import { readFileSync } from 'node:fs';
import { WebClient } from '@slack/web-api';
import Anthropic from '@anthropic-ai/sdk';

import { fetchIssues, fetchPullRequests } from './github-source.js';
import { getDigestWindow } from './digest-window.js';
import {
  derivePrStatusLabel,
  relativeAge,
  type PullRequestRow,
} from './pr-status.js';
import {
  extractMentionedUserIds,
  findMentions,
  resolveMentions,
  shouldFetchThread,
  type ChannelData,
  type DigestMessage,
  type MentionHit,
} from './slack-helpers.js';
import {
  planDigestPosts,
  SLACK_POST_OPTIONS,
  splitSummaryForPosting,
} from './slack-post.js';

interface ChannelConfig {
  id: string;
  name: string;
}

interface Config {
  channels: ChannelConfig[];
  model?: string;
  githubRepo?: string;
  mentionUserIds?: string[];
}

const config: Config = JSON.parse(
  readFileSync(new URL('../config.json', import.meta.url), 'utf8'),
);

const { SLACK_BOT_TOKEN, ANTHROPIC_API_KEY, DIGEST_CHANNEL_ID, GITHUB_TOKEN } =
  process.env;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const slackBotToken = requireEnv('SLACK_BOT_TOKEN', SLACK_BOT_TOKEN);
const anthropicApiKey = requireEnv('ANTHROPIC_API_KEY', ANTHROPIC_API_KEY);
const digestChannelId = requireEnv('DIGEST_CHANNEL_ID', DIGEST_CHANNEL_ID);

const slack = new WebClient(slackBotToken);
const anthropic = new Anthropic({ apiKey: anthropicApiKey });

const digestWindow = getDigestWindow();
const githubRepo = config.githubRepo ?? 'grafana/design';
const mentionUserIds = config.mentionUserIds ?? [];
const createdSince = new Date(digestWindow.oldest * 1000).toISOString();
const createdUntil = new Date(digestWindow.latest * 1000).toISOString();

function extractSlackError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'data' in err &&
    err.data &&
    typeof err.data === 'object' &&
    'error' in err.data &&
    typeof err.data.error === 'string'
  ) {
    return err.data.error;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function isHumanMessage(m: unknown): boolean {
  const subtype =
    m && typeof m === 'object' && 'subtype' in m
      ? (m as { subtype?: string }).subtype
      : undefined;
  return !subtype || subtype === 'thread_broadcast';
}

async function fetchThreadReplies(
  channelId: string,
  threadTs: string,
): Promise<DigestMessage[]> {
  const result = await slack.conversations.replies({
    channel: channelId,
    ts: threadTs,
    oldest: digestWindow.oldest.toString(),
    latest: digestWindow.latest.toString(),
    limit: 100,
  });
  return (result.messages ?? [])
    .filter((m) => m.ts !== threadTs)
    .filter((m) => isHumanMessage(m))
    .map((m) => ({
      ts: m.ts ?? '',
      user: m.user,
      text: m.text ?? '',
    }));
}

async function fetchChannelHistory(
  channel: ChannelConfig,
): Promise<ChannelData> {
  try {
    const result = await slack.conversations.history({
      channel: channel.id,
      oldest: digestWindow.oldest.toString(),
      latest: digestWindow.latest.toString(),
      limit: 200,
    });
    const messages: DigestMessage[] = [];
    for (const m of result.messages ?? []) {
      if (!isHumanMessage(m)) continue;
      const text = m.text ?? '';
      const replyCount = m.reply_count ?? 0;
      const entry: DigestMessage = {
        ts: m.ts ?? '',
        user: m.user,
        text,
        replyCount,
      };
      if (shouldFetchThread(text, replyCount)) {
        entry.replies = await fetchThreadReplies(channel.id, entry.ts);
      }
      messages.push(entry);
    }
    return { ...channel, messages };
  } catch (err: unknown) {
    return { ...channel, messages: [], error: extractSlackError(err) };
  }
}

function collectUserIds(channelData: ChannelData[]): Set<string> {
  const userIds = new Set<string>();
  const addFromMessage = (m: DigestMessage): void => {
    if (m.user) userIds.add(m.user);
    // Also resolve users referenced *inside* the message text (`<@U123>`), not
    // just the author — otherwise the summarizer sees bare IDs and may invent
    // names for them.
    for (const id of extractMentionedUserIds(m.text)) userIds.add(id);
  };
  for (const ch of channelData) {
    for (const m of ch.messages) {
      addFromMessage(m);
      for (const r of m.replies ?? []) addFromMessage(r);
    }
  }
  return userIds;
}

async function resolveUserNames(
  userIds: Set<string>,
): Promise<Record<string, string>> {
  const userMap: Record<string, string> = {};
  for (const id of userIds) {
    try {
      const r = await slack.users.info({ user: id });
      userMap[id] = r.user?.real_name ?? r.user?.name ?? id;
    } catch {
      userMap[id] = id;
    }
  }
  return userMap;
}

async function attachPermalinks(mentions: MentionHit[]): Promise<void> {
  for (const hit of mentions) {
    try {
      const r = await slack.chat.getPermalink({
        channel: hit.channelId,
        message_ts: hit.ts,
      });
      hit.permalink = r.permalink;
    } catch {
      hit.permalink = undefined;
    }
  }
}

async function attachMessagePermalinks(
  channelData: ChannelData[],
): Promise<void> {
  for (const ch of channelData) {
    for (const m of ch.messages) {
      try {
        const r = await slack.chat.getPermalink({
          channel: ch.id,
          message_ts: m.ts,
        });
        m.permalink = r.permalink;
      } catch {
        m.permalink = undefined;
      }
    }
  }
}

function formatMessageLine(
  m: DigestMessage,
  userMap: Record<string, string>,
  indent = '',
): string {
  const name = (m.user && userMap[m.user]) ?? m.user ?? 'unknown';
  const when = new Date(parseFloat(m.ts) * 1000).toISOString();
  const link = m.permalink ? ` permalink=${m.permalink}` : '';
  const text = resolveMentions(m.text, userMap);
  let out = `${indent}[${when}${link}] ${name}: ${text}`;
  for (const reply of m.replies ?? []) {
    out += `\n${formatMessageLine(reply, userMap, `${indent}  `)}`;
  }
  return out;
}

function buildRawDigest(
  channelData: ChannelData[],
  userMap: Record<string, string>,
  prs: PullRequestRow[],
  prError: string | undefined,
  issues: {
    number: number;
    title: string;
    author: { login: string };
    url: string;
    createdAt: string;
  }[],
  issueError: string | undefined,
  mentions: MentionHit[],
): string {
  const sections: string[] = [];

  const prSection = prs
    .map((pr) => {
      const status = derivePrStatusLabel(pr);
      const age = relativeAge(pr.createdAt);
      return `#${pr.number} ${pr.title} — @${pr.author.login} — ${age} — ${status} — ${pr.url}`;
    })
    .join('\n');
  sections.push(
    prError
      ? `## GitHub PRs (${githubRepo})\n_Error: ${prError}_`
      : `## GitHub PRs (${githubRepo})\n${prSection || '_None in window._'}`,
  );

  const issueSection = issues
    .map(
      (issue) =>
        `#${issue.number} ${issue.title} — @${issue.author.login} — ${issue.url}`,
    )
    .join('\n');
  sections.push(
    issueError
      ? `## GitHub issues (${githubRepo})\n_Error: ${issueError}_`
      : `## GitHub issues (${githubRepo})\n${issueSection || '_None in window._'}`,
  );

  const mentionSection = mentions
    .map((m) => {
      const name = (m.user && userMap[m.user]) ?? m.user ?? 'unknown';
      const link = m.permalink ?? `#${m.channelName}`;
      const text = resolveMentions(m.text, userMap);
      return `[#${m.channelName}] ${name} (${link}): ${text}`;
    })
    .join('\n');
  sections.push(
    `## Mentions of PDE team (${mentionUserIds.length ? mentionUserIds.join(', ') : 'none configured'})\n${mentionSection || '_None in window._'}`,
  );

  for (const ch of channelData) {
    const heading = `## #${ch.name} (${ch.id})`;
    if (ch.error) {
      sections.push(`${heading}\n_Error reading: ${ch.error}_`);
      continue;
    }
    if (ch.messages.length === 0) {
      sections.push(`${heading}\n_No activity in window._`);
      continue;
    }
    const lines = ch.messages
      .slice()
      .reverse()
      .map((m) => formatMessageLine(m, userMap))
      .join('\n');
    sections.push(`${heading}\n${lines}`);
  }

  return sections.join('\n\n');
}

async function summarize(
  rawDigest: string,
  windowLabel: string,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: config.model ?? 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are generating a daily Slack digest for the Product Design Engineering team at Grafana.

Time window: ${windowLabel} (UK time). Only summarize activity from this window.

Below is raw activity from Slack channels (including thread replies where fetched), GitHub PRs/issues, and @mentions of configured PDE team members. Produce a Slack-formatted digest with these sections in order. Omit any section that has no meaningful data (do not output empty section headings).

---

*:dart: Top signals*
3-4 one-sentence bullets of the most attention-worthy **non-PR** highlights — Slack discussions, thread decisions, blockers, cross-posted announcements, or mentions needing response. Do **not** list individual PR numbers or merge/review status here (those belong in the PR section). Good examples: thematic Slack activity, unanswered questions, time-sensitive thread decisions. When a bullet is about Slack activity and a \`permalink=\` URL is present in the raw data for that conversation, end the bullet with <permalink|slack thread> (use the parent message permalink for threaded discussions).

---

*Team channels*
Group by channel. For each channel with signal, use a short theme subheading then 2-5 bullets. Include distilled thread context where replies were provided — don't quote every reply. End each bullet that summarizes a specific Slack post or thread with <permalink|slack thread> using the \`permalink=\` URL from the raw data (parent message for threads). Skip channels with no meaningful activity. Filter out routine bot notifications, GitHub PR feed messages, subscribe/unsubscribe bots, standup/async-update bots, pure chitchat, and welcome messages.

*PRs opened in window (${githubRepo})*
List each PR as: <url|#N title> — author — age — status emoji label
Use these status labels exactly: :white_check_mark: merged, :no_entry: closed (not merged), :construction: draft, :white_check_mark: approved, awaiting merge, :speech_balloon: changes requested, :eyes: needs review

*GitHub issues opened in window (${githubRepo})*
List each as: <url|#N title> — author

*:wave: Mentions / needs response*
List mentions of PDE team members where someone else tagged them and may expect a reply. Format: _<permalink|author, #channel>_: one-sentence excerpt. Drop bot mentions and self-mentions.

---

Formatting rules:
- Never invent names. Refer to people only by names present in the raw activity. If a person is referenced only by a bare Slack ID (e.g. \`@U123ABC\`), keep that token verbatim rather than guessing a name.
- Slack markdown only: single *asterisks* for bold, _underscores_ for italic, \`backticks\` for code, <url|label> for links
- Deduplicate cross-posts across channels into one bullet listing channels
- Stay scannable in under a minute

Raw activity:

${rawDigest}`,
      },
    ],
  });
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

function countMessages(channelData: ChannelData[]): number {
  return channelData.reduce((sum, ch) => {
    const replies = ch.messages.reduce(
      (r, m) => r + (m.replies?.length ?? 0),
      0,
    );
    return sum + ch.messages.length + replies;
  }, 0);
}

async function main(): Promise<void> {
  console.log(
    `Fetching ${config.channels.length} channels (${digestWindow.label})...`,
  );
  console.log(
    `Window: ${digestWindow.oldest}–${digestWindow.latest} (unix seconds)`,
  );

  const [channelData, prResult, issueResult] = await Promise.all([
    Promise.all(config.channels.map(fetchChannelHistory)),
    fetchPullRequests(githubRepo, createdSince, createdUntil, GITHUB_TOKEN),
    fetchIssues(githubRepo, createdSince, createdUntil, GITHUB_TOKEN),
  ]);

  const messageCount = countMessages(channelData);
  console.log(
    `Got ${messageCount} Slack messages (incl. threads) across ${channelData.length} channels.`,
  );
  console.log(
    `Got ${prResult.items.length} PRs, ${issueResult.items.length} issues.`,
  );

  const mentions = findMentions(channelData, mentionUserIds);
  console.log(`Found ${mentions.length} PDE team mentions.`);

  if (
    messageCount === 0 &&
    prResult.items.length === 0 &&
    issueResult.items.length === 0 &&
    mentions.length === 0
  ) {
    console.log('No activity in window — skipping digest.');
    return;
  }

  const userIds = collectUserIds(channelData);
  for (const m of mentions) if (m.user) userIds.add(m.user);

  console.log('Resolving user names...');
  const userMap = await resolveUserNames(userIds);

  console.log('Resolving Slack permalinks...');
  await Promise.all([
    attachMessagePermalinks(channelData),
    attachPermalinks(mentions),
  ]);

  console.log('Generating summary via Anthropic...');
  const raw = buildRawDigest(
    channelData,
    userMap,
    prResult.items,
    prResult.error,
    issueResult.items,
    issueResult.error,
    mentions,
  );
  const summary = await summarize(raw, digestWindow.label);

  const today = new Date().toISOString().slice(0, 10);
  const header = `*PDE Daily Digest — ${today}*\n_${digestWindow.label}_`;
  const postParts = splitSummaryForPosting(summary);
  const plan = planDigestPosts(header, postParts);

  console.log(`Posting to ${digestChannelId}...`);
  console.log(
    `Message plan: root ${plan.root.length} chars, ${plan.threadReplies.length} thread reply(ies)`,
  );

  const root = await slack.chat.postMessage({
    channel: digestChannelId,
    text: plan.root,
    ...SLACK_POST_OPTIONS,
  });
  if (!root.ts) throw new Error('Slack postMessage returned no ts');

  for (const [index, text] of plan.threadReplies.entries()) {
    await slack.chat.postMessage({
      channel: digestChannelId,
      thread_ts: root.ts,
      text,
      ...SLACK_POST_OPTIONS,
    });
    console.log(
      `Posted thread reply ${index + 1}/${plan.threadReplies.length}`,
    );
  }

  console.log(`Posted: ts=${root.ts}`);
}

main().catch((err: unknown) => {
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${err.status}: ${err.message}`);
  } else {
    console.error('Digest failed:', err);
  }
  process.exit(1);
});

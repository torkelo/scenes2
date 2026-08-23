export interface DigestMessage {
  ts: string;
  user: string | undefined;
  text: string;
  replyCount?: number;
  replies?: DigestMessage[];
  /** Parent message permalink; opens the thread when replies exist. */
  permalink?: string;
}

export interface ChannelData {
  id: string;
  name: string;
  messages: DigestMessage[];
  error?: string;
}

export interface MentionHit {
  channelId: string;
  channelName: string;
  ts: string;
  user: string | undefined;
  text: string;
  permalink?: string;
}

export function shouldFetchThread(text: string, replyCount: number): boolean {
  if (replyCount <= 0) return false;
  return text.length >= 60 || text.includes('?') || text.includes('<@');
}

export function mentionsTeamMember(
  text: string,
  mentionUserIds: string[],
): boolean {
  if (mentionUserIds.length === 0) return false;
  return mentionUserIds.some((id) => text.includes(`<@${id}>`));
}

/**
 * Matches Slack in-text user mentions: `<@U123>` or `<@U123|fallback>`.
 * User IDs start with U (regular) or W (Enterprise Grid). The capture group
 * is the bare user ID.
 */
const USER_MENTION_RE = /<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g;

/** Collects the bare user IDs referenced by in-text mentions in `text`. */
export function extractMentionedUserIds(text: string): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(USER_MENTION_RE)) {
    if (match[1]) ids.push(match[1]);
  }
  return ids;
}

/**
 * Rewrites in-text `<@U123>` mentions into human-readable names using
 * `userMap`. When an ID cannot be resolved, it falls back to `@U123` (the
 * bare, clearly-a-Slack-ID form) rather than dropping the token — this stops
 * the summarizer from inventing a plausible name for an unknown ID.
 */
export function resolveMentions(
  text: string,
  userMap: Record<string, string>,
): string {
  return text.replace(USER_MENTION_RE, (_match, id: string) =>
    userMap[id] ? userMap[id] : `@${id}`,
  );
}

export function findMentions(
  channelData: ChannelData[],
  mentionUserIds: string[],
): MentionHit[] {
  if (mentionUserIds.length === 0) return [];
  const hits: MentionHit[] = [];
  for (const ch of channelData) {
    for (const m of ch.messages) {
      const candidates = [m, ...(m.replies ?? [])];
      for (const msg of candidates) {
        if (!mentionsTeamMember(msg.text, mentionUserIds)) continue;
        if (msg.user && mentionUserIds.includes(msg.user)) continue;
        hits.push({
          channelId: ch.id,
          channelName: ch.name,
          ts: msg.ts,
          user: msg.user,
          text: msg.text,
        });
      }
    }
  }
  return hits;
}

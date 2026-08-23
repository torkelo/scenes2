/** Slack soft-splits messages longer than this in the channel. */
export const SLACK_MESSAGE_MAX_CHARS = 4000;

const TOP_SIGNALS_MARKER = /^\*:dart: Top signals\*/m;
const NEXT_SECTION_MARKER =
  /^\*(Team channels|PRs opened in window|:wave: Mentions \/ needs response)/m;

export interface DigestPostParts {
  /** Top signals section only; empty when Claude omitted it. */
  topSignals: string;
  /** Team channels, PRs, issues, mentions — posted in thread. */
  thread: string;
}

export interface DigestPostPlan {
  root: string;
  threadReplies: string[];
}

/** Keep only top signals in the channel; everything else goes in the thread. */
export function splitSummaryForPosting(summary: string): DigestPostParts {
  const topMatch = summary.match(TOP_SIGNALS_MARKER);
  if (!topMatch || topMatch.index === undefined) {
    return { topSignals: '', thread: summary.trim() };
  }

  const afterHeading = topMatch.index + topMatch[0].length;
  const rest = summary.slice(afterHeading);
  const nextSection = rest.search(NEXT_SECTION_MARKER);

  const topBody = (nextSection >= 0 ? rest.slice(0, nextSection) : rest).trim();
  const topSignals = topBody
    ? `*:dart: Top signals*\n${topBody}`
    : '*:dart: Top signals*';
  const thread = nextSection >= 0 ? rest.slice(nextSection).trim() : '';

  return { topSignals, thread };
}

/**
 * Split text into chunks at paragraph or line boundaries, each ≤ maxChars.
 * Hard-splits only when a single line exceeds the limit.
 */
export function chunkSlackText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf('\n\n', maxChars);
    if (splitAt < Math.floor(maxChars * 0.5)) {
      splitAt = remaining.lastIndexOf('\n', maxChars);
    }
    if (splitAt < Math.floor(maxChars * 0.5)) {
      splitAt = maxChars;
    }

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/** Build a short root message (top signals) plus thread replies for the full digest. */
export function planDigestPosts(
  header: string,
  parts: DigestPostParts,
): DigestPostPlan {
  const footer = '\n\n---\n_Posted by PDE Digest bot._';
  const hasThread = parts.thread.length > 0;
  const threadNote = hasThread ? '\n_Full digest in thread ↓_' : '';

  const rootSections = [header];
  if (parts.topSignals) rootSections.push(parts.topSignals);
  const rootBody = `${rootSections.join('\n\n')}${threadNote}`;

  if (!hasThread) {
    return { root: `${rootBody}${footer}`, threadReplies: [] };
  }

  const threadReplies = chunkSlackText(parts.thread, SLACK_MESSAGE_MAX_CHARS);
  const lastIndex = threadReplies.length - 1;
  threadReplies[lastIndex] = `${threadReplies[lastIndex]}${footer}`;

  let root = rootBody;
  if (root.length > SLACK_MESSAGE_MAX_CHARS) {
    const [first, ...overflow] = chunkSlackText(root, SLACK_MESSAGE_MAX_CHARS);
    root = first ?? rootBody;
    threadReplies.unshift(...overflow);
  }

  return { root, threadReplies };
}

/** Disable Slack URL unfurls (e.g. linked thread previews). */
export const SLACK_POST_OPTIONS = {
  unfurl_links: false,
  unfurl_media: false,
} as const;

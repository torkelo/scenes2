export interface PullRequestRow {
  number: number;
  title: string;
  author: { login: string };
  url: string;
  createdAt: string;
  state: string;
  isDraft: boolean;
  reviewDecision: string | null;
}

export function derivePrStatusLabel(pr: {
  state: string;
  isDraft: boolean;
  reviewDecision: string | null;
}): string {
  if (pr.state === 'MERGED') return ':white_check_mark: merged';
  if (pr.state === 'CLOSED') return ':no_entry: closed (not merged)';
  if (pr.isDraft) return ':construction: draft';
  if (pr.state === 'OPEN' && pr.reviewDecision === 'APPROVED') {
    return ':white_check_mark: approved, awaiting merge';
  }
  if (pr.state === 'OPEN' && pr.reviewDecision === 'CHANGES_REQUESTED') {
    return ':speech_balloon: changes requested';
  }
  return ':eyes: needs review';
}

export function relativeAge(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

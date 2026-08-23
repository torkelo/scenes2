import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { PullRequestRow } from './pr-status.js';

const execFileAsync = promisify(execFile);

export interface GitHubIssueRow {
  number: number;
  title: string;
  author: { login: string };
  url: string;
  createdAt: string;
}

export interface GitHubFetchResult<T> {
  items: T[];
  error?: string;
}

export function filterByCreatedWindow<T extends { createdAt: string }>(
  items: T[],
  createdSince: string,
  createdUntil: string,
): T[] {
  const sinceMs = Date.parse(createdSince);
  const untilMs = Date.parse(createdUntil);
  return items.filter((item) => {
    const createdMs = Date.parse(item.createdAt);
    return createdMs >= sinceMs && createdMs <= untilMs;
  });
}

async function ghJson<T>(
  args: string[],
  token: string | undefined,
): Promise<T> {
  const { stdout } = await execFileAsync('gh', args, {
    env: {
      ...process.env,
      ...(token ? { GH_TOKEN: token, GITHUB_TOKEN: token } : {}),
    },
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

export async function fetchPullRequests(
  repo: string,
  createdSince: string,
  createdUntil: string,
  token: string | undefined,
): Promise<GitHubFetchResult<PullRequestRow>> {
  if (!token) {
    return { items: [], error: 'GITHUB_TOKEN not set — skipping PRs' };
  }
  try {
    const items = filterByCreatedWindow(
      await ghJson<PullRequestRow[]>(
        [
          'pr',
          'list',
          '--repo',
          repo,
          '--search',
          `created:>=${createdSince} created:<=${createdUntil}`,
          '--state',
          'all',
          '--json',
          'number,title,author,url,createdAt,state,isDraft,reviewDecision',
          '--limit',
          '30',
        ],
        token,
      ),
      createdSince,
      createdUntil,
    );
    return { items };
  } catch (err: unknown) {
    return {
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchIssues(
  repo: string,
  createdSince: string,
  createdUntil: string,
  token: string | undefined,
): Promise<GitHubFetchResult<GitHubIssueRow>> {
  if (!token) {
    return { items: [], error: 'GITHUB_TOKEN not set — skipping issues' };
  }
  try {
    const items = filterByCreatedWindow(
      await ghJson<GitHubIssueRow[]>(
        [
          'search',
          'issues',
          '--repo',
          repo,
          `created:>=${createdSince} created:<=${createdUntil}`,
          '--json',
          'number,title,author,url,createdAt',
          '--limit',
          '30',
        ],
        token,
      ),
      createdSince,
      createdUntil,
    );
    return { items };
  } catch (err: unknown) {
    return {
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * RIALO PRIMITIVE: Native HTTPS Connectivity
 *
 * This simulates the single-line HTTPS call that Rialo smart contracts can
 * make natively. No Chainlink, no API3, no middleware, and no relayer.
 *
 * Rialo equivalent:
 *   let res = await https::get("https://api.github.com/repos/{owner}/{repo}/pulls/{pr}");
 *   let pr: PullRequest = json::parse(res.body);
 *   if pr.merged { release_escrow(); }
 */
const GITHUB_API_BASE = 'https://api.github.com';

export interface PRStatus {
  number: number;
  state: string;
  merged: boolean;
  merged_at: string | null;
  title: string;
  html_url: string;
}

export interface IssueStatus {
  number: number;
  state: string;
  title: string;
  body?: string | null;
  html_url: string;
  pull_request?: { merged_at: string | null };
}

function headers(): HeadersInit {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'ChainTask-Rialo-Demo',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {})
  };
}

export async function fetchPRStatus(owner: string, repo: string, prNumber: number): Promise<PRStatus> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, { headers: headers() });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  const data = await response.json() as Record<string, unknown>;
  return {
    number: Number(data.number),
    state: String(data.state),
    merged: data.merged === true,
    merged_at: typeof data.merged_at === 'string' ? data.merged_at : null,
    title: String(data.title ?? ''),
    html_url: String(data.html_url ?? '')
  };
}

export async function fetchIssueStatus(owner: string, repo: string, issueNumber: number): Promise<IssueStatus> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`, { headers: headers() });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  return response.json() as Promise<IssueStatus>;
}

export async function fetchLinkedPRs(owner: string, repo: string, issueNumber: number): Promise<number[]> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/timeline`, {
    headers: { ...headers(), Accept: 'application/vnd.github.mockingbird-preview+json' }
  });
  if (!response.ok) return [];
  const events = await response.json() as Array<Record<string, unknown>>;
  const prNumbers = new Set<number>();
  for (const event of events) {
    const source = event.source as { issue?: { number?: number; pull_request?: unknown } } | undefined;
    if (event.event === 'cross-referenced' && source?.issue?.pull_request && source.issue.number) {
      prNumbers.add(source.issue.number);
    }
  }
  return [...prNumbers];
}

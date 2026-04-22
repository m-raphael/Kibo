# Security Gate

## Purpose

Every commit to this repo must pass a secret scan before it is accepted. This prevents credentials, API keys, tokens, and private keys from entering version history.

## How it works

The pre-commit hook runs [gitleaks](https://github.com/gitleaks/gitleaks) against staged files before each commit. If a secret pattern is found, the commit is blocked and the offending file/line is reported.

gitleaks v8.24.0 is pinned in `.pre-commit-config.yaml` at the repo root.

## First-time setup

Run once after cloning:

```bash
bash scripts/setup-hooks.sh
```

This installs `pre-commit` (via Homebrew or pip3) and activates the hook. After this, `git commit` automatically runs the scan on staged files.

### Manual install (if the script fails)

```bash
# macOS with Homebrew
brew install pre-commit
pre-commit install

# or with pip3
pip3 install pre-commit
pre-commit install
```

## Running a scan manually

To scan all staged files without committing:

```bash
pre-commit run --staged
```

To scan the full repository history (useful before first push):

```bash
gitleaks detect --source . --log-opts="HEAD"
```

## What is blocked

gitleaks matches against its built-in ruleset covering:

- AWS access keys and secrets
- GitHub/GitLab tokens
- Generic API keys and bearer tokens
- Private keys (RSA, ECDSA, PEM)
- Database connection strings with credentials
- JWT secrets

## What is not blocked

The hook only scans staged content. It does not prevent:

- Committing untracked sensitive files (add them to `.gitignore` first)
- Pushing to remotes if the hook was bypassed with `--no-verify`

Never use `git commit --no-verify` to skip the scan.

## Secrets baseline

`.secrets.baseline` is an empty JSON file reserved for audited false-positive allowances. If gitleaks flags a test fixture or non-sensitive pattern, document the exception here rather than suppressing the entire rule.

## If a secret is accidentally committed

1. Do not push.
2. Remove the secret from the file and amend or create a new commit.
3. If it was already pushed, rotate the credential immediately and contact the repository owner.

Git history rewrites (filter-branch, BFG) are required if a secret reaches a remote.

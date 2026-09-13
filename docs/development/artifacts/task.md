# Finova Main Deployment Checklist

- [x] Inspect git status, branch, remote, recent commits, workflows, and build config.
- [x] Run local backend and frontend CI checks.
- [x] Commit legitimate uncommitted Finova changes without credentials.
- [x] Push current work to `main` without force pushing.
- [x] Monitor GitHub Actions for the latest `main` commit.
- [x] Fix, commit, and push any root-cause CI failures until green.
- [x] Report final commit hash, Actions status, changed files, and manual actions.

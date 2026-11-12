# Family Parcel scheduled jobs

This repository only holds a schedule. Every 15 minutes it sends one authenticated request to the Family Parcel website, which decides whether any update work is due. All lookups and data stay in the private app.

Secrets (GitHub Actions secrets only): `SITE_URL` and `JOB_SECRET`. No database URL or other keys belong here.

Logs and run summaries contain only counts, timings, status codes, and limit numbers. Pull requests from forks never run this workflow, because it has no pull request trigger.

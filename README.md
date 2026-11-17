# Family Parcel scheduled jobs

This repository only holds a schedule. Every 15 minutes it starts two jobs.

The hourly job sends one authenticated request to the Family Parcel website. The website decides whether any daytime update work is due.

The nightly job first runs `due/nightly-due.mjs`. When the nightly is not due, the summary is `{"event":"nightly","outcome":"not_due"}` and the private app is not checked out. When it is due, the job checks out the private app and runs the price check. It uses this runner's own lookup allowance. If `DATABASE_URL` is missing, it stops with a count-only `missing_config` line.

An outside scheduler can start the workflow every 15 minutes. The steps are in `docs/outside-scheduler.md`. The GitHub schedule stays as a backup. A nightly job that is already running is not cancelled.

Logs and run summaries contain only counts, timings, status codes, and limit numbers. They must not contain names, links, prices, product codes, addresses, SQL, or stack traces. Pull requests from forks never run this workflow, because it has no pull request trigger.

## Secrets

Hourly job:

- `SITE_URL`
- `JOB_SECRET`

Nightly job:

- `PRIVATE_REPO_TOKEN` — fine-grained token. Repository access is only `ericianni/christmas-list`. Permission is Contents: Read-only.
- `DATABASE_URL` — the app's pooled Postgres URL. This job does not migrate.
- `APIFY_TOKEN` — Easyparser token. The price check still runs if this is empty.
- `BREVO_API_KEY`
- `NOTIFY_FROM_EMAIL`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

The digest sends nothing until the four digest secrets are set. The price check still finishes.

Do not put secret values, email bodies, or user addresses in this repository.

## First manual nightly run

Actions → Scheduled price jobs → Run workflow → set **force_nightly** on. A good summary is count-only lines such as `{"event":"done","outcome":"ok","job":"nightly","count":0}` plus lookup and allowance counts. It must not contain a name, link, price, or product code.

## Rollback

`git revert` the workflow commit and merge that. Do not reset or force-push.

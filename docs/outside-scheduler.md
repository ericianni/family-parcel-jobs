# Outside scheduler

GitHub's own 15-minute schedule often starts hours late. Use cron-job.org to start this workflow every 15 minutes. The GitHub schedule stays in the workflow as a backup.

## Token

Create a fine-grained personal access token.

- Resource owner: the owner of this repository
- Repository access: only `ericianni/family-parcel-jobs`
- Repository permission: Actions, Read and write
- No other repository and no other permission

Put the token in cron-job.org. Do not put the token in this repository.

## cron-job.org

Create one job.

- Title: Family Parcel jobs
- URL: `https://api.github.com/repos/ericianni/family-parcel-jobs/actions/workflows/price-jobs.yml/dispatches`
- Method: POST
- Schedule: every 15 minutes
- Request body: `{"ref":"main"}`
- Headers:
  - `Accept: application/vnd.github+json`
  - `Authorization: Bearer <token>`
  - `X-GitHub-Api-Version: 2022-11-28`

A successful call returns **204** with an empty body. That means GitHub queued the workflow. The workflow then decides whether the nightly price check is due. The hourly ping still runs.

Do not enable a pull request trigger. This file's workflow accepts `schedule` and `workflow_dispatch` only.

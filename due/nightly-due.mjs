import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SETTINGS_SQL =
  "select price_checks_on, nightly_enabled, nightly_hour_utc, nightly_minute_utc from runtime_settings where id = $1";
export const DONE_SQL =
  "select 1 as hit from job_run where job = 'nightly' and environment = 'github' and status = 'ok' and started_at >= $1 limit 1";

/** Same rule as the app nightly: switches on, on or after the UTC time, and not already finished today. */
export function decideNightlyDue(input) {
  if (!input.priceChecksOn || !input.nightlyEnabled) return false;
  if (input.force) return true;
  if (input.completedToday) return false;
  const minutes = input.now.getUTCHours() * 60 + input.now.getUTCMinutes();
  return minutes >= input.hour * 60 + input.minute;
}

export function dueLine(due) {
  return JSON.stringify({ event: "nightly", outcome: due ? "due" : "not_due" });
}

export const FAIL_LINE = JSON.stringify({ event: "fail", code: "db_error", job: "nightly" });
export const MISSING_LINE = JSON.stringify({ event: "fail", code: "missing_config", job: "nightly" });

function asBool(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "t" || value === "true" || value === 1) return true;
  if (value === "f" || value === "false" || value === 0) return false;
  return fallback;
}

export async function evaluateDue(query, now, force) {
  const settings = await query(SETTINGS_SQL, ["default"]);
  const row = settings[0];
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const done = await query(DONE_SQL, [start]);
  return decideNightlyDue({
    priceChecksOn: asBool(row?.price_checks_on, true),
    nightlyEnabled: asBool(row?.nightly_enabled, true),
    hour: row ? Number(row.nightly_hour_utc) : 7,
    minute: row ? Number(row.nightly_minute_utc) : 15,
    completedToday: done.length > 0,
    force: Boolean(force),
    now,
  });
}

const stdout = process.stdout.write.bind(process.stdout);

function emit(line) {
  stdout(`${line}\n`);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `${line}\n`);
}

function publish(due) {
  emit(dueLine(due));
  const output = process.env.GITHUB_OUTPUT;
  if (output) appendFileSync(output, `due=${due ? "yes" : "no"}\n`);
}

function silence() {
  const drop = () => true;
  process.stdout.write = drop;
  process.stderr.write = drop;
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}

export async function main() {
  silence();
  if (!process.env.DATABASE_URL) {
    emit(MISSING_LINE);
    return 1;
  }
  let client;
  try {
    const { default: pg } = await import("pg");
    const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
    await client.connect();
    const due = await evaluateDue(
      async (sql, params) => {
        const result = await client.query(sql, params);
        return result.rows;
      },
      new Date(),
      process.env.NIGHTLY_FORCE === "1",
    );
    publish(due);
    return 0;
  } catch {
    emit(FAIL_LINE);
    return 1;
  } finally {
    try {
      await client?.end();
    } catch {
      // A failed disconnect must not print the connection text.
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => {
    process.exit(code);
  });
}

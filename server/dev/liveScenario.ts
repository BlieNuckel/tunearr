import "reflect-metadata";
import {
  initializeDatabase,
  getDataSource,
  User,
  closeDatabase,
} from "../db/index";
import { initializeConfig } from "../config";
import { initializeNotifications } from "../services/notifications";
import { notifyLiveUpdates } from "../services/liveEvents/notifier";
import { SCENARIO_LIVE_EVENTS, seedOneEvent } from "./seedLiveEvents";

/**
 * Drives the tour notifier against the dev database, which the poller never
 * does without a JamBase key. Notifications land in the server log (the
 * always-on transport) and in web push if it is set up.
 *
 *   pnpm dev:live notify     run the notifier once
 *   pnpm dev:live announce   record baselines, add new dates, notify about them
 */
type Command = "notify" | "announce";

const COMMANDS: readonly Command[] = ["notify", "announce"];

async function adminId(): Promise<number> {
  const admin = await getDataSource()
    .getRepository(User)
    .findOne({ where: { username: "admin" } });
  if (!admin) throw new Error("No admin user: run `pnpm seed` first");
  return admin.id;
}

async function notifyOnce(label: string): Promise<void> {
  const outcome = await notifyLiveUpdates();
  console.log(
    `${label}: ${outcome.tours} tour notification(s), ${outcome.statusChanges} status change(s)`
  );
}

async function announce(userId: number): Promise<void> {
  // A first run records what the user already knows, silently, so the dates
  // added next are news rather than a first sighting.
  await notifyOnce("Baseline");

  for (const event of SCENARIO_LIVE_EVENTS) {
    const added = await seedOneEvent(event, userId);
    console.log(`  ${added ? "added" : "already there"}: ${event.note}`);
  }
  await notifyOnce("After new dates");
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  if (!command || !COMMANDS.includes(command)) {
    console.error(`Usage: pnpm dev:live <${COMMANDS.join("|")}>`);
    process.exitCode = 1;
    return;
  }

  await initializeDatabase();
  initializeConfig();
  initializeNotifications();

  try {
    if (command === "notify") await notifyOnce("Notifier");
    else await announce(await adminId());
  } finally {
    await closeDatabase();
  }
}

await main();

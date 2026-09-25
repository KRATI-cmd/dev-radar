import { cronHandler } from "../../src/web/cron";
import { collectAndAnalyzeTech, generateDailyDigest, generateWeeklyDigest } from "../../src/tasks";

// One cron job does everything so it fits Vercel's Hobby-plan cron limits
// (few jobs, at most once per day each). Vercel cron schedules run in UTC.
export default cronHandler("daily", async () => {
  await collectAndAnalyzeTech();
  await generateDailyDigest();
  if (new Date().getUTCDay() === 0) {
    await generateWeeklyDigest();
  }
});

import cron from "node-cron";
import { collectAndAnalyzeTech, generateDailyDigest, generateWeeklyDigest } from "./tasks";
import { db } from "./storage/database";

async function handleCommand(command: string, arg?: string): Promise<void> {
  switch (command) {
    case "collect":
      await collectAndAnalyzeTech();
      break;

    case "digest:daily":
      await generateDailyDigest();
      break;

    case "digest:weekly":
      await generateWeeklyDigest();
      break;

    case "digest:latest":
      const latest = await db.getLatestDigest();
      if (latest) {
        console.log(`\n📄 Latest digest: ${latest.type} - ${latest.generatedAt}`);
        console.log(`📁 Saved at: ${latest.filePath}`);
      } else {
        console.log("No digests generated yet");
      }
      break;

    case "search":
      if (!arg) {
        console.log("Please provide a search query");
        break;
      }
      const results = await db.searchItems(arg, 10);
      console.log(`\n🔍 Found ${results.length} results for "${arg}":\n`);
      results.forEach((item) => {
        console.log(`- [${item.category}] ${item.title}`);
        console.log(`  ${item.description.substring(0, 80)}...`);
        console.log(`  🔗 ${item.url}\n`);
      });
      break;

    case "show":
      const category = arg || "backend";
      const items = await db.getItemsByCategory(category, 10);
      console.log(`\n📊 Top items in ${category}:\n`);
      items.forEach((item) => {
        console.log(
          `- ${item.title} (relevance: ${(item.relevanceScore * 100).toFixed(0)}%)`
        );
        console.log(`  ${item.url}\n`);
      });
      break;

    case "star":
      if (!arg) {
        console.log("Please provide an item ID");
        break;
      }
      await db.starItem(arg);
      console.log(`⭐ Starred item ${arg}`);
      break;

    case "dismiss":
      if (!arg) {
        console.log("Please provide an item ID");
        break;
      }
      await db.dismissItem(arg);
      console.log(`🗑️ Dismissed item ${arg}`);
      break;

    case "unstar":
      if (!arg) {
        console.log("Please provide an item ID");
        break;
      }
      await db.unstarItem(arg);
      console.log(`☆ Unstarred item ${arg}`);
      break;

    case "starred":
      const starredItems = (await db.getStarredItems(20)).items;
      console.log(`\n⭐ Starred items (${starredItems.length}):\n`);
      starredItems.forEach((item) => {
        console.log(`- [${item.category}] ${item.title} (${item.id})`);
        console.log(`  🔗 ${item.url}\n`);
      });
      break;

    case "stats":
      const stats = await db.getStats();
      console.log(`\n📊 TechRadar Stats\n`);
      console.log(`Total items collected: ${stats.totalItems}`);
      console.log(`Digests generated: ${stats.digestCount}`);
      console.log(`Starred: ${stats.starredCount} | Dismissed: ${stats.dismissedCount}`);
      console.log(`\nBy category:`);
      Object.entries(stats.byCategory).forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
      console.log(`\nBy source:`);
      Object.entries(stats.bySource).forEach(([src, count]) => console.log(`  ${src}: ${count}`));
      break;

    case "help":
      console.log(`
TechRadar Commands:
  collect              - Fetch and analyze new technologies
  digest:daily         - Generate today's digest
  digest:weekly        - Generate this week's digest
  digest:latest        - Show latest generated digest
  search <query>       - Search for technologies
  show [category]      - Show top items in a category (default: backend)
  star <id>           - Mark item as interesting
  unstar <id>         - Remove a star from an item
  starred              - List all starred items
  dismiss <id>        - Hide item from future digests
  stats                - Show collection stats (totals by category/source)
  schedule             - Start automated daily/weekly schedule
  help                 - Show this message
      `);
      break;

    default:
      console.log(`Unknown command: ${command}. Use 'help' for available commands.`);
  }
}

// Main entry
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "schedule") {
  // Start scheduler
  console.log("🚀 TechRadar started in scheduler mode");
  console.log("📅 Daily digest: every day at 8:00 AM");
  console.log("📅 Weekly digest: every Sunday at 9:00 AM");
  console.log("💡 Run 'techradar help' for CLI commands\n");

  // Initial collection
  collectAndAnalyzeTech().catch(console.error);

  // Daily digest at 8 AM
  cron.schedule("0 8 * * *", () => {
    generateDailyDigest().catch(console.error);
  });

  // Weekly digest at 9 AM on Sunday
  cron.schedule("0 9 * * 0", () => {
    generateWeeklyDigest().catch(console.error);
  });

  // Collect new tech every 12 hours
  cron.schedule("0 */12 * * *", () => {
    collectAndAnalyzeTech().catch(console.error);
  });
} else {
  // Handle commands
  handleCommand(args[0], args[1]).then(() => {
    db.close();
    process.exit(0);
  }).catch((error) => {
    console.error("Error:", error);
    db.close();
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down TechRadar...");
  db.close();
  process.exit(0);
});

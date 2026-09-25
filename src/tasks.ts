import { fetchGitHubTrending, fetchNPMTrending, fetchHackerNewsTrending } from "./collectors/sources";
import { analyzeTechItem, generateDigest } from "./ai/analyzer";
import { saveDigest, generateMarkdownDigest, generateHTMLDigest } from "./digest/generator";
import { filterAndScoreByPreferences } from "./config/preferences";
import { db } from "./storage/database";
import { DigestItem, Digest } from "./types";

/**
 * The core collection/digest tasks, kept free of any CLI or process-exit
 * side effects so they're safe to import from both the CLI (src/index.ts)
 * and Vercel's cron-triggered API routes (api/cron/*.ts).
 */

export async function collectAndAnalyzeTech(): Promise<void> {
  console.log("🔍 Collecting trending technologies...");

  try {
    const [githubItems, npmItems, hnItems] = await Promise.all([
      fetchGitHubTrending(),
      fetchNPMTrending(),
      fetchHackerNewsTrending(),
    ]);

    console.log(
      `✅ Found ${githubItems.length} GitHub repos, ${npmItems.length} NPM packages, and ${hnItems.length} Hacker News stories`
    );

    // Apply config/preferences.json: drop excluded keywords, boost relevance
    // for your primary stack, interests, preferred languages and category weights
    const allItems = filterAndScoreByPreferences([...githubItems, ...npmItems, ...hnItems]);

    // Analyze each item
    console.log("🤖 Analyzing with Claude AI...");
    for (const item of allItems.slice(0, 15)) {
      // Limit to top 15 (by preference-adjusted relevance) to save API calls
      const analysis = await analyzeTechItem(item);
      item.aiSummary = analysis.summary;
      item.relevanceScore = analysis.relevanceScore;
      item.analyzedAt = new Date();

      // Store in database
      await db.insertItem(item);
      console.log(`  ✓ ${item.title}`);
    }

    console.log("💾 Stored in database");
  } catch (error) {
    console.error("❌ Error during collection:", error);
  }
}

export async function generateDailyDigest(): Promise<void> {
  console.log("\n📋 Generating daily digest...");

  const recentItems = await db.getRecentItems(24, 20);

  if (recentItems.length === 0) {
    console.log("⚠️ No items found for today's digest");
    return;
  }

  // Get digest analysis from Claude
  const { trends, insights } = await generateDigest(recentItems, "daily");

  // Create digest items with reasoning
  const digestItems: DigestItem[] = recentItems.slice(0, 10).map((item) => ({
    item,
    reasoning: `Relevant to your ${item.category} interests with ${(item.relevanceScore * 100).toFixed(0)}% relevance score`,
    actionItems: [
      `Explore this ${item.category} technology`,
      `Add to your learning backlog if interested`,
    ],
  }));

  const digest: Digest = {
    id: `digest_${Date.now()}`,
    type: "daily",
    generatedAt: new Date(),
    items: digestItems,
    trends,
    insights,
  };

  // The database is the source of truth for digest content (works on both a
  // local disk and Vercel's read-only/ephemeral filesystem). Writing local
  // .md/.html files too is just a convenience for local CLI use.
  const markdownContent = generateMarkdownDigest(digest, digestItems);
  const htmlContent = generateHTMLDigest(digest, digestItems);

  let filepath = "";
  try {
    filepath = saveDigest(digest, digestItems, "markdown");
    saveDigest(digest, digestItems, "html");
  } catch (error) {
    console.log("⚠️ Could not write digest files to disk, continuing with database storage only");
  }

  await db.saveDigest(
    digest.id,
    digest.type,
    recentItems.map((i) => i.id),
    trends,
    insights,
    filepath,
    markdownContent,
    htmlContent
  );

  console.log("✅ Daily digest generated!");
  console.log(`📊 Digest includes ${digestItems.length} items`);
}

export async function generateWeeklyDigest(): Promise<void> {
  console.log("\n📋 Generating weekly digest...");

  const weekItems = await db.getRecentItems(24 * 7, 50);

  if (weekItems.length === 0) {
    console.log("⚠️ No items found for this week");
    return;
  }

  const { trends, insights } = await generateDigest(weekItems, "weekly");

  const digestItems: DigestItem[] = weekItems.slice(0, 20).map((item) => ({
    item,
    reasoning: `Significant development in ${item.category} with strong community interest`,
    actionItems: [
      `Research use cases in your projects`,
      `Share with team if relevant`,
      `Consider for upcoming architecture`,
    ],
  }));

  const digest: Digest = {
    id: `digest_${Date.now()}`,
    type: "weekly",
    generatedAt: new Date(),
    items: digestItems,
    trends,
    insights,
  };

  const markdownContent = generateMarkdownDigest(digest, digestItems);
  const htmlContent = generateHTMLDigest(digest, digestItems);

  let filepath = "";
  try {
    filepath = saveDigest(digest, digestItems, "markdown");
    saveDigest(digest, digestItems, "html");
  } catch (error) {
    console.log("⚠️ Could not write digest files to disk, continuing with database storage only");
  }

  await db.saveDigest(
    digest.id,
    digest.type,
    weekItems.map((i) => i.id),
    trends,
    insights,
    filepath,
    markdownContent,
    htmlContent
  );

  console.log("✅ Weekly digest generated!");
  console.log(`📊 Digest includes ${digestItems.length} items`);
}

import fs from "fs";
import path from "path";
import { marked } from "marked";
import { TechItem, DigestItem, Digest } from "../types";

export function generateMarkdownDigest(
  digest: Digest,
  digestItems: DigestItem[]
): string {
  const timestamp = digest.generatedAt.toLocaleString();
  const typeLabel = digest.type === "daily" ? "Daily" : "Weekly";

  let md = `# 🚀 TechRadar ${typeLabel} Digest\n\n`;
  md += `**Generated:** ${timestamp}\n\n`;

  // Trends section
  if (digest.trends.length > 0) {
    md += `## 📈 Top Trends\n\n`;
    digest.trends.forEach((trend) => {
      md += `- **${trend}**\n`;
    });
    md += "\n";
  }

  // Insights section
  if (digest.insights.length > 0) {
    md += `## 💡 Key Insights\n\n`;
    digest.insights.forEach((insight) => {
      md += `- ${insight}\n`;
    });
    md += "\n";
  }

  // Items by category
  const byCategory: Record<string, DigestItem[]> = {};
  digestItems.forEach((di) => {
    const cat = di.item.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(di);
  });

  const categoryEmoji: Record<string, string> = {
    frontend: "⚛️",
    backend: "🖥️",
    devops: "🔧",
    "ai-ml": "🤖",
    "full-stack": "🌐",
  };

  for (const [category, items] of Object.entries(byCategory)) {
    const emoji = categoryEmoji[category] || "📦";
    md += `## ${emoji} ${category.toUpperCase()}\n\n`;

    items.forEach((di) => {
      const item = di.item;
      md += `### [${item.title}](${item.url})\n\n`;
      md += `${item.description}\n\n`;

      if (item.stars) md += `⭐ ${item.stars} stars | `;
      if (item.weeklyDownloads)
        md += `📥 ${item.weeklyDownloads} weekly downloads | `;
      if (item.language) md += `📝 ${item.language}`;
      md += "\n\n";

      if (item.aiSummary) {
        md += `**AI Summary:** ${item.aiSummary}\n\n`;
      }

      md += `**Why this matters:** ${di.reasoning}\n\n`;

      if (di.actionItems && di.actionItems.length > 0) {
        md += `**Action Items:**\n`;
        di.actionItems.forEach((action) => {
          md += `- ${action}\n`;
        });
        md += "\n";
      }

      md += `---\n\n`;
    });
  }

  md += `\n*TechRadar - Your Personal Technology Discovery Engine*\n`;
  return md;
}

export function generateHTMLDigest(
  digest: Digest,
  digestItems: DigestItem[]
): string {
  const markdown = generateMarkdownDigest(digest, digestItems);
  const html = marked(markdown);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechRadar ${digest.type === "daily" ? "Daily" : "Weekly"} Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    h1, h2, h3 { color: #2c3e50; }
    h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { margin-top: 30px; }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .metadata { color: #7f8c8d; font-size: 0.9em; }
    .action-item { background: #e8f4f8; padding: 10px; border-left: 4px solid #3498db; margin: 10px 0; }
    hr { border: none; border-top: 2px solid #ecf0f1; margin: 20px 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

export function saveDigest(
  digest: Digest,
  digestItems: DigestItem[],
  format: "markdown" | "html" = "markdown"
): string {
  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = digest.generatedAt
    .toISOString()
    .replace(/[:.]/g, "-")
    .substring(0, 19);
  const filename = `techradar_${digest.type}_${timestamp}.${format === "html" ? "html" : "md"}`;
  const filepath = path.join(outputDir, filename);

  const content =
    format === "html"
      ? generateHTMLDigest(digest, digestItems)
      : generateMarkdownDigest(digest, digestItems);

  fs.writeFileSync(filepath, content, "utf-8");
  console.log(`✅ Digest saved to: ${filepath}`);

  return filepath;
}

export function displayDigest(markdown: string): void {
  console.log("\n" + "=".repeat(80));
  console.log(markdown);
  console.log("=".repeat(80) + "\n");
}

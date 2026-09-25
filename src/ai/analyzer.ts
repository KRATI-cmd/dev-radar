import { TechItem, DigestItem } from "../types";
import { FreeAnalyzer } from "./free-analyzer";

// Use free analyzer by default, Claude API if key is available
const useClaudeAPI = !!process.env.ANTHROPIC_API_KEY;

let client: any = null;

if (useClaudeAPI) {
  try {
    const Anthropic = require("@anthropic-ai/sdk").default;
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log("✅ Using Claude API for analysis");
  } catch (e) {
    console.log("⚠️ Claude API not available, using free analysis");
  }
}

export async function analyzeTechItem(item: TechItem): Promise<{
  summary: string;
  relevanceScore: number;
  keyInsights: string[];
}> {
  // Try Claude API first if available
  if (client && useClaudeAPI) {
    try {
      const prompt = `Analyze this technology/project for a senior backend engineer with expertise in:
- Node.js, TypeScript, Express.js, PostgreSQL
- Microservices, RBAC, multi-tenant architecture
- Kafka, AWS, enterprise-scale systems
- Currently interested in: Full-stack dev, DevOps, AI/ML

Project: ${item.title}
Description: ${item.description}
URL: ${item.url}
Category: ${item.category}
Stars/Downloads: ${item.stars || item.weeklyDownloads || "N/A"}

Provide JSON: {"summary": "...", "relevanceScore": 0.85, "keyInsights": [...]}`;

      const message = await client.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      const text = (message.content[0] as { type: string; text: string }).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log("Claude API failed, falling back to free analysis");
    }
  }

  // Fall back to free analysis
  return FreeAnalyzer.analyzeTechItem(item);
}

export async function generateDigest(
  items: TechItem[],
  type: "daily" | "weekly"
): Promise<{
  digestItems: DigestItem[];
  trends: string[];
  insights: string[];
}> {
  // Try Claude API first if available
  if (client && useClaudeAPI) {
    try {
      const itemsText = items
        .slice(0, 15)
        .map(
          (i) =>
            `- ${i.title} (${i.category}): ${i.description}`
        )
        .join("\n");

      const prompt = `You're analyzing trending technology discoveries for a senior backend engineer.
These are the top ${type === "daily" ? "daily" : "weekly"} trending items:

${itemsText}

Provide JSON: {"trends": [...], "insights": [...], "summary": "..."}`;

      const message = await client.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const text = (message.content[0] as { type: string; text: string }).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          digestItems: [],
          trends: parsed.trends || [],
          insights: parsed.insights || [],
        };
      }
    } catch (e) {
      console.log("Claude API failed, using free analysis");
    }
  }

  // Fall back to free analysis
  const { trends, insights } = FreeAnalyzer.generateDigestSummary(items, type);
  return {
    digestItems: [],
    trends,
    insights,
  };
}

export async function generateActionItems(
  item: TechItem,
  insight: string
): Promise<string[]> {
  const prompt = `Given this technology and insight, suggest 2-3 specific action items for a backend engineer:

Technology: ${item.title}
Insight: ${insight}

Return as JSON: { "actions": ["action1", "action2"] }`;

  const message = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  try {
    const text = (message.content[0] as { type: string; text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).actions;
    }
  } catch (e) {
    // Silent fail
  }

  return [];
}

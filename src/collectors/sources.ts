import axios from "axios";
import { TechItem } from "../types";

const TRACKED_LANGUAGES = ["typescript", "javascript", "go", "python", "rust"];

export async function fetchGitHubTrending(): Promise<TechItem[]> {
  try {
    // GitHub's search API doesn't support a parenthesized "(language:a OR language:b)"
    // qualifier combined with other filters (it silently matches zero repos), so we
    // fetch by a rolling creation-date window and filter languages client-side instead.
    const since = new Date();
    since.setDate(since.getDate() - 120);
    const sinceDate = since.toISOString().split("T")[0];

    const response = await axios.get("https://api.github.com/search/repositories", {
      params: {
        q: `stars:>1000 created:>${sinceDate}`,
        sort: "stars",
        order: "desc",
        per_page: 30,
      },
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    return response.data.items
      .filter((repo: any) => !repo.language || TRACKED_LANGUAGES.includes(repo.language.toLowerCase()))
      .map((repo: any) => ({
      id: `gh_${repo.id}`,
      title: repo.name,
      description: repo.description || "No description",
      url: repo.html_url,
      source: "github" as const,
      category: categorizeRepo(repo),
      tags: repo.topics || [],
      relevanceScore: calculateRelevance(repo, "backend"),
      stars: repo.stargazers_count,
      language: repo.language,
      collectedAt: new Date(),
    }));
  } catch (error) {
    console.error("GitHub API error:", error);
    return [];
  }
}

export async function fetchNPMTrending(): Promise<TechItem[]> {
  try {
    // Using public NPM registry for trending packages
    const response = await axios.get("https://registry.npmjs.org/-/v1/search", {
      params: {
        text: "backend nodejs server database orm cache",
        size: 30,
        from: 0,
        quality: 1.0,
      },
      timeout: 5000,
    });

    return response.data.objects
      .filter((pkg: any) => new Date(pkg.package.date).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .map((pkg: any) => ({
        id: `npm_${pkg.package.name.replace(/\//g, "_")}`,
        title: pkg.package.name,
        description: pkg.package.description || "No description",
        url: pkg.package.links.npm,
        source: "npm" as const,
        category: categorizeNPMPackage(pkg.package.name),
        tags: pkg.package.keywords || [],
        relevanceScore: calculateNPMRelevance(pkg),
        weeklyDownloads: pkg.score.detail?.maintenance ?? 0,
        collectedAt: new Date(),
      }));
  } catch (error) {
    console.error("NPM API error:", error);
    return [];
  }
}

export async function fetchHackerNewsTrending(): Promise<TechItem[]> {
  try {
    const topIdsRes = await axios.get(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { timeout: 5000 }
    );
    const topIds: number[] = topIdsRes.data.slice(0, 25);

    const stories = await Promise.all(
      topIds.map((id) =>
        axios
          .get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
          .then((r) => r.data)
          .catch(() => null)
      )
    );

    return stories
      .filter((s) => s && s.url && s.title && (s.score ?? 0) >= 50)
      .map((s: any) => ({
        id: `hn_${s.id}`,
        title: s.title,
        description: `Discussed on Hacker News — ${s.score} points, ${s.descendants ?? 0} comments.`,
        url: s.url,
        source: "hackernews" as const,
        category: categorizeByKeywords(s.title),
        tags: [],
        relevanceScore: Math.min(0.5 + (s.score ?? 0) / 1000, 1),
        stars: s.score,
        collectedAt: new Date(),
      }));
  } catch (error) {
    console.error("Hacker News API error:", error);
    return [];
  }
}

function categorizeByKeywords(text: string): "frontend" | "backend" | "devops" | "ai-ml" | "full-stack" {
  const lower = text.toLowerCase();
  if (lower.includes("docker") || lower.includes("kubernetes") || lower.includes("devops") || lower.includes("terraform")) return "devops";
  if (lower.includes("ai") || lower.includes("llm") || lower.includes("gpt") || lower.includes("machine learning")) return "ai-ml";
  if (lower.includes("react") || lower.includes("frontend") || lower.includes("css") || lower.includes(" ui ")) return "frontend";
  if (lower.includes("api") || lower.includes("backend") || lower.includes("server") || lower.includes("database")) return "backend";
  return "full-stack";
}

function categorizeRepo(repo: any): "frontend" | "backend" | "devops" | "ai-ml" | "full-stack" {
  const keywords = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();

  if (keywords.includes("docker") || keywords.includes("kubernetes") || keywords.includes("ci/cd") || keywords.includes("terraform")) {
    return "devops";
  }
  if (keywords.includes("llm") || keywords.includes("ai") || keywords.includes("ml") || keywords.includes("neural") || keywords.includes("model")) {
    return "ai-ml";
  }
  if (keywords.includes("react") || keywords.includes("vue") || keywords.includes("angular") || keywords.includes("frontend")) {
    return "frontend";
  }
  if (keywords.includes("express") || keywords.includes("fastify") || keywords.includes("api") || keywords.includes("backend") || keywords.includes("server")) {
    return "backend";
  }
  return "full-stack";
}

function categorizeNPMPackage(name: string): "frontend" | "backend" | "devops" | "ai-ml" | "full-stack" {
  const lower = name.toLowerCase();

  if (lower.includes("react") || lower.includes("vue") || lower.includes("angular")) return "frontend";
  if (lower.includes("ai") || lower.includes("ml") || lower.includes("tensorflow")) return "ai-ml";
  if (lower.includes("docker") || lower.includes("k8s")) return "devops";
  if (lower.includes("express") || lower.includes("fastify") || lower.includes("hapi")) return "backend";
  return "full-stack";
}

function calculateRelevance(repo: any, userRole: string): number {
  let score = 0.5;

  if (repo.stargazers_count > 10000) score += 0.3;
  else if (repo.stargazers_count > 1000) score += 0.2;

  if (repo.language === "TypeScript") score += 0.2;
  if (repo.language === "JavaScript") score += 0.1;

  const keywords = `${repo.name} ${repo.description || ""}`.toLowerCase();
  if (keywords.includes("production") || keywords.includes("enterprise")) score += 0.1;

  return Math.min(score, 1.0);
}

function calculateNPMRelevance(pkg: any): number {
  let score = 0.5;

  const quality = pkg.score?.detail?.quality ?? 0;
  score += quality * 0.3;

  const popularity = pkg.score?.detail?.popularity ?? 0;
  score += popularity * 0.2;

  return Math.min(score, 1.0);
}

import fs from "fs";
import path from "path";
import { TechItem, UserPreferences } from "../types";

const DEFAULT_PREFERENCES: UserPreferences = {
  primaryStack: [],
  interests: [],
  experienceLevel: "mid",
  excludeKeywords: [],
  starrableItems: [],
  dismissedItems: [],
  preferredLanguages: [],
  categoryWeights: {},
};

let cached: UserPreferences | null = null;

export function loadPreferences(): UserPreferences {
  if (cached) return cached;

  const prefsPath = path.join(process.cwd(), "config", "preferences.json");
  try {
    const raw = fs.readFileSync(prefsPath, "utf-8");
    cached = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch (error) {
    console.log("⚠️ Could not read config/preferences.json, using defaults");
    cached = DEFAULT_PREFERENCES;
  }

  return cached!;
}

function isExcluded(item: TechItem, prefs: UserPreferences): boolean {
  if (!prefs.excludeKeywords?.length) return false;
  const content = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
  return prefs.excludeKeywords.some((keyword) => content.includes(keyword.toLowerCase()));
}

function preferenceBoost(item: TechItem, prefs: UserPreferences): number {
  let boost = 0;

  const weight = prefs.categoryWeights?.[item.category];
  if (typeof weight === "number") boost += weight * 0.3;

  if (item.language && prefs.preferredLanguages?.some((l) => l.toLowerCase() === item.language!.toLowerCase())) {
    boost += 0.1;
  }

  const content = `${item.title} ${item.description}`.toLowerCase();
  if (prefs.primaryStack?.some((s) => content.includes(s.toLowerCase()))) {
    boost += 0.1;
  }
  if (prefs.interests?.some((s) => content.includes(s.toLowerCase()))) {
    boost += 0.05;
  }

  return boost;
}

/**
 * Drops items matching excludeKeywords and re-scores the rest using
 * primaryStack, interests, preferredLanguages and categoryWeights from
 * config/preferences.json, so the settings the docs describe actually apply.
 */
export function filterAndScoreByPreferences(items: TechItem[]): TechItem[] {
  const prefs = loadPreferences();

  return items
    .filter((item) => !isExcluded(item, prefs))
    .map((item) => ({
      ...item,
      relevanceScore: Math.min(1, item.relevanceScore + preferenceBoost(item, prefs)),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

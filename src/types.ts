export interface TechItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: 'github' | 'npm' | 'hackernews';
  category: 'frontend' | 'backend' | 'devops' | 'ai-ml' | 'full-stack';
  tags: string[];
  relevanceScore: number;
  stars?: number;
  weeklyDownloads?: number;
  language?: string;
  collectedAt: Date;
  analyzedAt?: Date;
  aiSummary?: string;
}

export interface DigestItem {
  item: TechItem;
  reasoning: string; // Why this was recommended
  actionItems?: string[];
}

export interface UserPreferences {
  primaryStack: string[];
  interests: string[];
  experienceLevel: 'junior' | 'mid' | 'senior' | 'architect';
  excludeKeywords: string[];
  starrableItems: string[];
  dismissedItems: string[];
  preferredLanguages?: string[];
  categoryWeights?: Record<string, number>;
}

export interface Digest {
  id: string;
  type: 'daily' | 'weekly';
  generatedAt: Date;
  items: DigestItem[];
  trends: string[];
  insights: string[];
}

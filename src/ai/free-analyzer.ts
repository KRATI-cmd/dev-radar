import { TechItem } from "../types";

/**
 * Free AI Analysis - No API keys required
 * Uses rule-based analysis and local processing
 */
export class FreeAnalyzer {

  static analyzeTechItem(item: TechItem): {
    summary: string;
    relevanceScore: number;
    keyInsights: string[];
  } {
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();
    const content = `${title} ${description}`;

    // Rule-based categorization and scoring
    const relevanceScore = this.calculateRelevanceScore(content, item);
    const summary = this.generateSummary(item);
    const keyInsights = this.generateInsights(content, item);

    return {
      summary,
      relevanceScore,
      keyInsights,
    };
  }

  private static calculateRelevanceScore(content: string, item: TechItem): number {
    let score = 0.5; // Base score

    // Backend keywords (your expertise)
    const backendKeywords = [
      'node.js', 'nodejs', 'express', 'fastify', 'typescript', 'javascript',
      'postgres', 'postgresql', 'database', 'api', 'rest', 'graphql',
      'microservices', 'kafka', 'redis', 'mongodb', 'sql'
    ];

    // DevOps keywords
    const devopsKeywords = [
      'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
      'ci/cd', 'pipeline', 'deployment', 'monitoring', 'logging', 'metrics'
    ];

    // AI/ML keywords
    const aimlKeywords = [
      'ai', 'ml', 'machine learning', 'deep learning', 'tensorflow', 'pytorch',
      'llm', 'gpt', 'transformer', 'neural network', 'nlp', 'computer vision'
    ];

    // Enterprise keywords
    const enterpriseKeywords = [
      'production', 'enterprise', 'scalable', 'performance', 'security',
      'authentication', 'authorization', 'rbac', 'multi-tenant'
    ];

    // Score based on keyword matches
    backendKeywords.forEach(keyword => {
      if (content.includes(keyword)) score += 0.15;
    });

    devopsKeywords.forEach(keyword => {
      if (content.includes(keyword)) score += 0.10;
    });

    aimlKeywords.forEach(keyword => {
      if (content.includes(keyword)) score += 0.08;
    });

    enterpriseKeywords.forEach(keyword => {
      if (content.includes(keyword)) score += 0.05;
    });

    // Boost score based on popularity
    if (item.stars && item.stars > 10000) score += 0.2;
    else if (item.stars && item.stars > 1000) score += 0.1;

    if (item.weeklyDownloads && item.weeklyDownloads > 100000) score += 0.15;
    else if (item.weeklyDownloads && item.weeklyDownloads > 10000) score += 0.08;

    // Language bonus (you work with these)
    if (item.language === 'TypeScript') score += 0.15;
    else if (item.language === 'JavaScript') score += 0.10;
    else if (item.language === 'Go') score += 0.08;
    else if (item.language === 'Python') score += 0.05;

    return Math.min(score, 1.0);
  }

  private static generateSummary(item: TechItem): string {
    const category = item.category;
    const title = item.title;

    if (category === 'backend') {
      return `${title} is a backend technology that can enhance your server-side development workflow. ${item.description.substring(0, 100)}...`;
    }

    if (category === 'devops') {
      return `${title} is a DevOps tool that could improve your deployment and infrastructure management. ${item.description.substring(0, 100)}...`;
    }

    if (category === 'ai-ml') {
      return `${title} is an AI/ML technology you could integrate into your backend systems. ${item.description.substring(0, 100)}...`;
    }

    return `${title}: ${item.description.substring(0, 150)}...`;
  }

  private static generateInsights(content: string, item: TechItem): string[] {
    const insights: string[] = [];

    // Performance insights
    if (content.includes('performance') || content.includes('fast') || content.includes('speed')) {
      insights.push('Could improve application performance');
    }

    // Scalability insights
    if (content.includes('scalable') || content.includes('scale') || content.includes('distributed')) {
      insights.push('Helps with system scalability');
    }

    // Security insights
    if (content.includes('security') || content.includes('auth') || content.includes('secure')) {
      insights.push('Enhances application security');
    }

    // Developer experience
    if (content.includes('developer') || content.includes('dx') || content.includes('productivity')) {
      insights.push('Improves developer experience');
    }

    // Enterprise readiness
    if (content.includes('production') || content.includes('enterprise') || item.stars && item.stars > 5000) {
      insights.push('Production-ready for enterprise use');
    }

    // Default insights if none found
    if (insights.length === 0) {
      insights.push('Worth exploring for your tech stack');
      insights.push('Could be useful in upcoming projects');
    }

    return insights.slice(0, 3); // Max 3 insights
  }

  static generateDigestSummary(items: TechItem[], type: 'daily' | 'weekly'): {
    trends: string[];
    insights: string[];
  } {
    const categories = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const languages = items
      .filter(item => item.language)
      .reduce((acc, item) => {
        acc[item.language!] = (acc[item.language!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Generate trends based on data
    const trends: string[] = [];

    // Most active category
    const topCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)[0];
    if (topCategory) {
      trends.push(`${topCategory[0]} technologies are trending (${topCategory[1]} new items)`);
    }

    // Language trends
    const topLanguage = Object.entries(languages)
      .sort(([,a], [,b]) => b - a)[0];
    if (topLanguage) {
      trends.push(`${topLanguage[0]} ecosystem is very active`);
    }

    // High-star projects
    const highStarItems = items.filter(item => item.stars && item.stars > 5000);
    if (highStarItems.length > 0) {
      trends.push(`${highStarItems.length} high-quality projects (5000+ stars) discovered`);
    }

    // Generate insights
    const insights: string[] = [];

    if (categories.backend > 0) {
      insights.push(`${categories.backend} new backend tools to explore`);
    }

    if (categories.devops > 0) {
      insights.push(`DevOps tooling continues to evolve rapidly`);
    }

    if (categories['ai-ml'] > 0) {
      insights.push(`AI/ML integration becoming standard in backend systems`);
    }

    // Default insight
    if (insights.length === 0) {
      insights.push('Technology landscape continues to evolve rapidly');
    }

    return { trends, insights };
  }
}

/**
 * Optional: Ollama Integration (Local LLM - Free)
 *
 * To use local LLM with Ollama:
 * 1. Install Ollama: https://ollama.ai
 * 2. Run: ollama pull llama2
 * 3. Uncomment the code below and use OllamaAnalyzer instead
 */

/*
import axios from 'axios';

export class OllamaAnalyzer {
  static async analyzeTechItem(item: TechItem): Promise<{
    summary: string;
    relevanceScore: number;
    keyInsights: string[];
  }> {
    try {
      const prompt = `Analyze this technology for a senior backend engineer:
Title: ${item.title}
Description: ${item.description}
Category: ${item.category}

Provide a JSON response with:
- summary (2 sentences)
- relevanceScore (0-1)
- keyInsights (array of 2-3 strings)`;

      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'llama2',
        prompt,
        stream: false
      });

      const result = JSON.parse(response.data.response);
      return result;
    } catch (error) {
      console.log('Ollama not available, falling back to rule-based analysis');
      return FreeAnalyzer.analyzeTechItem(item);
    }
  }
}
*/
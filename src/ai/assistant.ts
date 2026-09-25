import { db } from "../storage/database";
import { TechItem } from "../types";

/**
 * Developer Assistant - Integrates TechRadar discoveries into your daily coding
 */
export class CodeAssistant {
  /**
   * Get recommendations for a specific problem you're trying to solve
   * @example
   * const suggestions = await assistant.getSuggestions("performance optimization node.js")
   */
  static async getSuggestions(problem: string): Promise<TechItem[]> {
    const results = await db.searchItems(problem, 5);
    console.log(`\n💡 Found ${results.length} solutions for "${problem}":\n`);

    results.forEach((item) => {
      console.log(`📦 ${item.title}`);
      console.log(`   ${item.description}`);
      console.log(`   🔗 ${item.url}`);
      if (item.aiSummary) console.log(`   💬 ${item.aiSummary}`);
      console.log();
    });

    return results;
  }

  /**
   * Get backend-specific libraries and frameworks
   */
  static getBackendTrends(): Promise<TechItem[]> {
    return db.getItemsByCategory("backend", 10);
  }

  /**
   * Get DevOps tools relevant to your infrastructure
   */
  static getDevOpsTrends(): Promise<TechItem[]> {
    return db.getItemsByCategory("devops", 10);
  }

  /**
   * Get AI/ML tools you might integrate
   */
  static getAIMachineLearning(): Promise<TechItem[]> {
    return db.getItemsByCategory("ai-ml", 10);
  }

  /**
   * Get full-stack technologies for side projects
   */
  static getFullStackTrends(): Promise<TechItem[]> {
    return db.getItemsByCategory("full-stack", 10);
  }

  /**
   * Find alternatives to what you're currently using
   * @example
   * const alternatives = await assistant.findAlternatives("express.js")
   */
  static findAlternatives(technology: string): Promise<TechItem[]> {
    const query = `${technology} alternative framework`;
    return db.searchItems(query, 5);
  }

  /**
   * Get your starred items (things you found interesting)
   */
  static async getStarredDiscoveries(): Promise<TechItem[]> {
    return (await db.getStarredItems(20)).items;
  }

  /**
   * Generate a quick learning path based on a topic
   * @example
   * const path = await assistant.generateLearningPath("microservices")
   */
  static async generateLearningPath(topic: string): Promise<TechItem[]> {
    const related = await db.searchItems(topic, 20);
    // Sort by relevance score (highest first)
    return related.sort((a: TechItem, b: TechItem) => b.relevanceScore - a.relevanceScore);
  }
}

/**
 * Use in your project:
 *
 * // In your code when you need help
 * import { CodeAssistant } from './ai/assistant'
 *
 * // When debugging performance issues
 * const perfSolutions = await CodeAssistant.getSuggestions('postgres query optimization')
 *
 * // When planning new features
 * const backendTools = await CodeAssistant.getBackendTrends()
 *
 * // When choosing between options
 * const alternatives = await CodeAssistant.findAlternatives('fastify')
 *
 * // When learning something new
 * const learnPath = await CodeAssistant.generateLearningPath('kubernetes')
 */

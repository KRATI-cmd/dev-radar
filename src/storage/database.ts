import Database from "better-sqlite3";
import path from "path";
import { TechItem, UserPreferences } from "../types";

const dbPath = path.join(process.cwd(), "data", "techradar.db");

export class TechRadarDB {
  private db: Database.Database;

  constructor() {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tech_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        relevanceScore REAL DEFAULT 0,
        stars INTEGER,
        weeklyDownloads INTEGER,
        language TEXT,
        aiSummary TEXT,
        collectedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        analyzedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS digests (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        generatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        itemIds TEXT,
        trends TEXT,
        insights TEXT,
        filePath TEXT
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS starred_items (
        itemId TEXT PRIMARY KEY,
        starrableAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(itemId) REFERENCES tech_items(id)
      );

      CREATE TABLE IF NOT EXISTS dismissed_items (
        itemId TEXT PRIMARY KEY,
        dismissedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(itemId) REFERENCES tech_items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_category ON tech_items(category);
      CREATE INDEX IF NOT EXISTS idx_source ON tech_items(source);
      CREATE INDEX IF NOT EXISTS idx_collected ON tech_items(collectedAt);
    `);
  }

  insertItem(item: TechItem): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tech_items
      (id, title, description, url, source, category, tags, relevanceScore,
       stars, weeklyDownloads, language, aiSummary, analyzedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.title,
      item.description,
      item.url,
      item.source,
      item.category,
      JSON.stringify(item.tags),
      item.relevanceScore,
      item.stars ?? null,
      item.weeklyDownloads ?? null,
      item.language ?? null,
      item.aiSummary ?? null,
      item.analyzedAt ? new Date(item.analyzedAt).toISOString() : null
    );
  }

  getItemsByCategory(category: string, limit = 20): TechItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tech_items
      WHERE category = ? AND id NOT IN (SELECT itemId FROM dismissed_items)
      ORDER BY relevanceScore DESC, collectedAt DESC
      LIMIT ?
    `);

    const rows = stmt.all(category, limit) as any[];
    return rows.map(this.rowToItem);
  }

  getRecentItems(hours = 24, limit = 50): TechItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tech_items
      WHERE collectedAt > datetime('now', '-' || ? || ' hours')
      AND id NOT IN (SELECT itemId FROM dismissed_items)
      ORDER BY relevanceScore DESC, collectedAt DESC
      LIMIT ?
    `);

    const rows = stmt.all(hours, limit) as any[];
    return rows.map(this.rowToItem);
  }

  searchItems(query: string, limit = 20): TechItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tech_items
      WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?)
      AND id NOT IN (SELECT itemId FROM dismissed_items)
      ORDER BY relevanceScore DESC
      LIMIT ?
    `);

    const searchTerm = `%${query}%`;
    const rows = stmt.all(searchTerm, searchTerm, searchTerm, limit) as any[];
    return rows.map(this.rowToItem);
  }

  starItem(itemId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO starred_items (itemId) VALUES (?)
    `).run(itemId);
  }

  dismissItem(itemId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO dismissed_items (itemId) VALUES (?)
    `).run(itemId);
  }

  getAllItems(opts: {
    category?: string;
    source?: string;
    language?: string;
    search?: string;
    includeDismissed?: boolean;
    limit?: number;
    offset?: number;
  } = {}): { items: (TechItem & { starred: boolean })[]; total: number } {
    const { category, source, language, search, includeDismissed = false, limit = 20, offset = 0 } = opts;
    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      conditions.push("ti.category = ?");
      params.push(category);
    }
    if (source) {
      conditions.push("ti.source = ?");
      params.push(source);
    }
    if (language) {
      conditions.push("ti.language = ?");
      params.push(language);
    }
    if (search) {
      conditions.push("(ti.title LIKE ? OR ti.description LIKE ? OR ti.tags LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (!includeDismissed) {
      conditions.push("ti.id NOT IN (SELECT itemId FROM dismissed_items)");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = (
      this.db.prepare(`SELECT COUNT(*) as c FROM tech_items ti ${where}`).get(...params) as any
    ).c;

    const stmt = this.db.prepare(`
      SELECT ti.*, CASE WHEN si.itemId IS NOT NULL THEN 1 ELSE 0 END as starred
      FROM tech_items ti
      LEFT JOIN starred_items si ON ti.id = si.itemId
      ${where}
      ORDER BY ti.relevanceScore DESC, ti.collectedAt DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as any[];
    const items = rows.map((row) => ({ ...this.rowToItem(row), starred: !!row.starred }));

    return { items, total };
  }

  getDistinctLanguages(): string[] {
    const rows = this.db
      .prepare(`SELECT DISTINCT language FROM tech_items WHERE language IS NOT NULL ORDER BY language`)
      .all() as any[];
    return rows.map((r) => r.language);
  }

  listDigests(limit = 20): { id: string; type: string; generatedAt: string; filePath: string }[] {
    return this.db
      .prepare(`SELECT id, type, generatedAt, filePath FROM digests ORDER BY generatedAt DESC LIMIT ?`)
      .all(limit) as any[];
  }

  unstarItem(itemId: string): void {
    this.db.prepare(`DELETE FROM starred_items WHERE itemId = ?`).run(itemId);
  }

  getStats(): {
    totalItems: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    starredCount: number;
    dismissedCount: number;
    digestCount: number;
  } {
    const totalItems = (this.db.prepare(`SELECT COUNT(*) as c FROM tech_items`).get() as any).c;
    const byCategoryRows = this.db.prepare(`SELECT category, COUNT(*) as c FROM tech_items GROUP BY category`).all() as any[];
    const bySourceRows = this.db.prepare(`SELECT source, COUNT(*) as c FROM tech_items GROUP BY source`).all() as any[];
    const starredCount = (this.db.prepare(`SELECT COUNT(*) as c FROM starred_items`).get() as any).c;
    const dismissedCount = (this.db.prepare(`SELECT COUNT(*) as c FROM dismissed_items`).get() as any).c;
    const digestCount = (this.db.prepare(`SELECT COUNT(*) as c FROM digests`).get() as any).c;

    return {
      totalItems,
      byCategory: Object.fromEntries(byCategoryRows.map((r) => [r.category, r.c])),
      bySource: Object.fromEntries(bySourceRows.map((r) => [r.source, r.c])),
      starredCount,
      dismissedCount,
      digestCount,
    };
  }

  getStarredItems(limit = 50, offset = 0): { items: TechItem[]; total: number } {
    const total = (
      this.db.prepare(`SELECT COUNT(*) as c FROM starred_items`).get() as any
    ).c;

    const stmt = this.db.prepare(`
      SELECT ti.* FROM tech_items ti
      INNER JOIN starred_items si ON ti.id = si.itemId
      ORDER BY si.starrableAt DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    return { items: rows.map(this.rowToItem), total };
  }

  saveDigest(digestId: string, type: string, itemIds: string[], trends: string[], insights: string[], filePath: string): void {
    this.db.prepare(`
      INSERT INTO digests (id, type, itemIds, trends, insights, filePath)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      digestId,
      type,
      JSON.stringify(itemIds),
      JSON.stringify(trends),
      JSON.stringify(insights),
      filePath
    );
  }

  getLatestDigest(type?: string): any {
    const query = type
      ? `SELECT * FROM digests WHERE type = ? ORDER BY generatedAt DESC LIMIT 1`
      : `SELECT * FROM digests ORDER BY generatedAt DESC LIMIT 1`;

    const stmt = this.db.prepare(query);
    return type ? stmt.get(type) : stmt.get();
  }

  private rowToItem(row: any): TechItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      source: row.source,
      category: row.category,
      tags: JSON.parse(row.tags || "[]"),
      relevanceScore: row.relevanceScore,
      stars: row.stars,
      weeklyDownloads: row.weeklyDownloads,
      language: row.language,
      collectedAt: new Date(row.collectedAt),
      analyzedAt: row.analyzedAt ? new Date(row.analyzedAt) : undefined,
      aiSummary: row.aiSummary,
    };
  }

  close(): void {
    this.db.close();
  }
}

export const db = new TechRadarDB();

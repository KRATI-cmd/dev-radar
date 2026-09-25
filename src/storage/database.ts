import { createClient, Client } from "@libsql/client";
import fs from "fs";
import path from "path";
import { TechItem } from "../types";

// Local dev uses data/techradar.db. On Vercel, TURSO_DATABASE_URL/TOKEN give
// persistent storage; without them we fall back to /tmp (the only writable
// path there), which is wiped on cold starts but re-seeded so the app still
// shows data.
function resolveDbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) {
    console.warn("⚠️ TURSO_DATABASE_URL not set: using temporary /tmp database (data resets on cold starts)");
    return "file:/tmp/techradar.db";
  }
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "techradar.db")}`;
}

const url = resolveDbUrl();
const authToken = process.env.TURSO_AUTH_TOKEN;

export class TechRadarDB {
  private client: Client;
  private ready: Promise<void>;

  constructor() {
    this.client = createClient(authToken ? { url, authToken } : { url });
    this.ready = this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    await this.client.executeMultiple(`
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
        filePath TEXT,
        markdownContent TEXT,
        htmlContent TEXT
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

    // Databases created before digest content moved into the DB lack these columns.
    const cols = await this.client.execute(`PRAGMA table_info(digests)`);
    const existing = new Set(cols.rows.map((r: any) => r.name as string));
    for (const col of ["markdownContent", "htmlContent"]) {
      if (!existing.has(col)) {
        await this.client.execute(`ALTER TABLE digests ADD COLUMN ${col} TEXT`);
      }
    }

    await this.seedIfEmpty();
  }

  // Loads seed/items.json into an empty database so a fresh deploy shows data
  // before the first cron collection has run.
  private async seedIfEmpty(): Promise<void> {
    const countRs = await this.client.execute(`SELECT COUNT(*) as c FROM tech_items`);
    if (Number((countRs.rows[0] as any).c) > 0) return;

    const seedPath = path.join(process.cwd(), "seed", "items.json");
    if (!fs.existsSync(seedPath)) return;

    const items: TechItem[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    await this.client.batch(
      items.map((item) => ({
        sql: `
          INSERT OR IGNORE INTO tech_items
          (id, title, description, url, source, category, tags, relevanceScore,
           stars, weeklyDownloads, language, aiSummary)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          item.id,
          item.title,
          item.description,
          item.url,
          item.source,
          item.category,
          JSON.stringify(item.tags ?? []),
          item.relevanceScore,
          item.stars ?? null,
          item.weeklyDownloads ?? null,
          item.language ?? null,
          item.aiSummary ?? null,
        ],
      })),
      "write"
    );
    console.log(`🌱 Seeded database with ${items.length} starter items`);
  }

  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  async insertItem(item: TechItem): Promise<void> {
    await this.ensureReady();
    await this.client.execute({
      sql: `
        INSERT OR REPLACE INTO tech_items
        (id, title, description, url, source, category, tags, relevanceScore,
         stars, weeklyDownloads, language, aiSummary, analyzedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
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
        item.analyzedAt ? new Date(item.analyzedAt).toISOString() : null,
      ],
    });
  }

  async getItemsByCategory(category: string, limit = 20): Promise<TechItem[]> {
    await this.ensureReady();
    const rs = await this.client.execute({
      sql: `
        SELECT * FROM tech_items
        WHERE category = ? AND id NOT IN (SELECT itemId FROM dismissed_items)
        ORDER BY relevanceScore DESC, collectedAt DESC
        LIMIT ?
      `,
      args: [category, limit],
    });
    return rs.rows.map(this.rowToItem);
  }

  async getRecentItems(hours = 24, limit = 50): Promise<TechItem[]> {
    await this.ensureReady();
    const rs = await this.client.execute({
      sql: `
        SELECT * FROM tech_items
        WHERE collectedAt > datetime('now', '-' || ? || ' hours')
        AND id NOT IN (SELECT itemId FROM dismissed_items)
        ORDER BY relevanceScore DESC, collectedAt DESC
        LIMIT ?
      `,
      args: [hours, limit],
    });
    return rs.rows.map(this.rowToItem);
  }

  async searchItems(query: string, limit = 20): Promise<TechItem[]> {
    await this.ensureReady();
    const term = `%${query}%`;
    const rs = await this.client.execute({
      sql: `
        SELECT * FROM tech_items
        WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?)
        AND id NOT IN (SELECT itemId FROM dismissed_items)
        ORDER BY relevanceScore DESC
        LIMIT ?
      `,
      args: [term, term, term, limit],
    });
    return rs.rows.map(this.rowToItem);
  }

  async starItem(itemId: string): Promise<void> {
    await this.ensureReady();
    await this.client.execute({
      sql: `INSERT OR IGNORE INTO starred_items (itemId) VALUES (?)`,
      args: [itemId],
    });
  }

  async dismissItem(itemId: string): Promise<void> {
    await this.ensureReady();
    await this.client.execute({
      sql: `INSERT OR IGNORE INTO dismissed_items (itemId) VALUES (?)`,
      args: [itemId],
    });
  }

  async unstarItem(itemId: string): Promise<void> {
    await this.ensureReady();
    await this.client.execute({
      sql: `DELETE FROM starred_items WHERE itemId = ?`,
      args: [itemId],
    });
  }

  async getAllItems(opts: {
    category?: string;
    source?: string;
    language?: string;
    search?: string;
    includeDismissed?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: (TechItem & { starred: boolean })[]; total: number }> {
    await this.ensureReady();
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

    const countRs = await this.client.execute({
      sql: `SELECT COUNT(*) as c FROM tech_items ti ${where}`,
      args: params,
    });
    const total = Number(countRs.rows[0].c);

    const rs = await this.client.execute({
      sql: `
        SELECT ti.*, CASE WHEN si.itemId IS NOT NULL THEN 1 ELSE 0 END as starred
        FROM tech_items ti
        LEFT JOIN starred_items si ON ti.id = si.itemId
        ${where}
        ORDER BY ti.relevanceScore DESC, ti.collectedAt DESC
        LIMIT ? OFFSET ?
      `,
      args: [...params, limit, offset],
    });

    const items = rs.rows.map((row: any) => ({ ...this.rowToItem(row), starred: !!Number(row.starred) }));
    return { items, total };
  }

  async getDistinctLanguages(): Promise<string[]> {
    await this.ensureReady();
    const rs = await this.client.execute(
      `SELECT DISTINCT language FROM tech_items WHERE language IS NOT NULL ORDER BY language`
    );
    return rs.rows.map((r: any) => r.language as string);
  }

  async listDigests(limit = 20): Promise<{ id: string; type: string; generatedAt: string; filePath: string }[]> {
    await this.ensureReady();
    const rs = await this.client.execute({
      sql: `SELECT id, type, generatedAt, filePath FROM digests ORDER BY generatedAt DESC LIMIT ?`,
      args: [limit],
    });
    return rs.rows as any[];
  }

  async getDigestContent(id: string): Promise<{ markdownContent: string | null; htmlContent: string | null } | null> {
    await this.ensureReady();
    const rs = await this.client.execute({
      sql: `SELECT markdownContent, htmlContent FROM digests WHERE id = ?`,
      args: [id],
    });
    if (rs.rows.length === 0) return null;
    const row = rs.rows[0] as any;
    return { markdownContent: row.markdownContent, htmlContent: row.htmlContent };
  }

  async getStats(): Promise<{
    totalItems: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    starredCount: number;
    dismissedCount: number;
    digestCount: number;
  }> {
    await this.ensureReady();
    const [totalRs, byCategoryRs, bySourceRs, starredRs, dismissedRs, digestRs] = await Promise.all([
      this.client.execute(`SELECT COUNT(*) as c FROM tech_items`),
      this.client.execute(`SELECT category, COUNT(*) as c FROM tech_items GROUP BY category`),
      this.client.execute(`SELECT source, COUNT(*) as c FROM tech_items GROUP BY source`),
      this.client.execute(`SELECT COUNT(*) as c FROM starred_items`),
      this.client.execute(`SELECT COUNT(*) as c FROM dismissed_items`),
      this.client.execute(`SELECT COUNT(*) as c FROM digests`),
    ]);

    return {
      totalItems: Number((totalRs.rows[0] as any).c),
      byCategory: Object.fromEntries(byCategoryRs.rows.map((r: any) => [r.category, Number(r.c)])),
      bySource: Object.fromEntries(bySourceRs.rows.map((r: any) => [r.source, Number(r.c)])),
      starredCount: Number((starredRs.rows[0] as any).c),
      dismissedCount: Number((dismissedRs.rows[0] as any).c),
      digestCount: Number((digestRs.rows[0] as any).c),
    };
  }

  async getStarredItems(limit = 50, offset = 0): Promise<{ items: TechItem[]; total: number }> {
    await this.ensureReady();
    const countRs = await this.client.execute(`SELECT COUNT(*) as c FROM starred_items`);
    const total = Number((countRs.rows[0] as any).c);

    const rs = await this.client.execute({
      sql: `
        SELECT ti.* FROM tech_items ti
        INNER JOIN starred_items si ON ti.id = si.itemId
        ORDER BY si.starrableAt DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    return { items: rs.rows.map(this.rowToItem), total };
  }

  async saveDigest(
    digestId: string,
    type: string,
    itemIds: string[],
    trends: string[],
    insights: string[],
    filePath: string,
    markdownContent?: string,
    htmlContent?: string
  ): Promise<void> {
    await this.ensureReady();
    await this.client.execute({
      sql: `
        INSERT INTO digests (id, type, itemIds, trends, insights, filePath, markdownContent, htmlContent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        digestId,
        type,
        JSON.stringify(itemIds),
        JSON.stringify(trends),
        JSON.stringify(insights),
        filePath,
        markdownContent ?? null,
        htmlContent ?? null,
      ],
    });
  }

  async getLatestDigest(type?: string): Promise<any> {
    await this.ensureReady();
    const rs = type
      ? await this.client.execute({ sql: `SELECT * FROM digests WHERE type = ? ORDER BY generatedAt DESC LIMIT 1`, args: [type] })
      : await this.client.execute(`SELECT * FROM digests ORDER BY generatedAt DESC LIMIT 1`);
    return rs.rows[0];
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
    this.client.close();
  }
}

export const db = new TechRadarDB();

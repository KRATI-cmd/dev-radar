import express, { Request, Response, NextFunction } from "express";
import { db } from "../storage/database";

/**
 * The dashboard's API, shared by two entry points:
 *  - src/web/server.ts  (local dev: adds static file serving + app.listen)
 *  - api/index.ts       (Vercel: exported as a serverless function; Vercel
 *                        serves public/ itself)
 */
export const app = express();

app.use(express.json());

const PAGE_SIZE_DEFAULT = 12;

// Wraps async route handlers so rejected promises reach Express's error handler
// instead of crashing the serverless function / hanging the request.
const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

function paging(query: Request["query"]) {
  const limit = query.pageSize ? Math.max(1, Number(query.pageSize)) : PAGE_SIZE_DEFAULT;
  const page = query.page ? Math.max(1, Number(query.page)) : 1;
  return { limit, page, offset: (page - 1) * limit };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

app.get(
  "/api/items",
  asyncRoute(async (req, res) => {
    const { limit, page, offset } = paging(req.query);
    const { items, total } = await db.getAllItems({
      category: str(req.query.category),
      source: str(req.query.source),
      language: str(req.query.language),
      search: str(req.query.search),
      includeDismissed: req.query.includeDismissed === "true",
      limit,
      offset,
    });

    res.json({ items, total, page, pageSize: limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  })
);

app.get(
  "/api/languages",
  asyncRoute(async (req, res) => {
    res.json(await db.getDistinctLanguages());
  })
);

app.get(
  "/api/starred",
  asyncRoute(async (req, res) => {
    const { limit, page, offset } = paging(req.query);
    const { items, total } = await db.getStarredItems(limit, offset);

    res.json({
      items: items.map((item) => ({ ...item, starred: true })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

app.get(
  "/api/stats",
  asyncRoute(async (req, res) => {
    res.json(await db.getStats());
  })
);

app.get(
  "/api/digests",
  asyncRoute(async (req, res) => {
    res.json(await db.listDigests(50));
  })
);

// Digest content is served from the database rather than the filesystem so
// it works on Vercel, where output/ files don't persist between invocations.
app.get(
  "/api/digests/:id/html",
  asyncRoute(async (req, res) => {
    const content = await db.getDigestContent(String(req.params.id));
    if (!content?.htmlContent) {
      res.status(404).send("Digest not found");
      return;
    }
    res.type("html").send(content.htmlContent);
  })
);

app.get(
  "/api/digests/:id/markdown",
  asyncRoute(async (req, res) => {
    const content = await db.getDigestContent(String(req.params.id));
    if (!content?.markdownContent) {
      res.status(404).send("Digest not found");
      return;
    }
    res.type("text/markdown").send(content.markdownContent);
  })
);

app.post(
  "/api/items/:id/star",
  asyncRoute(async (req, res) => {
    await db.starItem(String(req.params.id));
    res.json({ ok: true });
  })
);

app.delete(
  "/api/items/:id/star",
  asyncRoute(async (req, res) => {
    await db.unstarItem(String(req.params.id));
    res.json({ ok: true });
  })
);

app.post(
  "/api/items/:id/dismiss",
  asyncRoute(async (req, res) => {
    await db.dismissItem(String(req.params.id));
    res.json({ ok: true });
  })
);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("API error:", err);
  res.status(500).json({ error: "Internal server error" });
});

import express from "express";
import path from "path";
import { db } from "../storage/database";

const app = express();
const PORT = Number(process.env.PORT) || 4173;

app.use(express.json());

// Saved digest .md/.html files, so the dashboard can link straight to them
app.use("/digests", express.static(path.join(process.cwd(), "output")));

const PAGE_SIZE_DEFAULT = 12;

app.get("/api/items", (req, res) => {
  const { category, source, language, search, includeDismissed, page, pageSize } = req.query;
  const limit = pageSize ? Math.max(1, Number(pageSize)) : PAGE_SIZE_DEFAULT;
  const pageNum = page ? Math.max(1, Number(page)) : 1;

  const { items, total } = db.getAllItems({
    category: typeof category === "string" && category ? category : undefined,
    source: typeof source === "string" && source ? source : undefined,
    language: typeof language === "string" && language ? language : undefined,
    search: typeof search === "string" && search ? search : undefined,
    includeDismissed: includeDismissed === "true",
    limit,
    offset: (pageNum - 1) * limit,
  });

  res.json({
    items,
    total,
    page: pageNum,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

app.get("/api/languages", (req, res) => {
  res.json(db.getDistinctLanguages());
});

app.get("/api/starred", (req, res) => {
  const { page, pageSize } = req.query;
  const limit = pageSize ? Math.max(1, Number(pageSize)) : PAGE_SIZE_DEFAULT;
  const pageNum = page ? Math.max(1, Number(page)) : 1;

  const { items, total } = db.getStarredItems(limit, (pageNum - 1) * limit);

  res.json({
    items: items.map((item) => ({ ...item, starred: true })),
    total,
    page: pageNum,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

app.get("/api/stats", (req, res) => {
  res.json(db.getStats());
});

app.get("/api/digests", (req, res) => {
  res.json(db.listDigests(50));
});

app.post("/api/items/:id/star", (req, res) => {
  db.starItem(req.params.id);
  res.json({ ok: true });
});

app.delete("/api/items/:id/star", (req, res) => {
  db.unstarItem(req.params.id);
  res.json({ ok: true });
});

app.post("/api/items/:id/dismiss", (req, res) => {
  db.dismissItem(req.params.id);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🌐 TechRadar dashboard running at http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

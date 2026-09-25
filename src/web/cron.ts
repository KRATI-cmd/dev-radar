import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Wraps a task as a Vercel Cron handler. Vercel sends
 * `Authorization: Bearer $CRON_SECRET` on scheduled invocations when the
 * CRON_SECRET env var is set; anything else is rejected so random visitors
 * can't trigger collection runs (which can cost Claude API credits).
 */
export function cronHandler(name: string, task: () => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      res.status(500).json({ error: "CRON_SECRET is not configured" });
      return;
    }
    if (req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const started = Date.now();
    try {
      await task();
      res.status(200).json({ ok: true, task: name, durationMs: Date.now() - started });
    } catch (error) {
      console.error(`Cron task ${name} failed:`, error);
      res.status(500).json({ ok: false, task: name, error: String(error) });
    }
  };
}

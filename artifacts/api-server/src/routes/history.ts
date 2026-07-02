import { Router } from "express";
import type { Request, Response } from "express";
import { db, historyTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { AddHistoryRecordBody, DeleteHistoryRecordParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const records = await db.select().from(historyTable).orderBy(desc(historyTable.createdAt)).limit(500);
    const result = records.map((r) => ({
      id: r.id,
      satellite: r.satellite,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      altitude: r.altitude,
      timestamp: r.timestamp,
      createdAt: r.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get history");
    res.status(500).json({ error: "Failed to get history" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const parse = AddHistoryRecordBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  try {
    const [record] = await db.insert(historyTable).values(parse.data).returning();
    return res.status(201).json({
      id: record.id,
      satellite: record.satellite,
      latitude: record.latitude,
      longitude: record.longitude,
      country: record.country,
      altitude: record.altitude,
      timestamp: record.timestamp,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add history record");
    return res.status(500).json({ error: "Failed to add history record" });
  }
});

router.delete("/clear", async (req: Request, res: Response): Promise<void> => {
  try {
    await db.delete(historyTable);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to clear history");
    res.status(500).json({ error: "Failed to clear history" });
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const parse = DeleteHistoryRecordParams.safeParse({ id: Number(req.params.id) });
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(historyTable).where(eq(historyTable.id, parse.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete history record");
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;

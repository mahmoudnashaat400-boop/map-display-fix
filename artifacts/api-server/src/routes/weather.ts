import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/kp", async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
    const data = await response.json() as string[][];
    let kpIndex = 2.0;
    if (Array.isArray(data) && data.length > 1) {
      const last = data[data.length - 1];
      if (last && last[1]) kpIndex = parseFloat(last[1]) || 2.0;
    }
    let status = "QUIET";
    if (kpIndex >= 6) status = "STORM!";
    else if (kpIndex >= 4) status = "MODERATE";
    const tecValue = kpIndex >= 4
      ? 25 - Math.abs(13 - new Date().getUTCHours()) * 2 + kpIndex * 1.5
      : 5 + kpIndex * 1.5;
    const freqHz = 145.800e6;
    const pathDelayM = (40.3 * tecValue * 1e16) / (freqHz * freqHz);
    const ionoDelayNs = (pathDelayM / 299792458) * 1e9;
    res.json({ kpIndex, status, tecValue: Math.max(0, tecValue), ionoDelayNs });
  } catch (err) {
    req.log.warn({ err }, "Failed to fetch Kp index, using defaults");
    res.json({ kpIndex: 2.0, status: "QUIET", tecValue: 8.0, ionoDelayNs: 2.5 });
  }
});

export default router;

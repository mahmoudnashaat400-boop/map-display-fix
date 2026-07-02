import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
  const cleanIp = ip.replace(/^::ffff:/, "");
  const isLocal = cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp.startsWith("192.168") || cleanIp.startsWith("10.");
  if (isLocal) {
    return res.json({ lat: 30.0444, lon: 31.2357, city: "Cairo", country: "Egypt", known: true });
  }
  try {
    const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=lat,lon,city,country,status`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("ip-api failed");
    const data = await response.json() as { lat: number; lon: number; city: string; country: string; status: string };
    if (data.status !== "success") throw new Error("ip-api returned fail");
    return res.json({ lat: data.lat, lon: data.lon, city: data.city, country: data.country, known: true });
  } catch (err) {
    req.log.warn({ err }, "Failed to get user location");
    return res.json({ lat: 0, lon: 0, city: "Unknown", country: "Unknown", known: false });
  }
});

export default router;

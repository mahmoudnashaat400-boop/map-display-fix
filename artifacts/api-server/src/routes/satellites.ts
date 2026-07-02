import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

const ISS_ALT_KM = 408.0;
const CSS_ALT_KM = 390.0;
const EARTH_R_KM = 6371.0;

function guessCountry(lat: number, lon: number): string {
  if (lat > 70) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";
  if (lat > 24 && lat < 49.5 && lon > -125 && lon < -66) return "United States";
  if (lat > 42 && lat < 84 && lon > -141 && lon < -52) return "Canada";
  if (lat > 17.5 && lat < 53.5 && lon > 73 && lon < 135.5) return "China";
  if (lat > 54 && lat < 82 && lon > 19 && lon < 180) return "Russia";
  if (lat > 7 && lat < 37.5 && lon > 67 && lon < 97.5) return "India";
  if (lat > 30 && lat < 46 && lon > 130 && lon < 146) return "Japan";
  if (lat > 49.5 && lat < 61 && lon > -8 && lon < 2) return "United Kingdom";
  if (lat > 41 && lat < 51.5 && lon > -5.5 && lon < 9.6) return "France";
  if (lat > 47 && lat < 55.5 && lon > 5.5 && lon < 15.5) return "Germany";
  if (lat > 36 && lat < 42.5 && lon > 26 && lon < 45) return "Turkey";
  if (lat > -44.5 && lat < -10.5 && lon > 113 && lon < 154) return "Australia";
  if (lat > -34 && lat < 5 && lon > -74 && lon < -34) return "Brazil";
  if (lat > 21.5 && lat < 31.5 && lon > 24.5 && lon < 37.5) return "Egypt";
  if (lat > 36.5 && lat < 42.5 && lon > 52 && lon < 66) return "Turkmenistan";
  if (lat > 20 && lat < 38 && lon > 60 && lon < 77.5) return "Pakistan";
  if (lat > -8 && lat < 6.5 && lon > 95 && lon < 141.5) return "Indonesia";
  if (lat > 14.5 && lat < 23.5 && lon > -3.5 && lon < 4.5) return "Mali";
  if (lat > 0 && lat < 15.5 && lon > 24.5 && lon < 37.5) return "Sudan";
  if (lat > 66.5) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";
  if (lon >= -70 && lon < 20) return "Atlantic Ocean";
  if (lon >= 20 && lon < 147) return "Indian Ocean";
  return "Pacific Ocean";
}

router.get("/iss", async (req: Request, res: Response) => {
  const N2YO_API_KEY = "JYRTWC-7FBHWL-5PBWKR-5S9Y";
  const ISS_NORAD_ID = "25544";
  try {
    const url = `https://api.n2yo.com/rest/v1/satellite/positions/${ISS_NORAD_ID}/0/0/0/1/&apiKey=${N2YO_API_KEY}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "SatelliteTrackerWeb/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`n2yo returned ${response.status}`);
    const data = await response.json() as {
      positions: Array<{ satlatitude: number; satlongitude: number; sataltitude: number }>;
      info: { satname: string; satid: number };
    };
    if (!data.positions || data.positions.length === 0) throw new Error("No positions returned");
    const pos = data.positions[0];
    const country = guessCountry(pos.satlatitude, pos.satlongitude);
    res.json({
      id: "ISS",
      name: "ISS",
      latitude: pos.satlatitude,
      longitude: pos.satlongitude,
      altitude: pos.sataltitude,
      velocity: 7.66,
      timestamp: Math.floor(Date.now() / 1000),
      country,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ISS position");
    res.status(502).json({ error: "Failed to fetch ISS position" });
  }
});

router.get("/css", async (req: Request, res: Response) => {
  const N2YO_API_KEY = "JYRTWC-7FBHWL-5PBWKR-5S9Y";
  const CSS_NORAD_ID = "48274";
  try {
    const url = `https://api.n2yo.com/rest/v1/satellite/positions/${CSS_NORAD_ID}/0/0/0/1/&apiKey=${N2YO_API_KEY}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "SatelliteTrackerWeb/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`n2yo returned ${response.status}`);
    const data = await response.json() as {
      positions: Array<{ satlatitude: number; satlongitude: number; sataltitude: number; azimuth: number; elevation: number }>;
      info: { satname: string; satid: number; transactionscount: number };
    };
    if (!data.positions || data.positions.length === 0) throw new Error("No positions returned");
    const pos = data.positions[0];
    const country = guessCountry(pos.satlatitude, pos.satlongitude);
    res.json({
      id: "CSS",
      name: "CSS (Tiangong)",
      latitude: pos.satlatitude,
      longitude: pos.satlongitude,
      altitude: pos.sataltitude,
      velocity: 7.68,
      timestamp: Math.floor(Date.now() / 1000),
      country,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch CSS position");
    res.status(502).json({ error: "Failed to fetch CSS position" });
  }
});

export default router;

export const ISS_FREQ_MHZ = 145.800;
export const CSS_FREQ_MHZ = 437.525;
export const ISS_ALT_KM = 408.0;
export const CSS_ALT_KM = 390.0;
export const EARTH_R_KM = 6371.0;
export const SPEED_OF_LIGHT = 299792.458;

export function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function toDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

export function calcCentralAngleRad(obsLat: number, obsLon: number, satLat: number, satLon: number): number {
  const dlat = toRad(satLat - obsLat);
  const dlon = toRad(satLon - obsLon);
  const a = Math.sin(dlat / 2) ** 2
    + Math.cos(toRad(obsLat)) * Math.cos(toRad(satLat)) * Math.sin(dlon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcRangeKm(obsLat: number, obsLon: number, satLat: number, satLon: number, altKm: number): number {
  const ca = calcCentralAngleRad(obsLat, obsLon, satLat, satLon);
  const Re = EARTH_R_KM, h = altKm;
  return Math.sqrt(Re * Re + (Re + h) ** 2 - 2 * Re * (Re + h) * Math.cos(ca));
}

export function calcElevationDeg(obsLat: number, obsLon: number, satLat: number, satLon: number, altKm: number): number {
  const ca = calcCentralAngleRad(obsLat, obsLon, satLat, satLon);
  const Re = EARTH_R_KM, h = altKm;
  return toDeg(Math.atan2(Math.cos(ca) - Re / (Re + h), Math.sin(ca)));
}

export function calcAzimuthDeg(obsLat: number, obsLon: number, satLat: number, satLon: number): number {
  const phi1 = toRad(obsLat);
  const phi2 = toRad(satLat);
  const dl = toRad(satLon - obsLon);
  const y = Math.sin(dl) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function calcFsplDb(rangeKm: number, freqMhz: number): number {
  if (rangeKm <= 0) return 0;
  return 32.44 + 20 * Math.log10(freqMhz) + 20 * Math.log10(rangeKm);
}

export function calcDopplerHz(freqMhz: number, rangeNowKm: number, rangePrevKm: number, dtSec: number): number {
  if (dtSec <= 0) return 0;
  const vRadial = (rangeNowKm - rangePrevKm) / dtSec;
  return -freqMhz * 1e6 * vRadial / SPEED_OF_LIGHT;
}

export function signalQuality(fsplDb: number): string {
  if (fsplDb < 135) return "EXCELLENT";
  if (fsplDb < 140) return "GOOD";
  if (fsplDb < 145) return "FAIR";
  return "WEAK";
}

export function signalBars(fsplDb: number): number {
  if (fsplDb < 135) return 8;
  if (fsplDb < 138) return 6;
  if (fsplDb < 141) return 4;
  if (fsplDb < 144) return 2;
  return 1;
}

export function txRecommendation(elevation: number, passState: string, fsplDb: number, kp: number): { text: string; color: string } {
  if (elevation < 0) return { text: "NO CONTACT", color: "#FF4444" };
  if (kp >= 6) return { text: "STORM - POOR", color: "#FF8800" };
  if (passState === "SETTING") return { text: "FINISH SOON", color: "#FFAA00" };
  if (passState === "PEAK" && fsplDb < 135) return { text: "OPTIMAL WINDOW", color: "#00FF88" };
  if (passState === "RISING") return { text: "TRANSMIT NOW", color: "#00FF88" };
  return { text: "IN RANGE", color: "#88FF88" };
}

export function azToCardinal(az: number): string {
  const cards = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return cards[Math.round(az / 45) % 8];
}

export function getPassState(curEl: number, prevEl: number): string {
  if (curEl < 0) return "NO SIGNAL";
  if (curEl > prevEl + 0.05) return "RISING";
  if (curEl < prevEl - 0.05) return "SETTING";
  return "PEAK";
}

export function mercatorX(lon: number, w: number): number {
  return (lon + 180) * (w / 360);
}

export function mercatorY(lat: number, h: number, w: number): number {
  const r = toRad(lat);
  const n = Math.log(Math.tan(Math.PI / 4 + r / 2));
  return h / 2 - (w * n) / (2 * Math.PI);
}

export interface PredictedPoint {
  lat: number;
  lon: number;
  t: number;
}

export function computePredictions(
  curLat: number, curLon: number,
  prevLat: number, prevLon: number,
  curTime: number, prevTime: number,
  count = 6, stepSec = 600
): PredictedPoint[] {
  const dtBase = curTime - prevTime;
  if (dtBase <= 0) return [];
  const lat1 = toRad(prevLat), lon1 = toRad(prevLon);
  const lat2 = toRad(curLat), lon2 = toRad(curLon);
  const dlat = lat2 - lat1, dlon = lon2 - lon1;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const angDist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const bearing = Math.atan2(Math.sin(dlon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon));
  const angSpd = angDist / dtBase;
  const EARTH_ROT = (2 * Math.PI) / 86164.0905;
  const result: PredictedPoint[] = [];
  for (let i = 0; i < count; i++) {
    const ft = (i + 1) * stepSec;
    const d = angSpd * ft;
    const lat3 = Math.asin(Math.sin(lat2) * Math.cos(d) + Math.cos(lat2) * Math.sin(d) * Math.cos(bearing));
    let lon3 = lon2 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat2), Math.cos(d) - Math.sin(lat2) * Math.sin(lat3));
    lon3 -= EARTH_ROT * ft;
    let lon3d = toDeg(lon3);
    while (lon3d > 180) lon3d -= 360;
    while (lon3d < -180) lon3d += 360;
    result.push({ lat: toDeg(lat3), lon: lon3d, t: curTime + ft });
  }
  return result;
}

export interface LocalPass {
  riseUtc: number;
  peakUtc: number;
  maxElDeg: number;
  durationMin: number;
}

export function satPosAt(
  curLat: number, curLon: number, prevLat: number, prevLon: number,
  curTime: number, prevTime: number, tFuture: number
): { lat: number; lon: number } {
  const dt0 = curTime - prevTime;
  if (dt0 < 1) return { lat: curLat, lon: curLon };
  const lat1 = toRad(prevLat), lon1 = toRad(prevLon);
  const lat2 = toRad(curLat), lon2 = toRad(curLon);
  const dlat = lat2 - lat1, dlon = lon2 - lon1;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const ad = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const br = Math.atan2(Math.sin(dlon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon));
  const spd = ad / dt0;
  const ft = tFuture - curTime;
  const d = spd * ft;
  const lat3 = Math.asin(Math.sin(lat2) * Math.cos(d) + Math.cos(lat2) * Math.sin(d) * Math.cos(br));
  let lon3 = lon2 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat2), Math.cos(d) - Math.sin(lat2) * Math.sin(lat3));
  lon3 -= (2 * Math.PI / 86164.0905) * ft;
  let lon3d = toDeg(lon3);
  while (lon3d > 180) lon3d -= 360;
  while (lon3d < -180) lon3d += 360;
  return { lat: toDeg(lat3), lon: lon3d };
}

export function findPasses(
  curLat: number, curLon: number, prevLat: number, prevLon: number,
  curTime: number, prevTime: number,
  obsLat: number, obsLon: number, altKm: number, maxOut = 5
): LocalPass[] {
  const STEP_S = 30;
  const MIN_ELEV = 5;
  const WINDOW = 86400;
  const passes: LocalPass[] = [];
  let inPass = false;
  let peakEl = -999;
  let riseT = 0, peakT = 0;
  for (let t = curTime; t < curTime + WINDOW && passes.length < maxOut; t += STEP_S) {
    const pos = satPosAt(curLat, curLon, prevLat, prevLon, curTime, prevTime, t);
    const el = calcElevationDeg(obsLat, obsLon, pos.lat, pos.lon, altKm);
    if (!inPass && el >= MIN_ELEV) {
      inPass = true; riseT = t; peakEl = el; peakT = t;
    } else if (inPass && el >= MIN_ELEV) {
      if (el > peakEl) { peakEl = el; peakT = t; }
    } else if (inPass && el < MIN_ELEV) {
      inPass = false;
      passes.push({ riseUtc: riseT, peakUtc: peakT, maxElDeg: peakEl, durationMin: Math.max(1, Math.round((t - riseT) / 60)) });
      peakEl = -999;
    }
  }
  return passes;
}

export function guessCountry(lat: number, lon: number): string {
  if (lat > 24 && lat < 49.5 && lon > -125 && lon < -66) return "United States";
  if (lat > 42 && lat < 84 && lon > -141 && lon < -52) return "Canada";
  if (lat > 54 && lat < 82 && lon > 19 && lon < 180) return "Russia";
  if (lat > 17.5 && lat < 53.5 && lon > 73 && lon < 135.5) return "China";
  if (lat > 7 && lat < 37.5 && lon > 67 && lon < 97.5) return "India";
  if (lat > 30 && lat < 46 && lon > 130 && lon < 146) return "Japan";
  if (lat > 49.5 && lat < 61 && lon > -8 && lon < 2) return "United Kingdom";
  if (lat > 41 && lat < 51.5 && lon > -5.5 && lon < 9.6) return "France";
  if (lat > 47 && lat < 55.5 && lon > 5.5 && lon < 15.5) return "Germany";
  if (lat > -44.5 && lat < -10.5 && lon > 113 && lon < 154) return "Australia";
  if (lat > -34 && lat < 5 && lon > -74 && lon < -34) return "Brazil";
  if (lat > 21.5 && lat < 31.5 && lon > 24.5 && lon < 37.5) return "Egypt";
  if (lat > 36 && lat < 42.5 && lon > 26 && lon < 45) return "Turkey";
  if (lat > 70) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";
  if (lon >= -70 && lon < 20) return "Atlantic Ocean";
  if (lon >= 20 && lon < 147) return "Indian Ocean";
  return "Pacific Ocean";
}

export function formatUtc(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toUTCString().replace(" GMT", " UTC");
}

export function formatUtcTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

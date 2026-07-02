import { useMemo } from "react";
import type { SatellitePosition } from "@workspace/api-client-react";
import { findPasses, ISS_ALT_KM, CSS_ALT_KM } from "@/lib/satmath";

interface Props {
  sat: "iss" | "css";
  current: SatellitePosition | undefined;
  prev: SatellitePosition | undefined;
  obsLat: number;
  obsLon: number;
}

export function NextPassBadge({ sat, current, prev, obsLat, obsLon }: Props) {
  const color = sat === "iss" ? "#FF4444" : "#44FF44";
  const altKm = sat === "iss" ? ISS_ALT_KM : CSS_ALT_KM;

  const nextPass = useMemo(() => {
    if (!current || !prev || current.timestamp === prev.timestamp) return null;
    const passes = findPasses(
      current.latitude, current.longitude,
      prev.latitude, prev.longitude,
      current.timestamp, prev.timestamp,
      obsLat, obsLon, altKm, 1
    );
    return passes[0] ?? null;
  }, [current?.timestamp, prev?.timestamp, obsLat, obsLon]);

  if (!nextPass) return (
    <div className="text-xs font-mono text-gray-600 mt-1">
      Next pass: <span className="text-gray-500">collecting data…</span>
    </div>
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = nextPass.riseUtc - nowSec;
  const inPast = diffSec < 0;
  const displayDiff = inPast
    ? "overhead now"
    : diffSec < 3600
      ? `in ${Math.floor(diffSec / 60)} min`
      : `in ${(diffSec / 3600).toFixed(1)}h`;

  const d = new Date(nextPass.riseUtc * 1000);
  const timeStr = `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`;

  return (
    <div className="text-xs font-mono mt-1 space-y-0.5">
      <div className="flex justify-between">
        <span className="text-gray-500">Next pass</span>
        <span style={{ color }}>{displayDiff}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">{timeStr}</span>
        <span className="text-gray-400">max {nextPass.maxElDeg.toFixed(0)}&deg; · {nextPass.durationMin}min</span>
      </div>
    </div>
  );
}

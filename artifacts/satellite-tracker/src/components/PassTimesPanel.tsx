import { X, Clock } from "lucide-react";
import { useMemo } from "react";
import type { SatellitePosition } from "@workspace/api-client-react";
import { findPasses, ISS_ALT_KM, CSS_ALT_KM, formatUtcTime } from "@/lib/satmath";

interface Props {
  iss: SatellitePosition | undefined;
  prevIss: SatellitePosition | undefined;
  css: SatellitePosition | undefined;
  prevCss: SatellitePosition | undefined;
  userLat: number;
  userLon: number;
  userCity: string;
  onClose: () => void;
}

interface PassRowProps {
  index: number;
  riseUtc: number;
  maxElDeg: number;
  durationMin: number;
  color: string;
}

function PassRow({ index, riseUtc, maxElDeg, durationMin, color }: PassRowProps) {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = riseUtc - nowSec;
  const inPast = diffSec < 0;
  const diffStr = inPast ? "NOW" : diffSec < 3600 ? `+${Math.floor(diffSec / 60)} min` : `+${(diffSec / 3600).toFixed(1)}h`;
  const d = new Date(riseUtc * 1000);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`;

  const elClass = maxElDeg >= 60 ? "HIGH" : maxElDeg >= 30 ? "MED" : "LOW";
  const elColor = maxElDeg >= 60 ? "#00FF88" : maxElDeg >= 30 ? "#FFAA00" : "#888";

  return (
    <div className="rounded p-2 text-xs font-mono space-y-1" style={{ background: color + "0d", border: `1px solid ${color}22` }}>
      <div className="flex items-center justify-between">
        <span className="font-bold" style={{ color }}>#{index}</span>
        <span className="font-bold" style={{ color: inPast ? "#00FF88" : "#AAAACC" }}>{diffStr}</span>
        <span className="text-gray-300">{timeStr}</span>
        <span className="text-gray-500">{dateStr}</span>
      </div>
      <div className="flex items-center justify-between text-gray-400">
        <span>Max El: <span style={{ color: elColor }} className="font-bold">{maxElDeg.toFixed(0)}&deg; {elClass}</span></span>
        <span>Duration: <span className="text-white">{durationMin} min</span></span>
      </div>
    </div>
  );
}

function PassList({ name, color, passes }: { name: string; color: string; passes: ReturnType<typeof findPasses> }) {
  return (
    <div>
      <h3 className="font-mono text-xs font-bold mb-2 border-b pb-1" style={{ color, borderColor: color + "33" }}>
        ── {name} OVERPASSES ──
      </h3>
      {passes.length === 0 ? (
        <p className="text-xs font-mono text-gray-500 py-2">None above 5° elevation in 24h window</p>
      ) : (
        <div className="space-y-1.5">
          {passes.map((p, i) => (
            <PassRow key={i} index={i + 1} riseUtc={p.riseUtc} maxElDeg={p.maxElDeg} durationMin={p.durationMin} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PassTimesPanel({ iss, prevIss, css, prevCss, userLat, userLon, userCity, onClose }: Props) {
  const issPasses = useMemo(() => {
    if (!iss || !prevIss || iss.timestamp === prevIss.timestamp) return [];
    return findPasses(iss.latitude, iss.longitude, prevIss.latitude, prevIss.longitude, iss.timestamp, prevIss.timestamp, userLat, userLon, ISS_ALT_KM, 5);
  }, [iss?.timestamp, prevIss?.timestamp, userLat, userLon]);

  const cssPasses = useMemo(() => {
    if (!css || !prevCss || css.timestamp === prevCss.timestamp) return [];
    return findPasses(css.latitude, css.longitude, prevCss.latitude, prevCss.longitude, css.timestamp, prevCss.timestamp, userLat, userLon, CSS_ALT_KM, 5);
  }, [css?.timestamp, prevCss?.timestamp, userLat, userLon]);

  const hasData = (iss && prevIss && iss.timestamp !== prevIss.timestamp) || (css && prevCss && css.timestamp !== prevCss.timestamp);

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "#0a0e1a", border: "1px solid #1e2a3e" }}>
      <div className="sticky top-0 flex items-center justify-between p-3 border-b border-gray-800 z-10" style={{ background: "#0a0e1a" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-blue-400 font-semibold text-sm">SATELLITE OVERPASSES</span>
        </div>
        <button onClick={onClose} className="p-1 hover:text-white text-gray-400 transition-colors" data-testid="button-close-passes">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-5">
        <div className="text-xs font-mono text-gray-400 border-b border-gray-800 pb-2">
          Observer: <span className="text-white">{userCity}</span>
          {" "}· <span className="text-gray-500">{userLat.toFixed(2)}&deg;, {userLon.toFixed(2)}&deg;</span>
          {" "}· <span className="text-gray-500">min elevation 5&deg;</span>
        </div>

        {!hasData ? (
          <div className="text-xs font-mono text-yellow-500 text-center py-4">
            Collecting velocity data…<br />
            <span className="text-gray-500">Wait ~20 s for the second position fix</span>
          </div>
        ) : (
          <>
            <PassList name="ISS" color="#FF4444" passes={issPasses} />
            <PassList name="CSS (Tiangong)" color="#44FF44" passes={cssPasses} />
          </>
        )}
      </div>
    </div>
  );
}

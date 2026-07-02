import { X, Navigation } from "lucide-react";
import { useMemo } from "react";
import type { SatellitePosition } from "@workspace/api-client-react";
import { computePredictions, guessCountry, formatUtcTime } from "@/lib/satmath";

interface Props {
  sat: "iss" | "css";
  iss: SatellitePosition | undefined;
  prevIss: SatellitePosition | undefined;
  css: SatellitePosition | undefined;
  prevCss: SatellitePosition | undefined;
  onClose: () => void;
}

export function PredictionPanel({ sat, iss, prevIss, css, prevCss, onClose }: Props) {
  const isIss = sat === "iss";
  const color = isIss ? "#FF4444" : "#44FF44";
  const name = isIss ? "ISS" : "CSS (Tiangong)";
  const current = isIss ? iss : css;
  const prev = isIss ? prevIss : prevCss;

  const predictions = useMemo(() => {
    if (!current || !prev || current.timestamp === prev.timestamp) return [];
    return computePredictions(current.latitude, current.longitude, prev.latitude, prev.longitude, current.timestamp, prev.timestamp);
  }, [current?.timestamp, prev?.timestamp]);

  const hasData = current && prev && current.timestamp !== prev.timestamp;

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "#0d1020", border: "1px solid #1e2a3e" }}>
      <div className="sticky top-0 flex items-center justify-between p-3 border-b border-gray-800 z-10" style={{ background: "#0d1020" }}>
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" style={{ color }} />
          <span className="font-mono font-semibold text-sm" style={{ color }}>PATH PREDICTION — {name}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:text-white text-gray-400 transition-colors" data-testid="button-close-prediction">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-2">
        {!hasData ? (
          <div className="text-xs font-mono text-yellow-500 text-center py-6">
            Collecting velocity data…<br />
            <span className="text-gray-500">Wait ~20 s for two position fixes</span>
          </div>
        ) : predictions.length === 0 ? (
          <p className="text-xs font-mono text-gray-500">Unable to compute predictions.</p>
        ) : (
          <>
            <p className="text-xs font-mono text-gray-500 mb-3">Predicted positions (+10 min steps, Earth-rotation corrected)</p>
            {predictions.map((p, i) => {
              const country = guessCountry(p.lat, p.lon);
              const mins = (i + 1) * 10;
              return (
                <div key={i} className="rounded p-2 text-xs font-mono" style={{ background: color + "0d", border: `1px solid ${color}22` }}>
                  <div className="flex justify-between items-center">
                    <span style={{ color }} className="font-bold">#{i + 1}</span>
                    <span className="text-gray-400">+{mins} min</span>
                    <span className="text-white">{formatUtcTime(p.t)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Lat <span className="text-white">{p.lat.toFixed(2)}&deg;</span></span>
                    <span className="text-gray-400">Lon <span className="text-white">{p.lon.toFixed(2)}&deg;</span></span>
                  </div>
                  <div className="mt-1 text-gray-400">{country}</div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

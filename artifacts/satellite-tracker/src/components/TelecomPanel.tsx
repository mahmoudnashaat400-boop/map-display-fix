import { X, Radio } from "lucide-react";
import type { SatellitePosition } from "@workspace/api-client-react";
import type { SpaceWeather } from "@workspace/api-client-react";
import {
  calcRangeKm, calcElevationDeg, calcAzimuthDeg, calcFsplDb, calcDopplerHz,
  signalQuality, signalBars, txRecommendation, azToCardinal, getPassState,
  ISS_FREQ_MHZ, CSS_FREQ_MHZ, ISS_ALT_KM, CSS_ALT_KM
} from "@/lib/satmath";

interface Props {
  iss: SatellitePosition | undefined;
  css: SatellitePosition | undefined;
  prevIss: SatellitePosition | undefined;
  prevCss: SatellitePosition | undefined;
  weather: SpaceWeather | undefined;
  userLat: number;
  userLon: number;
  onClose: () => void;
}

interface CompassProps {
  azimuth: number;
  elevation: number;
  color: string;
  label: string;
}

function Compass({ azimuth, elevation, color, label }: CompassProps) {
  const inRange = elevation >= 0;
  const cx = 50, cy = 50, r = 36;
  const rad = (azimuth - 90) * Math.PI / 180;
  const ex = cx + r * Math.cos(rad);
  const ey = cy + r * Math.sin(rad);
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-mono mb-1" style={{ color }}>{label}</span>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={45} fill={color + "08"} stroke={color + "33"} strokeWidth={1.5} />
        {[0,90,180,270].map((deg, i) => {
          const a = (deg - 90) * Math.PI / 180;
          return <text key={i} x={50 + 38 * Math.cos(a)} y={50 + 38 * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fill="#555" fontSize="8" fontFamily="monospace">{["N","E","S","W"][i]}</text>;
        })}
        <circle cx={50} cy={50} r={3} fill="white" />
        {inRange ? (
          <>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={ex} cy={ey} r={3.5} fill={color} />
          </>
        ) : (
          <text x={50} y={55} textAnchor="middle" fill="#444" fontSize="7" fontFamily="monospace">NO SIGNAL</text>
        )}
      </svg>
    </div>
  );
}

interface SatTelecomProps {
  label: string;
  color: string;
  sat: SatellitePosition | undefined;
  prevSat: SatellitePosition | undefined;
  freqMhz: number;
  altKm: number;
  userLat: number;
  userLon: number;
  kp: number;
}

function SatTelecom({ label, color, sat, prevSat, freqMhz, altKm, userLat, userLon, kp }: SatTelecomProps) {
  if (!sat) return <div className="text-xs font-mono text-gray-500 text-center py-3">No data yet…</div>;

  const rangeNow = calcRangeKm(userLat, userLon, sat.latitude, sat.longitude, altKm);
  const elevation = calcElevationDeg(userLat, userLon, sat.latitude, sat.longitude, altKm);
  const azimuth = calcAzimuthDeg(userLat, userLon, sat.latitude, sat.longitude);
  const fspl = calcFsplDb(rangeNow, freqMhz);
  const quality = signalQuality(fspl);
  const bars = signalBars(fspl);
  const tx = txRecommendation(elevation, "RANGING", fspl, kp);

  // Doppler: need previous snapshot
  let dopplerHz = 0;
  let passState = "---";
  let dopplerDir = "---";
  if (prevSat && prevSat.timestamp !== sat.timestamp) {
    const dt = sat.timestamp - prevSat.timestamp;
    const rangePrev = calcRangeKm(userLat, userLon, prevSat.latitude, prevSat.longitude, altKm);
    dopplerHz = calcDopplerHz(freqMhz, rangeNow, rangePrev, dt);
    const prevEl = calcElevationDeg(userLat, userLon, prevSat.latitude, prevSat.longitude, altKm);
    passState = getPassState(elevation, prevEl);
    dopplerDir = dopplerHz > 100 ? "Approaching" : dopplerHz < -100 ? "Receding" : "Near-peak";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <Compass azimuth={azimuth} elevation={elevation} color={color} label={`${label} AZ`} />
        <div className="flex-1 space-y-1 text-xs font-mono">
          <div className="flex justify-between"><span className="text-gray-500">AZ</span><span style={{ color }}>{azimuth.toFixed(1)}&deg; ({azToCardinal(azimuth)})</span></div>
          <div className="flex justify-between"><span className="text-gray-500">EL</span><span style={{ color }}>{elevation.toFixed(1)}&deg;</span></div>
          <div className="flex justify-between"><span className="text-gray-500">STATUS</span><span style={{ color: elevation >= 0 ? "#44FF88" : "#FF4444" }}>{passState}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">RANGE</span><span className="text-white">{rangeNow.toFixed(0)} km</span></div>
          <div className="flex justify-between">
            <span className="text-gray-500">DOPPLER</span>
            <span className="text-yellow-300">{prevSat ? `${dopplerHz > 0 ? "+" : ""}${dopplerHz.toFixed(0)} Hz` : "collecting…"}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-500">DIR</span><span className="text-yellow-400">{dopplerDir}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">FREQ</span><span className="text-blue-400">{freqMhz.toFixed(3)} MHz</span></div>
          <div className="flex justify-between"><span className="text-gray-500">FSPL</span><span className="text-white">{fspl.toFixed(1)} dB</span></div>
          <div className="flex justify-between">
            <span className="text-gray-500">SIGNAL</span>
            <span style={{ color: quality === "EXCELLENT" ? "#00FF88" : quality === "GOOD" ? "#88FF44" : quality === "FAIR" ? "#FFAA00" : "#FF4444" }}>{quality}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-500">BARS</span><span className="text-green-400">{"█".repeat(bars)}{"░".repeat(8 - bars)}</span></div>
          <div className="flex justify-between pt-1 border-t border-gray-800">
            <span className="text-gray-500">TX</span>
            <span className="font-bold" style={{ color: tx.color }}>{tx.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TelecomPanel({ iss, css, prevIss, prevCss, weather, userLat, userLon, onClose }: Props) {
  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "#0a1a0a", border: "1px solid #1e3a1e" }}>
      <div className="sticky top-0 flex items-center justify-between p-3 border-b border-gray-800 z-10" style={{ background: "#0a1a0a" }}>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-mono text-green-400 font-semibold text-sm">TELECOM &amp; POINTING</span>
        </div>
        <button onClick={onClose} className="p-1 hover:text-white text-gray-400 transition-colors" data-testid="button-close-telecom">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <h3 className="font-mono text-red-400 text-xs font-bold mb-3 border-b border-red-900 pb-1">ISS — {ISS_FREQ_MHZ} MHz</h3>
          <SatTelecom label="ISS" color="#FF4444" sat={iss} prevSat={prevIss} freqMhz={ISS_FREQ_MHZ} altKm={ISS_ALT_KM} userLat={userLat} userLon={userLon} kp={weather?.kpIndex ?? 2} />
        </div>
        <div>
          <h3 className="font-mono text-green-400 text-xs font-bold mb-3 border-b border-green-900 pb-1">CSS (Tiangong) — {CSS_FREQ_MHZ} MHz</h3>
          <SatTelecom label="CSS" color="#44FF44" sat={css} prevSat={prevCss} freqMhz={CSS_FREQ_MHZ} altKm={CSS_ALT_KM} userLat={userLat} userLon={userLon} kp={weather?.kpIndex ?? 2} />
        </div>
        {weather && (
          <div className="border-t border-gray-800 pt-3">
            <h3 className="font-mono text-blue-400 text-xs font-bold mb-2">SPACE WEATHER</h3>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Kp INDEX</span>
                <span style={{ color: weather.kpIndex >= 6 ? "#FF4444" : weather.kpIndex >= 4 ? "#FF8800" : "#44FF44" }}>{weather.kpIndex.toFixed(1)} — {weather.status}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">TEC</span><span className="text-cyan-400">{weather.tecValue.toFixed(1)} TECU</span></div>
              <div className="flex justify-between"><span className="text-gray-500">IONO DELAY</span><span className="text-cyan-400">+{weather.ionoDelayNs.toFixed(1)} ns</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

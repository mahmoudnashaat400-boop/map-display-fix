import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetIssPosition,
  useGetCssPosition,
  useGetKpIndex,
  useGetUserLocation,
  useAddHistoryRecord,
  getGetIssPositionQueryKey,
  getGetCssPositionQueryKey,
  getGetKpIndexQueryKey,
  getGetUserLocationQueryKey,
  getGetHistoryQueryKey,
} from "@workspace/api-client-react";
import type { SatellitePosition } from "@workspace/api-client-react";
import { Map2D } from "@/components/Map2D";
import { Globe3D } from "@/components/Globe3D";
import { SatelliteCard } from "@/components/SatelliteCard";
import { TelecomPanel } from "@/components/TelecomPanel";
import { PassTimesPanel } from "@/components/PassTimesPanel";
import { PredictionPanel } from "@/components/PredictionPanel";
import { HistoryDashboard } from "@/components/HistoryDashboard";
import { NextPassBadge } from "@/components/NextPassBadge";
import { computePredictions } from "@/lib/satmath";
import { Globe, Map, Radio, Clock, Navigation, Filter, Satellite } from "lucide-react";

interface TrailPoint { lat: number; lon: number; ts: number }

const ISS_FACTS = [
  "The ISS orbits Earth about every 90 minutes.",
  "The average altitude of the ISS is 408 km.",
  "The speed of the ISS is ~7.66 km/s (27,000 km/h)!",
  "The ISS orbits Earth over 15 times per day.",
  "The ISS has been continuously inhabited since November 2000.",
  "The ISS is as long as a football field — about 109 meters.",
];

const CSS_FACTS = [
  "Tiangong (CSS) means 'Heavenly Palace'.",
  "It is China's first permanent space station.",
  "Orbiting at around 340–450 km above Earth.",
  "It was fully assembled in late 2022.",
  "Tiangong has three modules: Tianhe, Wentian, and Mengtian.",
  "CSS orbits at ~7.68 km/s — 27,648 km/h.",
];

type Panel = "none" | "telecom" | "passes" | "pass-times" | "predict-iss" | "predict-css";
type MapMode = "2d" | "3d";
type SatFilter = "both" | "iss" | "css";

export default function Home() {
  const [mapMode, setMapMode] = useState<MapMode>("2d");
  const [filter, setFilter] = useState<SatFilter>("both");
  const [activePanel, setActivePanel] = useState<Panel>("none");
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [issTrail, setIssTrail] = useState<TrailPoint[]>([]);
  const [cssTrail, setCssTrail] = useState<TrailPoint[]>([]);

  // ── correct prev-position tracking via refs ──────────────────────────────
  // lastIssRef = the most-recent ISS snapshot we have already stored
  // prevIss    = the snapshot BEFORE the current one (for velocity calcs)
  const lastIssRef = useRef<SatellitePosition | undefined>(undefined);
  const lastCssRef = useRef<SatellitePosition | undefined>(undefined);
  const [prevIss, setPrevIss] = useState<SatellitePosition | undefined>(undefined);
  const [prevCss, setPrevCss] = useState<SatellitePosition | undefined>(undefined);

  const pollCount = useRef(0);
  const queryClient = useQueryClient();

  const { data: iss, isLoading: issLoading } = useGetIssPosition({
    query: { refetchInterval: 10000, queryKey: getGetIssPositionQueryKey() },
  });
  const { data: css, isLoading: cssLoading } = useGetCssPosition({
    query: { refetchInterval: 10000, queryKey: getGetCssPositionQueryKey() },
  });
  const { data: weather } = useGetKpIndex({
    query: { refetchInterval: 180000, queryKey: getGetKpIndexQueryKey() },
  });
  const { data: userLocation } = useGetUserLocation({
    query: { queryKey: getGetUserLocationQueryKey() },
  });
  const addHistory = useAddHistoryRecord();

  // ── ISS position tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (!iss) return;
    setIssTrail(prev => [...prev, { lat: iss.latitude, lon: iss.longitude, ts: iss.timestamp }].slice(-60));
    if (lastIssRef.current && lastIssRef.current.timestamp !== iss.timestamp) {
      // A genuinely new position arrived — old current becomes prev
      setPrevIss(lastIssRef.current);
    }
    lastIssRef.current = iss;
  }, [iss?.timestamp]);

  // ── CSS position tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (!css) return;
    setCssTrail(prev => [...prev, { lat: css.latitude, lon: css.longitude, ts: css.timestamp }].slice(-60));
    if (lastCssRef.current && lastCssRef.current.timestamp !== css.timestamp) {
      setPrevCss(lastCssRef.current);
    }
    lastCssRef.current = css;
  }, [css?.timestamp]);

  // ── auto-save to history every 10 polls (~100 s) ──────────────────────────
  useEffect(() => {
    if (!iss && !css) return;
    pollCount.current += 1;
    if (pollCount.current % 10 !== 0) return;
    if (iss) {
      addHistory.mutate(
        { data: { satellite: "ISS", latitude: iss.latitude, longitude: iss.longitude, country: iss.country, altitude: iss.altitude, timestamp: iss.timestamp } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() }) },
      );
    }
    if (css) {
      addHistory.mutate(
        { data: { satellite: "CSS", latitude: css.latitude, longitude: css.longitude, country: css.country, altitude: css.altitude, timestamp: css.timestamp } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() }) },
      );
    }
  }, [iss?.timestamp, css?.timestamp]);

  // ── derived predictions (need at least 2 distinct snapshots) ─────────────
  const issPredictions = (iss && prevIss && prevIss.timestamp !== iss.timestamp)
    ? computePredictions(iss.latitude, iss.longitude, prevIss.latitude, prevIss.longitude, iss.timestamp, prevIss.timestamp)
    : [];
  const cssPredictions = (css && prevCss && prevCss.timestamp !== css.timestamp)
    ? computePredictions(css.latitude, css.longitude, prevCss.latitude, prevCss.longitude, css.timestamp, prevCss.timestamp)
    : [];

  function showToast(msg: string, color: string) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 4500);
  }

  function togglePanel(panel: Panel) {
    setActivePanel(prev => prev === panel ? "none" : panel);
  }

  // UTC clock (updates on each poll; good enough, no setInterval needed)
  const utcNow = new Date();
  const utcStr = `${String(utcNow.getUTCHours()).padStart(2, "0")}:${String(utcNow.getUTCMinutes()).padStart(2, "0")}:${String(utcNow.getUTCSeconds()).padStart(2, "0")} UTC`;

  const userLat = userLocation?.known ? userLocation.lat : 30.0444;
  const userLon = userLocation?.known ? userLocation.lon : 31.2357;
  const userCity = userLocation?.known ? `${userLocation.city}, ${userLocation.country}` : "Unknown";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0a0e1a" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-4 py-2 border-b shrink-0" style={{ background: "#0d1020", borderColor: "#1e2a3e" }}>
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-green-400" />
          <span className="font-mono font-bold text-white text-sm tracking-widest">SATELLITE TRACKER</span>
        </div>
        <div className="ml-auto font-mono text-xs text-gray-400">{utcStr}</div>
        {weather && (
          <div className="font-mono text-xs" style={{ color: weather.kpIndex >= 6 ? "#FF4444" : weather.kpIndex >= 4 ? "#FF8800" : "#44FF44" }}>
            Kp: {weather.kpIndex.toFixed(1)} {weather.status}
          </div>
        )}
        {userLocation?.known && (
          <div className="font-mono text-xs text-gray-500 hidden md:block">{userCity}</div>
        )}
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-2 p-2 border-r overflow-y-auto" style={{ background: "#0d1020", borderColor: "#1e2a3e" }}>
          {/* ISS card */}
          <div>
            <SatelliteCard
              sat={iss}
              name="ISS"
              color="#FF4444"
              isLoading={issLoading}
              onClick={() => {
                showToast(ISS_FACTS[Math.floor(Math.random() * ISS_FACTS.length)], "#FF4444");
                togglePanel("predict-iss");
              }}
            />
            <div className="px-1">
              <NextPassBadge sat="iss" current={iss} prev={prevIss} obsLat={userLat} obsLon={userLon} />
            </div>
          </div>

          {/* CSS card */}
          <div>
            <SatelliteCard
              sat={css}
              name="CSS"
              color="#44FF44"
              isLoading={cssLoading}
              onClick={() => {
                showToast(CSS_FACTS[Math.floor(Math.random() * CSS_FACTS.length)], "#44FF44");
                togglePanel("predict-css");
              }}
            />
            <div className="px-1">
              <NextPassBadge sat="css" current={css} prev={prevCss} obsLat={userLat} obsLon={userLon} />
            </div>
          </div>

          <div className="mt-auto space-y-1 pt-2">
            {/* Filter */}
            <div className="border rounded p-1.5" style={{ borderColor: "#1e2a3e", background: "#0a0e1a" }}>
              <div className="flex items-center gap-1 mb-1">
                <Filter className="w-3 h-3 text-gray-500" />
                <span className="font-mono text-xs text-gray-500">FILTER</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {(["both", "iss", "css"] as SatFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="text-left text-xs font-mono px-2 py-0.5 rounded transition-all"
                    style={{
                      background: filter === f ? (f === "iss" ? "#3a0a0a" : f === "css" ? "#0a2a0a" : "#1a1a2a") : "transparent",
                      color: filter === f ? (f === "iss" ? "#FF6666" : f === "css" ? "#66FF66" : "#AAAACC") : "#555",
                      border: `1px solid ${filter === f ? (f === "iss" ? "#FF444433" : f === "css" ? "#44FF4433" : "#6666AA33") : "transparent"}`,
                    }}
                    data-testid={`button-filter-${f}`}
                  >
                    {f === "both" ? "Both" : f.toUpperCase() + " Only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel buttons */}
            <button
              onClick={() => togglePanel("pass-times")}
              className="w-full flex items-center gap-1.5 text-xs font-mono px-2 py-1.5 rounded transition-all"
              style={{
                background: activePanel === "pass-times" ? "#0a1a2a" : "#0a0e1a",
                border: `1px solid ${activePanel === "pass-times" ? "#4488FF66" : "#1e2a3e"}`,
                color: activePanel === "pass-times" ? "#4488FF" : "#888",
              }}
              data-testid="button-panel-passes"
            >
              <Clock className="w-3 h-3" /> Pass Times
            </button>
            <button
              onClick={() => togglePanel("passes")}
              className="w-full flex items-center gap-1.5 text-xs font-mono px-2 py-1.5 rounded transition-all"
              style={{
                background: activePanel === "passes" ? "#0a1a2a" : "#0a0e1a",
                border: `1px solid ${activePanel === "passes" ? "#4488FF66" : "#1e2a3e"}`,
                color: activePanel === "passes" ? "#7799FF" : "#888",
              }}
              data-testid="button-panel-overpasses"
            >
              <Navigation className="w-3 h-3" /> Overpasses
            </button>
            <button
              onClick={() => togglePanel("telecom")}
              className="w-full flex items-center gap-1.5 text-xs font-mono px-2 py-1.5 rounded transition-all"
              style={{
                background: activePanel === "telecom" ? "#0a1a0a" : "#0a0e1a",
                border: `1px solid ${activePanel === "telecom" ? "#44FF4466" : "#1e2a3e"}`,
                color: activePanel === "telecom" ? "#44FF44" : "#888",
              }}
              data-testid="button-panel-telecom"
            >
              <Radio className="w-3 h-3" /> Telecom
            </button>
          </div>
        </div>

        {/* Map + panels column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Map mode bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ background: "#0d1020", borderColor: "#1e2a3e" }}>
            <span className="font-mono text-xs text-gray-600">MAP MODE</span>
            {(["2d", "3d"] as MapMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMapMode(m)}
                className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded transition-all"
                style={{
                  background: mapMode === m ? "#0a2a0a" : "transparent",
                  border: `1px solid ${mapMode === m ? "#44FF4444" : "#1e2a3e"}`,
                  color: mapMode === m ? "#44FF44" : "#555",
                }}
                data-testid={`button-map-${m}`}
              >
                {m === "2d" ? <><Map className="w-3 h-3" /> 2D Map</> : <><Globe className="w-3 h-3" /> 3D Globe</>}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-xs font-mono">
              {iss && <span style={{ color: "#FF4444" }}>ISS {iss.latitude.toFixed(2)}&deg;,{iss.longitude.toFixed(2)}&deg;</span>}
              {css && <span style={{ color: "#44FF44" }}>CSS {css.latitude.toFixed(2)}&deg;,{css.longitude.toFixed(2)}&deg;</span>}
            </div>
          </div>

          {/* Map + overlay wrapper */}
          <div className="flex-1 relative overflow-hidden">
            {mapMode === "2d" ? (
              <Map2D
                iss={iss} css={css}
                issTrail={issTrail} cssTrail={cssTrail}
                issPredictions={issPredictions} cssPredictions={cssPredictions}
                filter={filter}
                userLat={userLocation?.known ? userLocation.lat : undefined}
                userLon={userLocation?.known ? userLocation.lon : undefined}
                onIssClick={() => { showToast(ISS_FACTS[Math.floor(Math.random() * ISS_FACTS.length)], "#FF4444"); togglePanel("predict-iss"); }}
                onCssClick={() => { showToast(CSS_FACTS[Math.floor(Math.random() * CSS_FACTS.length)], "#44FF44"); togglePanel("predict-css"); }}
              />
            ) : (
              <Globe3D
                iss={iss} css={css}
                issTrail={issTrail} cssTrail={cssTrail}
                issPredictions={issPredictions} cssPredictions={cssPredictions}
                filter={filter}
                userLat={userLocation?.known ? userLocation.lat : undefined}
                userLon={userLocation?.known ? userLocation.lon : undefined}
              />
            )}

            {/* ── Overlay panels — z-index 2000 to sit above Leaflet (400-1000) ── */}
            {activePanel === "telecom" && (
              <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 2000 }}>
                <TelecomPanel
                  iss={iss} css={css}
                  prevIss={prevIss} prevCss={prevCss}
                  weather={weather}
                  userLat={userLat} userLon={userLon}
                  onClose={() => setActivePanel("none")}
                />
              </div>
            )}
            {activePanel === "passes" && (
              <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 2000 }}>
                <PassTimesPanel
                  iss={iss} prevIss={prevIss}
                  css={css} prevCss={prevCss}
                  userLat={userLat} userLon={userLon}
                  userCity={userCity}
                  onClose={() => setActivePanel("none")}
                />
              </div>
            )}
            {activePanel === "pass-times" && (
              <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 2000 }}>
                <div className="w-full h-full overflow-y-auto" style={{ background: "#0d1020", border: "1px solid #1e2a3e" }}>
                  <div className="sticky top-0 flex items-center justify-between p-3 border-b border-gray-800 z-10" style={{ background: "#0d1020" }}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-blue-400 font-semibold text-sm">PASS TIMES — ORBITAL PATH</span>
                    </div>
                    <button onClick={() => setActivePanel("none")} className="p-1 hover:text-white text-gray-400 transition-colors">
                      <span className="font-mono text-xs">✕</span>
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    <p className="text-xs font-mono text-gray-500">Predicted positions (+10 min steps)</p>
                    {/* ISS predictions */}
                    <div>
                      <h3 className="font-mono text-xs font-bold mb-2 border-b pb-1" style={{ color: "#FF4444", borderColor: "#FF444433" }}>── ISS PATH ──</h3>
                      {issPredictions.length === 0 ? (
                        <p className="text-xs font-mono text-yellow-500 py-2">Collecting velocity data… wait ~20 s</p>
                      ) : issPredictions.map((p, i) => (
                        <div key={i} className="rounded p-2 text-xs font-mono mb-1.5" style={{ background: "#FF44440d", border: "1px solid #FF444422" }}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold" style={{ color: "#FF4444" }}>#{i + 1}</span>
                            <span className="text-gray-400">+{(i + 1) * 10} min</span>
                            <span className="text-white">{new Date(p.t * 1000).toUTCString().slice(17, 22)} UTC</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-400">Lat <span className="text-white">{p.lat.toFixed(2)}°</span></span>
                            <span className="text-gray-400">Lon <span className="text-white">{p.lon.toFixed(2)}°</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* CSS predictions */}
                    <div>
                      <h3 className="font-mono text-xs font-bold mb-2 border-b pb-1" style={{ color: "#44FF44", borderColor: "#44FF4433" }}>── CSS (TIANGONG) PATH ──</h3>
                      {cssPredictions.length === 0 ? (
                        <p className="text-xs font-mono text-yellow-500 py-2">Collecting velocity data… wait ~20 s</p>
                      ) : cssPredictions.map((p, i) => (
                        <div key={i} className="rounded p-2 text-xs font-mono mb-1.5" style={{ background: "#44FF440d", border: "1px solid #44FF4422" }}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold" style={{ color: "#44FF44" }}>#{i + 1}</span>
                            <span className="text-gray-400">+{(i + 1) * 10} min</span>
                            <span className="text-white">{new Date(p.t * 1000).toUTCString().slice(17, 22)} UTC</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-400">Lat <span className="text-white">{p.lat.toFixed(2)}°</span></span>
                            <span className="text-gray-400">Lon <span className="text-white">{p.lon.toFixed(2)}°</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activePanel === "predict-iss" && (
              <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 2000 }}>
                <PredictionPanel
                  sat="iss"
                  iss={iss} prevIss={prevIss}
                  css={css} prevCss={prevCss}
                  onClose={() => setActivePanel("none")}
                />
              </div>
            )}
            {activePanel === "predict-css" && (
              <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 2000 }}>
                <PredictionPanel
                  sat="css"
                  iss={iss} prevIss={prevIss}
                  css={css} prevCss={prevCss}
                  onClose={() => setActivePanel("none")}
                />
              </div>
            )}

            {/* Toast */}
            {toast && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded font-mono text-sm z-[3000] max-w-xs text-center"
                style={{ background: "#0d1828", border: `1px solid ${toast.color}55`, color: toast.color }}
              >
                {toast.msg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Dashboard */}
      <HistoryDashboard />
    </div>
  );
}

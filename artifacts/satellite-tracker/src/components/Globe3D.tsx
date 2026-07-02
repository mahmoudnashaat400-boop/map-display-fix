import { useRef, useEffect, useState, lazy, Suspense } from "react";
import type { SatellitePosition } from "@workspace/api-client-react";
import type { PredictedPoint } from "@/lib/satmath";

const GlobeGL = lazy(() => import("react-globe.gl"));

interface TrailPoint { lat: number; lon: number; ts: number }

interface Props {
  iss: SatellitePosition | undefined;
  css: SatellitePosition | undefined;
  issTrail: TrailPoint[];
  cssTrail: TrailPoint[];
  issPredictions: PredictedPoint[];
  cssPredictions: PredictedPoint[];
  filter: "both" | "iss" | "css";
  userLat?: number;
  userLon?: number;
}

// Build SVG satellite icon as data-URI so it can be used in img tags inside htmlElement
function makeSatSvg(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24" viewBox="0 0 40 24">
    <!-- left solar panel -->
    <rect x="0" y="8" width="12" height="8" rx="1" fill="${color}" opacity="0.9"/>
    <!-- panel dividers -->
    <line x1="4" y1="8" x2="4" y2="16" stroke="#00000055" stroke-width="1"/>
    <line x1="8" y1="8" x2="8" y2="16" stroke="#00000055" stroke-width="1"/>
    <!-- right solar panel -->
    <rect x="28" y="8" width="12" height="8" rx="1" fill="${color}" opacity="0.9"/>
    <line x1="32" y1="8" x2="32" y2="16" stroke="#00000055" stroke-width="1"/>
    <line x1="36" y1="8" x2="36" y2="16" stroke="#00000055" stroke-width="1"/>
    <!-- body -->
    <rect x="12" y="5" width="16" height="14" rx="2" fill="#DDDDDD"/>
    <!-- body shade -->
    <rect x="13" y="6" width="14" height="12" rx="1" fill="#EEEEEE"/>
    <!-- antenna -->
    <line x1="20" y1="0" x2="20" y2="5" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="20" cy="0" r="1.5" fill="${color}"/>
    <!-- thruster -->
    <rect x="16" y="19" width="8" height="5" rx="1" fill="#AAAAAA"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeUserSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7" fill="#4488FF" opacity="0.25"/>
    <circle cx="10" cy="10" r="4" fill="#4488FF" opacity="0.6"/>
    <circle cx="10" cy="10" r="2" fill="#88BBFF"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ISS_SVG = makeSatSvg("#FF4444");
const CSS_SVG = makeSatSvg("#44FF44");
const USER_SVG = makeUserSvg();

function makeHtmlMarker(d: any): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:none;";

  const img = document.createElement("img");
  if (d.type === "iss") { img.src = ISS_SVG; img.width = 40; img.height = 24; }
  else if (d.type === "css") { img.src = CSS_SVG; img.width = 40; img.height = 24; }
  else { img.src = USER_SVG; img.width = 20; img.height = 20; }

  img.style.cssText = `filter: drop-shadow(0 0 4px ${d.color});`;

  const label = document.createElement("div");
  label.textContent = d.label;
  label.style.cssText = `color:${d.color};font-family:monospace;font-size:10px;font-weight:bold;margin-top:2px;text-shadow:0 0 6px ${d.color};`;

  wrap.appendChild(img);
  wrap.appendChild(label);
  return wrap;
}

interface GlobeInnerProps extends Props {}

function GlobeInner({ iss, css, issTrail, cssTrail, issPredictions, cssPredictions, filter, userLat, userLon }: GlobeInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const globeRef = useRef<any>(null);

  const showIss = filter === "both" || filter === "iss";
  const showCss = filter === "both" || filter === "css";

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) });
      }
    });
    ro.observe(containerRef.current);
    setSize({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls?.();
    if (ctrl) { ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.3; }
  });

  // ── HTML markers for satellites & user ──────────────────────────────────
  const htmlData: any[] = [];
  if (showIss && iss) htmlData.push({ lat: iss.latitude, lng: iss.longitude, alt: 0.065, type: "iss", color: "#FF4444", label: `ISS ${iss.altitude.toFixed(0)}km` });
  if (showCss && css) htmlData.push({ lat: css.latitude, lng: css.longitude, alt: 0.060, type: "css", color: "#44FF44", label: `CSS ${css.altitude.toFixed(0)}km` });
  if (userLat !== undefined && userLon !== undefined) htmlData.push({ lat: userLat, lng: userLon, alt: 0, type: "user", color: "#4488FF", label: "YOU" });

  // ── Trail arcs (solid) ───────────────────────────────────────────────────
  const arcs: any[] = [];
  const trailLen = 20;
  if (showIss && issTrail.length > 1) {
    for (let i = Math.max(0, issTrail.length - trailLen); i < issTrail.length - 1; i++) {
      const opacity = 0.15 + 0.85 * ((i - Math.max(0, issTrail.length - trailLen)) / trailLen);
      arcs.push({
        startLat: issTrail[i].lat, startLng: issTrail[i].lon,
        endLat: issTrail[i + 1].lat, endLng: issTrail[i + 1].lon,
        color: `rgba(255,68,68,${opacity.toFixed(2)})`,
        isPred: false,
      });
    }
  }
  if (showCss && cssTrail.length > 1) {
    for (let i = Math.max(0, cssTrail.length - trailLen); i < cssTrail.length - 1; i++) {
      const opacity = 0.15 + 0.85 * ((i - Math.max(0, cssTrail.length - trailLen)) / trailLen);
      arcs.push({
        startLat: cssTrail[i].lat, startLng: cssTrail[i].lon,
        endLat: cssTrail[i + 1].lat, endLng: cssTrail[i + 1].lon,
        color: `rgba(68,255,68,${opacity.toFixed(2)})`,
        isPred: false,
      });
    }
  }

  // ── Prediction arcs (dashed, higher altitude) ────────────────────────────
  // Connect current → pred[0] → pred[1] → … with dashed arcs
  if (showIss && iss && issPredictions.length > 0) {
    const chain = [{ lat: iss.latitude, lon: iss.longitude }, ...issPredictions.map(p => ({ lat: p.lat, lon: p.lon }))];
    for (let i = 0; i < chain.length - 1; i++) {
      arcs.push({
        startLat: chain[i].lat, startLng: chain[i].lon,
        endLat: chain[i + 1].lat, endLng: chain[i + 1].lon,
        color: `rgba(255,140,100,0.75)`,
        isPred: true,
      });
    }
  }
  if (showCss && css && cssPredictions.length > 0) {
    const chain = [{ lat: css.latitude, lon: css.longitude }, ...cssPredictions.map(p => ({ lat: p.lat, lon: p.lon }))];
    for (let i = 0; i < chain.length - 1; i++) {
      arcs.push({
        startLat: chain[i].lat, startLng: chain[i].lon,
        endLat: chain[i + 1].lat, endLng: chain[i + 1].lon,
        color: `rgba(140,255,140,0.75)`,
        isPred: true,
      });
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: "#020408" }}>
      {size.w > 0 && (
        <GlobeGL
          ref={globeRef}
          width={size.w}
          height={size.h}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

          htmlElementsData={htmlData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude="alt"
          htmlElement={makeHtmlMarker}

          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcAltitude={(d: any) => d.isPred ? 0.02 : 0.005}
          arcStroke={(d: any) => d.isPred ? 0.5 : 0.9}
          arcDashLength={(d: any) => d.isPred ? 0.25 : 1}
          arcDashGap={(d: any) => d.isPred ? 0.75 : 0}
          arcDashInitialGap={() => 0}

          atmosphereColor="#1a3a5c"
          atmosphereAltitude={0.12}
        />
      )}
    </div>
  );
}

export function Globe3D(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center" style={{ background: "#020408" }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#44FF44", borderTopColor: "transparent" }} />
            <p className="text-sm font-mono" style={{ color: "#44FF44" }}>Loading 3D Globe...</p>
          </div>
        </div>
      }
    >
      <GlobeInner {...props} />
    </Suspense>
  );
}

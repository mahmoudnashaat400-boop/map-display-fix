import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker, useMap } from "react-leaflet";
import L, { type LatLngExpression, type Icon, type DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SatellitePosition } from "@workspace/api-client-react";
import type { PredictedPoint } from "@/lib/satmath";

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
  onIssClick?: () => void;
  onCssClick?: () => void;
}

/**
 * Computes the fractional zoom level needed so the Mercator world tile sheet
 * covers the full container in every orientation (no black bars).
 *
 * At zoom Z the world is  256 × 2^Z  pixels wide AND tall (Web Mercator).
 * We need  256 × 2^Z  ≥  max(containerW, containerH)
 * ⟹  Z  =  log2( max(W, H) / 256 )
 */
function coverZoom(w: number, h: number): number {
  return Math.log2(Math.max(w, h) / 256);
}

/** Fills the container with the world map and re-fills on every resize. */
function FitWorld() {
  const map = useMap();

  useEffect(() => {
    function fill() {
      map.invalidateSize({ animate: false });

      const el = map.getContainer();
      const W = el.offsetWidth;
      const H = el.offsetHeight;
      if (W === 0 || H === 0) { setTimeout(fill, 60); return; }

      const z = coverZoom(W, H);
      map.setView([0, 0], z, { animate: false });
      // Prevent zooming out further than "full cover"
      map.setMinZoom(z);
    }

    const t = setTimeout(fill, 40);
    const ro = new ResizeObserver(fill);
    ro.observe(map.getContainer());
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [map]);

  return null;
}

function createGlowIcon(className: string): DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${className}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const issIcon = createGlowIcon("iss-marker");
const cssIcon = createGlowIcon("css-marker");

function createUserIcon(): DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#4488FF;border:2px solid #88AAFF;box-shadow:0 0 10px rgba(68,136,255,0.8)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function Map2D({ iss, css, issTrail, cssTrail, issPredictions, cssPredictions, filter, userLat, userLon, onIssClick, onCssClick }: Props) {
  const showIss = filter === "both" || filter === "iss";
  const showCss = filter === "both" || filter === "css";
  const userIcon = createUserIcon();

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <MapContainer
        center={[0, 0] as LatLngExpression}
        zoom={2}
        minZoom={1}
        zoomSnap={0}
        zoomDelta={0.5}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
        maxBounds={[[-90, -180], [90, 180]] as [LatLngExpression, LatLngExpression]}
        maxBoundsViscosity={1.0}
      >
        <FitWorld />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains={["a", "b", "c", "d"] as string[]}
          maxZoom={19}
          noWrap={true}
        />

        {userLat !== undefined && userLon !== undefined && (
          <Marker position={[userLat, userLon] as LatLngExpression} icon={userIcon as Icon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {showIss && issTrail.length > 1 && (
          <Polyline
            positions={issTrail.map(p => [p.lat, p.lon] as LatLngExpression)}
            pathOptions={{ color: "#FF4444", weight: 2, opacity: 0.5, dashArray: "4 4" }}
          />
        )}
        {showCss && cssTrail.length > 1 && (
          <Polyline
            positions={cssTrail.map(p => [p.lat, p.lon] as LatLngExpression)}
            pathOptions={{ color: "#44FF44", weight: 2, opacity: 0.5, dashArray: "4 4" }}
          />
        )}

        {showIss && issPredictions.map((p, i) => (
          <CircleMarker
            key={`iss-pred-${i}`}
            center={[p.lat, p.lon] as LatLngExpression}
            pathOptions={{ color: "#FF4444", fill: false, opacity: 1 - i * 0.15 }}
            radius={4}
          />
        ))}
        {showCss && cssPredictions.map((p, i) => (
          <CircleMarker
            key={`css-pred-${i}`}
            center={[p.lat, p.lon] as LatLngExpression}
            pathOptions={{ color: "#44FF44", fill: false, opacity: 1 - i * 0.15 }}
            radius={4}
          />
        ))}

        {showIss && iss && (
          <Marker
            position={[iss.latitude, iss.longitude] as LatLngExpression}
            icon={issIcon as Icon}
            eventHandlers={{ click: onIssClick }}
          >
            <Popup>
              <div style={{ color: "#FF4444", fontFamily: "monospace", fontSize: "12px" }}>
                <strong>ISS</strong><br />
                Lat: {iss.latitude.toFixed(4)}&deg;<br />
                Lon: {iss.longitude.toFixed(4)}&deg;<br />
                Alt: {iss.altitude.toFixed(1)} km<br />
                {iss.country}
              </div>
            </Popup>
          </Marker>
        )}
        {showCss && css && (
          <Marker
            position={[css.latitude, css.longitude] as LatLngExpression}
            icon={cssIcon as Icon}
            eventHandlers={{ click: onCssClick }}
          >
            <Popup>
              <div style={{ color: "#44FF44", fontFamily: "monospace", fontSize: "12px" }}>
                <strong>CSS (Tiangong)</strong><br />
                Lat: {css.latitude.toFixed(4)}&deg;<br />
                Lon: {css.longitude.toFixed(4)}&deg;<br />
                Alt: {css.altitude.toFixed(1)} km<br />
                {css.country}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker } from "react-leaflet";
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
    <MapContainer
      center={[0, 0] as LatLngExpression}
      zoom={2}
      minZoom={2}
      className="w-full h-full"
      zoomControl={true}
      scrollWheelZoom={true}
      maxBounds={[[-90, -180], [90, 180]] as [LatLngExpression, LatLngExpression]}
      maxBoundsViscosity={1.0}
    >
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
  );
}

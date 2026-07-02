import { Satellite } from "lucide-react";
import type { SatellitePosition } from "@workspace/api-client-react";

interface Props {
  sat: SatellitePosition | undefined;
  name: string;
  color: string;
  isLoading: boolean;
  onClick?: () => void;
}

export function SatelliteCard({ sat, name, color, isLoading, onClick }: Props) {
  const isISS = name === "ISS";

  return (
    <div
      className="rounded-lg border p-3 cursor-pointer hover:brightness-110 transition-all"
      style={{ borderColor: color + "44", background: "#0d1826" }}
      onClick={onClick}
      data-testid={`card-satellite-${name.toLowerCase()}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="font-semibold text-sm" style={{ color }}>{name}</span>
        <Satellite className="w-3 h-3 ml-auto opacity-50" style={{ color }} />
      </div>
      {isLoading || !sat ? (
        <div className="space-y-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ background: color + "22", width: i % 2 === 0 ? "70%" : "90%" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-gray-500">LAT</span>
            <span className="data-value" style={{ color }} data-testid={`text-lat-${name.toLowerCase()}`}>{sat.latitude.toFixed(4)}&deg;</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">LON</span>
            <span className="data-value" style={{ color }} data-testid={`text-lon-${name.toLowerCase()}`}>{sat.longitude.toFixed(4)}&deg;</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ALT</span>
            <span className="data-value text-white">{sat.altitude.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">SPD</span>
            <span className="data-value text-white">{sat.velocity.toFixed(2)} km/s</span>
          </div>
          <div className="mt-1 pt-1 border-t" style={{ borderColor: color + "22" }}>
            <span className="text-gray-400 truncate block">{sat.country}</span>
          </div>
        </div>
      )}
    </div>
  );
}

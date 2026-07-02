import { Trash2, Trash } from "lucide-react";
import { useState } from "react";
import {
  useGetHistory,
  useDeleteHistoryRecord,
  useClearHistory,
  getGetHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function HistoryDashboard() {
  const queryClient = useQueryClient();
  const { data: history = [], isLoading } = useGetHistory();
  const deleteRecord = useDeleteHistoryRecord();
  const clearHistory = useClearHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  const issCount = history.filter((r) => r.satellite === "ISS").length;
  const cssCount = history.filter((r) => r.satellite === "CSS").length;
  const issCountries = new Set(history.filter((r) => r.satellite === "ISS").map((r) => r.country)).size;
  const cssCountries = new Set(history.filter((r) => r.satellite === "CSS").map((r) => r.country)).size;

  function handleDelete(id: number) {
    deleteRecord.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() }),
    });
  }

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearHistory.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        setConfirmClear(false);
      },
    });
  }

  return (
    <div className="border-t border-gray-800" style={{ background: "#0a0e1a" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-xs font-bold text-gray-300">POSITION HISTORY</h2>
          <div className="flex gap-3 text-xs font-mono">
            <span style={{ color: "#FF4444" }}>ISS: {issCount} ({issCountries} countries)</span>
            <span style={{ color: "#44FF44" }}>CSS: {cssCount} ({cssCountries} countries)</span>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearHistory.isPending}
            className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded transition-all"
            style={{
              background: confirmClear ? "#3a1a1a" : "#1a1a2a",
              border: `1px solid ${confirmClear ? "#FF4444" : "#333"}`,
              color: confirmClear ? "#FF4444" : "#888",
            }}
            data-testid="button-clear-history"
          >
            <Trash className="w-3 h-3" />
            {confirmClear ? "Confirm Clear All?" : "Clear All"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-6 h-6 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#44FF44", borderTopColor: "transparent" }} />
        </div>
      ) : history.length === 0 ? (
        <div className="flex items-center justify-center h-16 text-xs font-mono text-gray-600">
          No history yet — positions auto-save every ~100 seconds
        </div>
      ) : (
        <div className="overflow-x-auto max-h-52 overflow-y-auto">
          <table className="w-full text-xs font-mono" data-testid="table-history">
            <thead className="sticky top-0" style={{ background: "#0d1020" }}>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left px-3 py-1">SAT</th>
                <th className="text-left px-3 py-1">TIME (UTC)</th>
                <th className="text-right px-3 py-1">LAT</th>
                <th className="text-right px-3 py-1">LON</th>
                <th className="text-right px-3 py-1">ALT</th>
                <th className="text-left px-3 py-1">REGION</th>
                <th className="px-3 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const d = new Date(record.createdAt);
                const timeStr = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                const color = record.satellite === "ISS" ? "#FF4444" : "#44FF44";
                return (
                  <tr key={record.id} className="border-b border-gray-900 hover:brightness-125 transition-all" data-testid={`row-history-${record.id}`}>
                    <td className="px-3 py-1">
                      <span className="font-bold" style={{ color }}>{record.satellite}</span>
                    </td>
                    <td className="px-3 py-1 text-gray-400">{timeStr}</td>
                    <td className="px-3 py-1 text-right text-gray-300">{record.latitude.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right text-gray-300">{record.longitude.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right text-gray-300">{record.altitude.toFixed(0)}km</td>
                    <td className="px-3 py-1 text-gray-400 truncate max-w-32">{record.country}</td>
                    <td className="px-3 py-1">
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deleteRecord.isPending}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                        data-testid={`button-delete-history-${record.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

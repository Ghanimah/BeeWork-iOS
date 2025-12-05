import { useMemo } from "react";
import { MapPin, Clock, Play } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import BeeIcon from "./BeeIcon";
import { Shift } from "../types";

interface UpcomingShiftsProps {
  shifts: Shift[];
}

const UpcomingShifts: React.FC<UpcomingShiftsProps> = ({ shifts }) => {
  const { setSelectedShift, setCurrentPage } = useApp();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingShifts = useMemo(
    () =>
      shifts
        .filter((shift) => {
          const shiftDate = new Date(shift.date);
          shiftDate.setHours(0, 0, 0, 0);
          const isUpcomingDay = shiftDate >= today;
          const isNotCompleted = shift.status !== "completed";
          return isUpcomingDay && isNotCompleted;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [shifts, today]
  );

  const nextShift = upcomingShifts[0];

  const statusForShift = (shift: Shift) => {
    const now = Date.now();
    const startMs = shift.startTime ? new Date(shift.startTime).getTime() : new Date(`${shift.date}T00:00:00`).getTime();
    const endMs =
      shift.endTime && new Date(shift.endTime).getTime() > startMs
        ? new Date(shift.endTime).getTime()
        : startMs + 60 * 60 * 1000; // default 1h duration fallback

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return { label: "Upcoming", tone: "amber" as const, Icon: Clock };
    }
    if (now >= startMs && now <= endMs) {
      return { label: "Live", tone: "green" as const, Icon: Play };
    }
    if (now < startMs) {
      return { label: "Upcoming", tone: "amber" as const, Icon: Clock };
    }
    return { label: "Ended", tone: "gray" as const, Icon: Clock };
  };

  const toneClass: Record<"amber" | "green" | "gray", string> = {
    amber: "text-amber-700 bg-amber-50",
    green: "text-green-700 bg-green-50",
    gray: "text-gray-600 bg-gray-100",
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-gray-900">Upcoming Shifts</h3>

      {nextShift ? (
        <div className="rounded-2xl border border-amber-100 bg-white divide-y divide-amber-50 shadow-[0_10px_30px_-26px_rgba(0,0,0,0.35)] overflow-hidden">
          {[nextShift, ...upcomingShifts.slice(1)].map((shift, idx) => {
            const start = new Date(shift.startTime || `${shift.date}T00:00:00`);
            const end = shift.endTime
              ? new Date(shift.endTime)
              : new Date(start.getTime() + 60 * 60 * 1000);
            const status = statusForShift(shift);
            const StatusIcon = status.Icon;
            const startLabel = Number.isNaN(start.getTime())
              ? "—"
              : start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const endLabel = Number.isNaN(end.getTime())
              ? "—"
              : end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <button
                key={shift.id || idx}
                type="button"
                onClick={() => {
                  setSelectedShift(shift);
                  setCurrentPage("shift-detail");
                }}
                className="w-full px-4 py-3 text-left hover:bg-amber-50/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs uppercase tracking-wide text-amber-600 font-semibold">
                      {formatDate(shift.date)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{shift.title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                      <Clock size={14} />
                      <span>
                        {startLabel} - {endLabel}
                      </span>
                      <MapPin size={14} />
                      <span className="truncate">{shift.location}</span>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${toneClass[status.tone]}`}
                  >
                    <StatusIcon size={14} />
                    {status.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-100 bg-white text-center py-8">
          <BeeIcon size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No upcoming shifts scheduled</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingShifts;

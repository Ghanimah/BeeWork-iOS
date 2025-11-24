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
          return shiftDate >= today && shift.status === "scheduled";
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [shifts, today]
  );

  const nextShift = upcomingShifts[0];

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
        <div className="rounded-2xl border border-amber-100 bg-white divide-y divide-amber-50 shadow-[0_10px_30px_-26px_rgba(0,0,0,0.35)]">
          {[nextShift, ...upcomingShifts.slice(1)].map((shift, idx) => {
            const start = new Date(shift.startTime || "");
            const end = new Date(shift.endTime || "");
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
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-amber-600 font-semibold">
                      {formatDate(shift.date)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{shift.title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock size={14} />
                      <span>
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <MapPin size={14} />
                      <span className="truncate">{shift.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                    <Play size={14} />
                    Scheduled
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

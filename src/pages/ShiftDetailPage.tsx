// src/pages/ShiftDetailPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPin, DollarSign, Clock, Play, Square } from "lucide-react";
import { useApp } from "../contexts/AppContext";

const METERS_RADIUS = 500;
const TAX_RATE = 0.05;

const getDistance = (lat1:number, lon1:number, lat2:number, lon2:number) => {
  const R = 6371e3, toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const formatTimer = (startMs: number | null, nowMs: number): string | null => {
  if (!startMs) return null;
  const secs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

const getDistanceNote = (distM: number | null, hasCoords: boolean): string => {
  if (distM !== null && distM !== undefined) return `You are ~${distM.toFixed(0)} m from site`;
  if (hasCoords) return "—";
  return "Location not set for this shift";
};

const getEffectiveStatus = (shiftStatus: string | undefined, punchState: string): "scheduled" | "in-progress" | "completed" => {
  if (punchState === "completed") return "completed";
  if (punchState === "punched_in") return "in-progress";
  return (shiftStatus ?? "scheduled") as "scheduled" | "in-progress" | "completed";
};

const ShiftDetailPage: React.FC = () => {
  const { selectedShift, setCurrentPage, setSelectedShift, punchIn, punchOut, punchStatus } = useApp();
  const [now, setNow] = useState(Date.now());
  const [distM, setDistM] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [punchStartMs, setPunchStartMs] = useState<number | null>(null);
  const askedRef = useRef(false);
  const shift = selectedShift;

  const fmtTimeHM = (d?: string) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "";
  const fmtMoney = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "JOD", maximumFractionDigits: 2 }).format(n);

  const startTs = shift?.startTime ? new Date(shift.startTime).getTime() : null;
  const endTs = shift?.endTime ? new Date(shift.endTime).getTime() : null;
  const effectiveStatus = getEffectiveStatus(shift?.status, punchStatus.state);

  const workedHours = useMemo(() => {
    const start = startTs;
    const end = effectiveStatus === "in-progress" ? now : (endTs ?? null);
    if (!start || !end) return 0;
    return Math.max(0, (end - start) / 3_600_000);
  }, [startTs, endTs, effectiveStatus, now]);

  const scheduledHours = useMemo(() => (!startTs || !endTs) ? 0 : Math.max(0, (endTs - startTs) / 3_600_000), [startTs, endTs]);
  const basePay = ((shift?.hourlyWage ?? 0)) * scheduledHours;
  const tax = basePay * TAX_RATE;

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const src = punchStatus.punchInAt || (shift as any)?.punchedInAt;
    if (effectiveStatus === "in-progress" && src) setPunchStartMs(new Date(src).getTime());
    if (effectiveStatus !== "in-progress") setPunchStartMs(null);
  }, [effectiveStatus, punchStatus.punchInAt]);

  const hasCoords = !!(shift && typeof shift.latitude === "number" && typeof shift.longitude === "number");
  const refreshDistance = () => {
    if (!("geolocation" in navigator) || !hasCoords || !shift) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDistM(getDistance(pos.coords.latitude, pos.coords.longitude, shift.latitude, shift.longitude)),
      () => {}
    );
  };
  useEffect(() => { if (!askedRef.current) { askedRef.current = true; refreshDistance(); } }, []);

  const requireNearby = async (cb: () => Promise<void> | void) => {
    if (!hasCoords || !shift) { 
      if (!busy) setBusy(true); 
      try { 
        await cb(); 
      } finally { 
        setBusy(false); 
      } 
      return; 
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const d = getDistance(pos.coords.latitude, pos.coords.longitude, shift.latitude, shift.longitude);
        setDistM(d);
        if (d <= METERS_RADIUS) { try { await cb(); } finally { setBusy(false); } }
        else { alert(`You must be within ${METERS_RADIUS} meters of the job site. You are ~${d.toFixed(0)}m away.`); setBusy(false); }
      },
      () => { setBusy(false); alert("Location permission is required."); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  const handlePunchIn = () => {
    const nowTs = Date.now();
    if (!startTs || !endTs) { alert("Shift start and end times are not set yet."); return; }
    if (nowTs < startTs) { alert("You cannot punch in before the scheduled start time."); return; }
    if (nowTs > endTs) { alert("You cannot punch in after the scheduled end time."); return; }
    if (!shift) return;
    requireNearby(async () => { await punchIn(shift.id); setSelectedShift({ ...shift, status: "in-progress" }); });
  };
  const handlePunchOut = () => { 
    if (!shift) return; 
    requireNearby(async () => { 
      await punchOut(shift.id); 
      setSelectedShift({ ...shift, status: "completed" }); 
    }); 
  };

  const timerText = formatTimer(punchStartMs, now);
  const distanceNote = getDistanceNote(distM, hasCoords);

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4 max-w-md mx-auto">
        <button onClick={() => setCurrentPage("home")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>

        {shift ? (
          <div className="mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{shift.title}</h1>
            <p className="text-gray-500 -mt-1">{shift.location}</p>
          </div>
        ) : (
          <div className="mt-2">
            <h1 className="text-xl font-bold text-gray-900">No shift selected</h1>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm text-gray-500">{fmtDate(shift?.startTime)}</p>
          <p className="text-3xl font-extrabold text-gray-900">
            {fmtTimeHM(shift?.startTime)} <span className="font-semibold">To</span> {fmtTimeHM(shift?.endTime)}
          </p>
          <p className="text-gray-500 mt-1">{scheduledHours.toFixed(0)} hours</p>
        </div>

        <div className="mt-6">
          <div className="flex items-center space-x-2 text-gray-700">
            <MapPin size={18} />
            <span className="font-medium">{shift?.location ?? "—"}</span>
          </div>
        </div>

        {hasCoords && shift ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${shift.latitude},${shift.longitude}`}
            target="_blank" rel="noopener noreferrer" className="block mt-3 overflow-hidden rounded-2xl shadow-sm"
          >
            <div className="w-full h-44 bg-gray-200">
              <iframe
                title="map" className="w-full h-full pointer-events-none"
                src={`https://www.google.com/maps?q=${shift.latitude},${shift.longitude}&z=16&output=embed`}
                loading="lazy"
              />
            </div>
          </a>
        ) : (
          <div className="w-full h-44 bg-gray-100 mt-3 rounded-2xl" />
        )}

        <div className="mt-6 rounded-2xl border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment</h3>
          <div className="mt-2 space-y-1 text-gray-600">
            <div className="flex items-center">
              <DollarSign size={16} className="mr-2" />
              <span>JOD {Number(shift?.hourlyWage ?? 0).toFixed(2)}/hr × {scheduledHours.toFixed(0)} hours</span>
            </div>
            <div className="text-gray-500">{(TAX_RATE * 100).toFixed(0)}% Worker Tax</div>
          </div>
          <div className="mt-2 font-bold text-gray-900">{fmtMoney(Math.max(0, basePay - tax))} <span className="font-normal text-gray-500">Total</span></div>
        </div>

        <div className="mt-4">
          {effectiveStatus === "scheduled" && (
            <button onClick={handlePunchIn} disabled={busy}
              className={`w-full ${busy ? "opacity-70" : ""} bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-2xl shadow`}>
              <div className="flex items-center justify-center space-x-2"><Play size={20} /><span>{busy ? "Checking location..." : "Punch In"}</span></div>
            </button>
          )}

          {effectiveStatus === "in-progress" && (
            <div className="space-y-2">
              <button onClick={handlePunchOut} disabled={busy}
                className={`w-full ${busy ? "opacity-70" : ""} bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow`}>
                <div className="flex items-center justify-center space-x-2"><Square size={20} /><span>{busy ? "Checking location..." : "Punch Out"}</span></div>
              </button>
              <div className="text-center text-sm text-gray-700">
                <div className="inline-flex items-center space-x-1"><Clock size={16} /><span>{timerText ?? "00:00:00"}</span></div>
              </div>
            </div>
          )}

          {effectiveStatus === "completed" && (
            <div className="text-center text-blue-700 font-medium p-4 bg-blue-50 rounded-2xl">Shift Completed</div>
          )}

          <div className="text-center text-xs text-gray-500 mt-2">
            {distanceNote}
          </div>
        </div>

        <div className="mt-6 flex items-center space-x-2 text-gray-600">
          <Clock size={18} />
          <span>{workedHours.toFixed(2)} hours • {fmtMoney(workedHours * ((shift?.hourlyWage ?? 0)))}</span>
        </div>
      </div>
    </div>
  );
};

export default ShiftDetailPage;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPin, DollarSign, Clock, Play, Square } from "lucide-react";
import { useApp } from "../contexts/AppContext";

const METERS_RADIUS = 500;
const TAX_RATE = 0.05; // 5% worker tax

const ShiftDetailPage: React.FC = () => {
  const { selectedShift, setCurrentPage, punchIn, punchOut } = useApp();
  const [now, setNow] = useState(Date.now());
  const [distM, setDistM] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [punchStartMs, setPunchStartMs] = useState<number | null>(null);
  const askedRef = useRef(false);

  if (!selectedShift) return null;

  const fmtTimeHM = (d?: string) =>
    d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "";
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "JOD", maximumFractionDigits: 2 }).format(n);

  // Show a gray subtitle like the screenshot (company if exists, else client/clientName, else location)
  const secondaryLine =
    (selectedShift as any).company ??
    (selectedShift as any).client ??
    (selectedShift as any).clientName ??
    selectedShift.location;

  const startTs = selectedShift.startTime ? new Date(selectedShift.startTime).getTime() : null;
  const endTs = selectedShift.endTime ? new Date(selectedShift.endTime).getTime() : null;

  const workedHours = useMemo(() => {
    const start = startTs;
    const end =
      selectedShift.status === "in-progress" ? now : endTs ? endTs : null;
    if (!start || !end) return 0;
    return Math.max(0, (end - start) / 3_600_000);
  }, [startTs, endTs, selectedShift.status, now]);

  const scheduledHours = useMemo(() => {
    if (!startTs || !endTs) return 0;
    return Math.max(0, (endTs - startTs) / 3_600_000);
  }, [startTs, endTs]);

  const basePay = (selectedShift.hourlyWage || 0) * scheduledHours;
  const tax = basePay * TAX_RATE;
  const total = Math.max(0, basePay - tax);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const any = (selectedShift as any).punchedInAt;
    if (selectedShift.status === "in-progress" && any) {
      setPunchStartMs(new Date(any).getTime());
    }
  }, [selectedShift.status]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3, toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const refreshDistance = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = getDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          selectedShift.latitude,
          selectedShift.longitude
        );
        setDistM(d);
      },
      () => {}
    );
  };
  useEffect(() => {
    if (!askedRef.current) {
      askedRef.current = true;
      refreshDistance();
    }
  }, []);

  const requireNearby = async (cb: () => Promise<void> | void) => {
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const d = getDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          selectedShift.latitude,
          selectedShift.longitude
        );
        setDistM(d);
        if (d <= METERS_RADIUS) {
          try {
            await cb();
          } finally {
            setBusy(false);
          }
        } else {
          alert(`You must be within ${METERS_RADIUS} meters of the job site. You are ~${d.toFixed(0)}m away.`);
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        alert("Location permission is required.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  const handlePunchIn = () => {
    const nowTs = Date.now();
    if (!startTs || !endTs) {
      alert("Shift start and end times are not set yet.");
      return;
    }
    if (nowTs < startTs) {
      alert("You cannot punch in before the scheduled start time.");
      return;
    }
    if (nowTs > endTs) {
      alert("You cannot punch in after the scheduled end time.");
      return;
    }
    requireNearby(async () => {
      await punchIn(selectedShift.id);
      setPunchStartMs(Date.now());
    });
  };

  // Punch out allowed after end for overtime
  const handlePunchOut = () =>
    requireNearby(async () => {
      await punchOut(selectedShift.id);
      setPunchStartMs(null);
    });

  const timerText = (() => {
    const start = punchStartMs;
    if (!start) return null;
    const secs = Math.max(0, Math.floor((now - start) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4 max-w-md mx-auto">
        {/* Header */}
        <button onClick={() => setCurrentPage("home")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>

        <div className="mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{selectedShift.title}</h1>
          <p className="text-gray-500 -mt-1">{secondaryLine}</p>
        </div>

        {/* Date & time row */}
        <div className="mt-4">
          <p className="text-sm text-gray-500">{fmtDate(selectedShift.startTime)}</p>
          <p className="text-3xl font-extrabold text-gray-900">
            {fmtTimeHM(selectedShift.startTime)} <span className="font-semibold">To</span> {fmtTimeHM(selectedShift.endTime)}
          </p>
          <p className="text-gray-500 mt-1">{scheduledHours.toFixed(0)} hours</p>
        </div>

        {/* Location label */}
        <div className="mt-6">
          <div className="flex items-center space-x-2 text-gray-700">
            <MapPin size={18} />
            <span className="font-medium">{selectedShift.location}</span>
          </div>
        </div>

        {/* Map preview (click → Google Maps) */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${selectedShift.latitude},${selectedShift.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 overflow-hidden rounded-2xl shadow-sm"
        >
          <div className="w-full h-44 bg-gray-200">
            <iframe
              title="map"
              className="w-full h-full pointer-events-none"
              src={`https://www.google.com/maps?q=${selectedShift.latitude},${selectedShift.longitude}&z=16&output=embed`}
              loading="lazy"
            />
          </div>
        </a>

        {/* Payment card */}
        <div className="mt-6 rounded-2xl border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment</h3>
          <div className="mt-2 space-y-1 text-gray-600">
            <div className="flex items-center">
              <DollarSign size={16} className="mr-2" />
              <span>JOD {Number(selectedShift.hourlyWage || 0).toFixed(2)}/hr × {scheduledHours.toFixed(0)} hours</span>
            </div>
            <div className="text-gray-500">{(TAX_RATE * 100).toFixed(0)}% Worker Tax</div>
          </div>
          <div className="mt-2 font-bold text-gray-900">
            {fmtMoney(total)} <span className="font-normal text-gray-500">Total</span>
          </div>
        </div>

        {/* Button + live timer */}
        <div className="mt-4">
          {selectedShift.status === "scheduled" && (
            <button
              onClick={handlePunchIn}
              disabled={busy}
              className={`w-full ${busy ? "opacity-70" : ""} bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-2xl shadow`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Play size={20} />
                <span>{busy ? "Checking location..." : "Punch In"}</span>
              </div>
            </button>
          )}

          {selectedShift.status === "in-progress" && (
            <div className="space-y-2">
              <button
                onClick={handlePunchOut}
                disabled={busy}
                className={`w-full ${busy ? "opacity-70" : ""} bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Square size={20} />
                  <span>{busy ? "Checking location..." : "Punch Out"}</span>
                </div>
              </button>
              <div className="text-center text-sm text-gray-700">
                <div className="inline-flex items-center space-x-1">
                  <Clock size={16} />
                  <span>{timerText ?? "00:00:00"}</span>
                </div>
              </div>
            </div>
          )}

          {selectedShift.status === "completed" && (
            <div className="text-center text-blue-700 font-medium p-4 bg-blue-50 rounded-2xl">Shift Completed</div>
          )}

          <div className="text-center text-xs text-gray-500 mt-2">
            {distM != null ? `You are ~${distM.toFixed(0)} m from site` : "—"}
          </div>
        </div>

        {/* Live earnings/hrs */}
        <div className="mt-6 flex items-center space-x-2 text-gray-600">
          <Clock size={18} />
          <span>
            {workedHours.toFixed(2)} hours • {fmtMoney(workedHours * (selectedShift.hourlyWage || 0))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShiftDetailPage;

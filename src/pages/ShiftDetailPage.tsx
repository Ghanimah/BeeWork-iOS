import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPin, DollarSign, Clock, Play, Square, ExternalLink, Navigation } from "lucide-react";
import { useApp } from "../contexts/AppContext";

const METERS_RADIUS = 500;

const ShiftDetailPage: React.FC = () => {
  const { selectedShift, setCurrentPage, punchIn, punchOut } = useApp();
  const [now, setNow] = useState(Date.now());
  const [distM, setDistM] = useState<number | null>(null);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const askedRef = useRef(false);

  if (!selectedShift) return null;

  const fmtTime = (d?: string) =>
    d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "JOD", maximumFractionDigits: 2 }).format(n);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3, toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const calcHours = useMemo(() => {
    const start = selectedShift.startTime ? new Date(selectedShift.startTime).getTime() : null;
    const end = selectedShift.endTime
      ? new Date(selectedShift.endTime).getTime()
      : selectedShift.status === "in-progress"
      ? now
      : null;
    if (!start || !end) return 0;
    return Math.max(0, (end - start) / 3_600_000);
  }, [selectedShift.startTime, selectedShift.endTime, selectedShift.status, now]);

  const earnings = calcHours * (selectedShift.hourlyWage || 0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshDistance = () => {
    if (!("geolocation" in navigator)) {
      setLocErr("Location is not supported on this device.");
      return;
    }
    setLocErr(null);
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
      (err) => setLocErr(err.code === 1 ? "Location permission is required." : "Could not get your location.")
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
    setLocErr(null);
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
      (err) => {
        setBusy(false);
        setLocErr(err.code === 1 ? "Location permission is required." : "Could not get your location.");
        alert(locErr ?? "Location permission is required.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  const handlePunchIn = () => {
    const nowTs = Date.now();
    const startTs = selectedShift.startTime ? new Date(selectedShift.startTime).getTime() : null;
    const endTs = selectedShift.endTime ? new Date(selectedShift.endTime).getTime() : null;

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
    requireNearby(() => punchIn(selectedShift.id));
  };

  // Punch out still allowed after end time (overtime OK)
  const handlePunchOut = () => requireNearby(() => punchOut(selectedShift.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-32">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => setCurrentPage("home")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Shift Details</h1>
        </div>

        <div className="card mb-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 text-center">{selectedShift.title}</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin size={18} />
              <span>{selectedShift.location}</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedShift.latitude},${selectedShift.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center space-x-1"
            >
              <ExternalLink size={16} />
              <span>Map</span>
            </a>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Clock size={18} />
            <span>
              {fmtTime(selectedShift.startTime)} - {fmtTime(selectedShift.endTime)}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Clock size={18} />
            <span>{calcHours.toFixed(2)} hours • {fmtMoney(earnings)}</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <DollarSign size={18} />
            <span>{fmtMoney(selectedShift.hourlyWage || 0)}/hour</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <button onClick={refreshDistance} className="flex items-center space-x-1 underline">
              <Navigation size={16} />
              <span>Check distance</span>
            </button>
            <span>{distM != null ? `~${distM.toFixed(0)} m away` : locErr ? "Location unavailable" : "—"}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="max-w-md mx-auto">
          {selectedShift.status === "scheduled" && (
            <button
              onClick={handlePunchIn}
              disabled={busy}
              className={`w-full ${busy ? "opacity-70" : ""} bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2`}
            >
              <Play size={20} />
              <span>{busy ? "Checking location..." : "Punch In"}</span>
            </button>
          )}

          {selectedShift.status === "in-progress" && (
            <button
              onClick={handlePunchOut}
              disabled={busy}
              className={`w-full ${busy ? "opacity-70" : ""} btn-danger py-4 flex items-center justify-center space-x-2`}
            >
              <Square size={20} />
              <span>{busy ? "Checking location..." : "Punch Out"}</span>
            </button>
          )}

          {selectedShift.status === "completed" && (
            <div className="text-center text-blue-700 font-medium p-4 bg-blue-50 rounded-xl">Shift Completed</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftDetailPage;

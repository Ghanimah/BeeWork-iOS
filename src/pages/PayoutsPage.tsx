import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Building2, CalendarDays, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection, query, where, getDocs, doc, getDoc
} from "firebase/firestore";

type Row = {
  id: string;
  company: string;
  campaign: string;
  location: string;
  dateStr: string;
  amount: number;
};

const currency = (n: number) => `JOD ${n.toFixed(2)}`;
const pad2 = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function startOfThuToWed(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // Sun=0..Sat=6, Thu=4
  const diffToThu = (dow >= 4 ? dow - 4 : dow + 3);
  d.setDate(d.getDate() - diffToThu - offset * 7);
  return d; // Thu 00:00
}
function endOfPeriod(start: Date) { const e = new Date(start); e.setDate(e.getDate() + 7); return e; }
function fmtRange(start: Date, endExcl: Date) {
  const endInc = new Date(endExcl.getTime() - 1);
  const f = (dt: Date) => dt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${f(start)} – ${f(endInc)}`;
}

const PayoutsPage: React.FC = () => {
  const nav = useNavigate();
  const [weeksBack, setWeeksBack] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const periodStart = useMemo(() => startOfThuToWed(weeksBack), [weeksBack]);
  const periodEndEx = useMemo(() => endOfPeriod(periodStart), [periodStart]);
  const periodLabel = useMemo(() => fmtRange(periodStart, periodEndEx), [periodStart, periodEndEx]);
  const weekThursISO = useMemo(() => ymd(periodStart), [periodStart]);
  const canGoNext = weeksBack > 0; // next disabled on current period

  useEffect(() => {
    const load = async () => {
      const u = auth.currentUser;
      if (!u) return;
      setLoading(true);

      // Pull all PAID timesheets for this pay period, then filter to this user robustly.
      const qTs = query(
        collection(db, "timesheets"),
        where("weekThursISO", "==", weekThursISO),
        where("isPaid", "==", true)
      );
      const snap = await getDocs(qTs);

      const out: Row[] = [];
      for (const docSnap of snap.docs) {
        const d = docSnap.data() as any;

        // Robust employee match (employeeId OR userId OR uid), fallback via shift.assigned[]
        const uid = u.uid;
        const directMatch =
          d.employeeId === uid || d.userId === uid || d.uid === uid;

        let shiftAllows = false;
        if (!directMatch && d.shiftId) {
          try {
            const sSnap = await getDoc(doc(db, "shifts", String(d.shiftId)));
            if (sSnap.exists()) {
              const s = sSnap.data() as any;
              if (Array.isArray(s.assigned)) shiftAllows = s.assigned.includes(uid);
            }
          } catch { /* ignore */ }
        }
        if (!directMatch && !shiftAllows) continue;

        // Resolve company / campaign from shift when possible
        let company = "Shift";
        let campaign = "";
        if (d.shiftId) {
          try {
            const sSnap = await getDoc(doc(db, "shifts", String(d.shiftId)));
            if (sSnap.exists()) {
              const s = sSnap.data() as any;
              company  = s.companyName || s.eventName || s.title || company;
              campaign = s.campaign || s.jobTitle || campaign;
            }
          } catch { /* ignore */ }
        }
        // Fallbacks (if you stored them on the timesheet)
        if (!campaign && typeof d.campaign === "string") campaign = d.campaign;

        // Date from timesheet.start (Timestamp or ISO string)
        let dateStr = "";
        const st = d?.start?.toDate?.() ?? (typeof d?.start === "string" ? new Date(d.start) : null);
        if (st) dateStr = st.toLocaleDateString();

        // Amount precedence
        const amount =
          typeof d.totalPayJOD === "number" ? d.totalPayJOD :
          (typeof d.totalHours === "number" && typeof d.rateJOD === "number"
            ? Math.round(d.totalHours * d.rateJOD * 100) / 100
            : (typeof d.payJOD === "number" ? d.payJOD : 0));

        const location = typeof d.location === "string" ? d.location : "";

        out.push({
          id: docSnap.id,
          company,
          campaign,
          location,
          dateStr,
          amount: Math.round(Number(amount || 0) * 100) / 100
        });
      }

      out.sort((a, b) => (a.dateStr || "").localeCompare(b.dateStr || ""));
      setRows(out);
      setLoading(false);
    };

    load();
  }, [weekThursISO, weeksBack]);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 pt-4 max-w-md mx-auto">
        {/* Back */}
        <div className="flex items-center">
          <button
            onClick={() => nav("/profile")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to Profile"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Period header (lowered under back) */}
        <div className="mt-2 text-center">
          <div className="text-base font-semibold text-gray-900">{periodLabel}</div>
          <div className="text-xs text-gray-500">Pay Period (Thu → Wed)</div>
        </div>

        {/* Period nav */}
        <div className="mt-3 mb-4 flex items-center justify-between">
          <button
            onClick={() => setWeeksBack(weeksBack + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-black hover:bg-gray-50"
          >
            <ChevronLeft size={16} /> Previous Period
          </button>

          <button
            onClick={() => canGoNext && setWeeksBack(weeksBack - 1)}
            disabled={!canGoNext}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border ${
              canGoNext ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            Next Period <ChevronRight size={16} />
          </button>
        </div>

        {/* Total */}
        <div className="card mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Paid</span>
            <span className="text-xl font-bold text-gray-900">{currency(total)}</span>
          </div>
        </div>

        {/* Rows */}
        <div className="card divide-y">
          {loading ? (
            <div className="py-6 text-center text-gray-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-gray-500">No paid shifts in this period.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                      <Building2 size={16} /> <span className="truncate">{r.company}</span>
                    </div>
                    {r.campaign && (
                      <div className="text-xs text-gray-600 mt-0.5 truncate">
                        Campaign: {r.campaign}
                      </div>
                    )}
                    {r.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                        <MapPin size={14} /> <span className="truncate">{r.location}</span>
                      </div>
                    )}
                    {r.dateStr && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <CalendarDays size={14} /> <span>{r.dateStr}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gray-900 font-semibold whitespace-nowrap">
                    <Coins size={16} /> {currency(r.amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
};

export default PayoutsPage;

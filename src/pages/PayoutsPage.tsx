// src/pages/PayoutsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, CalendarDays, Coins, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

type Row = { id: string; company: string; campaign: string; location: string; dateStr: string; hours: number; amount: number; };

const currency = (n:number)=>`JOD ${n.toFixed(2)}`;
const pad2 = (n:number)=>String(n).padStart(2,"0");
const ymd = (d:Date)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const addDays=(d:Date, n:number)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };

function startOfThuToWed(offset=0){
  const d=new Date(); d.setHours(0,0,0,0);
  const dow=d.getDay(); const diff=dow>=4?dow-4:dow+3; // Thu=4
  d.setDate(d.getDate()-diff-offset*7);
  return d;
}
function endOfPeriod(s:Date){ const e=new Date(s); e.setDate(e.getDate()+7); return e; }
function fmtRange(s:Date, eEx:Date){
  const e=new Date(eEx.getTime()-1);
  const f=(dt:Date)=>dt.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"});
  return `${f(s)} – ${f(e)}  (Thu → Wed)`;
}

const asNumber=(v:any)=>Number.isFinite(Number(v))?Number(v):0;

/** Parses:
 *  - Firestore Timestamp (via toDate)
 *  - ISO strings
 *  - "October 1, 2025 at 1:30:00 AM UTC+3"
 */
const asDate=(v:any):Date|undefined=>{
  if(!v) return;
  if(v instanceof Date) return v;
  if(typeof v?.toDate==="function"){ const d=v.toDate(); return isNaN(+d)?undefined:d; }
  if(typeof v==="string"){
    let d = new Date(v);
    if(!isNaN(+d)) return d;
    // try to normalize " at " + "UTC+3" -> " GMT+0300"
    let s=v.replace(" at "," ");
    const m = s.match(/UTC([+-]?\d{1,2})/i);
    if(m){
      const h = parseInt(m[1],10);
      const sign = h>=0?"+":"-";
      const abs = Math.abs(h);
      const gmt = `GMT${sign}${pad2(abs)}00`;
      s = s.replace(/UTC[+-]?\d{1,2}/i, gmt);
    }
    d = new Date(s);
    if(!isNaN(+d)) return d;
  }
  return;
};

export default function PayoutsPage(){
  const nav = useNavigate();
  const [weeksBack, setWeeksBack] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const periodStart = useMemo(()=>startOfThuToWed(weeksBack),[weeksBack]);
  const periodEndEx = useMemo(()=>endOfPeriod(periodStart),[periodStart]);
  const periodLabel = useMemo(()=>fmtRange(periodStart,periodEndEx),[periodStart,periodEndEx]);
  const candidateKeys = useMemo(()=>[ymd(addDays(periodStart,-1)), ymd(periodStart), ymd(addDays(periodStart,1))],[periodStart]);
  const canGoNext = weeksBack>0;

  useEffect(()=>{ (async()=>{
    const u = auth.currentUser; if(!u) return;
    setLoading(true);

    const out: Row[] = [];
    const seen = new Set<string>();

    // Prefer indexed compound query: my docs in this period (±1 day)
    // Falls back to three separate queries if 'in' is not available.
    const runQuery = async (keys: string[])=>{
      try{
        const qTs = query(
          collection(db,"timesheets"),
          where("employeeId","==",u.uid),
          where("weekThursISO","in", keys)
        );
        return await getDocs(qTs);
      }catch{
        // fallback: run three queries
        const all:any[] = [];
        for(const k of keys){
          const qTs = query(collection(db,"timesheets"), where("employeeId","==",u.uid), where("weekThursISO","==",k));
          const s = await getDocs(qTs);
          all.push(...s.docs);
        }
        return { docs: all } as any;
      }
    };

    const snap = await runQuery(candidateKeys);

    for(const docSnap of snap.docs){
      if(seen.has(docSnap.id)) continue; seen.add(docSnap.id);
      const d:any = docSnap.data();

      // Primary: per-shift breakdown
      if(Array.isArray(d.breakdown) && d.breakdown.length){
        d.breakdown.forEach((b:any, i:number)=>{
          const hours = asNumber(b.totalHours ?? b.hours);
          const company = b.companyName ?? d.companyName ?? "Shift";
          const campaign = b.campaignName ?? b.campaign ?? d.campaign ?? "";
          const location = b.locationName ?? (typeof b.location==="string"? b.location : d.locationName ?? d.location ?? "");
          const dt = asDate(b.date) ?? asDate(b.start) ?? asDate(b.eventStart) ?? asDate(b.end) ?? asDate(b.eventEnd);
          const amountRaw = (b.totalPayJOD ?? b.payJOD ?? b.amountJOD);
          const amount = asNumber(amountRaw ?? (hours * asNumber(b.rateJOD ?? d.rateJOD)));

          if(hours>0 || amount>0){
            out.push({
              id:`${docSnap.id}_${i}`,
              company, campaign, location,
              dateStr: dt ? dt.toLocaleDateString() : "",
              hours: Math.round(hours*100)/100,
              amount: Math.round(amount*100)/100
            });
          }
        });
        continue;
      }

      // Fallback: single weekly row
      const totalHours = asNumber(d.totalHours);
      let amount = d.totalPayJOD !== undefined ? asNumber(d.totalPayJOD) : totalHours * asNumber(d.rateJOD);
      let company = d.companyName ?? "Week Total";
      let campaign = d.campaign ?? "";
      let location = d.locationName ?? d.location ?? "";
      if(d.shiftId){
        try{
          const sSnap = await getDoc(doc(db,"shifts", String(d.shiftId)));
          if(sSnap.exists()){
            const s:any = sSnap.data();
            company = s.companyName || s.eventName || company;
            campaign = s.campaign || campaign;
            location = location || s.locationName || "";
          }
        }catch{}
      }
      const st = asDate(d.start) ?? asDate(d.eventStart);
      out.push({
        id: docSnap.id,
        company, campaign, location,
        dateStr: st ? st.toLocaleDateString() : "",
        hours: Math.round(totalHours*100)/100,
        amount: Math.round(asNumber(amount)*100)/100
      });
    }

    out.sort((a,b)=>(a.dateStr||"").localeCompare(b.dateStr||""));
    setRows(out);
    setLoading(false);
  })(); },[candidateKeys.join("|")]);

  const total = rows.reduce((s,r)=>s+r.amount,0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 pt-6 max-w-md mx-auto">
        <div className="flex items-center">
          <button onClick={()=>nav("/profile")} className="p-2 rounded-lg hover:bg-gray-100 -ml-2" aria-label="Back">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="ml-3 text-2xl font-extrabold text-gray-900">Payouts</h1>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">Pay Period</div>
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
            <button onClick={()=>setWeeksBack(w=>w+1)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-900" aria-label="Previous period">
              <ChevronLeft size={16}/>
            </button>
            <span className="mx-2 text-xs sm:text-sm font-semibold text-gray-900">{periodLabel}</span>
            <button onClick={()=>weeksBack>0 && setWeeksBack(w=>w-1)} disabled={weeksBack===0}
              className={`p-1.5 rounded-md ${weeksBack>0?"hover:bg-gray-100 text-gray-900":"text-gray-400"}`} aria-label="Next period">
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-md mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Coins size={18} /><span className="text-sm">Total (completed shifts)</span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{currency(total)}</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_,i)=>(<div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"/><div className="h-3 bg-gray-100 rounded w-1/2 mb-1.5"/><div className="h-3 bg-gray-100 rounded w-2/3"/></div>))}</div>
          ) : rows.length===0 ? (
            <div className="py-10 text-center"><div className="text-sm font-semibold text-gray-900">No completed shifts</div><div className="text-xs text-gray-500">Nothing finished in this period</div></div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rows.map(r=>(
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">{r.company}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        {r.location && <span className="inline-flex items-center gap-1"><MapPin size={12}/><span className="truncate">{r.location}</span></span>}
                        {r.dateStr && <span className="inline-flex items-center gap-1"><CalendarDays size={12}/> {r.dateStr}</span>}
                        <span className="inline-flex items-center gap-1"><Clock size={12}/> {r.hours.toFixed(2)} h</span>
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-base font-bold text-gray-900">{currency(r.amount)}</div>
                  </div>
                  {r.campaign && <div className="mt-1 text-xs text-gray-600">{r.campaign}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={()=>setWeeksBack(w=>w+1)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
            <div className="flex items-center justify-center gap-1"><ChevronLeft size={16}/>Previous</div>
          </button>
          <button onClick={()=>weeksBack>0 && setWeeksBack(w=>w-1)} disabled={weeksBack===0}
            className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${weeksBack>0?"border border-gray-300 bg-white text-gray-900 hover:bg-gray-100":"border border-gray-200 bg-gray-50 text-gray-400"}`}>
            <div className="flex items-center justify-center gap-1">Next <ChevronRight size={16}/></div>
          </button>
        </div>

        <button onClick={()=>nav("/profile")} className="mt-3 w-full rounded-xl bg-amber-500 text-white py-3 font-bold hover:bg-amber-600">Back to Profile</button>
      </div>
    </div>
  );
}

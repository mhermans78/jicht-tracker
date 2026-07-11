import { useState, useEffect, useCallback } from "react";

// Data komt via Netlify function — geen directe Supabase calls vanuit artifact
const API = "https://jichttracker.nl/.netlify/functions/admin-data";
const ADMIN_TOKEN = "jicht-admin-2026";
const PIN = "1984";

async function fetchData() {
  const r = await fetch(API, {
    headers: { Authorization: "Bearer " + ADMIN_TOKEN },
  });
  if (!r.ok) throw new Error("HTTP " + r.status + ": " + (await r.text()).slice(0, 100));
  return r.json();
}

// ─── PIN ──────────────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);

  const press = useCallback((d) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      if (next.join("") === PIN) onUnlock();
      else { setShake(true); setTimeout(() => { setShake(false); setDigits([]); }, 650); }
    }
  }, [digits, onUnlock]);

  const keys = [1,2,3,4,5,6,7,8,9,null,0,"⌫"];

  return (
    <div style={{ minHeight:"100vh", background:"#0B0E1A", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes sh{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}50%{transform:translateX(10px)}80%{transform:translateX(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .pk:hover{background:rgba(99,102,241,0.18)!important;border-color:rgba(99,102,241,0.5)!important}
      `}</style>
      <div style={{ animation:`fadeUp .5s ease${shake?",sh .4s ease":""}`, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", margin:"0 auto 20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, boxShadow:"0 8px 32px rgba(99,102,241,.4)" }}>🦶</div>
        <div style={{ color:"#fff", fontSize:20, fontWeight:800, letterSpacing:-.5, marginBottom:2 }}>Jicht Tracker</div>
        <div style={{ color:"rgba(255,255,255,.35)", fontSize:12, letterSpacing:2, textTransform:"uppercase", marginBottom:36 }}>Admin · HOBC BV</div>
        <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:32 }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:digits.length>i?"#6366f1":"rgba(255,255,255,.12)", boxShadow:digits.length>i?"0 0 12px #6366f1":"none", transition:"all .15s" }}/>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,72px)", gap:10, justifyContent:"center" }}>
          {keys.map((k,i)=>{
            if(k===null) return <div key={i}/>;
            return (
              <button key={i} className="pk" onClick={()=>k==="⌫"?setDigits(d=>d.slice(0,-1)):press(k)}
                style={{ height:72, border:"1px solid rgba(255,255,255,.08)", borderRadius:16, background:"rgba(255,255,255,.05)", color:"#fff", fontSize:k==="⌫"?20:24, fontWeight:600, cursor:"pointer", transition:"all .12s" }}>
                {k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function Donut({ slices, size=140, stroke=20 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s,x)=>s+x.value,0)||1;
  let off = 0;
  const arcs = slices.map(s => {
    const dash = (s.value/total)*circ;
    const arc = { dash, off, color:s.color, value:s.value };
    off += dash;
    return arc;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
      {arcs.map((a,i)=>(
        <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
          stroke={a.color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${a.dash-2} ${circ}`} strokeDashoffset={-a.off}
          style={{ filter:`drop-shadow(0 0 5px ${a.color}66)` }}/>
      ))}
    </svg>
  );
}

// ─── Arc gauge ────────────────────────────────────────────────────────────────
function ArcGauge({ value, max, color, size=170 }) {
  const pct = Math.min(1, max>0 ? value/max : 0);
  const cx = size/2, cy = size*0.57, r = size*0.37;
  const toXY = (deg, rad) => ({ x: cx + rad*Math.cos(deg*Math.PI/180), y: cy + rad*Math.sin(deg*Math.PI/180) });
  const arc = (f, t) => { const s=toXY(f,r),e=toXY(t,r); return `M${s.x},${s.y} A${r},${r} 0 ${t-f>180?1:0} 1 ${e.x},${e.y}`; };
  const sd = -210, ed = 30, sw = ed-sd;
  const ad = sd + pct*sw;
  const tip=toXY(ad,r*0.76), b1=toXY(ad+90,5), b2=toXY(ad-90,5);
  const ticks = Array.from({length:9},(_,i)=>{ const a=sd+(i/8)*sw; return { a1:toXY(a,r+2), a2:toXY(a,r-(i%4===0?10:5)) }; });
  return (
    <svg width={size} height={size*.68} viewBox={`0 0 ${size} ${size*.68}`} style={{overflow:"visible"}}>
      <path d={arc(sd,ed)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={8} strokeLinecap="round"/>
      {pct>0&&<path d={arc(sd,ad)} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${color})`}}/>}
      {ticks.map((t,i)=><line key={i} x1={t.a1.x} y1={t.a1.y} x2={t.a2.x} y2={t.a2.y} stroke="rgba(255,255,255,.18)" strokeWidth={i%4===0?2:1}/>)}
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill={color} style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
      <circle cx={cx} cy={cy} r={6} fill="#13172a" stroke={color} strokeWidth={2}/>
    </svg>
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent="#6366f1", icon, badge }) {
  return (
    <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"22px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:accent, opacity:.08, filter:"blur(28px)", pointerEvents:"none" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ fontSize:22 }}>{icon}</div>
        {badge && <div style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20, background:`${accent}22`, color:accent }}>{badge}</div>}
      </div>
      <div style={{ fontSize:36, fontWeight:800, color:"#fff", lineHeight:1, letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.5)", marginTop:6 }}>{label}</div>
      {sub&&<div style={{ fontSize:11, color:"rgba(255,255,255,.28)", marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ─── Spark bars ───────────────────────────────────────────────────────────────
function Sparkbar({ months }) {
  const maxV = Math.max(...months.map(m=>m.count), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:64 }}>
      {months.map((m,i)=>{
        const last = i===months.length-1;
        const h = Math.max((m.count/maxV)*50, m.count>0?6:2);
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            {last&&m.count>0&&<div style={{ fontSize:9, color:"#a5b4fc", fontWeight:700 }}>{m.count}</div>}
            <div style={{ width:"100%", height:h, borderRadius:"3px 3px 0 0", background:last?"linear-gradient(180deg,#818cf8,#6366f1)":"rgba(255,255,255,.13)", boxShadow:last?"0 0 8px #6366f166":"none", transition:"height .7s ease" }}/>
            <div style={{ fontSize:8, color:last?"#a5b4fc":"rgba(255,255,255,.22)", fontWeight:last?700:400, textTransform:"uppercase" }}>{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cockpit ─────────────────────────────────────────────────────────────────
function Cockpit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const now = new Date();

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await fetchData()); }
    catch(e) { setErr(e.message); }
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  return (
    <div style={{ minHeight:"100vh", background:"#0B0E1A", fontFamily:"'Inter',system-ui,sans-serif", color:"#fff", padding:"28px 32px" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.rfbtn:hover{background:rgba(99,102,241,.22)!important}`}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 16px rgba(99,102,241,.4)" }}>🦶</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:-.4 }}>Jicht Tracker</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", letterSpacing:1.5, textTransform:"uppercase" }}>Admin Cockpit · HOBC BV</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.25)" }}>{now.toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"})}</div>
          <button className="rfbtn" onClick={load} style={{ background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.28)", borderRadius:12, padding:"8px 18px", color:"#a5b4fc", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .15s" }}>↻ Refresh</button>
        </div>
      </div>

      {err&&<div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:14, padding:"12px 18px", color:"#fca5a5", fontSize:13, marginBottom:24 }}>⚠ {err}</div>}

      {loading?(
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"55vh", flexDirection:"column", gap:14 }}>
          <div style={{ width:36, height:36, border:"3px solid rgba(99,102,241,.15)", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
          <div style={{ color:"rgba(255,255,255,.3)", fontSize:13 }}>Dashboard laden...</div>
        </div>
      ):data&&(
        <div style={{ animation:"fadeUp .45s ease" }}>

          {/* Rij 1: 4 tiles */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
            <Tile icon="👥" label="Totaal gebruikers" value={data.total} accent="#6366f1" sub={`${data.freeCount} gratis · ${data.proCount} pro`}/>
            <Tile icon="🆕" label="Nieuw deze maand" value={data.newThis} accent="#06b6d4"
              badge={data.growth!=null?(data.growth>=0?"▲ "+data.growth+"%":"▼ "+Math.abs(data.growth)+"%"):null}
              sub={`Vorige maand: ${data.newPrev}`}/>
            <Tile icon="🟢" label="Actief (laatste 3 dgn)" value={data.active} accent="#10b981" sub={`${data.inactive} niet actief`}/>
            <Tile icon="⭐" label="Pro accounts" value={data.proCount} accent="#f59e0b"
              sub={data.total>0?Math.round(data.proCount/data.total*100)+"% van totaal":""}/>
          </div>

          {/* Rij 2: gauges + donut */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.2fr", gap:16, marginBottom:16 }}>

            {/* Activiteitsratio gauge */}
            <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-40, left:-40, width:120, height:120, borderRadius:"50%", background:"#10b981", opacity:.07, filter:"blur(40px)" }}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:2, marginBottom:8 }}>Activiteitsratio</div>
              <ArcGauge value={data.active} max={data.total||1} color="#10b981" size={170}/>
              <div style={{ fontSize:42, fontWeight:800, color:"#10b981", lineHeight:1, marginTop:-4 }}>
                {data.total>0?Math.round(data.active/data.total*100):0}<span style={{ fontSize:18, color:"rgba(255,255,255,.35)", fontWeight:400 }}>%</span>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:6 }}>{data.active} van {data.total} gebruikers</div>
            </div>

            {/* Pro conversie gauge */}
            <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-40, right:-40, width:120, height:120, borderRadius:"50%", background:"#f59e0b", opacity:.07, filter:"blur(40px)" }}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:2, marginBottom:8 }}>Pro conversie</div>
              <ArcGauge value={data.proCount} max={data.total||1} color="#f59e0b" size={170}/>
              <div style={{ fontSize:42, fontWeight:800, color:"#f59e0b", lineHeight:1, marginTop:-4 }}>
                {data.total>0?Math.round(data.proCount/data.total*100):0}<span style={{ fontSize:18, color:"rgba(255,255,255,.35)", fontWeight:400 }}>%</span>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:6 }}>{data.proCount} pro van {data.total}</div>
            </div>

            {/* Donut verdeling */}
            <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"24px", position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:2, marginBottom:16 }}>Verdeling</div>
              <div style={{ display:"flex", alignItems:"center", gap:24 }}>
                <div style={{ position:"relative", flexShrink:0 }}>
                  <Donut size={140} stroke={20} slices={[
                    { value:data.freeCount, color:"#6366f1" },
                    { value:data.proCount,  color:"#f59e0b" },
                    { value:Math.max(0,data.active-data.proCount), color:"#10b981" },
                  ]}/>
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontSize:24, fontWeight:800 }}>{data.total}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:1 }}>totaal</div>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  {[
                    { color:"#6366f1", label:"Gratis", value:data.freeCount, pct:data.total>0?Math.round(data.freeCount/data.total*100):0 },
                    { color:"#f59e0b", label:"Pro",    value:data.proCount,  pct:data.total>0?Math.round(data.proCount/data.total*100):0  },
                    { color:"#10b981", label:"Actief", value:data.active,    pct:data.total>0?Math.round(data.active/data.total*100):0    },
                  ].map(row=>(
                    <div key={row.label} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", background:row.color, boxShadow:`0 0 6px ${row.color}` }}/>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,.55)" }}>{row.label}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700 }}>{row.value}</span>
                      </div>
                      <div style={{ height:4, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:row.pct+"%", height:"100%", background:row.color, borderRadius:2, transition:"width .8s ease" }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rij 3: groeibar */}
          <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>Nieuwe gebruikers</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Afgelopen 6 maanden</div>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.05)", padding:"5px 12px", borderRadius:20 }}>
                +{data.months.reduce((s,m)=>s+m.count,0)} totaal
              </div>
            </div>
            <Sparkbar months={data.months}/>
          </div>

        </div>
      )}

      <div style={{ marginTop:24, textAlign:"center", fontSize:10, color:"rgba(255,255,255,.1)", letterSpacing:1 }}>HOBC BV · Jicht Tracker · {now.getFullYear()}</div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  return unlocked ? <Cockpit /> : <PinScreen onUnlock={() => setUnlocked(true)} />;
}

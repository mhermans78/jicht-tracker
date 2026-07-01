import { useState, useEffect, useCallback, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SU = "https://vblvtkykrcgjaovhqqlg.supabase.co";
const SK = "sb_publishable_qqsEjJUnlH6xiUx_S6mEnQ_zLA_bJNw";
async function sf(path,method="GET",body=null,token=null){ const h={"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+(token||SK),"Prefer":method==="POST"?"return=representation":""};
  const r=await fetch(SU+path,{method,headers:h,body:body?JSON.stringify(body):null});
  const t=await r.text(); return t?JSON.parse(t):null;
}
async function signIn(e,p){return sf("/auth/v1/token?grant_type=password","POST",{email:e,password:p});}
async function signUp(e,p){return sf("/auth/v1/signup","POST",{email:e,password:p});}
async function signOut(t){return sf("/auth/v1/logout","POST",{},t);}
async function getProfile(t){const r=await sf("/rest/v1/profiles?select=*","GET",null,t);return r?.[0]||null;}
async function upsertProfile(d,t){ const r=await fetch(SU+"/rest/v1/profiles",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+t,"Prefer":"return=representation,resolution=merge-duplicates","on-conflict":"id"},body:JSON.stringify(d)});
  return r.ok?r.json():null;
}
async function getEntries(t){return await sf("/rest/v1/entries?select=*&order=date.desc","GET",null,t)||[];}
async function upsertEntry(e,t){ const r=await fetch(SU+"/rest/v1/entries?on_conflict=user_id,date",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+t,"Prefer":"return=representation,resolution=merge-duplicates"},body:JSON.stringify(e)});
  if(!r.ok){const err=await r.json().catch(()=>{});throw new Error(err?.message||"Fout");}
  return r.json();
}

// ── Kleuren & constanten ──────────────────────────────────────────────────────
const C={bg:"#F0F4F8",card:"#FFFFFF",primary:"#1A7A8A",pL:"#D4EEF2",accent:"#C5611A",aL:"#FFF0E5",aT:"#9B4A17",danger:"#B03020",dL:"#FDECEA",success:"#166644",sL:"#E8F5E9",text:"#1C2B35",muted:"#4A6478",border:"#D8E4EA"};
const PC=["#ccc","#4CAF50","#8BC34A","#FF9800","#F44336","#B71C1C"];
const PL=["","Licht","Matig","Ernstig","Hevig","Ondraaglijk"];
const MNL=["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const today=()=>new Date().toISOString().slice(0,10);
const nowT=()=>new Date().toTimeString().slice(0,5);
const fmt=d=>new Date(d+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"});
const inp={width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid "+C.border,fontSize:14,fontFamily:"system-ui,sans-serif",color:C.text,background:C.bg,boxSizing:"border-box",outline:"none"};

const BEWEGING=["Wandelen","Hardlopen","Fietsen","Zwemmen","Yoga","Pilates","Krachttraining","HIIT","Dansen","Golf","Tennis","Tuinieren","Traplopen","Stretchen","Aquagym","Roeien","Skien","Wandelvoetbal","Tai chi","Anders"];
const SUPPL=["Vitamine C","Kersensap/cherry extract","Quercetine","Visolie (omega-3)","Foliumzuur","Probiotica","Curcumine/kurkuma","Magnesium","Zink","Bromelaine","Boswellia","MSM","Collageen","Vitamine D","Anders"];
const MEDP=["Allopurinol","Febuxostat (Adenuric)","Probenecid","Benzbromarone","Colchicine (laag)","Pegloticase"];
const MEDA=["Colchicine (hoog)","Ibuprofen","Naproxen","Indomethacine","Diclofenac","Prednison","Methylprednisolon","Triamcinolon (inj.)"];
const SYMP=["Zwelling","Roodheid","Warmte","Moeite lopen","Moeite bewegen","Tintelingen","Nachtpijn","Koorts","Stijfheid"];
const DCAT=["Water","Koffie/thee","Frisdrank","Alcohol","Fruitsap","Sportdrank","Melk","Anders"];
const PORTIE={ "Water":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Groot glas",i:"glas",ml:300},{l:"Flesje",i:"fles",ml:330},{l:"Fles",i:"fles",ml:500},{l:"Grote fles",i:"fles",ml:750}], "Koffie/thee":[{l:"Espresso",i:"kop",ml:30},{l:"Kopje",i:"kop",ml:150},{l:"Groot kopje",i:"kop",ml:250},{l:"Mok",i:"mok",ml:350}], "Frisdrank":[{l:"Glas",i:"glas",ml:200},{l:"Blikje",i:"blik",ml:330},{l:"Flesje",i:"fles",ml:500},{l:"Groot glas",i:"glas",ml:400}], "Alcohol":[{l:"Borrel",i:"shot",ml:35},{l:"Wijn",i:"wijn",ml:150},{l:"Biertje",i:"bier",ml:250},{l:"Pint",i:"bier",ml:500}], "Fruitsap":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Groot glas",i:"glas",ml:300},{l:"Flesje",i:"fles",ml:250}], "Sportdrank":[{l:"Klein flesje",i:"fles",ml:250},{l:"Flesje",i:"fles",ml:500},{l:"Grote fles",i:"fles",ml:750}], "Melk":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Groot glas",i:"glas",ml:300}], "Anders":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Kopje",i:"kop",ml:150},{l:"Flesje",i:"fles",ml:330},{l:"Fles",i:"fles",ml:500}],
};
const MMT=["Ontbijt","Lunch","Avondeten","Tussendoor","Avondsnack"];
const PRO_TABS=["drinken","bewegen","slaap","medsuppl","weer","urinezuur"];
const RTABS_S1=[{id:"aanval",icon:"⚠",label:"Aanval"},{id:"pijn",icon:"😣",label:"Pijn"},{id:"urinezuur",icon:"🩸",label:"Urinezuur"}];
const RTABS_S2=[{id:"eten",icon:"🍽",label:"Eten"},{id:"drinken",icon:"💧",label:"Drinken"},{id:"bewegen",icon:"🏃",label:"Bewegen"},{id:"slaap",icon:"😴",label:"Slaap"},{id:"weer",icon:"🌤",label:"Weer"},{id:"medsupp",icon:"💊",label:"Med & Suppl"}];
const MTABS=[["registreer","✏","Registreer"],["overzicht","📖","Dagboek"],["statistieken","📈","Trends"],["analyse","🧠","AI"]];

// ── Helpers ───────────────────────────────────────────────────────────────────
function Card({title,children,accentColor}){ return (
    <div style={{background:C.card,borderRadius:12,padding:"14px 16px",border:"1px solid "+C.border,borderTop:accentColor?"3px solid "+accentColor:"1px solid "+C.border,boxShadow:"0 2px 10px rgba(0,0,0,0.04)"}}>
      {title&&<div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>{title}</div>}
      {children}
    </div>
  );
}
function Chips({opts,sel,onToggle,col=C.primary,bg=C.pL}){ return (
    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
      {opts.map(o=>{ const on=sel.includes(o);
        return <button key={o} onClick={()=>onToggle(o)} style={{padding:"5px 11px",borderRadius:20,fontSize:12,cursor:"pointer",border:"1.5px solid "+(on?col:C.border),background:on?bg:C.card,color:on?col:C.muted,fontWeight:on?700:400}}>{o}</button>;
      })}
    </div>
  );
}
function Row({icon,label,val}){ return (
    <div style={{display:"flex",gap:6,fontSize:12,marginBottom:2}}>
      <span>{icon}</span>
      <span style={{color:C.muted,minWidth:80}}>{label}:</span>
      <span style={{color:C.text,flex:1}}>{val}</span>
    </div>
  );
}
function Empty({icon,text}){return <div style={{textAlign:"center",color:C.muted,marginTop:40}}><div style={{fontSize:40}}>{icon}</div><p style={{fontSize:14}}>{text}</p></div>;}
function Spinner(){return <div style={{textAlign:"center",padding:40,color:C.muted}}><div style={{fontSize:32}}>⏳</div><p style={{fontSize:13,marginTop:8}}>Laden...</p></div>;}

function berekenSlaap(bed,wek){ if(!bed||!wek)return null;
  const[bh,bm]=bed.split(":").map(Number),[wh,wm]=wek.split(":").map(Number);
  let min=(wh*60+wm)-(bh*60+bm);if(min<0)min+=1440;
  return{uren:Math.floor(min/60),min:min%60,totaalMin:min,label:Math.floor(min/60)+"u"+(min%60>0?" "+min%60+"min":""),dec:(min/60).toFixed(1)};
}
function getStats(entries){ const map={};
  entries.forEach(e=>{ const k=e.date.slice(0,7);
    if(!map[k])map[k]={attacks:0,pains:[],slaap:[],uz:[]};
    if((e.aanval?.logs||[]).some(a=>a.type==="actief"))map[k].attacks++;
    (e.pijn_logs||e.pijnLogs||[]).forEach(p=>{if(p.level>0)map[k].pains.push(p.level);});
    if(e.slaap?.uren)map[k].slaap.push(parseFloat(e.slaap.uren));
    (e.urinezuur?.logs||[]).forEach(l=>{if(l.mmol)map[k].uz.push(parseFloat(l.mmol));});
  });
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>({ key:k,label:MNL[parseInt(k.slice(5,7))-1]+" "+k.slice(2,4), attacks:v.attacks, avgPain:v.pains.length?(v.pains.reduce((a,b)=>a+b,0)/v.pains.length).toFixed(1):null, avgSlaap:v.slaap.length?(v.slaap.reduce((a,b)=>a+b,0)/v.slaap.length).toFixed(1):null, avgUZ:v.uz.length?(v.uz.reduce((a,b)=>a+b,0)/v.uz.length).toFixed(2):null, }));
}
function BarChart({data,vk,color,maxV=1,unit=""}){ const max=maxV||Math.max(...data.map(d=>parseFloat(d[vk])||0),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:5,height:90,marginTop:8}}>
      {data.map((d,i)=>{ const val=parseFloat(d[vk])||0;
        const h=max>0?Math.max((val/max)*70,val>0?4:0):0;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:9,color:C.muted,fontWeight:600}}>{val>0?val+unit:""}</div>
            <div style={{width:"100%",height:h,background:color,borderRadius:"3px 3px 0 0"}}/>
            <div style={{fontSize:9,color:C.muted,textAlign:"center",lineHeight:1.2}}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({show,onClose,title,accentColor=C.primary,children}){
  useEffect(()=>{
    if(show){document.body.style.overflow="hidden";}
    else{document.body.style.overflow="";}
    return ()=>{document.body.style.overflow="";};
  },[show]);
  if(!show)return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"env(safe-area-inset-top,0) 0 0"}} onClick={onClose}>
      <div style={{background:C.card,borderRadius:"20px 20px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:680,maxHeight:"min(88vh, calc(100vh - 40px))",overflowY:"auto",margin:"40px auto 0",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,position:"sticky",top:0,background:C.card,zIndex:1,paddingTop:2}}>
          <div style={{fontWeight:700,fontSize:19,color:C.text}}>{title}</div>
          <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,color:C.muted,flexShrink:0}}>✕</button>
        </div>
        <div style={{width:50,height:4,background:accentColor,borderRadius:2,marginBottom:20,flexShrink:0}}/>
        {children}
      </div>
    </div>
  );
}

// ── Informatie modals ─────────────────────────────────────────────────────────
function OverModal({show,onClose}){ return (
    <Modal show={show} onClose={onClose} title="ℹ Over Jicht Tracker">
      <p style={{fontSize:14,lineHeight:1.8,color:C.text,marginBottom:14}}>Jicht Tracker is ontwikkeld door <strong>Maurice Hermans</strong> en wordt aangeboden door <strong>HOBC BV</strong>, vanuit zijn persoonlijke ervaring met jicht.</p>
      <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:14}}>
        <div style={{display:"flex",gap:12,marginBottom:12}}>
          <span style={{fontSize:20}}>🎯</span>
          <div><div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Persoonlijk inzicht</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>De gebruiker helpen beter om te gaan met jicht door patronen en triggers in eigen data te ontdekken.</div></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <span style={{fontSize:20}}>🔬</span>
          <div><div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Anoniem onderzoek</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Op termijn anoniem geaggregeerde data verzamelen om betere behandeling mogelijk te maken.</div></div>
        </div>
      </div>
      <p style={{fontSize:12,color:C.muted,lineHeight:1.6,borderTop:"1px solid "+C.border,paddingTop:14}}>Jicht Tracker is een persoonlijk initiatief en geen medisch hulpmiddel. Raadpleeg altijd uw arts voor medisch advies.</p>
    </Modal>
  );
}

function SupportModal({show,onClose}){ const items=[
    {icon:"📧",title:"E-mail",sub:"Vragen en feedback",val:"support@jichttracker.nl",link:"mailto:support@jichttracker.nl"}, {icon:"🐛",title:"Bug melden",sub:"Iets werkt niet?",val:"Stuur melding",link:"mailto:support@jichttracker.nl?subject=Bug"}, {icon:"💡",title:"Suggestie",sub:"Idee voor verbetering",val:"Stuur suggestie",link:"mailto:support@jichttracker.nl?subject=Suggestie"}, ];
  return (
    <Modal show={show} onClose={onClose} title="🆘 Ondersteuning">
      {items.map(item=>(
        <a key={item.title} href={item.link} style={{display:"flex",gap:14,alignItems:"center",padding:"13px 14px",background:C.bg,borderRadius:12,marginBottom:10,textDecoration:"none"}}>
          <span style={{fontSize:22}}>{item.icon}</span>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:C.text}}>{item.title}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{item.sub}</div></div>
          <div style={{fontSize:12,color:C.primary,fontWeight:600}}>{item.val}</div>
        </a>
      ))}
      <div style={{background:C.pL,borderRadius:12,padding:"13px 14px",marginTop:4}}>
        <div style={{fontSize:12,color:C.muted}}>Versie 1.0 · Maurice Hermans · HOBC BV · 2025</div>
      </div>
    </Modal>
  );
}

function PrivacyModal({show,onClose,entries,wisAlleData,wisConf,setWisConf}){ const sections=[
    {t:"Welke gegevens?",b:"Dagelijkse gezondheidsregistraties: voeding, beweging, slaap, pijn, medicatie en aanvallen. Tevens naam, foto (optioneel) en e-mailadres voor uw account."}, {t:"Hoe gebruiken wij ze?",b:"Uitsluitend om de app te laten functioneren en AI-analyses te bieden. Gegevens worden nooit verkocht aan derden."}, {t:"Anoniem onderzoek",b:"Geaggregeerde en volledig geanonimiseerde gegevens kunnen worden gebruikt voor wetenschappelijk onderzoek naar jicht. Individuele data is nooit herleidbaar tot uw persoon."}, {t:"Beveiliging",b:"Alle gegevens zijn versleuteld opgeslagen via Supabase met Row Level Security. Alleen u heeft toegang tot uw eigen gegevens."}, {t:"Uw rechten (AVG/GDPR)",b:"U heeft het recht uw gegevens in te zien, te corrigeren of te verwijderen. Neem contact op via support@jichttracker.nl."}, {t:"Cookies",b:"Geen tracking-cookies. Alleen een sessie-token wordt lokaal opgeslagen om u ingelogd te houden."}, ];
  return (
    <Modal show={show} onClose={()=>{onClose();setWisConf(false);}} title="🔒 Privacybeleid">
      {sections.map(s=>(
        <div key={s.t} style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:5}}>{s.t}</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{s.b}</div>
        </div>
      ))}
      <div style={{fontSize:11,color:C.muted,borderTop:"1px solid "+C.border,paddingTop:14,marginBottom:20}}>Laatste update: januari 2025 · Maurice Hermans · HOBC BV</div>
      {!wisConf?(
        <button onClick={()=>setWisConf(true)} style={{width:"100%",padding:"12px",background:"transparent",border:"2px solid "+C.danger,borderRadius:10,color:C.danger,fontSize:14,fontWeight:700,cursor:"pointer"}}>
          🗑 Wis mijn data
        </button>
      ):(
        <div style={{background:C.dL,border:"1px solid "+C.danger,borderRadius:12,padding:16}}>
          <div style={{fontWeight:700,color:C.danger,fontSize:14,marginBottom:8}}>Weet je het zeker?</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:14}}>Hiermee worden al je registraties in de app gewist. Dit is niet ongedaan te maken.</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setWisConf(false)} style={{flex:1,padding:"11px",background:C.card,border:"1.5px solid "+C.border,borderRadius:8,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer"}}>Annuleer</button>
            <button onClick={wisAlleData} style={{flex:1,padding:"11px",background:C.danger,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Wis</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DisclaimerModal({show,onClose}){ const sections=[
    {t:"Aansprakelijkheid",b:"Maurice Hermans, HOBC BV en Jicht Tracker aanvaarden geen aansprakelijkheid voor beslissingen op basis van de app-analyses. Raadpleeg altijd uw arts of specialist."}, {t:"AI-analyses",b:"De analyses zijn indicatief en gebaseerd op uw invoer. Ze zijn niet medisch geverifieerd en mogen niet als medisch advies worden beschouwd."}, {t:"Nauwkeurigheid",b:"De gebruiker is zelf verantwoordelijk voor de juistheid van ingevoerde gegevens."}, {t:"Beschikbaarheid",b:"Wij streven naar hoge beschikbaarheid maar garanderen geen ononderbroken toegang."}, ];
  return (
    <Modal show={show} onClose={onClose} title="⚖ Disclaimer" accentColor={C.danger}>
      <div style={{background:C.dL,border:"1px solid "+C.danger,borderRadius:12,padding:14,marginBottom:18}}>
        <div style={{fontWeight:700,color:C.danger,marginBottom:6}}>Geen medisch hulpmiddel</div>
        <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>Jicht Tracker is een persoonlijke registratie-app en vervangt geen medisch advies, diagnose of behandeling.</div>
      </div>
      {sections.map(s=>(
        <div key={s.t} style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:5}}>{s.t}</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{s.b}</div>
        </div>
      ))}
      <div style={{fontSize:11,color:C.muted,borderTop:"1px solid "+C.border,paddingTop:14}}>Jicht Tracker · HOBC BV · Maurice Hermans · Alle rechten voorbehouden</div>
    </Modal>
  );
}

function TherapeutModal({show,onClose,entries,profile,genRapport}){ const [email,setEmail]=useState("");
  const [rapport,setRapport]=useState("");
  const [loading,setLoading]=useState(false);

  async function generate(){ setLoading(true);
    const r=await genRapport("therapeut");
    setRapport(r);
    setLoading(false);
  }

  function verstuur(){ if(!email||!rapport)return;
    const naam=profile.name||"de patient";
    const intro="Geachte therapeut,\n\nHierbij het therapeutisch rapport van "+naam+", op basis van "+entries.length+" dagregistraties in Jicht Tracker.\n\n";
    const footer="\n\n---\nGegenereerd door Jicht Tracker op "+new Date().toLocaleDateString("nl-NL")+"\nDit rapport vervangt geen professionele diagnose.";
    window.location.href="mailto:"+email+"?subject="+encodeURIComponent("Jicht Tracker – Therapeutisch rapport")+"&body="+encodeURIComponent(intro+rapport+footer);
  }

  return (
    <Modal show={show} onClose={()=>{onClose();setRapport("");setEmail("");}} title="🩺 Therapeut raadplegen">
      {entries.length<5?(
        <div style={{background:C.aL,border:"1px solid "+C.accent,borderRadius:12,padding:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}>📋</div>
          <div style={{fontWeight:700,color:C.aT,fontSize:14,marginBottom:8}}>Nog niet genoeg registraties</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>Voor een zinvol therapeutisch rapport zijn minimaal <strong>5 dagregistraties</strong> nodig. Je hebt er nu {entries.length}.</div>
        </div>
      ):(
        <>
          <div style={{background:C.pL,borderRadius:12,padding:"13px 14px",marginBottom:16}}>
            <div style={{fontWeight:700,color:C.primary,marginBottom:5,fontSize:13}}>Hoe werkt dit?</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>De AI stelt een professioneel therapeutisch rapport op. Je kunt dit e-mailen naar een zorgverlener als voorbereiding op een consult.</div>
            <div style={{fontSize:12,color:C.muted,marginTop:6}}>📊 {entries.length} registraties als input</div>
          </div>
          {!rapport&&(
            <button onClick={generate} disabled={loading} style={{width:"100%",padding:"13px",background:loading?C.border:C.primary,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",marginBottom:14,opacity:loading?0.7:1}}>
              {loading?"⏳ Rapport opstellen...":"🧠 Therapeutisch rapport genereren"}
            </button>
          )}
          {rapport&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>Gegenereerd rapport:</div>
                <button onClick={()=>setRapport("")} style={{fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer"}}>↩ Opnieuw</button>
              </div>
              <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:13,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap",border:"1px solid "+C.border,maxHeight:240,overflowY:"auto",marginBottom:14}}>{rapport}</div>
              <div style={{fontSize:12,color:C.muted,fontWeight:700,marginBottom:6}}>Verstuur naar therapeut:</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="therapeut@praktijk.nl" style={{...inp,marginBottom:12}}/>
              <button onClick={verstuur} disabled={!email} style={{width:"100%",padding:"13px",background:email?C.success:C.border,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:email?"pointer":"not-allowed"}}>
                📬 Versturen via mail-app
              </button>
              <div style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:8}}>Je mail-app wordt geopend. Je kunt de e-mail nog aanpassen.</div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

const GEWRICHTEN=[{id:"teen_r",label:"Grote teen rechts",cx:88,cy:348,r:9},{id:"enkel_r",label:"Enkel rechts",cx:92,cy:308,r:9},{id:"knie_r",label:"Knie rechts",cx:98,cy:228,r:10},{id:"heup_r",label:"Heup rechts",cx:108,cy:165,r:9},{id:"teen_l",label:"Grote teen links",cx:172,cy:348,r:9},{id:"enkel_l",label:"Enkel links",cx:168,cy:308,r:9},{id:"knie_l",label:"Knie links",cx:162,cy:228,r:10},{id:"heup_l",label:"Heup links",cx:152,cy:165,r:9},{id:"pols_r",label:"Pols rechts",cx:58,cy:195,r:9},{id:"pols_l",label:"Pols links",cx:202,cy:195,r:9},{id:"elleboog_r",label:"Elleboog rechts",cx:68,cy:148,r:9},{id:"elleboog_l",label:"Elleboog links",cx:192,cy:148,r:9}];

function GewrichtsKaart({sel, onToggle}) {
  const SH = "#DDE6ED";
  const SK = "#B8CAD6";
  return (<div><svg viewBox="0 0 260 380" style={{width:"100%",maxWidth:240,display:"block",margin:"0 auto"}}>
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E8EFF4"/>
            <stop offset="50%" stopColor="#F2F7FA"/>
            <stop offset="100%" stopColor="#E8EFF4"/>
          </linearGradient>
        </defs>

        <ellipse cx="130" cy="28" rx="21" ry="25" fill="url(#bodyGrad)" stroke={SK} strokeWidth="1.5"/>
        <rect x="122" y="50" width="16" height="14" rx="5" fill="url(#bodyGrad)" stroke={SK} strokeWidth="1.2"/>

        <path d="M95,64 Q80,68 76,80 L72,155 Q72,168 85,170 L88,170 L88,245 Q88,250 92,252 L102,252 L102,350 Q102,358 110,358 L120,358 Q126,358 128,352 L130,340 L132,352 Q134,358 140,358 L150,358 Q158,358 158,350 L158,252 L168,252 Q172,250 172,245 L172,170 L175,170 Q188,168 188,155 L184,80 Q180,68 165,64 Z"
          fill="url(#bodyGrad)" stroke={SK} strokeWidth="1.5"/>

        <path d="M76,80 Q60,88 55,110 L50,148 Q48,158 55,162 L62,162 L58,190 Q56,200 62,202 L68,202 Q74,202 74,195 L76,165 L82,165 L85,100 Z"
          fill="url(#bodyGrad)" stroke={SK} strokeWidth="1.5"/>

        <path d="M184,80 Q200,88 205,110 L210,148 Q212,158 205,162 L198,162 L202,190 Q204,200 198,202 L192,202 Q186,202 186,195 L184,165 L178,165 L175,100 Z"
          fill="url(#bodyGrad)" stroke={SK} strokeWidth="1.5"/>

        <path d="M113,65 Q105,70 96,72" stroke={SK} strokeWidth="1" fill="none" opacity="0.5"/>
        <path d="M147,65 Q155,70 164,72" stroke={SK} strokeWidth="1" fill="none" opacity="0.5"/>

        {GEWRICHTEN.map(g=>{const on=sel.includes(g.id),r=g.r||9;return(<g key={g.id} onClick={()=>onToggle(g.id)} style={{cursor:"pointer"}}><circle cx={g.cx} cy={g.cy} r={r+4} fill="transparent"/><circle cx={g.cx} cy={g.cy} r={r} fill={on?C.danger:"white"} stroke={on?C.danger:C.primary} strokeWidth={on?2.5:1.5}/>{on&&<text x={g.cx} y={g.cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontWeight="bold">!</text>}{!on&&<circle cx={g.cx} cy={g.cy} r={3} fill={C.primary} opacity="0.6"/>}</g>);})}
        {sel.map(id=>{const g=GEWRICHTEN.find(x=>x.id===id);if(!g)return null;const isL=g.cx>130;return(<text key={id+"_l"} x={isL?g.cx+(g.r||9)+3:g.cx-(g.r||9)-3} y={g.cy} textAnchor={isL?"start":"end"} dominantBaseline="middle" fontSize="7" fill={C.danger} fontWeight="600">{g.label.replace(" rechts","R").replace(" links","L")}</text>);})}
      </svg><div style={{fontSize:12,textAlign:"center",marginTop:6,color:sel.length>0?C.danger:C.muted,fontWeight:sel.length>0?600:400}}>{sel.length>0?sel.map(id=>GEWRICHTEN.find(g=>g.id===id)?.label).filter(Boolean).join(", "):"Tik op een gewricht om het te selecteren"}</div></div>);}

// ── Scan componenten ────────────────────────────────────────────────────────
function FotoScan({onResult}){
  const[loading,setLoading]=useState(false);
  const ref=useRef(null);
  async function handle(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const b64=ev.target.result.split(",")[1];
      setLoading(true);
      try{
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:150,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:"Wat zie je op deze foto? Geef alleen de naam van het voedsel, drank of supplement in max 8 woorden. Geen uitleg."}]}]})});
        const d=await res.json();
        onResult(d.content?.map(b=>b.text||"").join("").trim()||"");
      }catch{onResult("");}
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }
  return(<div style={{display:"inline"}}><input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:"none"}}/><button onClick={()=>ref.current?.click()} disabled={loading} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+C.primary,background:C.pL,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>{loading?"⏳ Herkennen...":"📷 Scan foto"}</button></div>);
}

function BarcodeScan({onResult}){
  const[loading,setLoading]=useState(false);
  const ref=useRef(null);
  async function handle(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const b64=ev.target.result.split(",")[1];
      setLoading(true);
      try{
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:50,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:"Lees de barcode/EAN uit deze foto. Geef alleen het getal. Als geen barcode: schrijf 'geen'."}]}]})});
        const d=await res.json();
        const barcode=(d.content?.map(b=>b.text||"").join("").trim()||"").replace(/\D/g,"");
        if(!barcode||barcode.length<8){onResult(null,"Geen barcode herkend");setLoading(false);return;}
        const p=await fetch("https://world.openfoodfacts.org/api/v0/product/"+barcode+".json");
        const pd=await p.json();
        if(pd.status===1){onResult(pd.product?.product_name_nl||pd.product?.product_name||pd.product?.brands||"Onbekend product");}
        else{onResult(null,"Product niet gevonden");}
      }catch{onResult(null,"Scan mislukt");}
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }
  return(<div style={{display:"inline"}}><input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:"none"}}/><button onClick={()=>ref.current?.click()} disabled={loading} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+C.accent,background:C.aL,color:C.aT,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>{loading?"⏳ Zoeken...":"🔢 Scan barcode"}</button></div>);
}

// ── Upgrade modal ────────────────────────────────────────────────────────────
function UpgradeModal({show, onClose}) {
  return (
    <Modal show={show} onClose={onClose} title="🔓 Upgrade naar Pro">
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:40,marginBottom:8}}>🦶</div>
        <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:6}}>Jicht Tracker Pro</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>Krijg toegang tot alle 9 registratie-modules en onbeperkte AI-analyses.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {["💧 Drinken registreren","🏃 Beweging bijhouden","😴 Slaap monitoren","💊 Medicatie logging","🌿 Supplementen tracking","🩸 Urinezuurwaarden"].map(f=>(
          <div key={f} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
            <span style={{color:C.success,fontWeight:700}}>✓</span>{f}
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        <div style={{background:C.pL,borderRadius:12,padding:"14px 16px",border:"1.5px solid "+C.primary}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,color:C.primary,fontSize:15}}>Maandelijks</div><div style={{fontSize:12,color:C.muted}}>Maandelijks opzegbaar</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:20,color:C.primary}}>€9</div><div style={{fontSize:11,color:C.muted}}>/maand</div></div>
          </div>
          <button onClick={()=>window.open("https://buy.stripe.com/test_6oUdR17qZ2tW8h84fLdQQ01","_blank")} style={{width:"100%",marginTop:10,padding:"10px",background:C.primary,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Kies maandelijks →
          </button>
        </div>
        <div style={{background:"#F5F0FF",borderRadius:12,padding:"14px 16px",border:"1.5px solid #7C3AED",position:"relative"}}>
          <div style={{position:"absolute",top:-10,right:12,background:"#7C3AED",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:10}}>BESTE DEAL</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,color:"#7C3AED",fontSize:15}}>Jaarlijks</div><div style={{fontSize:12,color:C.muted}}>2 maanden gratis</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:20,color:"#7C3AED"}}>€99</div><div style={{fontSize:11,color:C.muted}}>/jaar</div></div>
          </div>
          <button onClick={()=>window.open("https://buy.stripe.com/test_4gM00bfXv2tW54W7rXdQQ00","_blank")} style={{width:"100%",marginTop:10,padding:"10px",background:"#7C3AED",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Kies jaarlijks →
          </button>
        </div>
      </div>
      <div style={{fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.6}}>
        Betaling via iDEAL, creditcard of SEPA · Veilig via Stripe · Op elk moment opzegbaar
      </div>
    </Modal>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[pw,setPw]=useState("");
  const[pw2,setPw2]=useState("");
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[ok,setOk]=useState("");

  async function handle(){
    setErr("");setOk("");
    if(mode==="register"){
      if(pw!==pw2){setErr("Wachtwoorden komen niet overeen.");return;}
      if(pw.length<6){setErr("Wachtwoord moet minimaal 6 tekens zijn.");return;}
    }
    setLoading(true);
    try{
      if(mode==="register"){
        const d=await signUp(email,pw);
        if(d?.user){
          setOk("Account aangemaakt! Je kunt nu inloggen.");
          setMode("login");setPw("");setPw2("");
        } else {
          throw new Error(d?.error_description||d?.msg||"Registreren mislukt");
        }
      } else {
        const d=await signIn(email,pw);
        if(!d?.access_token)throw new Error("Inloggen mislukt — controleer je gegevens");
        onLogin({token:d.access_token,user:d.user});
      }
    }catch(e){setErr(e.message);}
    setLoading(false);
  }

  return (
    <div style={{fontFamily:"system-ui,sans-serif",background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 20px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:36,marginBottom:4}}>🦶</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:700,color:C.primary}}>Jicht Tracker</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>een product van <strong>HOBC BV</strong></p>
        </div>
        <div style={{background:C.card,borderRadius:16,padding:24,border:"1px solid "+C.border,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          {/* Tab switcher */}
          <div style={{display:"flex",background:C.bg,borderRadius:8,padding:3,marginBottom:20}}>
            {[["login","Inloggen"],["register","Registreren"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");setOk("");}} style={{flex:1,padding:"8px",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:mode===m?700:400,background:mode===m?C.card:"transparent",color:mode===m?C.primary:C.muted,boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{l}</button>
            ))}
          </div>

          {err&&<div style={{background:C.dL,border:"1px solid "+C.danger,borderRadius:8,padding:"9px 12px",color:C.danger,fontSize:13,marginBottom:14}}>{err}</div>}
          {ok&&<div style={{background:C.sL,border:"1px solid #81C784",borderRadius:8,padding:"9px 12px",color:C.success,fontSize:13,marginBottom:14}}>✅ {ok}</div>}

          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:5}}>E-mailadres</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jouw@email.nl" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          <div style={{marginBottom:mode==="register"?12:20}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:5}}>Wachtwoord</div>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Minimaal 6 tekens" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          {mode==="register"&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:5}}>Wachtwoord herhalen</div>
              <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Herhaal wachtwoord" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
            </div>
          )}

          <button onClick={handle} disabled={loading||!email||!pw||(mode==="register"&&!pw2)} style={{width:"100%",padding:"13px",background:(email&&pw&&(mode==="login"||pw2))?C.primary:C.border,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:(email&&pw)?"pointer":"default"}}>
            {loading?"⏳ Even geduld...":(mode==="login"?"Inloggen →":"Account aanmaken →")}
          </button>

          <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.border,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Wil je eerst de app bekijken?</div>
            <button onClick={()=>onLogin({token:"demo",user:{email:"demo@demo.nl"},demo:true})} style={{width:"100%",padding:"11px",background:C.aL,color:C.aT,border:"1.5px solid "+C.accent,borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              👀 Bekijk demo (zonder opslag)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App(){ const[session,setSession]=useState(null);
  const[ready,setReady]=useState(false);
  useEffect(()=>{ try{const s=localStorage.getItem("jicht_session");if(s)setSession(JSON.parse(s));}catch{}
    setReady(true);
  },[]);
  if(!ready)return <Spinner/>;
  if(!session)return <LoginScreen onLogin={s=>{localStorage.setItem("jicht_session",JSON.stringify(s));setSession(s);}}/>;
  return <JichtTracker session={session} onLogout={()=>{localStorage.removeItem("jicht_session");setSession(null);}}/>;
}

// ── Hoofd app ─────────────────────────────────────────────────────────────────
function JichtTracker({session,onLogout}){ const{token}=session;
  const isDemo=session.demo===true;
  const saveTimer=useRef(null);

  // ── ALLE HOOKS EERST ──────────────────────────────────────────────────────
  const[entries,setEntries]=useState([]);
  const[profile,setProfile]=useState({name:"",photo:"",meds:[]});
  const[loading,setLoading]=useState(true);
  const[sync,setSync]=useState("");
  const[mainTab,setMainTab]=useState("registreer");
  const[regDate,setRegDate]=useState(today());
  const[regSec,setRegSec]=useState("eten");
  const[aiResult,setAiResult]=useState("");
  const[aiLoading,setAiLoading]=useState(false);
  const[profSaved,setProfSaved]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const[showProfiel,setShowProfiel]=useState(false);
  const[showRapport,setShowRapport]=useState(false);
  const[rapportEmail,setRapportEmail]=useState("");
  const[rapportTekst,setRapportTekst]=useState("");
  const[rapportLoading,setRapportLoading]=useState(false);
  const[showOver,setShowOver]=useState(false);
  const[showSupport,setShowSupport]=useState(false);
  const[showPrivacy,setShowPrivacy]=useState(false);
  const[showDisc,setShowDisc]=useState(false);
  const[showTher,setShowTher]=useState(false);
  const[showUpgrade,setShowUpgrade]=useState(false);
  const[wisConf,setWisConf]=useState(false);
  const[dag,setDag]=useState(()=>emptyDay());
  const[skip,setSkip]=useState(true);
  const[etenMom,setEtenMom]=useState("Ontbijt");
  const[etenTxt,setEtenTxt]=useState("");
  const[dCat,setDCat]=useState("Water");
  const[dTxt,setDTxt]=useState("");
  const[dMl,setDMl]=useState(200);
  const[dPortie,setDPortie]=useState("Glas");
  const[bMin,setBMin]=useState("");
  const[bAct,setBAct]=useState([]);
  const[bTijd,setBTijd]=useState(()=>nowT());
  const[pLevel,setPLevel]=useState(0);
  const[aType,setAType]=useState("signalen");
  const[aSymp,setASymp]=useState([]);
  const[mType,setMType]=useState("preventie");
  const[mNaam,setMNaam]=useState("");
  const[mAnders,setMAnders]=useState("");
  const[mTijd,setMTijd]=useState(()=>nowT());
  const[sNaam,setSNaam]=useState("");
  const[sAnders,setSAnders]=useState("");
  const[sTijd,setSTijd]=useState(()=>nowT());
  const[uzWaarde,setUzWaarde]=useState("");
  const[weerLoading,setWeerLoading]=useState(false);
  const[uzEenheid,setUzEenheid]=useState("mmol");
  const[newMed,setNewMed]=useState({name:"",dose:"",frequency:""});
  const[nieuwPw,setNieuwPw]=useState("");
  const[nieuwPw2,setNieuwPw2]=useState("");
  const[pwLoading,setPwLoading]=useState(false);
  const[pwMsg,setPwMsg]=useState("");
  const[verwijderConf,setVerwijderConf]=useState(false);
  const[verwijderLoading,setVerwijderLoading]=useState(false);
  const[waterDoel,setWaterDoel]=useState(()=>parseInt(localStorage.getItem('waterDoel')||'2000'));

  function emptyDay(){return{eten:{logs:[]},drinken:{logs:[]},bewegen:{logs:[]},slaap:{uren:"",bedtijd:"",wektijd:""},pijnLogs:[],aanval:{logs:[]},med:{logs:[]},suppl:{logs:[]},urinezuur:{logs:[],eenheid:"mmol"},weer:{logs:[]}};}
  function norm(e){return{...e,pijnLogs:e.pijn_logs||e.pijnLogs||[],eten:e.eten||{logs:[]},drinken:e.drinken||{logs:[]},bewegen:Array.isArray(e.bewegen?.logs)?e.bewegen:{logs:[]},slaap:e.slaap||{uren:"",bedtijd:"",wektijd:""},aanval:Array.isArray(e.aanval?.logs)?e.aanval:{logs:[]},med:Array.isArray(e.med?.logs)?e.med:{logs:[]},suppl:Array.isArray(e.suppl?.logs)?e.suppl:{logs:[]},urinezuur:e.urinezuur&&Array.isArray(e.urinezuur.logs)?e.urinezuur:{logs:[],eenheid:e.urinezuur?.eenheid||"mmol"},weer:e.weer||{logs:[]}};}

  useEffect(()=>{ async function init(){ if(isDemo){setLoading(false);return;}
      try{const[p,es]=await Promise.all([getProfile(token),getEntries(token)]);if(p)setProfile({name:p.name||"",photo:p.photo||"",meds:p.meds||[],plan:p.plan||"free"});setEntries((es||[]).map(norm));}catch(e){console.error(e);}
      setLoading(false);
    }
    init();
  },[]);// eslint-disable-line

  useEffect(()=>{ setSkip(true);
    const ex=entries.find(e=>e.date===regDate);
    setDag(ex?norm(ex):emptyDay());
    setTimeout(()=>setSkip(false),80);
  },[regDate,entries.length]);// eslint-disable-line

  useEffect(()=>{ if(skip)return;
    if(isDemo){setSync("saved");setTimeout(()=>setSync(""),1500);return;}
    if(saveTimer.current)clearTimeout(saveTimer.current);
    setSync("saving");
    saveTimer.current=setTimeout(async()=>{ try{ const sl=berekenSlaap(dag.slaap.bedtijd,dag.slaap.wektijd);
        const payload={user_id:session.user.id,date:regDate,eten:dag.eten,drinken:dag.drinken,bewegen:dag.bewegen,slaap:{...dag.slaap,uren:sl?sl.dec:dag.slaap.uren},pijn_logs:dag.pijnLogs,aanval:dag.aanval,med:dag.med,suppl:dag.suppl,urinezuur:dag.urinezuur,weer:dag.weer};
        const saved=await upsertEntry(payload,token);
        if(saved?.[0]){const n=norm(saved[0]);setEntries(es=>{const i=es.findIndex(e=>e.date===regDate);return i>=0?es.map(e=>e.date===regDate?n:e):[n,...es].sort((a,b)=>b.date.localeCompare(a.date));});}
        setSync("saved");setTimeout(()=>setSync(""),2000);
      }catch(e){console.error("Supabase fout:",e);setSync("error:"+(e?.message||"onbekend"));setTimeout(()=>setSync(""),8000);}
    },800);
  },[dag]);// eslint-disable-line

  const callAI=useCallback(async(mode)=>{ const medInfo=profile.meds?.length>0?"Vaste medicatie: "+profile.meds.map(m=>m.name+" "+m.dose).join(", "):"";
    const summary=entries.slice(0,60).map(e=>{ const pijns=e.pijn_logs||e.pijnLogs||[];
      return e.date+"|E:"+(e.eten?.logs?.map(l=>l.moment+":"+l.tekst).join(";")||"–")+"|D:"+(e.drinken?.logs?.map(l=>l.categorie+"("+l.ml+"ml)").join(",")||"–")+"|B:"+(e.bewegen?.logs?.map(l=>(l.activiteiten?.join(",")||"?")+" "+l.minuten+"min").join("+")||"–")+"|S:"+(e.slaap?.uren?e.slaap.uren+"u":"–")+"|P:"+(pijns.map(p=>p.tijd+" lvl"+p.level).join(",")||"geen")+"|A:"+((e.aanval?.logs||[]).map(a=>a.tijd+":"+a.type).join(",")||"–")+"|M:"+((e.med?.logs||[]).map(m=>m.naam).join(",")||"–");
    }).join("\n");
    const prompts={ analyse:`Je bent expert jichtmanagement. ${medInfo}\nAnalyseer:\n1.🔍PATRONEN\n2.⚠TRIGGERS\n3.✅POSITIEVE TRENDS\n4.💡TIPS(4 concreet)\n5.📈VOORTGANG\nNederlands, empathisch.\n\nDATA:\n${summary}`, rapport:`Maak beknopt medisch jicht-rapport (max 350 woorden). ${medInfo}\n1.SAMENVATTING 2.PIJNVERLOOP 3.TRIGGERS 4.MEDICATIE 5.AANBEVELINGEN\n\nDATA:\n${summary}`, therapeut:`Je bent jicht-therapeut. ${medInfo}\nStel therapeutisch adviesrapport op:\n1.KLINISCH BEELD\n2.LEEFSTIJLANALYSE\n3.TRIGGERS\n4.MEDICATIE\n5.THERAPEUTISCHE AANBEVELINGEN(min 5)\n6.VERVOLGVRAGEN(3)\nProfessioneel, empathisch, max 500 woorden.\n\nDATA:\n${summary}`, };
    try{ const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompts[mode]}]})});
      const d=await r.json();
      return d.content?.map(b=>b.text||"").join("\n")||"Geen resultaat.";
    }catch{return"Fout bij genereren.";}
  },[entries,profile]);

  // ── Mutaties ──────────────────────────────────────────────────────────────
  function addEten(){if(!etenTxt.trim())return;setDag(d=>({...d,eten:{logs:[...d.eten.logs,{moment:etenMom,tekst:etenTxt.trim()}]}}));setEtenTxt("");}
  function remEten(i){setDag(d=>({...d,eten:{logs:d.eten.logs.filter((_,j)=>j!==i)}}));}
  function addDrinken(){setDag(d=>({...d,drinken:{logs:[...d.drinken.logs,{categorie:dCat,tekst:dTxt.trim(),ml:dMl,portie:dPortie,tijd:nowT()}]}}));setDTxt("");}
  function remDrinken(i){setDag(d=>({...d,drinken:{logs:d.drinken.logs.filter((_,j)=>j!==i)}}));}
  function addBewegen(){if(!bMin&&bAct.length===0)return;setDag(d=>({...d,bewegen:{logs:[...(d.bewegen?.logs||[]),{tijd:bTijd,minuten:bMin,activiteiten:[...bAct]}]}}));setBMin("");setBAct([]);setBTijd(nowT());}
  function remBewegen(i){setDag(d=>({...d,bewegen:{logs:(d.bewegen?.logs||[]).filter((_,j)=>j!==i)}}));}
  function addPijn(){if(pLevel===0)return;setDag(d=>({...d,pijnLogs:[...d.pijnLogs,{tijd:nowT(),level:pLevel,label:PL[pLevel]}]}));setPLevel(0);}
  function remPijn(i){setDag(d=>({...d,pijnLogs:d.pijnLogs.filter((_,j)=>j!==i)}));}
  function addAanval(){setDag(d=>({...d,aanval:{logs:[...(d.aanval?.logs||[]),{tijd:nowT(),type:aType,symptomen:[...aSymp]}]}}));setASymp([]);}
  function remAanval(i){setDag(d=>({...d,aanval:{logs:(d.aanval?.logs||[]).filter((_,j)=>j!==i)}}));}
  function addMed(){const n=mNaam||mAnders;if(!n)return;setDag(d=>({...d,med:{logs:[...(d.med?.logs||[]),{tijd:mTijd,type:mType,naam:n}]}}));setMNaam("");setMAnders("");setMTijd(nowT());}
  function remMed(i){setDag(d=>({...d,med:{logs:(d.med?.logs||[]).filter((_,j)=>j!==i)}}));}
  function addSuppl(){const n=sNaam||sAnders;if(!n)return;setDag(d=>({...d,suppl:{logs:[...(d.suppl?.logs||[]),{tijd:sTijd,naam:n}]}}));setSNaam("");setSAnders("");setSTijd(nowT());}
  function remSuppl(i){setDag(d=>({...d,suppl:{logs:(d.suppl?.logs||[]).filter((_,j)=>j!==i)}}));}
  async function fetchWeer(){
    setWeerLoading(true);
    try{
      const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000}));
      const{latitude:lat,longitude:lon}=pos.coords;
      const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto");
      const d=await r.json();
      const c=d.current;
      const weerCode=c.weather_code;
      const omschrijving=weerCode<=1?"Helder":weerCode<=3?"Bewolkt":weerCode<=48?"Mist":weerCode<=67?"Regen":weerCode<=77?"Sneeuw":weerCode<=82?"Buien":"Onweer";
      const icon=weerCode<=1?"☀":weerCode<=3?"⛅":weerCode<=48?"🌫":weerCode<=67?"🌧":weerCode<=77?"❄":weerCode<=82?"🌦":"⛈";
      setDag(dg=>({...dg,weer:{...dg.weer,logs:[...( dg.weer?.logs||[]),{tijd:nowT(),temp:c.temperature_2m,vochtigheid:c.relative_humidity_2m,wind:c.wind_speed_10m,omschrijving,icon}]}}));
    }catch(e){alert("Kan weersdata niet ophalen: "+e.message);}
    setWeerLoading(false);
  }
  function addUZ(){
    if(!uzWaarde)return;
    const v=parseFloat(uzWaarde);
    const inMmol=uzEenheid==="mmol"?v:v/16.8;
    setDag(d=>({...d,urinezuur:{...d.urinezuur,logs:[...(d.urinezuur?.logs||[]),{tijd:nowT(),waarde:uzWaarde,eenheid:uzEenheid,mmol:inMmol.toFixed(3)}]}}));
    setUzWaarde("");
  }
  function remUZ(i){setDag(d=>({...d,urinezuur:{...d.urinezuur,logs:(d.urinezuur?.logs||[]).filter((_,j)=>j!==i)}}));}
  function handlePhoto(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setProfile(p=>({...p,photo:ev.target.result}));r.readAsDataURL(f);}
  function addProfMed(){if(!newMed.name)return;setProfile(p=>({...p,meds:[...(p.meds||[]),{...newMed,id:Date.now()}]}));setNewMed({name:"",dose:"",frequency:""});}
  function remProfMed(id){setProfile(p=>({...p,meds:p.meds.filter(m=>m.id!==id)}));}
  async function saveProfiel(){localStorage.setItem("waterDoel",String(waterDoel));if(isDemo){setProfSaved(true);setTimeout(()=>setProfSaved(false),2000);return;}try{await upsertProfile({name:profile.name,photo:profile.photo,meds:profile.meds},token);setProfSaved(true);setTimeout(()=>setProfSaved(false),2000);}catch(e){alert("Fout: "+e.message);}}
  async function wijzigWachtwoord(){
    if(nieuwPw!==nieuwPw2){setPwMsg("error:Wachtwoorden komen niet overeen");return;}
    if(nieuwPw.length<6){setPwMsg("error:Minimaal 6 tekens");return;}
    if(isDemo){setPwMsg("ok:Wachtwoord gewijzigd!");setTimeout(()=>setPwMsg(""),3000);return;}
    setPwLoading(true);
    try{
      const r=await fetch("/.netlify/functions/account-beheer",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({actie:"wachtwoord",nieuwWachtwoord:nieuwPw})});
      const d=await r.json();
      if(d.ok){setPwMsg("ok:Wachtwoord gewijzigd!");setNieuwPw("");setNieuwPw2("");setTimeout(()=>setPwMsg(""),3000);}
      else{setPwMsg("error:"+(d.error||"Mislukt"));}
    }catch(e){setPwMsg("error:"+e.message);}
    setPwLoading(false);
  }

  async function verwijderAccount(){
    if(isDemo){alert("Demo-modus: account verwijderen niet beschikbaar.");return;}
    setVerwijderLoading(true);
    try{
      const r=await fetch("/.netlify/functions/account-beheer",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({actie:"verwijder"})});
      const d=await r.json();
      if(d.ok){localStorage.removeItem("jicht_session");onLogout();}
      else{alert("Fout: "+(d.error||"Mislukt"));}
    }catch(e){alert("Fout: "+e.message);}
    setVerwijderLoading(false);
  }

  async function wisAlleData(){if(isDemo){setEntries([]);setDag(emptyDay());setWisConf(false);return;}try{await sf("/rest/v1/entries?user_id=not.is.null","DELETE",null,token);setEntries([]);setDag(emptyDay());}catch(e){alert("Fout: "+e.message);}setWisConf(false);}
  async function genRapport(){ setRapportLoading(true);
    const t=await callAI("rapport");
    setRapportTekst(t);
    setRapportLoading(false);
  }
  function verstuurRapport(){ if(!rapportEmail||!rapportTekst)return;
    window.location.href="mailto:"+rapportEmail+"?subject="+encodeURIComponent("Export Jicht Tracker")+"&body="+encodeURIComponent("Jicht Tracker Rapport\n"+"=".repeat(40)+"\n\n"+rapportTekst+"\n\n"+"=".repeat(40)+"\nGegenereerd: "+new Date().toLocaleDateString("nl-NL")+"\nRegistraties: "+entries.length);
  }

  // ── Na hooks: vroege return ───────────────────────────────────────────────
  if(loading)return <Spinner/>;
  const isPro = profile.plan==='pro';

  const totalAttacks=entries.filter(e=>(e.aanval?.logs||[]).some(a=>a.type==="actief")).length;
  const allPains=entries.flatMap(e=>e.pijn_logs||e.pijnLogs||[]).map(p=>p.level).filter(Boolean);
  const avgPain=allPains.length?(allPains.reduce((a,b)=>a+b,0)/allPains.length).toFixed(1):"–";
  const monthly=getStats(entries);
  const recent=monthly.slice(-6);
  const syncBadge=sync==="saving"?{bg:"#FFF8E1",b:"#FFD54F",t:"⏳ Opslaan...",c:"#795548"}:sync==="saved"?{bg:C.sL,b:"#81C784",t:"✅ Opgeslagen",c:C.success}:(sync.startsWith("error"))?{bg:C.dL,b:C.danger,t:"❌ Fout bij opslaan: "+sync.replace("error:",""),c:C.danger}:null;
  const slaap=berekenSlaap(dag.slaap.bedtijd,dag.slaap.wektijd);
  const PG="linear-gradient(90deg,#4CAF50 0%,#8BC34A 25%,#FF9800 50%,#F44336 75%,#B71C1C 100%)";

  const MENU_ITEMS=[
    ["🩺","Arts / Therapeut raadplegen",()=>setShowTher(true)],
    ["📧","Rapport versturen",()=>{setShowRapport(true);setRapportTekst("");}],
    ["🛒","Naar de webshop",()=>{}],
    ["---","---",null],
    ["👤","Profiel",()=>setShowProfiel(true)],
    ["🆘","Ondersteuning",()=>setShowSupport(true)],
    ["ℹ","Over Jicht Tracker",()=>setShowOver(true)],
    ["---","---",null],
    ["🔒","Privacy",()=>setShowPrivacy(true)],
    ["⚖","Disclaimer",()=>setShowDisc(true)],
    ["🚪",isDemo?"↩ Terug naar login":"Uitloggen",async()=>{if(!isDemo)await signOut(token);onLogout();}],
  ];

  return (
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",background:C.bg,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:50}}>

      {/* Header */}
      <div style={{background:C.primary,padding:"16px 20px 12px",color:"#fff",display:"flex",alignItems:"center",gap:14,position:"relative"}}>
        {profile.photo&&<img src={profile.photo} alt="p" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,0.4)"}}/>}
        <div style={{flex:1}}>
          <h1 style={{margin:0,fontSize:24,fontWeight:700}}>{profile.name?"Jicht Tracker · "+profile.name:"Jicht Tracker"}</h1>
        </div>
        <button onClick={()=>setMenuOpen(m=>!m)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",padding:"8px 11px",borderRadius:8,cursor:"pointer",fontSize:20}}>{menuOpen?"✕":"☰"}</button>
        {menuOpen&&(
          <div style={{position:"absolute",top:"100%",right:16,zIndex:100,background:C.card,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",border:"1px solid "+C.border,minWidth:210,overflow:"hidden"}} onClick={()=>setMenuOpen(false)}>
            {MENU_ITEMS.map(([icon,lbl,fn],i)=>(
              lbl==="---"
                ? <div key={i} style={{height:1,background:C.border,margin:"4px 0"}}/>
                : <button key={lbl} onClick={fn} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",textAlign:"left",cursor:"pointer",fontSize:14,color:(lbl==="Uitloggen"||lbl==="↩ Terug naar login")?C.danger:C.text,display:"flex",alignItems:"center",gap:10}}>
                    <span>{icon}</span><span style={{fontWeight:600}}>{lbl}</span>
                  </button>
            ))}
          </div>
        )}
      </div>

      {isDemo&&<div style={{background:C.aL,borderBottom:"1px solid "+C.accent,padding:"8px 16px",textAlign:"center",fontSize:12,color:C.aT,fontWeight:600}}>👀 Demo-modus — wijzigingen worden niet opgeslagen</div>}

      {/* Stats */}
      <div style={{display:"flex",background:C.pL,borderBottom:"1px solid "+C.border}}>
        {[{l:"Registraties",v:entries.length},{l:"Gem. pijn",v:avgPain},{l:"Aanvallen",v:totalAttacks},{l:"Maanden",v:monthly.length}].map((s,i)=>(
          <div key={i} style={{flex:1,padding:"9px 5px",textAlign:"center",borderRight:i<3?"1px solid "+C.border:"none"}}>
            <div style={{fontSize:17,fontWeight:700,color:C.primary}}>{s.v}</div>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:C.card,borderBottom:"1px solid "+C.border}}>
        {MTABS.map(([id,icon,lbl])=>(
          <button key={id} onClick={()=>setMainTab(id)} style={{flex:1,padding:"11px 0",border:"none",background:"transparent",cursor:"pointer",fontSize:11,fontWeight:mainTab===id?700:400,color:mainTab===id?C.primary:C.muted,borderBottom:mainTab===id?"3px solid "+C.primary:"3px solid transparent"}}>
            {icon}<br/>{lbl}
          </button>
        ))}
      </div>

      {/* Modals */}
      <Modal show={showProfiel} onClose={()=>setShowProfiel(false)} title="👤 Profiel">
        {profSaved&&<div style={{background:C.sL,border:"1px solid #81C784",borderRadius:8,padding:"9px 13px",color:C.success,fontWeight:600,fontSize:13,marginBottom:12}}>✅ Profiel opgeslagen!</div>}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:14,background:C.bg,borderRadius:12}}>
          {profile.photo?<img src={profile.photo} alt="p" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover"}}/>:<div style={{width:64,height:64,borderRadius:"50%",background:C.pL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>👤</div>}
          <div>
            <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}} id="pu"/>
            <label htmlFor="pu" style={{display:"inline-block",padding:"7px 14px",background:C.pL,color:C.primary,borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid "+C.border}}>📷 Foto kiezen</label>
            {profile.photo&&<button onClick={()=>setProfile(p=>({...p,photo:""}))} style={{display:"block",fontSize:11,color:C.danger,background:"none",border:"none",cursor:"pointer",marginTop:5,padding:0}}>Verwijderen</button>}
          </div>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:5}}>Naam</div>
        <input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} placeholder="Jouw naam" style={{...inp,marginBottom:14}}/>
        <div style={{fontSize:12,color:C.muted,marginBottom:5}}>E-mailadres</div>
        <input value={session.user?.email||""} readOnly style={{...inp,marginBottom:4,background:"#E8EDF0",color:C.muted,cursor:"not-allowed",border:"1.5px solid "+C.border}}/>
        <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Je e-mailadres is niet aanpasbaar via de app.</div>
        <div style={{borderTop:"1px solid "+C.border,paddingTop:16,marginTop:4}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>💧 Dagelijks waterdoel</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Hoeveel vocht wil je per dag drinken? (aanbevolen: 2000–2500ml)</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {[1500,2000,2500,3000].map(ml=>(
              <button key={ml} onClick={()=>setWaterDoel(ml)} style={{padding:"7px 14px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(waterDoel===ml?C.primary:C.border),background:waterDoel===ml?C.pL:C.card,color:waterDoel===ml?C.primary:C.muted,fontWeight:waterDoel===ml?700:400}}>
                {ml}ml
              </button>
            ))}
          </div>
          <input type="number" value={waterDoel} onChange={e=>setWaterDoel(parseInt(e.target.value)||2000)} min={500} max={5000} style={{...inp,marginBottom:14}}/>
        </div>
        <button onClick={saveProfiel} style={{background:C.primary,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",width:"100%"}}>💾 Profiel opslaan</button>

        {/* Wachtwoord wijzigen */}
        <div style={{borderTop:"1px solid "+C.border,paddingTop:18,marginTop:18}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>🔑 Wachtwoord wijzigen</div>
          {pwMsg&&<div style={{background:pwMsg.startsWith("ok:")?C.sL:C.dL,border:"1px solid "+(pwMsg.startsWith("ok:")?"#81C784":C.danger),borderRadius:8,padding:"8px 12px",color:pwMsg.startsWith("ok:")?C.success:C.danger,fontSize:13,marginBottom:10}}>{pwMsg.startsWith("ok:")?"✅ ":""}{pwMsg.replace(/^(ok|error):/,"")}</div>}
          <input type="password" value={nieuwPw} onChange={e=>setNieuwPw(e.target.value)} placeholder="Nieuw wachtwoord" style={{...inp,marginBottom:8}}/>
          <input type="password" value={nieuwPw2} onChange={e=>setNieuwPw2(e.target.value)} placeholder="Herhaal nieuw wachtwoord" style={{...inp,marginBottom:10}}/>
          <button onClick={wijzigWachtwoord} disabled={pwLoading||!nieuwPw||!nieuwPw2} style={{background:nieuwPw&&nieuwPw2?C.primary:C.border,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:nieuwPw&&nieuwPw2?"pointer":"not-allowed",width:"100%",opacity:pwLoading?0.7:1}}>
            {pwLoading?"⏳ Bezig...":"Wachtwoord wijzigen"}
          </button>
        </div>

        {/* Account verwijderen */}
        <div style={{borderTop:"1px solid "+C.border,paddingTop:18,marginTop:6}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:C.danger}}>⚠ Account verwijderen</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:12}}>Je account wordt verwijderd en je gegevens geanonimiseerd. Je gezondheidsdata blijft bewaard voor onderzoek maar is niet meer aan jou gekoppeld.</div>
          {!verwijderConf?(
            <button onClick={()=>setVerwijderConf(true)} style={{width:"100%",padding:"11px",background:"transparent",border:"2px solid "+C.danger,borderRadius:10,color:C.danger,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              Account verwijderen
            </button>
          ):(
            <div style={{background:C.dL,border:"1px solid "+C.danger,borderRadius:12,padding:14}}>
              <div style={{fontWeight:700,color:C.danger,fontSize:14,marginBottom:8}}>Weet je het zeker?</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:14}}>Dit kan niet ongedaan worden gemaakt. Je kunt daarna niet meer inloggen.</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setVerwijderConf(false)} style={{flex:1,padding:"11px",background:C.card,border:"1.5px solid "+C.border,borderRadius:8,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer"}}>Annuleer</button>
                <button onClick={verwijderAccount} disabled={verwijderLoading} style={{flex:1,padding:"11px",background:C.danger,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",opacity:verwijderLoading?0.7:1}}>
                  {verwijderLoading?"⏳ Bezig...":"Verwijder account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal show={showRapport} onClose={()=>setShowRapport(false)} title="📧 Rapport versturen">
        <div style={{background:C.pL,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.text,lineHeight:1.6}}>
          ℹ De AI genereert een beknopt rapport. Daarna kun je het e-mailen via je <strong>standaard mail-app</strong>.
        </div>
        {!rapportTekst&&(
          <button onClick={genRapport} disabled={rapportLoading||entries.length===0} style={{background:entries.length>0?C.accent:C.border,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:entries.length>0?"pointer":"not-allowed",width:"100%",marginBottom:12,opacity:rapportLoading?0.7:1}}>
            {rapportLoading?"⏳ Rapport genereren...":"🧠 Rapport genereren door AI"}
          </button>
        )}
        {entries.length===0&&<div style={{fontSize:12,color:C.muted,textAlign:"center",marginBottom:12}}>Voeg eerst registraties toe.</div>}
        {rapportTekst&&(
          <>
            <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:13,lineHeight:1.7,color:C.text,whiteSpace:"pre-wrap",border:"1px solid "+C.border,maxHeight:220,overflowY:"auto",marginBottom:8}}>{rapportTekst}</div>
            <button onClick={()=>setRapportTekst("")} style={{fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer",marginBottom:14,padding:0}}>↩ Opnieuw genereren</button>
            <div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>Verstuur naar:</div>
            <input type="email" value={rapportEmail} onChange={e=>setRapportEmail(e.target.value)} placeholder="ontvanger@email.nl" style={{...inp,marginBottom:12}}/>
            <button onClick={verstuurRapport} disabled={!rapportEmail} style={{background:rapportEmail?C.primary:C.border,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:rapportEmail?"pointer":"not-allowed",width:"100%"}}>
              📬 Openen in mail-app
            </button>
            <div style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:8}}>Je mail-app wordt geopend. Je kunt de e-mail nog aanpassen.</div>
          </>
        )}
      </Modal>

      <TherapeutModal show={showTher} onClose={()=>setShowTher(false)} entries={entries} profile={profile} genRapport={callAI}/>
      <OverModal show={showOver} onClose={()=>setShowOver(false)}/>
      <SupportModal show={showSupport} onClose={()=>setShowSupport(false)}/>
      <PrivacyModal show={showPrivacy} onClose={()=>setShowPrivacy(false)} entries={entries} wisAlleData={wisAlleData} wisConf={wisConf} setWisConf={setWisConf}/>
      <DisclaimerModal show={showDisc} onClose={()=>setShowDisc(false)}/>
      <UpgradeModal show={showUpgrade} onClose={()=>setShowUpgrade(false)}/>

      <div style={{padding:"16px 14px"}}>

        {/* ══ REGISTREER ══ */}
        {mainTab==="registreer"&&(
          <div>
            {syncBadge&&<div style={{background:syncBadge.bg,border:"1px solid "+syncBadge.b,borderRadius:8,padding:"7px 12px",color:syncBadge.c,fontSize:12,fontWeight:600,marginBottom:10,textAlign:"center"}}>{syncBadge.t}</div>}
            <div style={{background:C.card,borderRadius:12,padding:"12px",border:"1px solid "+C.border,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:13,color:C.muted,fontWeight:600}}>📅 Datum</span>
                <input type="date" value={regDate} onChange={e=>setRegDate(e.target.value)} style={{...inp,flex:1,padding:"7px 10px"}}/>
              </div>
            </div>
            {/* Sectie 1 — Aanval & Metingen */}
            <div style={{background:"#FFF8F8",border:"1.5px solid #FFE0E0",borderRadius:14,padding:"12px 12px 14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:C.danger,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:C.danger,display:"inline-block"}}/>Aanval & Metingen
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {RTABS_S1.map(t=>{
                  const locked=PRO_TABS.includes(t.id)&&!isPro;
                  const isAanval=t.id==="aanval";
                  return(
                  <button key={t.id} onClick={()=>locked?setShowUpgrade(true):setRegSec(t.id)}
                    style={{padding:isAanval?"14px 4px":"12px 4px",border:"2px solid "+(regSec===t.id?(isAanval?C.danger:C.primary):locked?"#E2D9F3":isAanval?"#FECACA":C.border),borderRadius:10,background:regSec===t.id?(isAanval?C.dL:C.pL):locked?"#FAF8FF":isAanval?"#FFF5F5":C.card,color:regSec===t.id?(isAanval?C.danger:C.primary):locked?"#9B59D6":isAanval?C.danger:C.muted,fontSize:11,fontWeight:regSec===t.id?700:isAanval?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative",boxShadow:regSec===t.id?"0 2px 8px rgba(0,0,0,0.12)":"none",transform:regSec===t.id?"translateY(-1px)":"none",transition:"all 0.15s"}}>
                    {locked&&<span style={{position:"absolute",top:4,right:4,fontSize:8,fontWeight:700,background:"#7C3AED",color:"#fff",padding:"1px 4px",borderRadius:6}}>PRO</span>}
                    <span style={{fontSize:isAanval?32:28}}>{t.icon}</span>
                    <span style={{fontSize:isAanval?12:11,fontWeight:isAanval?700:400}}>{t.label}</span>
                  </button>);})}
              </div>
            </div>
            {/* Sectie 2 — Invloeden */}
            <div style={{background:C.pL,border:"1.5px solid #BFE0E8",borderRadius:14,padding:"12px 12px 14px",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:C.primary,display:"inline-block"}}/>Invloeden
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {RTABS_S2.map(t=>{
                  const locked=PRO_TABS.includes(t.id)&&!isPro;
                  return(
                  <button key={t.id} onClick={()=>locked?setShowUpgrade(true):setRegSec(t.id)}
                    style={{padding:"12px 4px",border:"2px solid "+(regSec===t.id?C.primary:locked?"#E2D9F3":C.border),borderRadius:10,background:regSec===t.id?"#fff":locked?"#FAF8FF":C.card,color:regSec===t.id?C.primary:locked?"#9B59D6":C.muted,fontSize:11,fontWeight:regSec===t.id?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative",boxShadow:regSec===t.id?"0 2px 8px rgba(0,0,0,0.12)":"none",transform:regSec===t.id?"translateY(-1px)":"none",transition:"all 0.15s"}}>
                    {locked&&<span style={{position:"absolute",top:4,right:4,fontSize:8,fontWeight:700,background:"#7C3AED",color:"#fff",padding:"1px 4px",borderRadius:6}}>PRO</span>}
                    <span style={{fontSize:28}}>{t.icon}</span>
                    <span style={{fontSize:11}}>{t.label}</span>
                  </button>);})}
              </div>
            </div>

            {/* Verbindende pijl naar actief paneel */}
            <div style={{display:"flex",justifyContent:"center",marginBottom:-4}}>
              <div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderTop:"8px solid "+(RTABS_S1.some(t=>t.id===regSec)?C.danger:C.primary)}}/>
            </div>

            {regSec==="eten"&&(
              <Card title="🍽 Voeding registreren" accentColor={C.primary}>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                  {MMT.map(m=><button key={m} onClick={()=>setEtenMom(m)} style={{padding:"5px 11px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(etenMom===m?C.accent:C.border),background:etenMom===m?C.aL:C.card,color:etenMom===m?C.aT:C.muted,fontWeight:etenMom===m?700:400}}>{m}</button>)}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <FotoScan onResult={tekst=>{if(tekst)setEtenTxt(tekst);}}/>
                </div>
                <textarea value={etenTxt} onChange={e=>setEtenTxt(e.target.value)} placeholder="Wat heb je gegeten? Of scan een foto..." rows={2} style={{...inp,resize:"vertical",marginBottom:8}}/>
                <button onClick={addEten} disabled={!etenTxt.trim()} style={{background:etenTxt.trim()?C.primary:C.border,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:13,fontWeight:600,cursor:etenTxt.trim()?"pointer":"default",width:"100%"}}>+ Toevoegen</button>
                {dag.eten.logs.length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:10}}>{dag.eten.logs.map((l,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,fontWeight:700,color:C.aT,minWidth:70}}>{l.moment}</span><span style={{fontSize:12,flex:1}}>{l.tekst}</span><button onClick={()=>remEten(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button></div>)}</div>}
              </Card>
            )}

            {regSec==="drinken"&&isPro&&(
              <Card title="💧 Drinken registreren" accentColor={C.primary}>
                {(()=>{ const tot=dag.drinken.logs.reduce((s,l)=>s+(l.ml||0),0);
                  const pct=Math.min(100,Math.round(tot/waterDoel*100));
                  const kleur=pct>=100?C.success:pct>=60?C.accent:C.danger;
                  return(
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:700,color:kleur}}>💧 {tot}ml / {waterDoel}ml dagdoel</span>
                        <span style={{fontSize:12,color:kleur,fontWeight:700}}>{pct}%</span>
                      </div>
                      <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden"}}>
                        <div style={{width:pct+"%",height:"100%",background:kleur,borderRadius:4,transition:"width 0.3s"}}/>
                      </div>
                      {pct>=100&&<div style={{fontSize:11,color:C.success,marginTop:4,fontWeight:600}}>✅ Daaldoel behaald!</div>}
                    </div>
                  );
                })()}
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {DCAT.map(d=><button key={d} onClick={()=>{setDCat(d);const e=(PORTIE[d]||PORTIE["Anders"])[0];setDMl(e.ml);setDPortie(e.l);}} style={{padding:"5px 11px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(dCat===d?C.primary:C.border),background:dCat===d?C.pL:C.card,color:dCat===d?C.primary:C.muted,fontWeight:dCat===d?700:400}}>{d}</button>)}
                </div>
                {(dCat==="Anders"||dCat==="Alcohol"||dCat==="Frisdrank")&&<input value={dTxt} onChange={e=>setDTxt(e.target.value)} placeholder={dCat==="Alcohol"?"Bijv. bier, rode wijn...":"Omschrijving"} style={{...inp,marginBottom:12}}/>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                  {(PORTIE[dCat]||PORTIE["Anders"]).map(p=><button key={p.l} onClick={()=>{setDMl(p.ml);setDPortie(p.l);}} style={{padding:"7px 3px",borderRadius:10,border:"2px solid "+(dMl===p.ml&&dPortie===p.l?C.primary:C.border),background:dMl===p.ml&&dPortie===p.l?C.pL:C.card,color:dMl===p.ml&&dPortie===p.l?C.primary:C.muted,fontSize:10,fontWeight:dMl===p.ml&&dPortie===p.l?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><span style={{fontSize:16}}>{p.i==="kop"?"☕":p.i==="mok"?"🫖":p.i==="bier"?"🍺":p.i==="wijn"?"🍷":p.i==="fles"?"💧":"🥤"}</span><span>{p.l}</span><span style={{fontSize:9,color:C.muted}}>{p.ml}ml</span></button>)}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <FotoScan onResult={tekst=>{if(tekst)setDTxt(tekst);}}/>
                </div>
                <button onClick={addDrinken} style={{background:C.primary,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%",marginBottom:10}}>+ Registreren</button>
                {dag.drinken.logs.length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10}}>{dag.drinken.logs.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{l.tijd}</span><span style={{fontSize:12,fontWeight:700,color:C.primary,flex:1}}>{l.categorie}{l.tekst?" · "+l.tekst:""}</span><span style={{fontSize:11,color:C.muted,background:C.pL,padding:"2px 7px",borderRadius:8}}>{l.portie} · {l.ml}ml</span><button onClick={()=>remDrinken(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button></div>)}</div>}
              </Card>
            )}

            {regSec==="bewegen"&&isPro&&(
              <Card title="🏃 Beweging registreren" accentColor={C.primary}>
                {(dag.bewegen?.logs||[]).length>0&&(()=>{const tot=(dag.bewegen.logs).reduce((s,l)=>s+(parseInt(l.minuten)||0),0);return<div style={{background:C.pL,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.primary,fontWeight:700}}>{dag.bewegen.logs.length} sessie{dag.bewegen.logs.length>1?"s":""}</span><span style={{fontSize:12,color:C.primary}}>{tot} min totaal</span></div>;})()}
                <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-end"}}>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tijdstip</div><input type="time" value={bTijd} onChange={e=>setBTijd(e.target.value)} style={{...inp,width:100}}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Minuten</div><input type="number" value={bMin} onChange={e=>setBMin(e.target.value)} placeholder="0" min={0} style={{...inp,width:75,textAlign:"center",fontSize:17,fontWeight:700}}/></div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {[15,20,30,45,60,90].map(m=><button key={m} onClick={()=>setBMin(String(m))} style={{padding:"5px 12px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(bMin===String(m)?C.accent:C.border),background:bMin===String(m)?C.aL:C.card,color:bMin===String(m)?C.aT:C.muted,fontWeight:bMin===String(m)?700:400}}>{m}min</button>)}
                </div>
                <Chips opts={BEWEGING} sel={bAct} onToggle={item=>setBAct(a=>a.includes(item)?a.filter(x=>x!==item):[...a,item])}/>
                <button onClick={addBewegen} disabled={!bMin&&bAct.length===0} style={{background:(bMin||bAct.length>0)?C.primary:C.border,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:(bMin||bAct.length>0)?"pointer":"default",width:"100%",marginTop:12}}>+ Sessie toevoegen</button>
                {(dag.bewegen?.logs||[]).length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>{dag.bewegen.logs.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{l.tijd}</span><span style={{fontSize:12,fontWeight:700,color:C.primary,flex:1}}>{l.activiteiten?.join(", ")||"Activiteit"}</span><span style={{fontSize:11,color:C.muted,background:C.pL,padding:"2px 7px",borderRadius:8}}>{l.minuten}min</span><button onClick={()=>remBewegen(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button></div>)}</div>}
              </Card>
            )}

            {regSec==="slaap"&&isPro&&(
              <Card title="😴 Slaap registreren" accentColor={C.primary}>
                <div style={{display:"flex",gap:12,marginBottom:16}}>
                  <div style={{flex:1}}><div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Wakker geworden</div><input type="time" value={dag.slaap.wektijd} onChange={e=>setDag(d=>({...d,slaap:{...d.slaap,wektijd:e.target.value}}))} style={{...inp,fontSize:17,fontWeight:700,textAlign:"center",padding:"11px"}}/></div>
                  <div style={{flex:1}}><div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Naar bed gegaan</div><input type="time" value={dag.slaap.bedtijd} onChange={e=>setDag(d=>({...d,slaap:{...d.slaap,bedtijd:e.target.value}}))} style={{...inp,fontSize:17,fontWeight:700,textAlign:"center",padding:"11px"}}/></div>
                </div>
                {slaap?(
                  <div style={{background:slaap.totaalMin>=420?C.sL:slaap.totaalMin>=360?C.aL:C.dL,border:"1px solid "+(slaap.totaalMin>=420?"#81C784":slaap.totaalMin>=360?C.accent:C.danger),borderRadius:12,padding:16,textAlign:"center"}}>
                    <div style={{fontSize:34,fontWeight:800,color:slaap.totaalMin>=420?C.success:slaap.totaalMin>=360?C.aT:C.danger}}>{slaap.label}</div>
                    <div style={{fontSize:13,color:C.muted,marginTop:4}}>{slaap.totaalMin>=420?"✅ Goede nachtrust":slaap.totaalMin>=360?"⚠ Redelijke nachtrust":"❌ Te weinig slaap"}</div>
                  </div>
                ):(
                  <div style={{background:C.bg,borderRadius:12,padding:20,textAlign:"center",color:C.muted,border:"1px dashed "+C.border}}>
                    <div style={{fontSize:26,marginBottom:6}}>😴</div>
                    <div style={{fontSize:13}}>Vul beide tijden in om de slaapduur te berekenen</div>
                  </div>
                )}
                <div style={{fontSize:11,color:C.muted,marginTop:10,textAlign:"center"}}>Slaapduur wordt automatisch berekend en opgeslagen</div>
              </Card>
            )}

            {regSec==="pijn"&&(
              <Card title="😣 Pijn registreren" accentColor={C.danger}>
                <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.6}}>Tijdstip wordt automatisch opgeslagen. Meerdere metingen per dag mogelijk.</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Ervaar je op dit moment pijn?</div>
                <div style={{display:"flex",gap:10,marginBottom:pLevel>0?18:4}}>
                  <button onClick={()=>setPLevel(pLevel>0?0:1)} style={{flex:1,padding:"11px 8px",borderRadius:10,border:"2px solid "+(pLevel>0?C.danger:C.border),background:pLevel>0?C.dL:C.card,color:pLevel>0?C.danger:C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}>😣 Ja, pijn</button>
                  <button onClick={()=>{setDag(d=>({...d,pijnLogs:[...d.pijnLogs,{tijd:nowT(),level:0,label:"Geen pijn"}]}));setPLevel(0);}} style={{flex:1,padding:"11px 8px",borderRadius:10,border:"2px solid "+C.border,background:C.card,color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}>😊 Geen pijn</button>
                </div>
                {pLevel>0&&(
                  <>
                    <div style={{position:"relative",marginBottom:8,padding:"0 8px"}}>
                      <div style={{height:12,borderRadius:6,background:PG,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.2)",position:"relative"}}>
                        <div style={{position:"absolute",top:"50%",left:((pLevel-1)/4*100)+"%",transform:"translate(-50%,-50%)",width:28,height:28,borderRadius:"50%",background:PC[pLevel],border:"3px solid white",boxShadow:"0 2px 8px "+PC[pLevel]+"80",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:13,transition:"left 0.15s"}}>{pLevel}</div>
                      </div>
                      <input type="range" min={1} max={5} step={1} value={pLevel} onChange={e=>setPLevel(Number(e.target.value))} style={{position:"absolute",top:0,left:8,right:8,width:"calc(100% - 16px)",height:12,opacity:0,cursor:"pointer",zIndex:3,margin:0}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"0 4px",marginTop:12,marginBottom:14}}>
                      {[["1","Licht","#4CAF50"],["2","Matig","#8BC34A"],["3","Ernstig","#FF9800"],["4","Hevig","#F44336"],["5","Ondraag.","#B71C1C"]].map(([n,l,c])=>(
                        <div key={n} onClick={()=>setPLevel(Number(n))} style={{textAlign:"center",cursor:"pointer",opacity:pLevel===Number(n)?1:0.45}}>
                          <div style={{fontWeight:800,fontSize:14,color:c}}>{n}</div>
                          <div style={{fontSize:9,color:c,fontWeight:600}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={addPijn} style={{background:C.danger,color:"#fff",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>+ Pijnmeting opslaan ({nowT()})</button>
                  </>
                )}
                {dag.pijnLogs.length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.pijnLogs.map((p,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}>
                        <span style={{fontSize:11,color:C.muted,minWidth:36}}>{p.tijd}</span>
                        {p.level===0?<span style={{fontSize:12,color:C.success,fontWeight:600,flex:1}}>😊 Geen pijn</span>:(
                          <><div style={{width:10,height:10,borderRadius:"50%",background:PC[p.level],flexShrink:0}}/><div style={{flex:1,height:6,borderRadius:3,background:"#eee",overflow:"hidden"}}><div style={{width:((p.level-1)/4*100)+"%",height:"100%",background:PG,minWidth:8}}/></div><span style={{fontSize:12,fontWeight:700,color:PC[p.level],minWidth:32}}>{p.level}/5</span><span style={{fontSize:11,color:C.muted}}>{PL[p.level]}</span></>
                        )}
                        <button onClick={()=>remPijn(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0,marginLeft:"auto"}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {regSec==="aanval"&&(
              <Card title="⚠ Aanval registreren" accentColor={C.danger}>
                {(dag.aanval?.logs||[]).length>0&&<div style={{background:C.dL,borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.danger,fontWeight:700}}>{dag.aanval.logs.length} registratie{dag.aanval.logs.length>1?"s":""} vandaag</span></div>}
                <div style={{fontSize:12,color:C.muted,marginBottom:8,fontWeight:600}}>Situatie op dit moment:</div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {[["signalen","🔔 Waarschuwingssignalen","Mogelijk aanval op komst",C.accent,C.aL],["actief","🚨 Actieve aanval","Nu een actieve aanval",C.danger,C.dL],["afnemend","📉 Aanval neemt af","Ergste pijn voorbij",C.accent,C.aL],["voorbij","✅ Aanval voorbij","Geen klachten meer",C.success,C.sL]].map(([v,lbl,sub,col,bg])=>(
                    <button key={v} onClick={()=>setAType(v)} style={{padding:"10px 14px",borderRadius:10,textAlign:"left",cursor:"pointer",border:"2px solid "+(aType===v?col:C.border),background:aType===v?bg:C.card}}>
                      <div style={{fontWeight:700,fontSize:13,color:aType===v?col:C.text}}>{lbl}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>
                    </button>
                  ))}
                </div>
                {(aType==="signalen"||aType==="actief")&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:8}}>Symptomen (optioneel)</div>
                    <Chips opts={SYMP} sel={aSymp} onToggle={item=>setASymp(a=>a.includes(item)?a.filter(x=>x!==item):[...a,item])} col={C.danger} bg={C.dL}/>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginTop:14,marginBottom:8}}>Aangetast gewricht (tik om te selecteren)</div>
                    <GewrichtsKaart sel={dag.aanval.gewricht||[]} onToggle={g=>setDag(d=>({...d,aanval:{...d.aanval,gewricht:(d.aanval.gewricht||[]).includes(g)?(d.aanval.gewricht||[]).filter(x=>x!==g):[...(d.aanval.gewricht||[]),g]}}))}/>
                  </div>
                )}
                <button onClick={addAanval} style={{background:C.danger,color:"#fff",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>+ Registratie opslaan</button>
                {(dag.aanval?.logs||[]).length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.aanval.logs.map((a,i)=>{ const kleur=a.type==="actief"?C.danger:a.type==="voorbij"?C.success:C.accent;
                      const bg=a.type==="actief"?C.dL:a.type==="voorbij"?C.sL:C.aL;
                      const icon=a.type==="actief"?"🚨":a.type==="voorbij"?"✅":a.type==="afnemend"?"📉":"🔔";
                      const lbl={"actief":"Actieve aanval","voorbij":"Aanval voorbij","afnemend":"Aanval neemt af","signalen":"Waarschuwingssignalen"}[a.type];
                      return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:7,background:C.bg,borderRadius:8,padding:"8px 10px"}}>
                        <span style={{fontSize:11,color:C.muted,minWidth:36,paddingTop:2}}>{a.tijd}</span>
                        <div style={{flex:1}}><span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:8,background:bg,color:kleur}}>{icon} {lbl}</span>{a.symptomen?.length>0&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{a.symptomen.join(", ")}</div>}</div>
                        <button onClick={()=>remAanval(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
                      </div>;
                    })}
                  </div>
                )}
              </Card>
            )}

            {regSec==="medsupp"&&isPro&&(
              <div>
                <Card title="💊 Medicatie vandaag" accentColor={C.primary}>
                  {(dag.med?.logs||[]).length>0&&<div style={{background:C.pL,borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.primary,fontWeight:700}}>{dag.med.logs.length} inname{dag.med.logs.length>1?"s":""} vandaag</span></div>}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tijdstip</div><input type="time" value={mTijd} onChange={e=>setMTijd(e.target.value)} style={{...inp,width:100}}/></div>
                    <div style={{flex:1}}><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Type</div><div style={{display:"flex",gap:6}}>{[["preventie","🛡 Preventief"],["aanval","🚨 Aanval/pijn"]].map(([v,l])=><button key={v} onClick={()=>{setMType(v);setMNaam("");}} style={{flex:1,padding:"7px 4px",borderRadius:8,fontSize:12,cursor:"pointer",border:"1.5px solid "+(mType===v?(v==="preventie"?C.primary:C.danger):C.border),background:mType===v?(v==="preventie"?C.pL:C.dL):C.card,color:mType===v?(v==="preventie"?C.primary:C.danger):C.muted,fontWeight:mType===v?700:400}}>{l}</button>)}</div></div>
                  </div>
                  <Chips opts={mType==="preventie"?MEDP:MEDA} sel={mNaam?[mNaam]:[]} onToggle={item=>setMNaam(mNaam===item?"":item)} col={mType==="preventie"?C.primary:C.danger} bg={mType==="preventie"?C.pL:C.dL}/>
                  <input value={mAnders} onChange={e=>setMAnders(e.target.value)} placeholder="Of typ een ander medicijn..." style={{...inp,marginTop:10}}/>
                  <button onClick={addMed} disabled={!mNaam&&!mAnders} style={{background:(mNaam||mAnders)?C.primary:C.border,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:(mNaam||mAnders)?"pointer":"default",width:"100%",marginTop:10}}>+ Inname registreren</button>
                  {(dag.med?.logs||[]).length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>{dag.med.logs.map((m,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{m.tijd}</span><span style={{fontSize:11,padding:"2px 7px",borderRadius:8,fontWeight:700,background:m.type==="preventie"?C.pL:C.dL,color:m.type==="preventie"?C.primary:C.danger}}>{m.type==="preventie"?"🛡":"🚨"}</span><span style={{fontSize:12,fontWeight:600,flex:1}}>{m.naam}</span><button onClick={()=>remMed(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button></div>)}</div>}
                </Card>
                <div style={{marginTop:12}}>
                <Card title="🌿 Supplementen vandaag" accentColor={C.primary}>
                  {(dag.suppl?.logs||[]).length>0&&<div style={{background:C.sL,borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.success,fontWeight:700}}>{dag.suppl.logs.length} inname{dag.suppl.logs.length>1?"s":""} vandaag</span></div>}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tijdstip</div><input type="time" value={sTijd} onChange={e=>setSTijd(e.target.value)} style={{...inp,width:100}}/></div></div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <FotoScan onResult={tekst=>{if(tekst)setSAnders(tekst);}}/>
                    <BarcodeScan onResult={(naam)=>{if(naam)setSAnders(naam);}}/>
                  </div>
                  <Chips opts={SUPPL} sel={sNaam?[sNaam]:[]} onToggle={item=>setSNaam(sNaam===item?"":item)} col={C.success} bg={C.sL}/>
                  <input value={sAnders} onChange={e=>setSAnders(e.target.value)} placeholder="Of typ of scan een supplement..." style={{...inp,marginTop:10}}/>
                  <button onClick={addSuppl} disabled={!sNaam&&!sAnders} style={{background:(sNaam||sAnders)?C.success:C.border,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:(sNaam||sAnders)?"pointer":"default",width:"100%",marginTop:10}}>+ Inname registreren</button>
                  {(dag.suppl?.logs||[]).length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>{dag.suppl.logs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{s.tijd}</span><span style={{fontSize:12,fontWeight:600,flex:1}}>{s.naam}</span><button onClick={()=>remSuppl(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button></div>)}</div>}
                </Card>
                </div>
              </div>
            )}

            {regSec==="urinezuur"&&isPro&&(
              <Card title="🩸 Urinezuurwaarde" accentColor={C.danger}>
                {(dag.urinezuur?.logs||[]).length>0&&<div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.danger,fontWeight:700}}>{dag.urinezuur.logs.length} meting{dag.urinezuur.logs.length>1?"en":""} vandaag</span></div>}
                <div style={{fontSize:13,color:C.muted,marginBottom:12,lineHeight:1.6}}>Voer de waarde in na een bloedprikbeurt. Streefwaarde bij jicht: onder 0.36 mmol/L (6 mg/dL).</div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  {["mmol","mg"].map(e=>(
                    <button key={e} onClick={()=>setUzEenheid(e)}
                      style={{flex:1,padding:"8px",borderRadius:8,border:"1.5px solid "+(uzEenheid===e?C.primary:C.border),background:uzEenheid===e?C.pL:C.card,color:uzEenheid===e?C.primary:C.muted,fontWeight:uzEenheid===e?700:400,cursor:"pointer",fontSize:13}}>
                      {e==="mmol"?"mmol/L":"mg/dL"}
                    </button>
                  ))}
                </div>
                <input type="number" step="0.01" min="0" max={uzEenheid==="mmol"?"2":"34"}
                  value={uzWaarde} onChange={e=>setUzWaarde(e.target.value)}
                  placeholder={uzEenheid==="mmol"?"bijv. 0.42":"bijv. 7.2"}
                  style={{...inp,fontSize:22,fontWeight:700,textAlign:"center",padding:"12px",marginBottom:10}}/>
                {uzWaarde&&(()=>{
                  const v=parseFloat(uzWaarde);
                  const inMmol=uzEenheid==="mmol"?v:v/16.8;
                  const goed=inMmol<0.36,grens=inMmol<0.48;
                  return(
                    <div style={{background:goed?C.sL:grens?C.aL:C.dL,border:"1px solid "+(goed?"#81C784":grens?C.accent:C.danger),borderRadius:10,padding:"10px 14px",textAlign:"center",marginBottom:10}}>
                      <div style={{fontSize:22,fontWeight:800,color:goed?C.success:grens?C.aT:C.danger}}>{uzEenheid==="mmol"?v+" mmol/L":v+" mg/dL · "+inMmol.toFixed(2)+" mmol/L"}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:4}}>{goed?"✅ Onder streefwaarde":grens?"⚠ Verhoogd":"❌ Fors verhoogd"}</div>
                    </div>
                  );
                })()}
                <button onClick={addUZ} disabled={!uzWaarde} style={{background:uzWaarde?C.danger:C.border,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:uzWaarde?"pointer":"default",width:"100%",marginBottom:4}}>+ Meting opslaan ({nowT()})</button>
                {(dag.urinezuur?.logs||[]).length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:10}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.urinezuur.logs.map((l,i)=>{
                      const mmol=parseFloat(l.mmol);
                      const goed=mmol<0.36,grens=mmol<0.48;
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}>
                          <span style={{fontSize:11,color:C.muted,minWidth:36}}>{l.tijd}</span>
                          <span style={{fontSize:13,fontWeight:700,color:goed?C.success:grens?C.aT:C.danger,flex:1}}>{l.waarde} {l.eenheid==="mmol"?"mmol/L":"mg/dL"}</span>
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:goed?C.sL:grens?C.aL:C.dL,color:goed?C.success:grens?C.aT:C.danger,fontWeight:600}}>{goed?"✅ OK":grens?"⚠ Verhoogd":"❌ Hoog"}</span>
                          <button onClick={()=>remUZ(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {regSec==="weer"&&isPro&&(
              <Card title="🌤 Weer registreren" accentColor={C.primary}>
                <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.6}}>
                  Registreer het huidige weer automatisch via je locatie. Weersomstandigheden kunnen een trigger zijn voor jichtaanvallen.
                </div>
                <button onClick={fetchWeer} disabled={weerLoading} style={{background:weerLoading?C.border:C.primary,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:weerLoading?"not-allowed":"pointer",width:"100%",marginBottom:12,opacity:weerLoading?0.7:1}}>
                  {weerLoading?"⏳ Locatie ophalen...":"📍 Registreer huidig weer"}
                </button>
                {(dag.weer?.logs||[]).length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.weer.logs.map((w,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                        <span style={{fontSize:22}}>{w.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:C.text}}>{w.omschrijving}</div>
                          <div style={{fontSize:11,color:C.muted}}>{w.temp}°C · {w.vochtigheid}% vochtig · wind {w.wind} km/u</div>
                        </div>
                        <span style={{fontSize:11,color:C.muted}}>{w.tijd}</span>
                        <button onClick={()=>setDag(d=>({...d,weer:{...d.weer,logs:d.weer.logs.filter((_,j)=>j!==i)}}))} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:10}}>☁ Data wordt automatisch opgeslagen</div>
          </div>
        )}

        {/* ══ OVERZICHT ══ */}
        {mainTab==="overzicht"&&(
          <div>
            <div style={{background:C.pL,borderRadius:12,padding:"12px 14px",marginBottom:14,border:"1px solid "+C.border}}>
              <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:4}}>📖 Dagboek</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Een overzicht van al je dagregistraties. Tik op een dag voor alle details.</div>
            </div>
            {entries.length===0?<Empty icon="📖" text="Nog geen registraties. Start met de Registreer tab!"/>:(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {entries.map(e=>{ const pijns=e.pijn_logs||e.pijnLogs||[];
                  const topP=pijns.length?Math.max(...pijns.map(p=>p.level)):0;
                  return (
                    <div key={e.id} style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,borderLeft:"4px solid "+(topP>0?PC[topP]:C.border)}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15}}>{fmt(e.date)}</div>
                          {(e.aanval?.logs||[]).some(a=>a.type==="actief")&&<span style={{fontSize:11,background:C.dL,color:C.danger,padding:"2px 8px",borderRadius:10,fontWeight:700}}>🚨 AANVAL</span>}
                        </div>
                        {topP>0&&<div style={{width:34,height:34,borderRadius:8,background:PC[topP],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16}}>{topP}</div>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        {e.eten?.logs?.length>0&&<Row icon="🍽" label="Eten" val={e.eten.logs.map(l=>l.moment+": "+l.tekst).join(" · ")}/>}
                        {e.drinken?.logs?.length>0&&<Row icon="💧" label="Drinken" val={e.drinken.logs.length+"x · "+e.drinken.logs.reduce((s,l)=>s+(l.ml||0),0)+"ml"}/>}
                        {e.bewegen?.logs?.length>0&&<Row icon="🏃" label="Beweging" val={e.bewegen.logs.reduce((s,l)=>s+(parseInt(l.minuten)||0),0)+"min"}/>}
                        {e.slaap?.uren&&<Row icon="😴" label="Slaap" val={e.slaap.uren+"u"}/>}
                        {pijns.length>0&&<Row icon="😣" label="Pijn" val={pijns.map(p=>p.tijd+": "+(p.level>0?p.level+"/5":"geen")).join(", ")}/>}
                        {(e.aanval?.logs||[]).length>0&&<Row icon="⚠" label="Aanval" val={(e.aanval.logs).map(a=>a.tijd+" "+(a.type==="actief"?"🚨":a.type==="voorbij"?"✅":a.type==="afnemend"?"📉":"🔔")).join(" · ")}/>}
                        {(e.med?.logs||[]).length>0&&<Row icon="💊" label="Meds" val={(e.med.logs).map(m=>m.naam).join(", ")}/>}
                        {(e.suppl?.logs||[]).length>0&&<Row icon="🌿" label="Supplementen" val={(e.suppl.logs).map(s=>s.naam).join(", ")}/>
                        }{(e.urinezuur?.logs||[]).length>0&&<Row icon="🩸" label="Urinezuur" val={(e.urinezuur.logs).map(l=>l.waarde+" "+(l.eenheid==="mmol"?"mmol/L":"mg/dL")).join(", ")}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ STATISTIEKEN ══ */}
        {mainTab==="statistieken"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.pL,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border}}>
              <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:4}}>📈 Trends</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Maandelijkse samenvattingen en grafieken van je aanvallen, pijnscores en slaappatroon.</div>
            </div>
            {entries.length===0?<Empty icon="📈" text="Voeg registraties toe om trends te zien."/>:(
              <>
                <Card title="📅 Maandoverzicht">
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{borderBottom:"2px solid "+C.border}}>{["Maand","Aanvallen","Gem. pijn","Gem. slaap"].map(h=><th key={h} style={{padding:"5px 7px",textAlign:"left",color:C.muted,fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                      <tbody>{monthly.slice().reverse().map((m,i)=>(
                        <tr key={m.key} style={{borderBottom:"1px solid "+C.border,background:i%2===0?"#fff":C.bg}}>
                          <td style={{padding:"7px",fontWeight:600}}>{m.label}</td>
                          <td style={{padding:"7px"}}><span style={{background:m.attacks>0?"#FEE2E2":"#D1FAE5",color:m.attacks>0?C.danger:C.success,borderRadius:10,padding:"2px 8px",fontWeight:700,fontSize:11}}>{m.attacks}</span></td>
                          <td style={{padding:"7px",color:m.avgPain?PC[Math.round(parseFloat(m.avgPain))]:C.muted,fontWeight:m.avgPain?700:400}}>{m.avgPain?m.avgPain+"/5":"–"}</td>
                          <td style={{padding:"7px",color:C.muted}}>{m.avgSlaap?m.avgSlaap+"u":"–"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </Card>
                {recent.length>=2&&<Card title="🔴 Aanvallen per maand"><BarChart data={recent} vk="attacks" color={C.danger} maxV={Math.max(...recent.map(m=>m.attacks),1)}/></Card>}
                {recent.filter(m=>m.avgPain).length>=2&&<Card title="😣 Gem. pijn per maand"><BarChart data={recent} vk="avgPain" color={C.accent} maxV={5} unit="/5"/></Card>}
                {recent.filter(m=>m.avgUZ).length>=2&&(
                  <Card title="🩸 Gem. urinezuur per maand (mmol/L)">
                    <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Streefwaarde: onder 0.36 mmol/L</div>
                    <BarChart data={recent} vk="avgUZ" color={C.danger} maxV={Math.max(...recent.map(m=>parseFloat(m.avgUZ)||0),0.6)}/>
                    <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"center"}}>
                      <div style={{width:12,height:4,background:C.success,borderRadius:2,alignSelf:"center"}}/>
                      <span style={{fontSize:10,color:C.muted}}>Doel: 0.36</span>
                    </div>
                  </Card>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[{l:"Totaal aanvallen",v:totalAttacks,icon:"🔴",col:C.danger},{l:"Gem. pijnscore",v:avgPain,icon:"😣",col:C.accent},{l:"Registraties",v:entries.length,icon:"📝",col:C.primary},{l:"Maanden gevolgd",v:monthly.length,icon:"📅",col:C.success}].map((s,i)=>(
                    <div key={i} style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,textAlign:"center"}}>
                      <div style={{fontSize:22}}>{s.icon}</div>
                      <div style={{fontSize:24,fontWeight:800,color:s.col,marginTop:3}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ AI ══ */}
        {mainTab==="analyse"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.pL,borderRadius:12,padding:14,border:"1px solid "+C.border}}>
              <div style={{fontWeight:700,color:C.primary,fontSize:15,marginBottom:5}}>🧠 Persoonlijke AI-analyse</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Analyseert patronen, triggers en trends in al jouw gegevens.</div>
              <div style={{fontSize:11,color:C.muted,marginTop:6}}>📊 {entries.length} dag(en) · 💊 {profile.meds?.length||0} vaste medicatie(s)</div>
            </div>
            <button onClick={async()=>{setAiLoading(true);const r=await callAI("analyse");setAiResult(r);setAiLoading(false);}} disabled={aiLoading||entries.length<2} style={{background:entries.length>=2?C.accent:C.border,color:"#fff",border:"none",borderRadius:10,padding:"14px",fontSize:15,fontWeight:700,cursor:entries.length>=2?"pointer":"not-allowed",width:"100%",opacity:aiLoading?0.7:1}}>
              {aiLoading?"⏳ Analyseren...":"🔍 Analyseer mijn data"}
            </button>
            {entries.length<2&&<div style={{textAlign:"center",color:C.muted,fontSize:13}}>Minimaal 2 registraties nodig.</div>}
            {aiResult&&<div style={{background:C.card,borderRadius:12,padding:18,border:"1px solid "+C.border}}><div style={{fontSize:14,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap"}}>{aiResult}</div></div>}
          </div>
        )}

      </div>
    </div>
  );
}

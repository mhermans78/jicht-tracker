import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SU = "https://vblvtkykrcgjaovhqqlg.supabase.co";
const SK = "sb_publishable_qqsEjJUnlH6xiUx_S6mEnQ_zLA_bJNw";
async function sf(path,method="GET",body=null,token=null){ const h={"Content-Type":"application/json","apikey":SK,"Authorization":"Bearer "+(token||SK),"Prefer":method==="POST"?"return=representation":""};
  const r=await fetch(SU+path,{method,headers:h,body:body?JSON.stringify(body):null});
  const t=await r.text(); return t?JSON.parse(t):null;
}
async function signIn(e,p){return sf("/auth/v1/token?grant_type=password","POST",{email:e,password:p});}
async function refreshSession(rt){return sf("/auth/v1/token?grant_type=refresh_token","POST",{refresh_token:rt});}
const REMEMBER_MS=7*24*60*60*1000;
function readSession(){
  try{
    let raw=localStorage.getItem("jicht_session"),store="local";
    if(!raw){raw=sessionStorage.getItem("jicht_session");store="session";}
    if(!raw)return null;
    const s=JSON.parse(raw);
    if(s.until&&Date.now()>s.until){clearSession();return null;}
    s._store=store;return s;
  }catch{return null;}
}
function writeSession(s){
  try{
    const{_store,...clean}=s;
    const store=(_store==="session"||(!_store&&!clean.until&&!clean.demo))?sessionStorage:localStorage;
    const other=store===localStorage?sessionStorage:localStorage;
    other.removeItem("jicht_session");
    store.setItem("jicht_session",JSON.stringify(clean));
  }catch{}
}
function clearSession(){try{localStorage.removeItem("jicht_session");sessionStorage.removeItem("jicht_session");}catch{}}
function buildSession(d,remember){return{token:d.access_token,refresh:d.refresh_token,exp:Date.now()+(d.expires_in||3600)*1000,user:d.user,until:remember?Date.now()+REMEMBER_MS:0,_store:remember?"local":"session"};}
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
// Modern font via system stack met Inter als voorkeur
// Tabler icons worden geladen via index.html
const FONT = '"IBM Plex Sans","Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const C={bg:"#F3F8FB",card:"#FFFFFF",dark:"#12303D",dark2:"#FFFFFF",dark3:"#D9E6EC",primary:"#0E7C86",pL:"#E3F3F4",pD:"#0A5F67",accent:"#E8912D",aL:"#FDF3E3",aT:"#9A5B0F",danger:"#DC2F2F",dL:"#FEF2F2",success:"#2F9E6E",sL:"#E6F5EE",text:"#12303D",muted:"#6B8794",border:"#D9E6EC",pro:"#7C3AED",proL:"#F5F3FF"};
const PC=["#ccc","#4CAF50","#8BC34A","#FF9800","#F44336","#B71C1C"];
const PL=["","Licht","Matig","Ernstig","Hevig","Ondraaglijk"];
const MNL=["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const today=()=>new Date().toISOString().slice(0,10);
const nowT=()=>new Date().toTimeString().slice(0,5);
const fmt=d=>new Date(d+"T12:00:00").toLocaleDateString(LOC(),{day:"numeric",month:"short",year:"numeric"});
const inp={width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid "+C.border,fontSize:15,fontFamily:FONT,color:C.text,background:"#FFFFFF",boxSizing:"border-box",outline:"none",transition:"border-color 0.15s"};

const BEWEGING=["Wandelen","Hardlopen","Fietsen","Zwemmen","Yoga","Pilates","Krachttraining","HIIT","Dansen","Golf","Tennis","Tuinieren","Traplopen","Stretchen","Aquagym","Roeien","Skien","Wandelvoetbal","Tai chi","Anders"];
const SUPPL=["Vitamine C","Kersensap/cherry extract","Quercetine","Visolie (omega-3)","Foliumzuur","Probiotica","Curcumine/kurkuma","Magnesium","Zink","Bromelaine","Boswellia","MSM","Collageen","Vitamine D","Anders"];
const MEDP=["Allopurinol","Febuxostat (Adenuric)","Probenecid","Benzbromarone","Colchicine (laag)","Pegloticase"];
const MEDA=["Colchicine (hoog)","Ibuprofen","Naproxen","Indomethacine","Diclofenac","Prednison","Methylprednisolon","Triamcinolon (inj.)"];
const SYMP=["Zwelling","Roodheid","Warmte","Moeite lopen","Moeite bewegen","Tintelingen","Nachtpijn","Koorts","Stijfheid"];
const DCAT=["Water","Koffie/thee","Frisdrank","Alcohol","Fruitsap","Sportdrank","Melk","Anders"];
const PORTIE={ "Water":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Groot glas",i:"glas",ml:300},{l:"Flesje",i:"fles",ml:330},{l:"Fles",i:"fles",ml:500},{l:"Grote fles",i:"fles",ml:750}], "Koffie/thee":[{l:"Espresso",i:"kop",ml:30},{l:"Kopje",i:"kop",ml:150},{l:"Groot kopje",i:"kop",ml:250},{l:"Mok",i:"mok",ml:350}], "Frisdrank":[{l:"Glas",i:"glas",ml:200},{l:"Blikje",i:"blik",ml:330},{l:"Flesje",i:"fles",ml:500},{l:"Groot glas",i:"glas",ml:400}], "Alcohol":[{l:"Borrel",i:"shot",ml:35},{l:"Wijn",i:"wijn",ml:150},{l:"Biertje",i:"bier",ml:250},{l:"Pint",i:"bier",ml:500}], "Fruitsap":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Groot glas",i:"glas",ml:300},{l:"Flesje",i:"fles",ml:250}], "Sportdrank":[{l:"Klein flesje",i:"fles",ml:250},{l:"Flesje",i:"fles",ml:500},{l:"Grote fles",i:"fles",ml:750}], "Melk":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Groot glas",i:"glas",ml:300}], "Anders":[{l:"Klein glas",i:"glas",ml:150},{l:"Glas",i:"glas",ml:200},{l:"Kopje",i:"kop",ml:150},{l:"Flesje",i:"fles",ml:330},{l:"Fles",i:"fles",ml:500}],
};
const MMT=["Ontbijt","Lunch","Avondeten","Tussendoor","Avondsnack"];
const PRO_TABS=["bewegen","slaap","medsupp","weer","urinezuur"]; // alleen voor Pro-gebruikers
const RTABS_S1=[{id:"aanval",icon:"ti-alert-triangle",label:"Aanval"},{id:"pijn",icon:"ti-mood-sad",label:"Pijn"},{id:"urinezuur",icon:"ti-droplet",label:"Urinezuur"}];
const RTABS_S2=[{id:"eten",icon:"ti-salad",label:"Eten"},{id:"drinken",icon:"ti-droplets",label:"Drinken"},{id:"bewegen",icon:"ti-run",label:"Bewegen"},{id:"slaap",icon:"ti-moon",label:"Slaap"},{id:"weer",icon:"ti-cloud-sun",label:"Weer"},{id:"medsupp",icon:"ti-pill",label:"Med & Suppl"}];
const MTABS=[["home","ti-home","Home"],["registreer","ti-pencil","Registreer"],["overzicht","ti-book","Dagboek"],["statistieken","ti-chart-line","Trends"],["analyse","ti-bulb","Advies"]];

// ── Taal / i18n (NL standaard, DE via vlag) ───────────────────────────────────
let LANG="nl";
const LOC=()=>LANG==="de"?"de-DE":"nl-NL";
const DE={
"Slaap opslaan": "Schlaf speichern",
"In de demo-modus is het AI-advies niet beschikbaar. Maak een gratis account aan om een persoonlijk advies te ontvangen.": "Im Demo-Modus ist die KI-Empfehlung nicht verfügbar. Erstelle ein kostenloses Konto, um eine persönliche Empfehlung zu erhalten.",
"De AI is nu niet beschikbaar. Probeer het later opnieuw.": "Die KI ist derzeit nicht verfügbar. Versuche es später erneut.",
"Je sessie is verlopen. Log opnieuw in.": "Deine Sitzung ist abgelaufen. Melde dich erneut an.",
"Abonnement": "Abonnement",
"Zeg je abonnement op, wijzig je betaalmethode of download je facturen. Je opent hiervoor een beveiligde pagina van Stripe.": "Kündige dein Abonnement, ändere deine Zahlungsmethode oder lade deine Rechnungen herunter. Dafür öffnest du eine sichere Seite von Stripe.",
"Abonnement beheren": "Abonnement verwalten",
"Er is geen lopend abonnement gevonden bij dit account.": "Für dieses Konto wurde kein laufendes Abonnement gefunden.",
"Het beheerscherm is nu niet beschikbaar. Probeer het later opnieuw.": "Die Verwaltung ist derzeit nicht verfügbar. Versuche es später erneut.",
"De eerste maand is gratis": "Der erste Monat ist kostenlos",
"Probeer Pro een maand zonder kosten. Je betaalt pas na die maand. Zeg je vóór het einde van de proefmaand op, dan betaal je niets.": "Teste Pro einen Monat lang kostenlos. Du zahlst erst nach diesem Monat. Wenn du vor Ende des Probemonats kündigst, zahlst du nichts.",
"Start gratis maand →": "Kostenlosen Monat starten →",
"E-mailherinnering": "E-Mail-Erinnerung",
"Een vriendelijke mail als je een paar dagen niets hebt geregistreerd.": "Eine freundliche E-Mail, wenn du ein paar Tage nichts erfasst hast.",
"Instellen mislukt. Probeer het later opnieuw.": "Einstellung fehlgeschlagen. Versuche es später erneut.",
"E-mailherinnering als je een paar dagen niets registreert": "E-Mail-Erinnerung, wenn du ein paar Tage nichts erfasst",
"App-pincode": "App-PIN",
"Pincode instellen": "PIN festlegen",
"Pincode wijzigen": "PIN ändern",
"Pincode verwijderen": "PIN entfernen",
"Pincode verwijderd.": "PIN entfernt.",
"Pincode ingesteld.": "PIN festgelegt.",
"Kies een pincode van 4 cijfers.": "Wähle eine 4-stellige PIN.",
"Herhaal je pincode.": "Wiederhole deine PIN.",
"De pincodes komen niet overeen. Probeer opnieuw.": "Die PINs stimmen nicht überein. Versuche es erneut.",
"Voer je pincode in": "Gib deine PIN ein",
"Onjuiste pincode.": "Falsche PIN.",
"Pincode vergeten? Log opnieuw in": "PIN vergessen? Melde dich erneut an",
"Na 5 foute pogingen word je uitgelogd.": "Nach 5 Fehlversuchen wirst du abgemeldet.",
"Pincode is actief op dit toestel.": "Die PIN ist auf diesem Gerät aktiv.",
"Met een pincode open je de app sneller dan met je wachtwoord. De pincode geldt alleen op dit toestel. Na 5 foute pogingen word je uitgelogd en log je opnieuw in met je wachtwoord.": "Mit einer PIN öffnest du die App schneller als mit deinem Passwort. Die PIN gilt nur auf diesem Gerät. Nach 5 Fehlversuchen wirst du abgemeldet und meldest dich erneut mit deinem Passwort an.",
"Wissen": "Löschen",
"Maximaal 1 keer per dag, samen met je persoonlijk advies.": "Höchstens einmal pro Tag, zusammen mit deiner persönlichen Empfehlung.",
"Persoonlijk advies en rapporten kun je samen maximaal 1 keer per dag laten maken.": "Persönliche Empfehlungen und Berichte kannst du zusammen höchstens einmal pro Tag erstellen lassen.",
"⚠ Je hebt je dagelijkse AI-limiet bereikt: maximaal 1 advies of rapport per dag. Probeer het morgen weer.": "⚠ Du hast dein tägliches KI-Limit erreicht: höchstens 1 Empfehlung oder Bericht pro Tag. Versuche es morgen wieder.",
"Je locatie wordt alleen gebruikt voor het automatisch ophalen van weersgegevens. Deze gegevens worden niet permanent opgeslagen op onze servers.": "Dein Standort wird nur zum automatischen Abrufen von Wetterdaten verwendet. Diese Daten werden nicht dauerhaft auf unseren Servern gespeichert.",
"Licht": "Leicht",
"Matig": "Mäßig",
"Ernstig": "Stark",
"Hevig": "Sehr stark",
"Ondraaglijk": "Unerträglich",
"Ondraag.": "Unerträgl.",
"Wandelen": "Wandern",
"Hardlopen": "Laufen",
"Fietsen": "Radfahren",
"Zwemmen": "Schwimmen",
"Krachttraining": "Krafttraining",
"Dansen": "Tanzen",
"Tuinieren": "Gartenarbeit",
"Traplopen": "Treppensteigen",
"Stretchen": "Dehnen",
"Aquagym": "Aquagymnastik",
"Roeien": "Rudern",
"Skien": "Skifahren",
"Wandelvoetbal": "Walking Football",
"Tai chi": "Tai-Chi",
"Anders": "Andere",
"Vitamine C": "Vitamin C",
"Kersensap/cherry extract": "Kirschsaft/Kirschextrakt",
"Quercetine": "Quercetin",
"Visolie (omega-3)": "Fischöl (Omega-3)",
"Foliumzuur": "Folsäure",
"Probiotica": "Probiotika",
"Curcumine/kurkuma": "Curcumin/Kurkuma",
"Bromelaine": "Bromelain",
"Collageen": "Kollagen",
"Vitamine D": "Vitamin D",
"Benzbromarone": "Benzbromaron",
"Colchicine (laag)": "Colchicin (niedrig)",
"Colchicine (hoog)": "Colchicin (hoch)",
"Indomethacine": "Indometacin",
"Triamcinolon (inj.)": "Triamcinolon (Inj.)",
"Zwelling": "Schwellung",
"Roodheid": "Rötung",
"Warmte": "Wärme",
"Moeite lopen": "Gehbeschwerden",
"Moeite bewegen": "Bewegungseinschränkung",
"Tintelingen": "Kribbeln",
"Nachtpijn": "Nachtschmerz",
"Koorts": "Fieber",
"Stijfheid": "Steifheit",
"Water": "Wasser",
"Koffie/thee": "Kaffee/Tee",
"Frisdrank": "Softdrink",
"Alcohol": "Alkohol",
"Fruitsap": "Fruchtsaft",
"Sportdrank": "Sportgetränk",
"Melk": "Milch",
"Klein glas": "Kleines Glas",
"Groot glas": "Großes Glas",
"Flesje": "Fläschchen",
"Fles": "Flasche",
"Grote fles": "Große Flasche",
"Kopje": "Tasse",
"Groot kopje": "Große Tasse",
"Mok": "Becher",
"Blikje": "Dose",
"Borrel": "Schnaps",
"Wijn": "Wein",
"Biertje": "Bier",
"Pint": "Großes Bier",
"Klein flesje": "Kleine Flasche",
"Ontbijt": "Frühstück",
"Lunch": "Mittagessen",
"Avondeten": "Abendessen",
"Tussendoor": "Zwischendurch",
"Avondsnack": "Abendsnack",
"Aanval": "Anfall",
"Pijn": "Schmerz",
"Urinezuur": "Harnsäure",
"Eten": "Essen",
"Drinken": "Trinken",
"Bewegen": "Bewegung",
"Slaap": "Schlaf",
"Weer": "Wetter",
"Med & Suppl": "Med. & Suppl.",
"Home": "Start",
"Registreer": "Erfassen",
"Dagboek": "Tagebuch",
"Trends": "Trends",
"Advies": "Empfehlung",
"Laden...": "Laden...",
"Sluiten": "Schließen",
"Terug": "Zurück",
"Over Jicht Tracker": "Über GichtTracker",
"Jicht Tracker heb ik,": "GichtTracker habe ich,",
", ontwikkeld vanuit persoonlijke motivatie door eigen ervaring met de aandoening. Ik wilde meer inzicht zodat ik mijn aanvallen kon verminderen, ik minder pijn had en minder beperkt werd in mijn dagelijks doen en laten.": ", aus persönlicher Motivation aufgrund eigener Erfahrung mit der Erkrankung entwickelt. Ich wollte mehr Einblick, um meine Anfälle zu verringern, weniger Schmerzen zu haben und im Alltag weniger eingeschränkt zu sein.",
"De app wordt beheerd door": "Die App wird betrieben von",
"en de uit de pro versie gegenereerde opbrengsten zijn bedoeld om de infrastructuur kostendekkend te maken.": "und die Einnahmen aus der Pro-Version dienen dazu, die Infrastruktur kostendeckend zu betreiben.",
"Persoonlijk inzicht": "Persönliche Einblicke",
"De gebruiker helpen beter om te gaan met jicht door patronen en triggers in eigen data te ontdekken.": "Nutzern helfen, besser mit Gicht umzugehen, indem sie Muster und Auslöser in ihren eigenen Daten entdecken.",
"Anoniem onderzoek": "Anonyme Forschung",
"Op termijn anoniem geaggregeerde data verzamelen om betere behandeling mogelijk te maken.": "Langfristig anonym aggregierte Daten sammeln, um eine bessere Behandlung zu ermöglichen.",
"Let op!": "Achtung!",
"Jicht Tracker is een persoonlijk initiatief en geen medisch hulpmiddel. Raadpleeg altijd uw arts voor medisch advies.": "GichtTracker ist eine persönliche Initiative und kein Medizinprodukt. Konsultiere für medizinischen Rat immer deinen Arzt.",
"E-mail": "E-Mail",
"Vragen en feedback": "Fragen und Feedback",
"Bug melden": "Fehler melden",
"Iets werkt niet?": "Etwas funktioniert nicht?",
"Stuur melding": "Meldung senden",
"Suggestie": "Vorschlag",
"Idee voor verbetering": "Idee zur Verbesserung",
"Stuur suggestie": "Vorschlag senden",
"1. Aanval & Metingen — altijd invullen": "1. Anfall & Messungen — immer erfassen",
"Registreer elke aanval, pijnmeting of urinezuurwaarde zo snel mogelijk. Hoe preciezer de timing, hoe beter de app patronen herkent. Gebruik de Aanval-knop ook als je alleen signalen voelt — niet alleen bij een volledige aanval.": "Erfasse jeden Anfall, jede Schmerzmessung und jeden Harnsäurewert so schnell wie möglich. Je genauer der Zeitpunkt, desto besser erkennt die App Muster. Nutze die Schaltfläche „Anfall“ auch, wenn du nur Warnsignale spürst — nicht nur bei einem vollständigen Anfall.",
"2. Invloeden — dagelijks bijhouden": "2. Einflüsse — täglich festhalten",
"Vul dagelijks in wat je at, dronk, hoe je bewoog en sliep. Juist de combinatie van deze gegevens over meerdere dagen onthult welke triggers bij jou jichtaanvallen uitlokken. Alcohol, bepaalde voeding en te weinig water zijn bekende triggers.": "Trage täglich ein, was du gegessen und getrunken hast, wie du dich bewegt und geschlafen hast. Gerade die Kombination dieser Daten über mehrere Tage zeigt, welche Auslöser bei dir Gichtanfälle hervorrufen. Alkohol, bestimmte Lebensmittel und zu wenig Wasser sind bekannte Auslöser.",
"3. Waterdoel — stel jezelf een doel": "3. Wasserziel — setze dir ein Ziel",
"Voldoende drinken is een van de effectiefste manieren om jichtaanvallen te voorkomen. Stel je dagdoel in bovenaan de Drinken-tab en registreer wat je drinkt. Bij 2–3 liter water per dag scheidt het lichaam urinezuur beter uit.": "Ausreichend zu trinken ist eine der wirksamsten Möglichkeiten, Gichtanfälle zu verhindern. Lege dein Tagesziel oben im Tab „Trinken“ fest und erfasse, was du trinkst. Bei 2–3 Litern Wasser pro Tag scheidet der Körper Harnsäure besser aus.",
"4. Persoonlijk Advies": "4. Persönliche Empfehlung",
"Na minstens 5 registraties kun je een persoonlijk AI-advies opvragen, maximaal 1 keer per dag. Hoe meer data, hoe scherper het advies. Probeer het eens per week te doen om je voortgang te volgen.": "Nach mindestens 5 Einträgen kannst du eine persönliche KI-Empfehlung anfordern, höchstens einmal pro Tag. Je mehr Daten, desto präziser die Empfehlung. Versuche es einmal pro Woche, um deinen Fortschritt zu verfolgen.",
"5. Arts of therapeut raadplegen": "5. Arzt oder Therapeut konsultieren",
"Genereer een rapport vóór een bezoek aan uw arts of therapeut. Het rapport geeft een compleet overzicht van uw klachtenpatroon en kan het gesprek met uw zorgverlener sterk verbeteren.": "Erstelle vor einem Besuch bei deinem Arzt oder Therapeuten einen Bericht. Er gibt einen vollständigen Überblick über dein Beschwerdebild und kann das Gespräch mit deinem Behandler deutlich verbessern.",
"Jicht is grillig — een aanval kan dagen later komen na de trigger. Alleen dagelijkse registratie legt dat verband bloot.": "Gicht ist launisch — ein Anfall kann Tage nach dem Auslöser kommen. Nur die tägliche Erfassung deckt diesen Zusammenhang auf.",
"De AI-analyse wordt nauwkeuriger naarmate er meer data is. Eén week data geeft hints, één maand geeft inzicht, drie maanden geeft echt persoonlijk advies.": "Die KI-Analyse wird genauer, je mehr Daten vorliegen. Eine Woche Daten liefert Hinweise, ein Monat Einblicke, drei Monate echte persönliche Empfehlungen.",
"Als u medicatie gebruikt, helpt dagelijkse registratie om te zien of die effectief is en of uw leefstijl de werking ondersteunt.": "Wenn du Medikamente nimmst, hilft die tägliche Erfassung zu erkennen, ob sie wirken und ob dein Lebensstil die Wirkung unterstützt.",
"Uw arts of therapeut kan met een goed bijgehouden dagboek veel gerichter adviseren dan op basis van uw herinnering tijdens een consult.": "Dein Arzt oder Therapeut kann mit einem gut geführten Tagebuch viel gezielter beraten als allein anhand deiner Erinnerung im Gespräch.",
"Gebruikers die dagelijks registreren rapporteren gemiddeld 40% minder aanvallen binnen drie maanden, doordat ze hun persoonlijke triggers leren kennen en vermijden.": "Nutzer, die täglich erfassen, berichten im Schnitt von 40 % weniger Anfällen innerhalb von drei Monaten, weil sie ihre persönlichen Auslöser kennenlernen und vermeiden.",
"Ondersteuning": "Support",
"Handleiding": "Anleitung",
"Contact": "Kontakt",
"Waarom dagelijks registreren?": "Warum täglich erfassen?",
"Haal het maximale uit de app door:": "Hole das Maximum aus der App heraus:",
"Gouden tip": "Goldener Tipp",
"Maak er een vaste gewoonte van — registreer 's avonds voor het slapen gaan de dag. Dat duurt minder dan 2 minuten en levert waardevolle inzichten op.": "Mach es zur festen Gewohnheit — erfasse den Tag abends vor dem Schlafengehen. Das dauert weniger als 2 Minuten und liefert wertvolle Erkenntnisse.",
"Versie 1.1 · Maurice Hermans · HOBC BV · 2026": "Version 1.1 · Maurice Hermans · HOBC BV · 2026",
"Welke gegevens verzamelen wij?": "Welche Daten erheben wir?",
"Jicht Tracker slaat alle gegevens op die je via registraties ingeeft. Tevens slaan we je naam, profielfoto (optioneel), e-mailadres en abonnementsstatus op.": "GichtTracker speichert alle Daten, die du bei der Erfassung eingibst. Außerdem speichern wir deinen Namen, dein Profilfoto (optional), deine E-Mail-Adresse und deinen Abonnementstatus.",
"Locatie": "Standort",
"De app kan optioneel je camera gebruiken voor foto- en barcodeherkenning van voeding en supplementen. Je locatie wordt alleen gebruikt voor het automatisch ophalen van weersgegevens. Deze gegevens worden niet permanent opgeslagen op onze servers.": "Die App kann optional deine Kamera für die Foto- und Barcode-Erkennung von Lebensmitteln und Nahrungsergänzungsmitteln nutzen. Dein Standort wird nur zum automatischen Abrufen von Wetterdaten verwendet. Diese Daten werden nicht dauerhaft auf unseren Servern gespeichert.",
"AI-verwerking": "KI-Verarbeitung",
"Bij gebruik van de AI-analyses en het rapport worden je gezondheidsgegevens versleuteld verstuurd naar de Claude API (Anthropic). Deze gegevens worden niet gebruikt voor het trainen van AI-modellen.": "Bei Nutzung der KI-Analysen und des Berichts werden deine Gesundheitsdaten verschlüsselt an die Claude API (Anthropic) gesendet. Diese Daten werden nicht zum Training von KI-Modellen verwendet.",
"Hoe gebruiken wij jouw gegevens?": "Wie verwenden wir deine Daten?",
"Jouw gegevens worden uitsluitend gebruikt om de app te laten functioneren en jou gepersonaliseerde analyses te bieden. Persoonlijke gegevens worden nooit verkocht aan derden.": "Deine Daten werden ausschließlich verwendet, damit die App funktioniert und um dir personalisierte Analysen zu bieten. Persönliche Daten werden niemals an Dritte verkauft.",
"Op termijn kunnen volledig geanonimiseerde en geaggregeerde gegevens worden gebruikt voor wetenschappelijk onderzoek naar jicht. Individuele data is nooit herleidbaar tot jou als persoon.": "Langfristig können vollständig anonymisierte und aggregierte Daten für die wissenschaftliche Gichtforschung verwendet werden. Individuelle Daten sind niemals auf dich als Person zurückführbar.",
"Betalingen": "Zahlungen",
"Betalingen verlopen via Stripe. Jicht Tracker slaat geen betaalgegevens op. Stripe verwerkt betalingen conform PCI-DSS normen.": "Zahlungen laufen über Stripe. GichtTracker speichert keine Zahlungsdaten. Stripe verarbeitet Zahlungen gemäß den PCI-DSS-Standards.",
"Beveiliging": "Sicherheit",
"Alle gegevens zijn versleuteld opgeslagen via Supabase met Row Level Security. Alleen jij hebt toegang tot je eigen gegevens via jouw persoonlijke inloggegevens.": "Alle Daten werden verschlüsselt über Supabase mit Row Level Security gespeichert. Nur du hast mit deinen persönlichen Zugangsdaten Zugriff auf deine eigenen Daten.",
"Account verwijderen": "Konto löschen",
"Je kunt jouw account verwijderen via Profiel → Account verwijderen. Jouw gezondheidsdata wordt dan geanonimiseerd bewaard voor onderzoeksdoeleinden maar is niet meer herleidbaar tot jouw persoon.": "Du kannst dein Konto über Profil → Konto löschen entfernen. Deine Gesundheitsdaten werden dann anonymisiert für Forschungszwecke aufbewahrt, sind aber nicht mehr auf dich zurückführbar.",
"Jouw rechten (AVG/GDPR)": "Deine Rechte (DSGVO)",
"Je hebt het recht je gegevens in te zien, te corrigeren of te verwijderen. Neem contact op via support@jichttracker.nl.": "Du hast das Recht, deine Daten einzusehen, zu berichtigen oder zu löschen. Kontaktiere uns unter support@jichttracker.nl.",
"Cookies": "Cookies",
"Geen tracking-cookies. Alleen een sessie-token wordt lokaal opgeslagen om je ingelogd te houden.": "Keine Tracking-Cookies. Lediglich ein Sitzungs-Token wird lokal gespeichert, damit du angemeldet bleibst.",
"Privacybeleid": "Datenschutzerklärung",
"Laatste update: juli 2026 · Maurice Hermans · HOBC BV": "Letzte Aktualisierung: Juli 2026 · Maurice Hermans · HOBC BV",
"Weet je het zeker?": "Bist du sicher?",
"Hiermee worden al je registraties in de app gewist. Dit is niet ongedaan te maken.": "Damit werden alle deine Einträge in der App gelöscht. Das lässt sich nicht rückgängig machen.",
"Annuleer": "Abbrechen",
"Verwijderen": "Löschen",
"Geen medisch hulpmiddel": "Kein Medizinprodukt",
"Jicht Tracker is een persoonlijke registratie-app en vervangt geen medisch advies, diagnose of behandeling.": "GichtTracker ist eine persönliche Erfassungs-App und ersetzt keine medizinische Beratung, Diagnose oder Behandlung.",
"Aansprakelijkheid": "Haftung",
"Maurice Hermans, HOBC BV en Jicht Tracker aanvaarden geen aansprakelijkheid voor beslissingen die je neemt op basis van de informatie, analyses of adviezen in deze app. Raadpleeg altijd je arts of therapeut voor medisch advies.": "Maurice Hermans, HOBC BV und GichtTracker übernehmen keine Haftung für Entscheidungen, die du auf Grundlage der Informationen, Analysen oder Empfehlungen in dieser App triffst. Konsultiere für medizinischen Rat immer deinen Arzt oder Therapeuten.",
"AI-analyses en therapeutisch rapport": "KI-Analysen und Therapiebericht",
"De door AI gegenereerde analyses, persoonlijke adviezen en therapeutische rapporten zijn indicatief van aard en gebaseerd op door jou ingevoerde gegevens. Ze zijn niet medisch geverifieerd en mogen niet worden beschouwd als vervanging van professioneel medisch advies.": "Die von der KI erstellten Analysen, persönlichen Empfehlungen und Therapieberichte sind lediglich indikativ und beruhen auf den von dir eingegebenen Daten. Sie sind medizinisch nicht überprüft und dürfen nicht als Ersatz für professionellen medizinischen Rat betrachtet werden.",
"Foto- en barcodeherkenning": "Foto- und Barcode-Erkennung",
"De herkenning van voeding en supplementen via camera of barcode is gebaseerd op AI en externe databases. Jicht Tracker garandeert niet de volledigheid of juistheid van deze herkenning.": "Die Erkennung von Lebensmitteln und Nahrungsergänzungsmitteln per Kamera oder Barcode basiert auf KI und externen Datenbanken. GichtTracker garantiert nicht die Vollständigkeit oder Richtigkeit dieser Erkennung.",
"Weersgegevens": "Wetterdaten",
"Weersgegevens worden opgehaald via de Open-Meteo API en zijn indicatief. Jicht Tracker is niet verantwoordelijk voor afwijkingen in weersinformatie.": "Wetterdaten werden über die Open-Meteo-API abgerufen und sind unverbindlich. GichtTracker ist nicht für Abweichungen in den Wetterinformationen verantwortlich.",
"Nauwkeurigheid": "Genauigkeit",
"De gebruiker is zelf verantwoordelijk voor de juistheid van ingevoerde gegevens. Onjuiste invoer kan leiden tot onjuiste analyses.": "Der Nutzer ist selbst für die Richtigkeit der eingegebenen Daten verantwortlich. Falsche Eingaben können zu falschen Analysen führen.",
"Urinezuurwaarden": "Harnsäurewerte",
"De weergave van urinezuurwaarden en streefwaarden is informatief. Raadpleeg altijd je arts voor de interpretatie van bloedwaarden.": "Die Anzeige von Harnsäure- und Zielwerten dient nur der Information. Lass die Interpretation von Blutwerten immer von deinem Arzt vornehmen.",
"Beschikbaarheid": "Verfügbarkeit",
"Wij streven naar hoge beschikbaarheid maar garanderen geen ononderbroken toegang tot de app of de AI-functies.": "Wir streben eine hohe Verfügbarkeit an, garantieren aber keinen unterbrechungsfreien Zugang zur App oder zu den KI-Funktionen.",
"Disclaimer": "Haftungsausschluss",
"Jicht Tracker · HOBC BV · Maurice Hermans · Alle rechten voorbehouden": "GichtTracker · HOBC BV · Maurice Hermans · Alle Rechte vorbehalten",
"Grote teen rechts": "Großzeh rechts",
"Enkel rechts": "Sprunggelenk rechts",
"Knie rechts": "Knie rechts",
"Heup rechts": "Hüfte rechts",
"Grote teen links": "Großzeh links",
"Enkel links": "Sprunggelenk links",
"Knie links": "Knie links",
"Heup links": "Hüfte links",
"Pols rechts": "Handgelenk rechts",
"Pols links": "Handgelenk links",
"Elleboog rechts": "Ellenbogen rechts",
"Elleboog links": "Ellenbogen links",
"Tik op een gewricht om het te selecteren": "Tippe auf ein Gelenk, um es auszuwählen",
"Herkennen...": "Erkenne...",
"Scan foto": "Foto scannen",
"Geen barcode herkend": "Kein Barcode erkannt",
"Onbekend product": "Unbekanntes Produkt",
"Product niet gevonden": "Produkt nicht gefunden",
"Scan mislukt": "Scan fehlgeschlagen",
"Zoeken...": "Suche...",
"Scan barcode": "Barcode scannen",
"Pro-voordelen": "Pro-Vorteile",
"Dit onderdeel is alleen beschikbaar met Pro. Bekijk hier vrijblijvend de voordelen van Pro.": "Dieser Bereich ist nur mit Pro verfügbar. Sieh dir hier unverbindlich die Vorteile von Pro an.",
"Gratis of Pro": "Gratis oder Pro",
"Bekijk hier vrijblijvend wat Pro je extra biedt ten opzichte van gratis.": "Sieh dir hier unverbindlich an, was Pro dir gegenüber der kostenlosen Version zusätzlich bietet.",
"Je gebruikt al Jicht Tracker Pro.": "Du nutzt bereits GichtTracker Pro.",
"Gratis": "Kostenlos",
"Pro: alles van gratis, plus": "Pro: alles aus Kostenlos, plus",
"Aanvallen en pijn registreren": "Anfälle und Schmerzen erfassen",
"Eten en drinken bijhouden": "Essen und Trinken festhalten",
"Dagboek en trends": "Tagebuch und Trends",
"Persoonlijk AI-advies (na 5 registraties, 1 keer per dag)": "Persönliche KI-Empfehlung (nach 5 Einträgen, einmal pro Tag)",
"Medicatie en supplementen": "Medikamente und Nahrungsergänzung",
"Upgrade naar Pro": "Upgrade auf Pro",
"Onthoud mij 7 dagen": "7 Tage angemeldet bleiben",
"Jicht Tracker Pro": "GichtTracker Pro",
"Krijg toegang tot alle registratiemodules: beweging, slaap, weer, urinezuur, medicatie en supplementen.": "Erhalte Zugang zu allen Erfassungsmodulen: Bewegung, Schlaf, Wetter, Harnsäure, Medikamente und Nahrungsergänzung.",
"Drinken registreren": "Trinken erfassen",
"Beweging bijhouden": "Bewegung festhalten",
"Slaap monitoren": "Schlaf überwachen",
"Medicatie logging": "Medikamentenprotokoll",
"Supplementen tracking": "Nahrungsergänzung verfolgen",
"Maandelijks": "Monatlich",
"Maandelijks opzegbaar": "Monatlich kündbar",
"/maand": "/Monat",
"Kies maandelijks →": "Monatlich wählen →",
"BESTE DEAL": "BESTES ANGEBOT",
"Jaarlijks": "Jährlich",
"Je bespaart €9 per jaar": "Du sparst 9 € pro Jahr",
"/jaar": "/Jahr",
"Kies jaarlijks →": "Jährlich wählen →",
"Betaling via iDEAL, creditcard of SEPA · Veilig via Stripe · Op elk moment opzegbaar": "Zahlung per iDEAL, Kreditkarte oder SEPA · Sicher über Stripe · Jederzeit kündbar",
"Wachtwoorden komen niet overeen.": "Passwörter stimmen nicht überein.",
"Wachtwoorden komen niet overeen": "Passwörter stimmen nicht überein",
"Wachtwoord moet minimaal 6 tekens zijn.": "Das Passwort muss mindestens 6 Zeichen lang sein.",
"Account aangemaakt! Je kunt nu inloggen.": "Konto erstellt! Du kannst dich jetzt anmelden.",
"Registreren mislukt": "Registrierung fehlgeschlagen",
"Inloggen mislukt — controleer je gegevens": "Anmeldung fehlgeschlagen — überprüfe deine Angaben",
"Jicht": "Gicht",
"Begrijp je jicht. Verminder je aanvallen.": "Verstehe deine Gicht. Reduziere deine Anfälle.",
"een product van": "ein Produkt von",
"Inloggen": "Anmelden",
"Registreren": "Registrieren",
"E-mailadres": "E-Mail-Adresse",
"jouw@email.nl": "deine@email.de",
"Wachtwoord": "Passwort",
"Minimaal 6 tekens": "Mindestens 6 Zeichen",
"Wachtwoord herhalen": "Passwort wiederholen",
"Herhaal wachtwoord": "Passwort wiederholen",
"Even geduld...": "Einen Moment...",
"Inloggen →": "Anmelden →",
"Account aanmaken →": "Konto erstellen →",
"Vul eerst je e-mailadres in.": "Gib zuerst deine E-Mail-Adresse ein.",
"Fout bij versturen herstelmail. Controleer je e-mailadres.": "Fehler beim Senden der E-Mail. Überprüfe deine E-Mail-Adresse.",
"Wachtwoord vergeten?": "Passwort vergessen?",
"Wil je eerst de app bekijken?": "Möchtest du dir die App zuerst ansehen?",
"Bekijk demo (zonder opslag)": "Demo ansehen (ohne Speicherung)",
"Geen resultaat.": "Kein Ergebnis.",
"Fout bij genereren.": "Fehler beim Generieren.",
"Helder": "Klar",
"Bewolkt": "Bewölkt",
"Mist": "Nebel",
"Regen": "Regen",
"Sneeuw": "Schnee",
"Buien": "Schauer",
"Onweer": "Gewitter",
"Wachtwoord gewijzigd!": "Passwort geändert!",
"Mislukt": "Fehlgeschlagen",
"Demo-modus: account verwijderen niet beschikbaar.": "Demo-Modus: Konto löschen nicht verfügbar.",
"Opslaan...": "Speichern...",
"Opgeslagen": "Gespeichert",
"Rapport versturen": "Bericht senden",
"Profiel": "Profil",
"Privacy": "Datenschutz",
"Terug naar login": "Zurück zur Anmeldung",
"Uitloggen": "Abmelden",
"Menu": "Menü",
"Demo-modus — wijzigingen worden niet opgeslagen": "Demo-Modus — Änderungen werden nicht gespeichert",
"Eindelijk meer controle over je jicht": "Endlich mehr Kontrolle über deine Gicht",
"Goedemorgen": "Guten Morgen",
"Dagen actief": "Aktive Tage",
"Hoofdmenu": "Hauptmenü",
"Profiel opgeslagen!": "Profil gespeichert!",
"Foto kiezen": "Foto auswählen",
"Naam": "Name",
"Jouw naam": "Dein Name",
"Je e-mailadres is niet aanpasbaar via de app.": "Deine E-Mail-Adresse kann in der App nicht geändert werden.",
"Wachtwoord wijzigen": "Passwort ändern",
"Nieuw wachtwoord": "Neues Passwort",
"Herhaal nieuw wachtwoord": "Neues Passwort wiederholen",
"Bezig...": "Bitte warten...",
"Je account wordt verwijderd en je gegevens geanonimiseerd. Je gezondheidsdata blijft bewaard voor onderzoek maar is niet meer aan jou gekoppeld.": "Dein Konto wird gelöscht und deine Daten werden anonymisiert. Deine Gesundheitsdaten bleiben für die Forschung erhalten, sind aber nicht mehr mit dir verknüpft.",
"Dit kan niet ongedaan worden gemaakt. Je kunt daarna niet meer inloggen.": "Das lässt sich nicht rückgängig machen. Danach kannst du dich nicht mehr anmelden.",
"Verwijder account": "Konto löschen",
"De AI genereert een beknopt rapport. Daarna kun je het e-mailen via je": "Die KI erstellt einen kurzen Bericht. Danach kannst du ihn über deine",
"standaard mail-app": "Standard-Mail-App",
"Rapport genereren...": "Bericht wird erstellt...",
"Rapport genereren door AI": "Bericht per KI erstellen",
"Voeg eerst registraties toe.": "Füge zuerst Einträge hinzu.",
"Opnieuw genereren": "Neu erstellen",
"Verstuur naar:": "Senden an:",
"ontvanger@email.nl": "empfaenger@email.de",
"Openen in mail-app": "In Mail-App öffnen",
"Deze maand": "Dieser Monat",
"Aanvallen": "Anfälle",
"Gem. pijn": "Ø Schmerz",
"Registraties": "Einträge",
"Water vandaag": "Wasser heute",
"L van": "L von",
"L doel —": "L Ziel —",
"Registreer vandaag": "Heute erfassen",
"Persoonlijk advies klaar": "Persönliche Empfehlung bereit",
"registraties als basis": "Einträge als Grundlage",
"Bekijk": "Ansehen",
"Datum": "Datum",
"Aanval & Metingen": "Anfall & Messungen",
"Invloeden": "Einflüsse",
"Voeding registreren": "Ernährung erfassen",
"Wat heb je gegeten?": "Was hast du gegessen?",
"+ Toevoegen": "+ Hinzufügen",
"Dagdoel:": "Tagesziel:",
"ml dagdoel": "ml Tagesziel",
"Dagdoel behaald!": "Tagesziel erreicht!",
"Bijv. bier, rode wijn...": "Z. B. Bier, Rotwein...",
"Omschrijving": "Beschreibung",
"+ Registreren": "+ Erfassen",
"Beweging registreren": "Bewegung erfassen",
"sessie": "Einheit",
"sessies": "Einheiten",
"min totaal": "Min. gesamt",
"Tijdstip": "Uhrzeit",
"Minuten": "Minuten",
"+ Sessie toevoegen": "+ Einheit hinzufügen",
"Activiteit": "Aktivität",
"Slaap registreren": "Schlaf erfassen",
"Gisteravond naar bed": "Gestern Abend ins Bett",
"Vanochtend wakker": "Heute Morgen aufgewacht",
"Goede nachtrust": "Guter Schlaf",
"Redelijke nachtrust": "Akzeptabler Schlaf",
"Te weinig slaap": "Zu wenig Schlaf",
"Vul beide tijden in om de slaapduur te berekenen": "Gib beide Zeiten ein, um die Schlafdauer zu berechnen",
"Slaapduur wordt automatisch berekend en opgeslagen": "Die Schlafdauer wird automatisch berechnet und gespeichert",
"Pijn registreren": "Schmerz erfassen",
"Tijdstip wordt automatisch opgeslagen. Meerdere metingen per dag mogelijk.": "Die Uhrzeit wird automatisch gespeichert. Mehrere Messungen pro Tag sind möglich.",
"Ervaar je op dit moment pijn?": "Hast du gerade Schmerzen?",
"Ja, pijn": "Ja, Schmerzen",
"Geen pijn": "Keine Schmerzen",
"+ Pijnmeting opslaan (": "+ Schmerzmessung speichern (",
"Log vandaag:": "Protokoll heute:",
"Aanval registreren": "Anfall erfassen",
"registratie": "Eintrag",
"registraties": "Einträge",
"vandaag": "heute",
"Situatie op dit moment:": "Aktuelle Situation:",
"Waarschuwingssignalen": "Warnsignale",
"Mogelijk aanval op komst": "Möglicherweise kündigt sich ein Anfall an",
"Actieve aanval": "Akuter Anfall",
"Nu een actieve aanval": "Gerade ein akuter Anfall",
"Aanval neemt af": "Anfall klingt ab",
"Ergste pijn voorbij": "Schlimmste Schmerzen vorbei",
"Aanval voorbij": "Anfall vorbei",
"Geen klachten meer": "Keine Beschwerden mehr",
"Symptomen (optioneel)": "Symptome (optional)",
"Aangetast gewricht (tik om te selecteren)": "Betroffenes Gelenk (zum Auswählen tippen)",
"+ Registratie opslaan": "+ Eintrag speichern",
"Medicatie vandaag": "Medikamente heute",
"inname": "Einnahme",
"innames": "Einnahmen",
"Type": "Typ",
"Preventief": "Vorbeugend",
"Aanval/pijn": "Anfall/Schmerz",
"Of typ een ander medicijn...": "Oder gib ein anderes Medikament ein...",
"+ Inname registreren": "+ Einnahme erfassen",
"Supplementen vandaag": "Nahrungsergänzung heute",
"Of typ een supplement...": "Oder gib ein Supplement ein...",
"Urinezuurwaarde": "Harnsäurewert",
"meting": "Messung",
"metingen": "Messungen",
"Voer de waarde in na een bloedprikbeurt. Streefwaarde bij jicht: onder 0.36 mmol/L (6 mg/dL).": "Gib den Wert nach einer Blutabnahme ein. Zielwert bei Gicht: unter 0,36 mmol/L (6 mg/dL).",
"bijv. 0.42": "z. B. 0.42",
"bijv. 7.2": "z. B. 7.2",
"Onder streefwaarde": "Unter dem Zielwert",
"Verhoogd": "Erhöht",
"Fors verhoogd": "Stark erhöht",
"+ Meting opslaan (": "+ Messung speichern (",
"Hoog": "Hoch",
"Weer registreren": "Wetter erfassen",
"Registreer het huidige weer automatisch via je locatie. Weersomstandigheden kunnen een trigger zijn voor jichtaanvallen.": "Erfasse das aktuelle Wetter automatisch über deinen Standort. Wetterbedingungen können ein Auslöser für Gichtanfälle sein.",
"Locatie ophalen...": "Standort wird abgerufen...",
"Registreer huidig weer": "Aktuelles Wetter erfassen",
"% vochtig · wind": "% Luftfeuchtigkeit · Wind",
"km/u": "km/h",
"Data wordt automatisch opgeslagen": "Daten werden automatisch gespeichert",
"Een overzicht van al je dagregistraties. Tik op een dag voor alle details.": "Eine Übersicht aller deiner Tageseinträge. Tippe auf einen Tag für alle Details.",
"Nog geen registraties. Start met de Registreer tab!": "Noch keine Einträge. Starte mit dem Tab „Erfassen“!",
"AANVAL": "ANFALL",
"Beweging": "Bewegung",
"Meds": "Medikamente",
"Supplementen": "Nahrungsergänzung",
"Maandelijkse samenvattingen en grafieken van je aanvallen, pijnscores en slaappatroon.": "Monatliche Zusammenfassungen und Diagramme zu deinen Anfällen, Schmerzwerten und deinem Schlafmuster.",
"Voeg registraties toe om trends te zien.": "Füge Einträge hinzu, um Trends zu sehen.",
"Maandoverzicht": "Monatsübersicht",
"Maand": "Monat",
"Gem. slaap": "Ø Schlaf",
"Aanvallen per maand": "Anfälle pro Monat",
"Gem. pijn per maand": "Ø Schmerz pro Monat",
"Gem. urinezuur per maand (mmol/L)": "Ø Harnsäure pro Monat (mmol/L)",
"Streefwaarde: onder 0.36 mmol/L": "Zielwert: unter 0,36 mmol/L",
"Doel: 0.36": "Ziel: 0.36",
"Totaal aanvallen": "Anfälle gesamt",
"Gem. pijnscore": "Ø Schmerzwert",
"Maanden gevolgd": "Monate erfasst",
"Persoonlijk Jicht Advies": "Persönliche Gicht-Empfehlung",
"Analyseert jouw registraties en geeft persoonlijk advies over patronen, triggers en verbeterpunten.": "Analysiert deine Einträge und gibt persönliche Empfehlungen zu Mustern, Auslösern und Verbesserungen.",
"dag(en) ·": "Tag(e) ·",
"vaste medicatie(s)": "feste Medikament(e)",
"Analyseren...": "Analysiere...",
"Genereer mijn persoonlijk advies": "Meine persönliche Empfehlung erstellen",
"Minimaal 5 registraties nodig.": "Mindestens 5 Einträge nötig.",
"Dagelijkse registratie": "Tägliche Erfassung",
"Taal / Sprache": "Sprache / Taal",
"geen": "keine",
"min": "Min."
};
const MONTH_DE={Jan:"Jan",Feb:"Feb",Mrt:"Mär",Apr:"Apr",Mei:"Mai",Jun:"Jun",Jul:"Jul",Aug:"Aug",Sep:"Sep",Okt:"Okt",Nov:"Nov",Dec:"Dez"};
const I18N_RULES=[
  [/^(Jan|Feb|Mrt|Apr|Mei|Jun|Jul|Aug|Sep|Okt|Nov|Dec)( \d{2})?$/,m=>MONTH_DE[m[1]]+(m[2]||"")],
  [/^(\d+)u(?: (\d+)min)?$/,m=>m[1]+" Std."+(m[2]?" "+m[2]+" Min.":"")],
  [/^([\d.,]+)u$/,m=>m[1]+" Std."],
  [/^(\d+)min$/,m=>m[1]+" Min."],
  [/^(\d{1,2}:\d{2}) (actief|voorbij|afnemend|signalen)$/,m=>m[1]+" "+({actief:"akut",voorbij:"vorbei",afnemend:"klingt ab",signalen:"Warnsignale"})[m[2]]],
  [/^⚠ Je hebt het dagelijkse maximum van (\d+) (AI-analyse|foto scan)(s?) bereikt\. Probeer het morgen weer\.$/,m=>"⚠ Du hast das Tageslimit von "+m[1]+" "+(m[2]==="AI-analyse"?"KI-Analyse":"Foto-Scan")+(m[3]?(m[2]==="AI-analyse"?"n":"s"):"")+" erreicht. Versuche es morgen wieder."],
  [/^Herstelmail verstuurd naar (.+)\. Controleer ook je spam\.$/,m=>"Wiederherstellungs-E-Mail an "+m[1]+" gesendet. Prüfe auch deinen Spam-Ordner."],
  [/^Kan weersdata niet ophalen: ([\s\S]*)$/,m=>"Wetterdaten konnten nicht abgerufen werden: "+m[1]],
  [/^Fout bij opslaan: ([\s\S]*)$/,m=>"Fehler beim Speichern: "+m[1]],
  [/^Fout: ([\s\S]*)$/,m=>"Fehler: "+m[1]],
];
function trPiece(p){
  if(typeof DE[p]==="string"&&Object.prototype.hasOwnProperty.call(DE,p))return DE[p];
  for(const [re,fn] of I18N_RULES){const m=p.match(re);if(m)return fn(m);}
  return p;
}
function trCore(core){
  const whole=trPiece(core);
  if(whole!==core)return whole;
  const parts=core.split(/(, | · |: )/);
  if(parts.length>1){let ch=false;const out=parts.map((x,i)=>{if(i%2===1)return x;const r=trPiece(x);if(r!==x)ch=true;return r;});if(ch)return out.join("");}
  return core;
}
function tt(str){
  if(LANG!=="de"||typeof str!=="string")return str;
  const m=str.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if(!m[2])return str;
  const core=m[2].replace(/\s+/g," ");
  const out=trCore(core);
  return out===core?str:m[1]+out+m[3];
}
const dialog=msg=>window.alert(tt(msg));
const TR_ATTRS=["placeholder","title","aria-label","alt"];
const nodeRec=new WeakMap(),elRec=new WeakMap();
function trNode(n){
  const p=n.parentNode;if(!p)return;
  const tag=p.nodeName;if(tag==="SCRIPT"||tag==="STYLE"||tag==="TEXTAREA")return;
  let rec=nodeRec.get(n);
  if(!rec||n.nodeValue!==rec.out)rec={src:n.nodeValue,out:n.nodeValue};
  const out=LANG==="de"?tt(rec.src):rec.src;
  rec.out=out;nodeRec.set(n,rec);
  if(n.nodeValue!==out)n.nodeValue=out;
}
function trEl(el){
  if(!el||el.nodeType!==1)return;
  for(const a of TR_ATTRS){
    if(!el.hasAttribute(a))continue;
    let m=elRec.get(el);if(!m){m={};elRec.set(el,m);}
    const cur=el.getAttribute(a);
    let rec=m[a];if(!rec||cur!==rec.out)rec={src:cur,out:cur};
    const out=LANG==="de"?tt(rec.src):rec.src;
    rec.out=out;m[a]=rec;
    if(cur!==out)el.setAttribute(a,out);
  }
}
function trTree(root){
  if(!root)return;
  if(root.nodeType===3){trNode(root);return;}
  if(root.nodeType!==1)return;
  trEl(root);
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
  let n;while((n=w.nextNode())){if(n.nodeType===3)trNode(n);else trEl(n);}
}
function startI18nObserver(){
  const mo=new MutationObserver(ms=>{
    if(LANG!=="de")return;
    for(const m of ms){
      if(m.type==="characterData")trNode(m.target);
      else if(m.type==="attributes")trEl(m.target);
      else m.addedNodes.forEach(trTree);
    }
  });
  mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:TR_ATTRS});
  return mo;
}
function Flag({code,w=34}){
  const h=Math.round(w*2/3);
  return(
    <svg width={w} height={h} viewBox="0 0 30 20" aria-hidden="true" style={{display:"block",borderRadius:5}}>
      {code==="nl"?<><rect width="30" height="7" y="0" fill="#AE1C28"/><rect width="30" height="6.5" y="6.5" fill="#FFFFFF"/><rect width="30" height="7" y="13" fill="#21468B"/></>
      :<><rect width="30" height="7" y="0" fill="#111111"/><rect width="30" height="6.5" y="6.5" fill="#DD0000"/><rect width="30" height="7" y="13" fill="#FFCE00"/></>}
    </svg>
  );
}
function LangSwitch({lang,setLang}){
  return(
    <div style={{display:"inline-flex",gap:10,alignItems:"center"}}>
      {[["nl","Nederlands"],["de","Deutsch"]].map(([c,lbl])=>{const on=lang===c;return(
        <button key={c} type="button" onClick={e=>{e.stopPropagation();setLang(c);}} aria-label={lbl} aria-pressed={on} title={lbl} style={{border:"none",background:"transparent",padding:3,cursor:"pointer",borderRadius:9,outline:on?"2px solid "+C.primary:"2px solid transparent",outlineOffset:1,opacity:on?1:0.55,transition:"opacity 0.15s"}}>
          <Flag code={c}/>
        </button>);})}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Card({title,children,accentColor,icon}){ const ac=accentColor||C.primary; return (
    <div style={{background:C.card,borderRadius:18,padding:"18px 20px",border:"1px solid "+C.border,boxShadow:"0 1px 3px rgba(18,48,61,0.05)"}}>
      {title&&<div style={{fontWeight:600,fontSize:15,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        {icon&&<span style={{width:32,height:32,borderRadius:10,background:ac+"1A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className={"ti "+icon} style={{fontSize:18,color:ac}} aria-hidden="true"></i></span>}
        {title}
      </div>}
      {children}
    </div>
  );
}
function Chips({opts,sel,onToggle,col=C.primary,bg=C.pL}){ return (
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {opts.map(o=>{ const on=sel.includes(o);
        return <button key={o} onClick={()=>onToggle(o)} style={{padding:"5px 11px",borderRadius:20,fontSize:12,cursor:"pointer",border:"1.5px solid "+(on?col:C.border),background:on?bg:C.card,color:on?col:C.muted,fontWeight:on?700:400}}>{o}</button>;
      })}
    </div>
  );
}
function Row({icon,label,val}){ return (
    <div style={{display:"flex",gap:8,fontSize:12,marginBottom:4,alignItems:"center"}}>
      <i className={"ti "+icon} style={{fontSize:15,color:C.primary,flexShrink:0}} aria-hidden="true"></i>
      <span style={{color:C.muted,minWidth:80}}>{label}:</span>
      <span style={{color:C.text,flex:1}}>{val}</span>
    </div>
  );
}
function Empty({icon,text}){return <div style={{textAlign:"center",color:C.muted,marginTop:40}}><div style={{width:72,height:72,borderRadius:22,background:C.pL,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><i className={"ti "+icon} style={{fontSize:34,color:C.primary}} aria-hidden="true"></i></div><p style={{fontSize:14,marginTop:12}}>{text}</p></div>;}
function Spinner(){return <div style={{textAlign:"center",padding:40,color:C.muted}}><i className="ti ti-loader-2" style={{fontSize:32,color:C.primary}} aria-hidden="true"></i><p style={{fontSize:13,marginTop:8}}>Laden...</p></div>;}

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
function Modal({show,onClose,title,accentColor=C.primary,icon,children}){
  useEffect(()=>{
    if(show){document.body.style.overflow="hidden";}
    else{document.body.style.overflow="";}
    return ()=>{document.body.style.overflow="";};
  },[show]);
  if(!show)return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(18,48,61,0.55)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"#FFFFFF",borderRadius:"0 0 24px 24px",padding:"24px 20px 0",width:"100%",maxWidth:680,minHeight:"60vh",display:"flex",flexDirection:"column",position:"relative"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,position:"sticky",top:0,background:C.card,zIndex:1,paddingTop:2,paddingBottom:4}}>
          <div style={{fontWeight:700,fontSize:19,color:C.text,display:"flex",alignItems:"center",gap:10}}>{icon&&<span style={{width:36,height:36,borderRadius:11,background:accentColor+"1A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className={"ti "+icon} style={{fontSize:20,color:accentColor}} aria-hidden="true"></i></span>}{title}</div>
          <button onClick={onClose} aria-label="Sluiten" style={{background:C.bg,border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",color:C.muted,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti ti-x" style={{fontSize:18}} aria-hidden="true"></i></button>
        </div>
        <div style={{height:1,background:C.border,marginBottom:18,flexShrink:0}}/>
        {/* Inhoud */}
        <div style={{flex:1,paddingBottom:16}}>
          {children}
        </div>
        {/* Sticky terug knop onderaan */}
        <div style={{position:"sticky",bottom:0,background:C.card,paddingTop:10,paddingBottom:28,marginTop:4,borderTop:"1px solid "+C.border}}>
          <button onClick={onClose} style={{width:"100%",padding:"12px",background:C.bg,border:"1.5px solid "+C.border,borderRadius:12,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <i className="ti ti-arrow-left" style={{fontSize:16}} aria-hidden="true"></i> Terug
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Informatie modals ─────────────────────────────────────────────────────────
function OverModal({show,onClose}){ return (
    <Modal show={show} onClose={onClose} title="Over Jicht Tracker" icon="ti-info-circle">
      <p style={{fontSize:14,lineHeight:1.8,color:C.text,marginBottom:16}}>Jicht Tracker heb ik, <strong>Maurice Hermans</strong>, ontwikkeld vanuit persoonlijke motivatie door eigen ervaring met de aandoening. Ik wilde meer inzicht zodat ik mijn aanvallen kon verminderen, ik minder pijn had en minder beperkt werd in mijn dagelijks doen en laten.</p>
      <p style={{fontSize:14,lineHeight:1.8,color:C.text,marginBottom:16}}>De app wordt beheerd door <strong>HOBC BV</strong> en de uit de pro versie gegenereerde opbrengsten zijn bedoeld om de infrastructuur kostendekkend te maken.</p>
      <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:16}}>
        <div style={{display:"flex",gap:12,marginBottom:14}}>
          <span style={{fontSize:22}}><i className="ti ti-target" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></span>
          <div><div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Persoonlijk inzicht</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>De gebruiker helpen beter om te gaan met jicht door patronen en triggers in eigen data te ontdekken.</div></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <span style={{fontSize:22}}><i className="ti ti-microscope" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></span>
          <div><div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Anoniem onderzoek</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Op termijn anoniem geaggregeerde data verzamelen om betere behandeling mogelijk te maken.</div></div>
        </div>
      </div>
      <div style={{background:C.aL,border:"1px solid "+C.accent,borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:18,flexShrink:0}}><i className="ti ti-alert-triangle" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></span>
        <p style={{fontSize:13,color:C.aT,lineHeight:1.6,margin:0}}><strong>Let op!</strong> Jicht Tracker is een persoonlijk initiatief en geen medisch hulpmiddel. Raadpleeg altijd uw arts voor medisch advies.</p>
      </div>
    </Modal>
  );
}

function SupportModal({show,onClose}){
  const [tab,setTab]=useState("handleiding");
  const items=[
    {icon:"ti-mail",title:"E-mail",sub:"Vragen en feedback",val:"support@jichttracker.nl",link:"mailto:support@jichttracker.nl"},
    {icon:"ti-bug",title:"Bug melden",sub:"Iets werkt niet?",val:"Stuur melding",link:"mailto:support@jichttracker.nl?subject=Bug"},
    {icon:"ti-bulb",title:"Suggestie",sub:"Idee voor verbetering",val:"Stuur suggestie",link:"mailto:support@jichttracker.nl?subject=Suggestie"},
  ];
  const stappen=[
    {icon:"ti-alert-triangle",kleur:C.danger,titel:"1. Aanval & Metingen — altijd invullen",tekst:"Registreer elke aanval, pijnmeting of urinezuurwaarde zo snel mogelijk. Hoe preciezer de timing, hoe beter de app patronen herkent. Gebruik de Aanval-knop ook als je alleen signalen voelt — niet alleen bij een volledige aanval."},
    {icon:"ti-salad",kleur:C.primary,titel:"2. Invloeden — dagelijks bijhouden",tekst:"Vul dagelijks in wat je at, dronk, hoe je bewoog en sliep. Juist de combinatie van deze gegevens over meerdere dagen onthult welke triggers bij jou jichtaanvallen uitlokken. Alcohol, bepaalde voeding en te weinig water zijn bekende triggers."},
    {icon:"ti-droplets",kleur:C.primary,titel:"3. Waterdoel — stel jezelf een doel",tekst:"Voldoende drinken is een van de effectiefste manieren om jichtaanvallen te voorkomen. Stel je dagdoel in bovenaan de Drinken-tab en registreer wat je drinkt. Bij 2–3 liter water per dag scheidt het lichaam urinezuur beter uit."},
    {icon:"ti-brain",kleur:"#7C3AED",titel:"4. Persoonlijk Advies",tekst:"Na minstens 5 registraties kun je een persoonlijk AI-advies opvragen, maximaal 1 keer per dag. Hoe meer data, hoe scherper het advies. Probeer het eens per week te doen om je voortgang te volgen."},
    {icon:"ti-stethoscope",kleur:C.success,titel:"5. Arts of therapeut raadplegen",tekst:"Genereer een rapport vóór een bezoek aan uw arts of therapeut. Het rapport geeft een compleet overzicht van uw klachtenpatroon en kan het gesprek met uw zorgverlener sterk verbeteren."},
  ];
  const waarom=[
    {icon:"ti-chart-line",tekst:"Jicht is grillig — een aanval kan dagen later komen na de trigger. Alleen dagelijkse registratie legt dat verband bloot."},
    {icon:"ti-search",tekst:"De AI-analyse wordt nauwkeuriger naarmate er meer data is. Eén week data geeft hints, één maand geeft inzicht, drie maanden geeft echt persoonlijk advies."},
    {icon:"ti-pill",tekst:"Als u medicatie gebruikt, helpt dagelijkse registratie om te zien of die effectief is en of uw leefstijl de werking ondersteunt."},
    {icon:"ti-stethoscope",tekst:"Uw arts of therapeut kan met een goed bijgehouden dagboek veel gerichter adviseren dan op basis van uw herinnering tijdens een consult."},
    {icon:"ti-target",tekst:"Gebruikers die dagelijks registreren rapporteren gemiddeld 40% minder aanvallen binnen drie maanden, doordat ze hun persoonlijke triggers leren kennen en vermijden."},
  ];
  return (
    <Modal show={show} onClose={onClose} title="Ondersteuning" icon="ti-lifebuoy">
      {/* Tab switcher */}
      <div style={{display:"flex",background:C.bg,borderRadius:8,padding:3,marginBottom:20}}>
        {[["handleiding","Handleiding"],["contact","Contact"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:tab===id?700:400,background:tab===id?C.card:"transparent",color:tab===id?C.primary:C.muted,boxShadow:tab===id?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{lbl}</button>
        ))}
      </div>

      {tab==="handleiding"&&(
        <div>
          {/* Waarom dagelijks */}
          <div style={{background:C.pL,borderRadius:12,padding:16,marginBottom:20,border:"1px solid "+C.primary+"40"}}>
            <div style={{fontWeight:700,fontSize:15,color:C.primary,marginBottom:10}}><i className="ti ti-star" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Waarom dagelijks registreren?</div>
            {waarom.map((w,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:i<waarom.length-1?10:0}}>
                <i className={"ti "+w.icon} style={{fontSize:18,flexShrink:0,color:C.primary}} aria-hidden="true"></i>
                <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{w.tekst}</div>
              </div>
            ))}
          </div>

          {/* Stap voor stap */}
          <div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:4}}>Haal het maximale uit de app door:</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:14}}> </div>
          {stappen.map((s,i)=>(
            <div key={i} style={{borderLeft:"3px solid "+s.kleur,paddingLeft:14,marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:13,color:s.kleur,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                <i className={"ti "+s.icon} style={{fontSize:16}} aria-hidden="true"></i>{s.titel}
              </div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{s.tekst}</div>
            </div>
          ))}

          <div style={{background:C.sL,borderRadius:10,padding:"12px 14px",marginTop:4}}>
            <div style={{fontSize:13,color:C.success,fontWeight:600,marginBottom:4}}><i className="ti ti-bulb" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Gouden tip</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Maak er een vaste gewoonte van — registreer 's avonds voor het slapen gaan de dag. Dat duurt minder dan 2 minuten en levert waardevolle inzichten op.</div>
          </div>
        </div>
      )}

      {tab==="contact"&&(
        <div>
          {items.map(item=>(
            <a key={item.title} href={item.link} style={{display:"flex",gap:14,alignItems:"center",padding:"13px 14px",background:C.bg,borderRadius:12,marginBottom:10,textDecoration:"none"}}>
              <span style={{width:40,height:40,borderRadius:12,background:C.pL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className={"ti "+item.icon} style={{fontSize:20,color:C.primary}} aria-hidden="true"></i></span>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:C.text}}>{item.title}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{item.sub}</div></div>
              <div style={{fontSize:12,color:C.primary,fontWeight:600}}>{item.val}</div>
            </a>
          ))}
          <div style={{background:C.pL,borderRadius:12,padding:"13px 14px",marginTop:4}}>
            <div style={{fontSize:12,color:C.muted}}>Versie 1.1 · Maurice Hermans · HOBC BV · 2026</div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PrivacyModal({show,onClose,entries,wisAlleData,wisConf,setWisConf}){ const sections=[
    {t:"Welke gegevens verzamelen wij?",b:"Jicht Tracker slaat alle gegevens op die je via registraties ingeeft. Tevens slaan we je naam, profielfoto (optioneel), e-mailadres en abonnementsstatus op."},
    {t:"Locatie",b:"Je locatie wordt alleen gebruikt voor het automatisch ophalen van weersgegevens. Deze gegevens worden niet permanent opgeslagen op onze servers."},
    {t:"AI-verwerking",b:"Bij gebruik van de AI-analyses en het rapport worden je gezondheidsgegevens versleuteld verstuurd naar de Claude API (Anthropic). Deze gegevens worden niet gebruikt voor het trainen van AI-modellen."},
    {t:"Hoe gebruiken wij jouw gegevens?",b:"Jouw gegevens worden uitsluitend gebruikt om de app te laten functioneren en jou gepersonaliseerde analyses te bieden. Persoonlijke gegevens worden nooit verkocht aan derden."},
    {t:"Anoniem onderzoek",b:"Op termijn kunnen volledig geanonimiseerde en geaggregeerde gegevens worden gebruikt voor wetenschappelijk onderzoek naar jicht. Individuele data is nooit herleidbaar tot jou als persoon."},
    {t:"Betalingen",b:"Betalingen verlopen via Stripe. Jicht Tracker slaat geen betaalgegevens op. Stripe verwerkt betalingen conform PCI-DSS normen."},
    {t:"Beveiliging",b:"Alle gegevens zijn versleuteld opgeslagen via Supabase met Row Level Security. Alleen jij hebt toegang tot je eigen gegevens via jouw persoonlijke inloggegevens."},
    {t:"Account verwijderen",b:"Je kunt jouw account verwijderen via Profiel → Account verwijderen. Jouw gezondheidsdata wordt dan geanonimiseerd bewaard voor onderzoeksdoeleinden maar is niet meer herleidbaar tot jouw persoon."},
    {t:"Jouw rechten (AVG/GDPR)",b:"Je hebt het recht je gegevens in te zien, te corrigeren of te verwijderen. Neem contact op via support@jichttracker.nl."},
    {t:"Cookies",b:"Geen tracking-cookies. Alleen een sessie-token wordt lokaal opgeslagen om je ingelogd te houden."},
  ];
  return (
    <Modal show={show} onClose={()=>{onClose();setWisConf(false);}} title="Privacybeleid">
      {sections.map(s=>(
        <div key={s.t} style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:5}}>{s.t}</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{s.b}</div>
        </div>
      ))}
      <div style={{fontSize:11,color:C.muted,borderTop:"1px solid "+C.border,paddingTop:14,marginBottom:20}}>Laatste update: juli 2026 · Maurice Hermans · HOBC BV</div>
      {!wisConf?(
        <button onClick={()=>setWisConf(true)} style={{width:"100%",padding:"12px",background:"transparent",border:"2px solid "+C.danger,borderRadius:10,color:C.danger,fontSize:14,fontWeight:700,cursor:"pointer"}}>
          Account verwijderen
        </button>
      ):(
        <div style={{background:C.dL,border:"1px solid "+C.danger,borderRadius:12,padding:16}}>
          <div style={{fontWeight:700,color:C.danger,fontSize:14,marginBottom:8}}>Weet je het zeker?</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:14}}>Hiermee worden al je registraties in de app gewist. Dit is niet ongedaan te maken.</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setWisConf(false)} style={{flex:1,padding:"11px",background:C.card,border:"1.5px solid "+C.border,borderRadius:8,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer"}}>Annuleer</button>
            <button onClick={wisAlleData} style={{flex:1,padding:"11px",background:C.danger,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Verwijderen</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DisclaimerModal({show,onClose}){ const sections=[
    {t:"Geen medisch hulpmiddel",b:"Jicht Tracker is een persoonlijke registratie-app en vervangt geen medisch advies, diagnose of behandeling."},
    {t:"Aansprakelijkheid",b:"Maurice Hermans, HOBC BV en Jicht Tracker aanvaarden geen aansprakelijkheid voor beslissingen die je neemt op basis van de informatie, analyses of adviezen in deze app. Raadpleeg altijd je arts of therapeut voor medisch advies."},
    {t:"AI-analyses en therapeutisch rapport",b:"De door AI gegenereerde analyses, persoonlijke adviezen en therapeutische rapporten zijn indicatief van aard en gebaseerd op door jou ingevoerde gegevens. Ze zijn niet medisch geverifieerd en mogen niet worden beschouwd als vervanging van professioneel medisch advies."},
    {t:"Weersgegevens",b:"Weersgegevens worden opgehaald via de Open-Meteo API en zijn indicatief. Jicht Tracker is niet verantwoordelijk voor afwijkingen in weersinformatie."},
    {t:"Nauwkeurigheid",b:"De gebruiker is zelf verantwoordelijk voor de juistheid van ingevoerde gegevens. Onjuiste invoer kan leiden tot onjuiste analyses."},
    {t:"Urinezuurwaarden",b:"De weergave van urinezuurwaarden en streefwaarden is informatief. Raadpleeg altijd je arts voor de interpretatie van bloedwaarden."},
    {t:"Beschikbaarheid",b:"Wij streven naar hoge beschikbaarheid maar garanderen geen ononderbroken toegang tot de app of de AI-functies."},
  ];
  return (
    <Modal show={show} onClose={onClose} title="Disclaimer" icon="ti-scale" accentColor={C.danger}>
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
    const footer="\n\n---\nGegenereerd door Jicht Tracker op "+new Date().toLocaleDateString(LOC())+"\nDit rapport vervangt geen professionele diagnose.";
    window.location.href="mailto:"+email+"?subject="+encodeURIComponent("Jicht Tracker – Therapeutisch rapport")+"&body="+encodeURIComponent(intro+rapport+footer);
  }

  return (
    <Modal show={show} onClose={()=>{onClose();setRapport("");setEmail("");}} title="Therapeut raadplegen">
      {entries.length<5?(
        <div style={{background:C.aL,border:"1px solid "+C.accent,borderRadius:12,padding:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}><i className="ti ti-clipboard-list" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></div>
          <div style={{fontWeight:700,color:C.aT,fontSize:14,marginBottom:8}}>Nog niet genoeg registraties</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>Voor een zinvol therapeutisch rapport zijn minimaal <strong>5 dagregistraties</strong> nodig. Je hebt er nu {entries.length}.</div>
        </div>
      ):(
        <>
          <div style={{background:C.pL,borderRadius:12,padding:"13px 14px",marginBottom:16}}>
            <div style={{fontWeight:700,color:C.primary,marginBottom:5,fontSize:13}}>Hoe werkt dit?</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>De AI stelt een professioneel therapeutisch rapport op. Je kunt dit e-mailen naar een zorgverlener als voorbereiding op een consult.</div>
            <div style={{fontSize:12,color:C.muted,marginTop:6}}><i className="ti ti-chart-bar" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>{entries.length} registraties als input</div>
          </div>
          {!rapport&&(
            <button onClick={generate} disabled={loading} style={{width:"100%",padding:"13px",background:loading?C.border:C.primary,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",marginBottom:14,opacity:loading?0.7:1}}>
              {loading?"Rapport opstellen...":"Therapeutisch rapport genereren"}
            </button>
          )}
          {rapport&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>Gegenereerd rapport:</div>
                <button onClick={()=>setRapport("")} style={{fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer"}}><i className="ti ti-arrow-back-up" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Opnieuw</button>
              </div>
              <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:13,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap",border:"1px solid "+C.border,maxHeight:240,overflowY:"auto",marginBottom:14}}>{rapport}</div>
              <div style={{fontSize:12,color:C.muted,fontWeight:700,marginBottom:6}}>Verstuur naar therapeut:</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="therapeut@praktijk.nl" style={{...inp,marginBottom:12}}/>
              <button onClick={verstuur} disabled={!email} style={{width:"100%",padding:"13px",background:email?C.success:C.border,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:email?"pointer":"not-allowed"}}>
                Versturen via mail-app
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
        {sel.map(id=>{const g=GEWRICHTEN.find(x=>x.id===id);if(!g)return null;const isL=g.cx>130;return(<text key={id+"_l"} x={isL?g.cx+(g.r||9)+3:g.cx-(g.r||9)-3} y={g.cy} textAnchor={isL?"start":"end"} dominantBaseline="middle" fontSize="7" fill={C.danger} fontWeight="600">{tt(g.label).replace(" rechts","R").replace(" links","L")}</text>);})}
      </svg><div style={{fontSize:12,textAlign:"center",marginTop:6,color:sel.length>0?C.danger:C.muted,fontWeight:sel.length>0?600:400}}>{sel.length>0?sel.map(id=>GEWRICHTEN.find(g=>g.id===id)?.label).filter(Boolean).join(", "):"Tik op een gewricht om het te selecteren"}</div></div>);}

// ── Scan componenten ────────────────────────────────────────────────────────
// Foto- en barcodescan staan uit (te duur aan de achterkant). Zet SCAN_AAN op true om terug te zetten.
const SCAN_AAN=false;
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
        const res=await fetch("/.netlify/functions/ai-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:150,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:"Wat zie je op deze foto? Geef alleen de naam van het voedsel, drank of supplement in max 8 woorden. Geen uitleg."}]}]})});
        const d=await res.json();
        onResult(d.content?.map(b=>b.text||"").join("").trim()||"");
      }catch{onResult("");}
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }
  if(!SCAN_AAN)return null;
  return(<div style={{display:"inline"}}><input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:"none"}}/><button onClick={()=>ref.current?.click()} disabled={loading} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+C.primary,background:C.pL,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>{loading?"Herkennen...":"Scan foto"}</button></div>);
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
        const res=await fetch("/.netlify/functions/ai-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:50,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:"Lees de barcode/EAN uit deze foto. Geef alleen het getal. Als geen barcode: schrijf 'geen'."}]}]})});
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
  if(!SCAN_AAN)return null;
  return(<div style={{display:"inline"}}><input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:"none"}}/><button onClick={()=>ref.current?.click()} disabled={loading} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+C.accent,background:C.aL,color:C.aT,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>{loading?"Zoeken...":"Scan barcode"}</button></div>);
}

// ── Upgrade modal ────────────────────────────────────────────────────────────
const LINK_MAAND="https://buy.stripe.com/bJe14feDE4T159F1QLc7u01";
const LINK_JAAR="https://buy.stripe.com/8x24gr1QSetB7hN52Xc7u00";
function payUrl(u,user){if(!user||!user.id)return u;return u+(u.includes("?")?"&":"?")+"prefilled_email="+encodeURIComponent(user.email||"")+"&client_reference_id="+encodeURIComponent(user.id);}
function UpgradeModal({show, onClose, from, isPro, user}) {
  const GRATIS=["Aanvallen en pijn registreren","Eten en drinken bijhouden","Dagboek en trends","Persoonlijk AI-advies (na 5 registraties, 1 keer per dag)"];
  const PROF=["Beweging bijhouden","Slaap monitoren","Weer registreren","Urinezuurwaarden","Medicatie en supplementen","E-mailherinnering als je een paar dagen niets registreert"];
  return (
    <Modal show={show} onClose={onClose} title="Pro-voordelen" icon="ti-lock-open">
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:40,marginBottom:8}}><i className="ti ti-heartbeat" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></div>
        <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:6}}>Jicht Tracker Pro</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{from&&<strong style={{color:C.pro}}>{from}: </strong>}{from?"Dit onderdeel is alleen beschikbaar met Pro. Bekijk hier vrijblijvend de voordelen van Pro.":"Bekijk hier vrijblijvend wat Pro je extra biedt ten opzichte van gratis."}</div>
      </div>
      {isPro&&<div style={{background:C.sL,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.success,fontWeight:600,marginBottom:14,textAlign:"center"}}>Je gebruikt al Jicht Tracker Pro.</div>}
      <div style={{background:C.bg,borderRadius:12,padding:"12px 14px",marginBottom:10,border:"1px solid "+C.border}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Gratis</div>
        {GRATIS.map(f=>(<div key={f} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:C.text,marginBottom:6}}><i className="ti ti-check" style={{color:C.success,marginTop:2}} aria-hidden="true"></i><span>{f}</span></div>))}
      </div>
      <div style={{background:"#F5F0FF",borderRadius:12,padding:"12px 14px",marginBottom:18,border:"1.5px solid "+C.pro}}>
        <div style={{fontSize:11,fontWeight:700,color:C.pro,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Pro: alles van gratis, plus</div>
        {PROF.map(f=>(<div key={f} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:C.text,marginBottom:6}}><i className="ti ti-check" style={{color:C.pro,marginTop:2}} aria-hidden="true"></i><span>{f}</span></div>))}
      </div>
      {!isPro&&<div style={{background:C.aL,border:"1.5px solid "+C.accent,borderRadius:12,padding:"12px 14px",marginBottom:14,textAlign:"center"}}>
        <div style={{fontWeight:700,fontSize:14,color:C.aT,marginBottom:4}}>De eerste maand is gratis</div>
        <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>Probeer Pro een maand zonder kosten. Je betaalt pas na die maand. Zeg je vóór het einde van de proefmaand op, dan betaal je niets.</div>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        <div style={{background:C.pL,borderRadius:12,padding:"14px 16px",border:"1.5px solid "+C.primary}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,color:C.primary,fontSize:15}}>Maandelijks</div><div style={{fontSize:12,color:C.muted}}>Maandelijks opzegbaar</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:20,color:C.primary}}>€9</div><div style={{fontSize:11,color:C.muted}}>/maand</div></div>
          </div>
          <button onClick={()=>window.open(payUrl(LINK_MAAND,user),"_blank")} style={{width:"100%",marginTop:10,padding:"10px",background:C.primary,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Start gratis maand →
          </button>
        </div>
        <div style={{background:"#F5F0FF",borderRadius:12,padding:"14px 16px",border:"1.5px solid #7C3AED",position:"relative"}}>
          <div style={{position:"absolute",top:-10,right:12,background:"#7C3AED",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:10}}>BESTE DEAL</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,color:"#7C3AED",fontSize:15}}>Jaarlijks</div><div style={{fontSize:12,color:C.muted}}>Je bespaart €9 per jaar</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:20,color:"#7C3AED"}}>€99</div><div style={{fontSize:11,color:C.muted}}>/jaar</div></div>
          </div>
          <button onClick={()=>window.open(payUrl(LINK_JAAR,user),"_blank")} style={{width:"100%",marginTop:10,padding:"10px",background:"#7C3AED",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Start gratis maand →
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
function LoginScreen({onLogin,lang,setLang}){
  const[mode,setMode]=useState("login");
  const[remember,setRemember]=useState(true);
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
        onLogin(buildSession(d,remember));
      }
    }catch(e){setErr(e.message);}
    setLoading(false);
  }

  return (
    <div style={{fontFamily:FONT,background:"linear-gradient(180deg,#E3F3F4 0%,#F3F8FB 45%)",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 20px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{width:56,height:56,borderRadius:18,background:C.primary,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:10,boxShadow:"0 6px 16px rgba(14,124,134,0.28)"}}><i className="ti ti-heartbeat" style={{fontSize:30,color:"#fff"}} aria-hidden="true"></i></div>
          <h1 style={{margin:0,fontSize:26,fontWeight:700,color:C.text,letterSpacing:"-0.4px"}}>Jicht<span style={{color:C.primary}}>Tracker</span></h1>
          <p style={{color:C.text,fontSize:14,marginTop:6,fontWeight:500}}>Begrijp je jicht. Verminder je aanvallen.</p>
          <div style={{marginTop:12}}><LangSwitch lang={lang} setLang={setLang}/></div>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>een product van <strong>HOBC BV</strong></p>
        </div>
        <div style={{background:C.card,borderRadius:24,padding:28,border:"1px solid "+C.border,boxShadow:"0 10px 32px rgba(18,48,61,0.08)"}}>
          {/* Tab switcher */}
          <div style={{display:"flex",background:C.bg,borderRadius:8,padding:3,marginBottom:20}}>
            {[["login","Inloggen"],["register","Registreren"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");setOk("");}} style={{flex:1,padding:"8px",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:mode===m?700:400,background:mode===m?C.card:"transparent",color:mode===m?C.primary:C.muted,boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{l}</button>
            ))}
          </div>

          {err&&<div style={{background:C.dL,border:"1px solid "+C.danger,borderRadius:8,padding:"9px 12px",color:C.danger,fontSize:13,marginBottom:14}}>{err}</div>}
          {ok&&<div style={{background:C.sL,border:"1px solid #9ED8BC",borderRadius:8,padding:"9px 12px",color:C.success,fontSize:13,marginBottom:14}}>{ok}</div>}

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

          {mode==="login"&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text,margin:"-8px 0 16px",cursor:"pointer"}}><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{width:18,height:18,accentColor:C.primary}}/>Onthoud mij 7 dagen</label>}
          <button onClick={handle} disabled={loading||!email||!pw||(mode==="register"&&!pw2)} style={{width:"100%",padding:"13px",background:(email&&pw&&(mode==="login"||pw2))?C.primary:C.border,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:(email&&pw)?"pointer":"default"}}>
            {loading?"Even geduld...":(mode==="login"?"Inloggen →":"Account aanmaken →")}
          </button>

          {mode==="login"&&(
            <div style={{textAlign:"center",marginTop:10}}>
              <button onClick={async()=>{
                if(!email){dialog("Vul eerst je e-mailadres in.");return;}
                const r=await fetch(SU+"/auth/v1/recover",{method:"POST",headers:{"Content-Type":"application/json","apikey":SK},body:JSON.stringify({email})});
                if(r.ok){dialog("Herstelmail verstuurd naar "+email+". Controleer ook je spam.");}
                else{dialog("Fout bij versturen herstelmail. Controleer je e-mailadres.");}
              }} style={{background:"none",border:"none",color:C.primary,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>
                Wachtwoord vergeten?
              </button>
            </div>
          )}

          <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.border,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Wil je eerst de app bekijken?</div>
            <button onClick={()=>onLogin({token:"demo",user:{email:"demo@demo.nl"},demo:true})} style={{width:"100%",padding:"11px",background:C.pL,color:C.pD,border:"1.5px solid "+C.primary,borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              Bekijk demo (zonder opslag)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App-pincode (optioneel, alleen op dit toestel) ───────────────────────────
async function hashPin(pin,salt){const b=new TextEncoder().encode(salt+":"+pin);const h=await crypto.subtle.digest("SHA-256",b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("");}
function getPin(){try{return JSON.parse(localStorage.getItem("jicht_pin")||"null");}catch{return null;}}
async function savePin(pin){const salt=Math.random().toString(36).slice(2)+Date.now();const hash=await hashPin(pin,salt);try{localStorage.setItem("jicht_pin",JSON.stringify({salt,hash}));}catch{}}
function clearPin(){try{localStorage.removeItem("jicht_pin");}catch{}}
async function checkPin(pin){const p=getPin();if(!p)return true;return (await hashPin(pin,p.salt))===p.hash;}

function PinPad({onComplete,error,reset}){
  const[v,setV]=useState("");
  useEffect(()=>{setV("");},[reset]);
  function press(d){if(v.length>=4)return;const n=v+d;setV(n);if(n.length===4)setTimeout(()=>onComplete(n),120);}
  const keys=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(
    <div style={{textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",gap:14,margin:"6px 0 8px"}}>
        {[0,1,2,3].map(i=><span key={i} style={{width:16,height:16,borderRadius:"50%",background:i<v.length?C.primary:"transparent",border:"2px solid "+(error?C.danger:C.primary)}}/>)}
      </div>
      <div style={{minHeight:20,fontSize:13,color:C.danger,fontWeight:600,marginBottom:10}}>{error||""}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:260,margin:"0 auto"}}>
        {keys.map((k,i)=>k===""?<span key={i}/>:(
          <button key={i} onClick={()=>k==="⌫"?setV(v.slice(0,-1)):press(k)} aria-label={k==="⌫"?"Wissen":k} style={{height:56,borderRadius:16,border:"1.5px solid "+C.border,background:C.card,fontSize:22,fontWeight:600,color:C.text,cursor:"pointer",fontFamily:FONT}}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function LockScreen({onUnlock,onForgot}){
  const[err,setErr]=useState("");const[tries,setTries]=useState(0);const[rs,setRs]=useState(0);
  async function done(pin){
    if(await checkPin(pin)){onUnlock();return;}
    const t=tries+1;setTries(t);setRs(r=>r+1);
    if(t>=5){onForgot();return;}
    setErr("Onjuiste pincode.");
  }
  return(
    <div style={{fontFamily:FONT,background:"linear-gradient(180deg,#E3F3F4 0%,#F3F8FB 45%)",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:18,background:C.primary,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><i className="ti ti-lock" style={{fontSize:28,color:"#fff"}} aria-hidden="true"></i></div>
        <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.text}}>Jicht<span style={{color:C.primary}}>Tracker</span></h1>
        <p style={{color:C.muted,fontSize:14,margin:"0 0 18px"}}>Voer je pincode in</p>
        <PinPad onComplete={done} error={err} reset={rs}/>
        <button onClick={onForgot} style={{marginTop:22,background:"none",border:"none",color:C.primary,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:FONT}}>Pincode vergeten? Log opnieuw in</button>
        <div style={{fontSize:11,color:C.muted,marginTop:10}}>Na 5 foute pogingen word je uitgelogd.</div>
      </div>
    </div>
  );
}

function PinModal({show,onClose}){
  const[step,setStep]=useState("start");const[first,setFirst]=useState("");const[err,setErr]=useState("");const[rs,setRs]=useState(0);const[msg,setMsg]=useState("");
  const has=!!getPin();
  useEffect(()=>{if(show){setStep("start");setFirst("");setErr("");setMsg("");}},[show]);
  function begin(){setStep("new");setErr("");setFirst("");setRs(r=>r+1);}
  async function onNew(p){setFirst(p);setStep("confirm");setErr("");setRs(r=>r+1);}
  async function onConfirm(p){
    if(p!==first){setErr("De pincodes komen niet overeen. Probeer opnieuw.");setStep("new");setFirst("");setRs(r=>r+1);return;}
    await savePin(p);setMsg("Pincode ingesteld.");setStep("start");
  }
  return(
    <Modal show={show} onClose={onClose} title="App-pincode" icon="ti-dialpad">
      {step==="start"&&(<div>
        {msg&&<div style={{background:C.sL,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.success,fontWeight:600,marginBottom:12,textAlign:"center"}}>{msg}</div>}
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:16}}>Met een pincode open je de app sneller dan met je wachtwoord. De pincode geldt alleen op dit toestel. Na 5 foute pogingen word je uitgelogd en log je opnieuw in met je wachtwoord.</div>
        {has&&<div style={{fontSize:13,color:C.success,fontWeight:600,marginBottom:12}}><i className="ti ti-circle-check" style={{marginRight:6}} aria-hidden="true"></i>Pincode is actief op dit toestel.</div>}
        <button onClick={begin} style={{width:"100%",padding:"12px",background:C.primary,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8}}>{has?"Pincode wijzigen":"Pincode instellen"}</button>
        {has&&<button onClick={()=>{clearPin();setMsg("Pincode verwijderd.");setStep("start");}} style={{width:"100%",padding:"12px",background:C.card,color:C.danger,border:"1.5px solid "+C.danger,borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"}}>Pincode verwijderen</button>}
      </div>)}
      {step==="new"&&(<div><div style={{textAlign:"center",fontSize:14,color:C.text,fontWeight:600,marginBottom:8}}>Kies een pincode van 4 cijfers.</div><PinPad onComplete={onNew} error={err} reset={rs}/></div>)}
      {step==="confirm"&&(<div><div style={{textAlign:"center",fontSize:14,color:C.text,fontWeight:600,marginBottom:8}}>Herhaal je pincode.</div><PinPad onComplete={onConfirm} error={err} reset={rs}/></div>)}
    </Modal>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App(){ const[session,setSession]=useState(null);
  const[locked,setLocked]=useState(()=>!!getPin());
  useEffect(()=>{let t=0;const f=()=>{if(document.hidden)t=Date.now();else if(t&&Date.now()-t>5*60*1000&&getPin())setLocked(true);};document.addEventListener("visibilitychange",f);return()=>document.removeEventListener("visibilitychange",f);},[]);
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    (async()=>{
      const s=readSession();
      if(s&&!s.demo&&s.refresh&&(!s.exp||s.exp<Date.now()+60000)){
        try{const d=await refreshSession(s.refresh);
          if(d?.access_token){const n={...s,token:d.access_token,refresh:d.refresh_token||s.refresh,exp:Date.now()+(d.expires_in||3600)*1000,user:d.user||s.user};writeSession(n);setSession(n);}
          else clearSession();
        }catch{clearSession();}
      } else if(s)setSession(s);
      setReady(true);
    })();
  },[]);
  useEffect(()=>{ // token vernieuwen terwijl de app open staat
    if(!session||session.demo||!session.refresh)return;
    const wait=Math.max(30000,(session.exp||Date.now()+3600000)-Date.now()-120000);
    const t=setTimeout(async()=>{
      try{const d=await refreshSession(session.refresh);
        if(d?.access_token){const n={...session,token:d.access_token,refresh:d.refresh_token||session.refresh,exp:Date.now()+(d.expires_in||3600)*1000};writeSession(n);setSession(n);}
        else{clearSession();setSession(null);}
      }catch{}
    },wait);
    return()=>clearTimeout(t);
  },[session]);
  const[lang,setLangState]=useState(()=>{try{return localStorage.getItem("jicht_lang")==="de"?"de":"nl";}catch{return"nl";}});
  LANG=lang;
  const setLang=l=>{try{localStorage.setItem("jicht_lang",l);}catch{}setLangState(l);};
  useLayoutEffect(()=>{const mo=startI18nObserver();return()=>mo.disconnect();},[]);
  useLayoutEffect(()=>{
    LANG=lang;
    document.documentElement.lang=lang;
    document.title=lang==="de"?"GichtTracker — Verstehe deine Gicht, reduziere deine Anfälle":"Jicht Tracker — Begrijp je jicht, verminder je aanvallen";
    const md=document.querySelector('meta[name="description"]');
    if(md)md.setAttribute("content",lang==="de"?"GichtTracker hilft dir, täglich zu erfassen, was du isst, trinkst und wie du dich bewegst — damit du deine persönlichen Auslöser entdeckst und Anfälle reduzierst.":"Jicht Tracker helpt je dagelijks registreren wat je eet, drinkt en beweegt — zodat je jouw persoonlijke triggers ontdekt en aanvallen vermindert.");
    trTree(document.body);
  },[lang,session,ready]);
  if(!ready)return <Spinner/>;
  if(session&&!session.demo&&locked&&getPin())return <LockScreen onUnlock={()=>setLocked(false)} onForgot={()=>{clearSession();clearPin();setLocked(false);setSession(null);}}/>;
  if(!session)return <LoginScreen lang={lang} setLang={setLang} onLogin={s=>{writeSession(s);setLocked(false);setSession(s);}}/>;
  return <JichtTracker lang={lang} setLang={setLang} session={session} onLogout={()=>{clearSession();clearPin();setSession(null);}}/>;
}

// ── Hoofd app ─────────────────────────────────────────────────────────────────
function JichtTracker({session,onLogout,lang,setLang}){ const{token}=session;
  const isDemo=session.demo===true;
  const saveTimer=useRef(null);

  // ── ALLE HOOKS EERST ──────────────────────────────────────────────────────
  const[entries,setEntries]=useState([]);
  const[profile,setProfile]=useState({name:"",photo:"",meds:[]});
  const[loading,setLoading]=useState(true);
  useEffect(()=>{if(isDemo||loading)return;upsertProfile({lang:lang},token).catch(()=>{});},[lang,loading]);// eslint-disable-line
  const[sync,setSync]=useState("");
  const[mainTab,setMainTab]=useState("home");
  const[regDate,setRegDate]=useState(today());
  const[regSec,setRegSec]=useState(null);
  const[aiResult,setAiResult]=useState("");
  const[aiLoading,setAiLoading]=useState(false);
  const[profSaved,setProfSaved]=useState(false);
  const[subBusy,setSubBusy]=useState(false);
  async function manageSub(){
    setSubBusy(true);
    try{
      const r=await fetch("/.netlify/functions/billing-portal",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token}});
      const d=await r.json();
      if(d?.url){window.location.href=d.url;return;}
      dialog(r.status===404?"Er is geen lopend abonnement gevonden bij dit account.":"Het beheerscherm is nu niet beschikbaar. Probeer het later opnieuw.");
    }catch(e){dialog("Het beheerscherm is nu niet beschikbaar. Probeer het later opnieuw.");}
    setSubBusy(false);
  }
  const[menuOpen,setMenuOpen]=useState(false);
  const[showProfiel,setShowProfiel]=useState(false);
  const[showRapport,setShowRapport]=useState(false);
  const[rapportEmail,setRapportEmail]=useState("");
  const[rapportTekst,setRapportTekst]=useState("");
  const[rapportLoading,setRapportLoading]=useState(false);
  const[showOver,setShowOver]=useState(false);
  const[showSupport,setShowSupport]=useState(false);
  const[showPin,setShowPin]=useState(false);
  const[showPrivacy,setShowPrivacy]=useState(false);
  const[showDisc,setShowDisc]=useState(false);
  // eslint-disable-next-line no-unused-vars
  const[showTher,setShowTher]=useState(false);
  const[showUpgrade,setShowUpgrade]=useState(false);
  const[upgradeFrom,setUpgradeFrom]=useState("");
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
  const[waterDoel,setWaterDoel]=useState(2000);

  function emptyDay(){return{eten:{logs:[]},drinken:{logs:[]},bewegen:{logs:[]},slaap:{uren:"",bedtijd:"",wektijd:""},pijnLogs:[],aanval:{logs:[]},med:{logs:[]},suppl:{logs:[]},urinezuur:{logs:[],eenheid:"mmol"},weer:{logs:[]}};}
  function norm(e){return{...e,pijnLogs:e.pijn_logs||e.pijnLogs||[],eten:e.eten||{logs:[]},drinken:e.drinken||{logs:[]},bewegen:Array.isArray(e.bewegen?.logs)?e.bewegen:{logs:[]},slaap:e.slaap||{uren:"",bedtijd:"",wektijd:""},aanval:Array.isArray(e.aanval?.logs)?e.aanval:{logs:[]},med:Array.isArray(e.med?.logs)?e.med:{logs:[]},suppl:Array.isArray(e.suppl?.logs)?e.suppl:{logs:[]},urinezuur:e.urinezuur&&Array.isArray(e.urinezuur.logs)?e.urinezuur:{logs:[],eenheid:e.urinezuur?.eenheid||"mmol"},weer:e.weer||{logs:[]}};}

  useEffect(()=>{ async function init(){ if(isDemo){setLoading(false);return;}
      try{const[p,es]=await Promise.all([getProfile(token),getEntries(token)]);if(p){setProfile({name:p.name||"",photo:p.photo||"",meds:p.meds||[],plan:p.plan||"free",reminder:p.reminder_enabled!==false});if(p.water_doel)setWaterDoel(p.water_doel);}setEntries((es||[]).map(norm));}catch(e){console.error(e);}
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

  async function checkAndIncrementLimit(type){
    // type: 'ai' of 'scan'
    const today = new Date().toISOString().slice(0,10);
    const dateCol = type==='ai' ? 'ai_calls_date' : 'scan_calls_date';
    const countCol = type==='ai' ? 'ai_calls_count' : 'scan_calls_count';
    const maxLimit = type==='ai' ? 1 : 5;

    const r = await sf('/rest/v1/profiles?select='+dateCol+','+countCol+'&id=eq.'+session.user.id,'GET',null,token);
    const p = r?.[0];
    const lastDate = p?.[dateCol];
    const count = lastDate===today ? (p?.[countCol]||0) : 0;

    if(count >= maxLimit){
      const msg = type==='ai' ? 'LIMIT:Je hebt je dagelijkse AI-limiet bereikt: maximaal 1 advies of rapport per dag. Probeer het morgen weer.' : 'LIMIT:Je hebt het dagelijkse maximum aan fotoscans bereikt. Probeer het morgen weer.';
      throw new Error(msg);
    }
    // Increment
    await sf('/rest/v1/profiles?id=eq.'+session.user.id,'PATCH',{[dateCol]:today,[countCol]:count+1},token);
    return true;
  }

  const callAI=useCallback(async(mode)=>{
    if(isDemo)return "In de demo-modus is het AI-advies niet beschikbaar. Maak een gratis account aan om een persoonlijk advies te ontvangen.";
    const medInfo=profile.meds?.length>0?"Vaste medicatie: "+profile.meds.map(m=>m.name+" "+m.dose).join(", "):"";
    const summary=entries.slice(0,60).map(e=>{ const pijns=e.pijn_logs||e.pijnLogs||[];
      return e.date+"|E:"+(e.eten?.logs?.map(l=>l.moment+":"+l.tekst).join(";")||"–")+"|D:"+(e.drinken?.logs?.map(l=>l.categorie+"("+l.ml+"ml)").join(",")||"–")+"|B:"+(e.bewegen?.logs?.map(l=>(l.activiteiten?.join(",")||"?")+" "+l.minuten+"min").join("+")||"–")+"|S:"+(e.slaap?.uren?e.slaap.uren+"u":"–")+"|P:"+(pijns.map(p=>p.tijd+" lvl"+p.level).join(",")||"geen")+"|A:"+((e.aanval?.logs||[]).map(a=>a.tijd+":"+a.type).join(",")||"–")+"|M:"+((e.med?.logs||[]).map(m=>m.naam).join(",")||"–");
    }).join("\n");
    const prompts={ analyse:`Je bent expert jichtmanagement. ${medInfo}\nAnalyseer:\n1.🔍PATRONEN\n2.⚠TRIGGERS\n3.✅POSITIEVE TRENDS\n4.💡TIPS(4 concreet)\n5.📈VOORTGANG\nNederlands, empathisch.\n\nDATA:\n${summary}`, rapport:`Maak beknopt medisch jicht-rapport (max 350 woorden). ${medInfo}\n1.SAMENVATTING 2.PIJNVERLOOP 3.TRIGGERS 4.MEDICATIE 5.AANBEVELINGEN\n\nDATA:\n${summary}`, therapeut:`Je bent jicht-therapeut. ${medInfo}\nStel therapeutisch adviesrapport op:\n1.KLINISCH BEELD\n2.LEEFSTIJLANALYSE\n3.TRIGGERS\n4.MEDICATIE\n5.THERAPEUTISCHE AANBEVELINGEN(min 5)\n6.VERVOLGVRAGEN(3)\nProfessioneel, empathisch, max 500 woorden.\n\nDATA:\n${summary}`, };
    try{ const r=await fetch("/.netlify/functions/ai-proxy",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompts[mode]+(LANG==="de"?"\n\nAntworte ausschließlich auf Deutsch (du-Form, empathisch). Das Wort für jicht ist Gicht.":"")}]})});
      const d=await r.json();
      if(r.status===429)return "⚠ "+(d.error||"Je hebt je dagelijkse AI-limiet bereikt: maximaal 1 advies of rapport per dag. Probeer het morgen weer.");
      if(!r.ok)return "⚠ "+(d.error||"De AI is nu niet beschikbaar. Probeer het later opnieuw.");
      return d.content?.map(b=>b.text||"").join("\n")||"Geen resultaat.";
    }catch{return"Fout bij genereren.";}
  },[entries,profile]);

  // ── Mutaties ──────────────────────────────────────────────────────────────
  function closeReg(){setRegSec(null);window.scrollTo({top:0,behavior:"smooth"});}
  function addEten(){if(!etenTxt.trim())return;setDag(d=>({...d,eten:{logs:[...d.eten.logs,{moment:etenMom,tekst:etenTxt.trim()}]}}));setEtenTxt("");closeReg();}
  function remEten(i){setDag(d=>({...d,eten:{logs:d.eten.logs.filter((_,j)=>j!==i)}}));}
  function addDrinken(){setDag(d=>({...d,drinken:{logs:[...d.drinken.logs,{categorie:dCat,tekst:dTxt.trim(),ml:dMl,portie:dPortie,tijd:nowT()}]}}));setDTxt("");closeReg();}
  function remDrinken(i){setDag(d=>({...d,drinken:{logs:d.drinken.logs.filter((_,j)=>j!==i)}}));}
  function addBewegen(){if(!bMin&&bAct.length===0)return;setDag(d=>({...d,bewegen:{logs:[...(d.bewegen?.logs||[]),{tijd:bTijd,minuten:bMin,activiteiten:[...bAct]}]}}));setBMin("");setBAct([]);setBTijd(nowT());closeReg();}
  function remBewegen(i){setDag(d=>({...d,bewegen:{logs:(d.bewegen?.logs||[]).filter((_,j)=>j!==i)}}));}
  function addPijn(){if(pLevel===0)return;setDag(d=>({...d,pijnLogs:[...d.pijnLogs,{tijd:nowT(),level:pLevel,label:PL[pLevel]}]}));setPLevel(0);closeReg();}
  function remPijn(i){setDag(d=>({...d,pijnLogs:d.pijnLogs.filter((_,j)=>j!==i)}));}
  function addAanval(){setDag(d=>({...d,aanval:{logs:[...(d.aanval?.logs||[]),{tijd:nowT(),type:aType,symptomen:[...aSymp]}]}}));setASymp([]);closeReg();}
  function remAanval(i){setDag(d=>({...d,aanval:{logs:(d.aanval?.logs||[]).filter((_,j)=>j!==i)}}));}
  function addMed(){const n=mNaam||mAnders;if(!n)return;setDag(d=>({...d,med:{logs:[...(d.med?.logs||[]),{tijd:mTijd,type:mType,naam:n}]}}));setMNaam("");setMAnders("");setMTijd(nowT());closeReg();}
  function remMed(i){setDag(d=>({...d,med:{logs:(d.med?.logs||[]).filter((_,j)=>j!==i)}}));}
  function addSuppl(){const n=sNaam||sAnders;if(!n)return;setDag(d=>({...d,suppl:{logs:[...(d.suppl?.logs||[]),{tijd:sTijd,naam:n}]}}));setSNaam("");setSAnders("");setSTijd(nowT());closeReg();}
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
      closeReg();
    }catch(e){dialog("Kan weersdata niet ophalen: "+e.message);}
    setWeerLoading(false);
  }
  function addUZ(){
    if(!uzWaarde)return;
    const v=parseFloat(uzWaarde);
    const inMmol=uzEenheid==="mmol"?v:v/16.8;
    setDag(d=>({...d,urinezuur:{...d.urinezuur,logs:[...(d.urinezuur?.logs||[]),{tijd:nowT(),waarde:uzWaarde,eenheid:uzEenheid,mmol:inMmol.toFixed(3)}]}}));
    setUzWaarde("");closeReg();
  }
  function remUZ(i){setDag(d=>({...d,urinezuur:{...d.urinezuur,logs:(d.urinezuur?.logs||[]).filter((_,j)=>j!==i)}}));}
  function handlePhoto(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setProfile(p=>({...p,photo:ev.target.result}));r.readAsDataURL(f);}
  function addProfMed(){if(!newMed.name)return;setProfile(p=>({...p,meds:[...(p.meds||[]),{...newMed,id:Date.now()}]}));setNewMed({name:"",dose:"",frequency:""});}
  function remProfMed(id){setProfile(p=>({...p,meds:p.meds.filter(m=>m.id!==id)}));}
  async function saveProfiel(){if(isDemo){setProfSaved(true);setTimeout(()=>{setProfSaved(false);setShowProfiel(false);},900);return;}try{await upsertProfile({name:profile.name,photo:profile.photo,meds:profile.meds,water_doel:waterDoel},token);setProfSaved(true);setTimeout(()=>{setProfSaved(false);setShowProfiel(false);},900);}catch(e){dialog("Fout: "+e.message);}}
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
    if(isDemo){dialog("Demo-modus: account verwijderen niet beschikbaar.");return;}
    setVerwijderLoading(true);
    try{
      const r=await fetch("/.netlify/functions/account-beheer",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({actie:"verwijder"})});
      const d=await r.json();
      if(d.ok){clearSession();onLogout();}
      else{dialog("Fout: "+(d.error||"Mislukt"));}
    }catch(e){dialog("Fout: "+e.message);}
    setVerwijderLoading(false);
  }

  async function wisAlleData(){if(isDemo){setEntries([]);setDag(emptyDay());setWisConf(false);return;}try{await sf("/rest/v1/entries?user_id=not.is.null","DELETE",null,token);setEntries([]);setDag(emptyDay());}catch(e){dialog("Fout: "+e.message);}setWisConf(false);}
  async function genRapport(){ setRapportLoading(true);
    const t=await callAI("rapport");
    setRapportTekst(t);
    setRapportLoading(false);
  }
  function verstuurRapport(){ if(!rapportEmail||!rapportTekst)return;
    window.location.href="mailto:"+rapportEmail+"?subject="+encodeURIComponent("Export Jicht Tracker")+"&body="+encodeURIComponent("Jicht Tracker Rapport\n"+"=".repeat(40)+"\n\n"+rapportTekst+"\n\n"+"=".repeat(40)+"\nGegenereerd: "+new Date().toLocaleDateString(LOC())+"\nRegistraties: "+entries.length);
  }

  // ── Na hooks: vroege return ───────────────────────────────────────────────
  if(loading)return <Spinner/>;
  const isPro = isDemo || profile.plan==='pro';

  const totalAttacks=entries.filter(e=>(e.aanval?.logs||[]).some(a=>a.type==="actief")).length;
  const allPains=entries.flatMap(e=>e.pijn_logs||e.pijnLogs||[]).map(p=>p.level).filter(Boolean);
  const avgPain=allPains.length?(allPains.reduce((a,b)=>a+b,0)/allPains.length).toFixed(1):"–";
  const monthly=getStats(entries);
  const recent=monthly.slice(-6);
  const syncBadge=sync==="saving"?{bg:C.pL,b:C.border,t:"Opslaan...",c:C.pD}:sync==="saved"?{bg:C.sL,b:"#9ED8BC",t:"Opgeslagen",c:C.success}:(sync.startsWith("error"))?{bg:C.dL,b:C.danger,t:"Fout bij opslaan: "+sync.replace("error:",""),c:C.danger}:null;
  const slaap=berekenSlaap(dag.slaap.bedtijd,dag.slaap.wektijd);
  const PG="linear-gradient(90deg,#4CAF50 0%,#8BC34A 25%,#FF9800 50%,#F44336 75%,#B71C1C 100%)";

  const MENU_ITEMS=[
    ["ti-mail","Rapport versturen",()=>{setShowRapport(true);setRapportTekst("");}],
    ["---","---",null],
    ["ti-sparkles","Gratis of Pro",()=>{setUpgradeFrom("");setShowUpgrade(true);}],
    ["ti-user","Profiel",()=>setShowProfiel(true)],
    ...(isDemo?[]:[["ti-dialpad","App-pincode",()=>setShowPin(true)]]),
    ["ti-lifebuoy","Ondersteuning",()=>setShowSupport(true)],
    ["ti-info-circle","Over Jicht Tracker",()=>setShowOver(true)],
    ["---","---",null],
    ["ti-lock","Privacy",()=>setShowPrivacy(true)],
    ["ti-scale","Disclaimer",()=>setShowDisc(true)],
    ["ti-logout",isDemo?"Terug naar login":"Uitloggen",async()=>{if(!isDemo)await signOut(token);onLogout();}],
  ];

  return (
    <div style={{fontFamily:FONT,background:C.bg,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:110,overflowX:"hidden",width:"100%"}}>

      {/* Header */}
      <div style={{background:C.card,padding:"14px 18px",color:C.text,display:"flex",alignItems:"center",gap:12,position:"relative",borderBottom:"1px solid "+C.border}}>
        <button onClick={()=>{setMenuOpen(false);setRegSec(null);setMainTab("home");window.scrollTo({top:0,behavior:"smooth"});}} aria-label="Home" style={{flex:1,display:"flex",alignItems:"center",gap:12,background:"none",border:"none",padding:0,margin:0,cursor:"pointer",textAlign:"left",fontFamily:FONT}}>
        {profile.photo?<img src={profile.photo} alt="p" style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",border:"2px solid "+C.pL}}/>:<div style={{width:38,height:38,borderRadius:12,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className="ti ti-heartbeat" style={{fontSize:21,color:"#fff"}} aria-hidden="true"></i></div>}
        <div style={{flex:1}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:700,letterSpacing:"-0.3px",color:C.text}}>Jicht<span style={{color:C.primary}}>Tracker</span></h1>
        </div>
        </button>
        <button onClick={()=>setMenuOpen(m=>!m)} aria-label="Menu" style={{background:C.pL,border:"none",color:C.primary,width:40,height:40,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><i className={"ti "+(menuOpen?"ti-x":"ti-menu-2")} style={{fontSize:22}} aria-hidden="true"></i></button>
        {menuOpen&&(
          <div style={{position:"absolute",top:"100%",right:16,zIndex:100,background:C.card,borderRadius:12,boxShadow:"0 12px 32px rgba(18,48,61,0.16)",border:"1px solid "+C.border,minWidth:250,overflow:"hidden",padding:6}} onClick={()=>setMenuOpen(false)}>
            {MENU_ITEMS.map(([icon,lbl,fn],i)=>(
              lbl==="---"
                ? <div key={i} style={{height:1,background:C.border,margin:"6px 8px"}}/>
                : <button key={lbl} onClick={fn} style={{width:"100%",padding:"10px 12px",border:"none",borderRadius:10,background:"transparent",textAlign:"left",cursor:"pointer",fontSize:14,color:(lbl==="Uitloggen"||lbl==="Terug naar login")?C.danger:C.text,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{width:32,height:32,borderRadius:10,background:(lbl==="Uitloggen"||lbl==="Terug naar login")?C.dL:C.pL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className={"ti "+icon} style={{fontSize:18,color:(lbl==="Uitloggen"||lbl==="Terug naar login")?C.danger:C.primary}} aria-hidden="true"></i></span><span style={{fontWeight:500,flex:1}}>{lbl}</span>{icon==="ti-sparkles"&&!isPro&&<span style={{fontSize:10,fontWeight:700,background:C.pro,color:"#fff",padding:"2px 7px",borderRadius:6}}>PRO</span>}
                  </button>
            ))}
            <div style={{height:1,background:C.border,margin:"6px 8px"}}/>
            <div onClick={e=>e.stopPropagation()} style={{padding:"8px 12px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <span style={{fontSize:13,color:C.muted,fontWeight:500}}>Taal / Sprache</span>
              <LangSwitch lang={lang} setLang={setLang}/>
            </div>
          </div>
        )}
      </div>

      {isDemo&&<div style={{background:C.pL,borderBottom:"1px solid "+C.border,padding:"8px 16px",textAlign:"center",fontSize:12,color:C.pD,fontWeight:600}}><i className="ti ti-eye" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Demo-modus — wijzigingen worden niet opgeslagen</div>}

      {mainTab==="home"&&(<>
      {/* Hero banner */}
      <div style={{padding:"16px 18px 0",fontSize:13,color:C.muted,fontWeight:500}}>Eindelijk meer controle over je jicht</div>

      {/* Today card */}
      <div style={{background:"linear-gradient(135deg,"+C.primary+" 0%,#2F9E6E 100%)",margin:"14px 14px 0",borderRadius:20,padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fff",boxShadow:"0 6px 18px rgba(14,124,134,0.22)"}}>
        <div>
          <div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.85)",marginBottom:3}}>Goedemorgen{profile.name?", "+profile.name.split(" ")[0]:""}</div>
          <div style={{fontSize:18,fontWeight:700,letterSpacing:"-0.3px"}}>{new Date().toLocaleDateString(LOC(),{weekday:"long",day:"numeric",month:"long"}).replace(/^\w/,c=>c.toUpperCase())}</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.18)",borderRadius:14,padding:"10px 14px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,lineHeight:1}}>{entries.length}</div>
          <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.9)",textTransform:"uppercase",marginTop:3,letterSpacing:0.4}}>Dagen actief</div>
        </div>
      </div>
      </>)}

      {/* Onderste navigatiebalk */}
      <nav aria-label="Hoofdmenu" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,zIndex:90,display:"flex",background:C.card,borderTop:"1px solid "+C.border,padding:"8px 8px calc(10px + env(safe-area-inset-bottom))",boxShadow:"0 -4px 18px rgba(18,48,61,0.07)",boxSizing:"border-box"}}>
        {MTABS.map(([id,icon,lbl])=>{const on=mainTab===id;return(
          <button key={id} onClick={()=>{setMainTab(id);if(id==="registreer")setRegSec(null);window.scrollTo({top:0,behavior:"smooth"});}} aria-current={on?"page":undefined} style={{flex:1,border:"none",background:on?C.pL:"transparent",borderRadius:14,padding:"7px 2px",cursor:"pointer",fontSize:11,fontWeight:on?600:500,color:on?C.primary:C.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:3,margin:"0 2px",fontFamily:FONT}}>
            <i className={"ti "+icon} style={{fontSize:22,display:"block",lineHeight:1,color:on?C.primary:C.muted}} aria-hidden="true"></i><span>{lbl}</span>
          </button>);})}
      </nav>

      {/* Modals */}
      <Modal show={showProfiel} onClose={()=>setShowProfiel(false)} title="Profiel">
        {profSaved&&<div style={{background:C.sL,border:"1px solid #9ED8BC",borderRadius:8,padding:"9px 13px",color:C.success,fontWeight:600,fontSize:13,marginBottom:12}}><i className="ti ti-circle-check" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Profiel opgeslagen!</div>}
        {!isDemo&&(<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 14px",background:isPro?C.bg:C.proL,borderRadius:12,border:"1px solid "+(isPro?C.border:C.proL)}}>
          <i className="ti ti-bell" style={{fontSize:22,color:isPro?C.primary:C.pro}} aria-hidden="true"></i>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>E-mailherinnering{!isPro&&<span style={{marginLeft:8,fontSize:9,fontWeight:700,background:C.pro,color:"#fff",padding:"2px 6px",borderRadius:5,verticalAlign:"1px"}}>PRO</span>}</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>Een vriendelijke mail als je een paar dagen niets hebt geregistreerd.</div>
          </div>
          <button onClick={async()=>{if(!isPro){setShowProfiel(false);setUpgradeFrom("E-mailherinnering");setShowUpgrade(true);return;}const nv=!profile.reminder;const r=await upsertProfile({reminder_enabled:nv},token);if(r){setProfile(p=>({...p,reminder:nv}));}else{dialog("Instellen mislukt. Probeer het later opnieuw.");}}} role="switch" aria-checked={isPro&&profile.reminder} aria-label="E-mailherinnering" style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",background:(isPro&&profile.reminder)?C.primary:C.border,position:"relative",flexShrink:0,transition:"background 0.15s"}}>
            <span style={{position:"absolute",top:3,left:(isPro&&profile.reminder)?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.25)"}}/>
          </button>
        </div>)}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:14,background:C.bg,borderRadius:12}}>
          {profile.photo?<img src={profile.photo} alt="p" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover"}}/>:<div style={{width:64,height:64,borderRadius:"50%",background:C.pL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}><i className="ti ti-user" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></div>}
          <div>
            <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}} id="pu"/>
            <label htmlFor="pu" style={{display:"inline-block",padding:"7px 14px",background:C.pL,color:C.primary,borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid "+C.border}}><i className="ti ti-camera" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Foto kiezen</label>
            {profile.photo&&<button onClick={()=>setProfile(p=>({...p,photo:""}))} style={{display:"block",fontSize:11,color:C.danger,background:"none",border:"none",cursor:"pointer",marginTop:5,padding:0}}>Verwijderen</button>}
          </div>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:5}}>Naam</div>
        <input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} placeholder="Jouw naam" style={{...inp,marginBottom:14}}/>
        <div style={{fontSize:12,color:C.muted,marginBottom:5}}>E-mailadres</div>
        <input value={session.user?.email||""} readOnly style={{...inp,marginBottom:4,background:"#E8EDF0",color:C.muted,cursor:"not-allowed",border:"1.5px solid "+C.border}}/>
        <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Je e-mailadres is niet aanpasbaar via de app.</div>
        {/* Abonnement beheren */}
        {!isDemo&&isPro&&(<div style={{borderTop:"1px solid "+C.border,paddingTop:18,marginTop:18}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:6}}><i className="ti ti-credit-card" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Abonnement</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:10}}>Zeg je abonnement op, wijzig je betaalmethode of download je facturen. Je opent hiervoor een beveiligde pagina van Stripe.</div>
          <button onClick={manageSub} disabled={subBusy} style={{width:"100%",padding:"11px",background:C.pL,color:C.primary,border:"1.5px solid "+C.primary,borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",opacity:subBusy?0.7:1}}>{subBusy?"Even geduld...":"Abonnement beheren"}</button>
        </div>)}
        {/* Wachtwoord wijzigen */}
        <div style={{borderTop:"1px solid "+C.border,paddingTop:18,marginTop:18}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}><i className="ti ti-key" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Wachtwoord wijzigen</div>
          {pwMsg&&<div style={{background:pwMsg.startsWith("ok:")?C.sL:C.dL,border:"1px solid "+(pwMsg.startsWith("ok:")?"#81C784":C.danger),borderRadius:8,padding:"8px 12px",color:pwMsg.startsWith("ok:")?C.success:C.danger,fontSize:13,marginBottom:10}}>{pwMsg.startsWith("ok:")?"":""}{pwMsg.replace(/^(ok|error):/,"")}</div>}
          <input type="password" value={nieuwPw} onChange={e=>setNieuwPw(e.target.value)} placeholder="Nieuw wachtwoord" style={{...inp,marginBottom:8}}/>
          <input type="password" value={nieuwPw2} onChange={e=>setNieuwPw2(e.target.value)} placeholder="Herhaal nieuw wachtwoord" style={{...inp,marginBottom:10}}/>
          <button onClick={wijzigWachtwoord} disabled={pwLoading||!nieuwPw||!nieuwPw2} style={{background:nieuwPw&&nieuwPw2?C.primary:C.border,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontSize:13,fontWeight:700,cursor:nieuwPw&&nieuwPw2?"pointer":"not-allowed",width:"100%",opacity:pwLoading?0.7:1}}>
            {pwLoading?"Bezig...":"Wachtwoord wijzigen"}
          </button>
        </div>

        {/* Account verwijderen */}
        <div style={{borderTop:"1px solid "+C.border,paddingTop:18,marginTop:6}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:C.danger}}><i className="ti ti-alert-triangle" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Account verwijderen</div>
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
                  {verwijderLoading?"Bezig...":"Verwijder account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal show={showRapport} onClose={()=>setShowRapport(false)} title="Rapport versturen">
        <div style={{background:C.pL,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.text,lineHeight:1.6}}>
          De AI genereert een beknopt rapport. Daarna kun je het e-mailen via je <strong>standaard mail-app</strong>.
          <div style={{fontSize:12,color:C.pD,marginTop:6,fontWeight:500}}>Maximaal 1 keer per dag, samen met je persoonlijk advies.</div>
        </div>
        {!rapportTekst&&(
          <button onClick={genRapport} disabled={rapportLoading||entries.length===0} style={{background:entries.length>0?C.primary:C.border,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:entries.length>0?"pointer":"not-allowed",width:"100%",marginBottom:12,opacity:rapportLoading?0.7:1}}>
            {rapportLoading?"Rapport genereren...":"Rapport genereren door AI"}
          </button>
        )}
        {entries.length===0&&<div style={{fontSize:12,color:C.muted,textAlign:"center",marginBottom:12}}>Voeg eerst registraties toe.</div>}
        {rapportTekst&&(
          <>
            <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:13,lineHeight:1.7,color:C.text,whiteSpace:"pre-wrap",border:"1px solid "+C.border,maxHeight:220,overflowY:"auto",marginBottom:8}}>{rapportTekst}</div>
            <button onClick={()=>setRapportTekst("")} style={{fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer",marginBottom:14,padding:0}}><i className="ti ti-arrow-back-up" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Opnieuw genereren</button>
            <div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>Verstuur naar:</div>
            <input type="email" value={rapportEmail} onChange={e=>setRapportEmail(e.target.value)} placeholder="ontvanger@email.nl" style={{...inp,marginBottom:12}}/>
            <button onClick={verstuurRapport} disabled={!rapportEmail} style={{background:rapportEmail?C.primary:C.border,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:rapportEmail?"pointer":"not-allowed",width:"100%"}}>
              Openen in mail-app
            </button>
            <div style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:8}}>Je mail-app wordt geopend. Je kunt de e-mail nog aanpassen.</div>
          </>
        )}
      </Modal>

      <TherapeutModal show={showTher} onClose={()=>setShowTher(false)} entries={entries} profile={profile} genRapport={callAI}/>
      <OverModal show={showOver} onClose={()=>setShowOver(false)}/>
      <PinModal show={showPin} onClose={()=>setShowPin(false)}/>
      <SupportModal show={showSupport} onClose={()=>setShowSupport(false)}/>
      <PrivacyModal show={showPrivacy} onClose={()=>setShowPrivacy(false)} entries={entries} wisAlleData={wisAlleData} wisConf={wisConf} setWisConf={setWisConf}/>
      <DisclaimerModal show={showDisc} onClose={()=>setShowDisc(false)}/>
      <UpgradeModal show={showUpgrade} onClose={()=>setShowUpgrade(false)} from={upgradeFrom} isPro={isPro} user={session.user}/>

      <div style={{padding:"16px 14px"}}>

        {/* ══ HOME ══ */}
        {mainTab==="home"&&(
          <div>
            {syncBadge&&<div style={{background:syncBadge.bg,border:"1px solid "+syncBadge.b,borderRadius:8,padding:"7px 12px",color:syncBadge.c,fontSize:12,fontWeight:600,marginBottom:10,textAlign:"center"}}>{syncBadge.t}</div>}
            {/* Dashboard kaarten */}
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>Deze maand</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {icon:"ti-alert-triangle",col:"#EF4444",bg:"#FEF2F2",val:totalAttacks,lbl:"Aanvallen",trend:""},
                {icon:"ti-mood-sad",col:"#E8912D",bg:"#FDF3E3",val:avgPain,lbl:"Gem. pijn",trend:""},
                {icon:"ti-droplet",col:C.primary,bg:C.pL,val:monthly.length>0?(monthly[monthly.length-1].avgUZ||"–"):"–",lbl:"Urinezuur",trend:"mmol/L"},
                {icon:"ti-calendar-check",col:C.success,bg:C.sL,val:entries.length,lbl:"Registraties",trend:""},
              ].map((d,i)=>(
                <div key={i} style={{background:C.card,borderRadius:18,padding:"14px",border:"1px solid "+C.border,boxShadow:"0 1px 2px rgba(18,48,61,0.04)"}}>
                  <div style={{width:32,height:32,borderRadius:10,background:d.bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
                    <i className={"ti "+d.icon} style={{fontSize:16,color:d.col}} aria-hidden="true"></i>
                  </div>
                  <div style={{fontSize:28,fontWeight:700,color:C.dark,lineHeight:1}}>{d.val}</div>
                  <div style={{fontSize:9,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginTop:4}}>{d.lbl}</div>
                  {d.trend&&<div style={{fontSize:9,color:C.muted,marginTop:3}}>{d.trend}</div>}
                </div>
              ))}
            </div>

            {/* Water progress card */}
            {(()=>{const wd=dag?.drinken?.water||0;const doel=profile.water_doel||2000;const pct=Math.min(100,Math.round(wd/doel*100));return(
              <div style={{background:C.card,borderRadius:16,padding:"14px",border:"1px solid "+C.border,marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:40,height:40,background:C.pL,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className="ti ti-droplets" style={{fontSize:20,color:C.primary}} aria-hidden="true"></i>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.dark,marginBottom:5}}>Water vandaag</div>
                  <div style={{height:6,background:"#F1F5F9",borderRadius:3}}>
                    <div style={{height:6,background:"linear-gradient(to right,#0E7C86,#2F9E6E)",borderRadius:3,width:pct+"%",transition:"width 0.3s"}}/>
                  </div>
                  <div style={{fontSize:9,color:C.muted,marginTop:4}}>{(wd/1000).toFixed(1)}L van {(doel/1000).toFixed(1)}L doel — {pct}%</div>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:C.primary}}>{(wd/1000).toFixed(1)}L</div>
              </div>
            )})()}

            <button onClick={()=>{setRegSec(null);setMainTab("registreer");window.scrollTo({top:0});}} style={{width:"100%",background:C.card,border:"1.5px solid "+C.primary,color:C.primary,borderRadius:16,padding:"14px",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14,fontFamily:FONT}}>
              <i className="ti ti-pencil-plus" style={{fontSize:20}} aria-hidden="true"></i> Registreer vandaag
            </button>
            {/* AI advies banner  */}
            {entries.length>=5&&(
              <div style={{background:C.dark,borderRadius:16,padding:"13px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,marginTop:4}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,background:"rgba(255,255,255,0.14)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <i className="ti ti-sparkles" style={{fontSize:18,color:"#7FE0D0"}} aria-hidden="true"></i>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Persoonlijk advies klaar</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",marginTop:1}}>{entries.length} registraties als basis</div>
                  </div>
                </div>
                <button onClick={()=>setMainTab("analyse")} style={{background:C.primary,color:"#fff",fontSize:10,fontWeight:700,padding:"7px 12px",borderRadius:9,border:"none",cursor:"pointer",flexShrink:0}}>Bekijk</button>
              </div>
            )}

          </div>
        )}

        {/* ══ REGISTREER ══ */}
        {mainTab==="registreer"&&(
          <div style={{display:"flex",flexDirection:"column"}}>
            <div style={{fontSize:20,fontWeight:700,color:C.text,margin:"2px 2px 14px",letterSpacing:"-0.3px"}}>Dagelijkse registratie</div>
            {syncBadge&&<div style={{background:syncBadge.bg,border:"1px solid "+syncBadge.b,borderRadius:8,padding:"7px 12px",color:syncBadge.c,fontSize:12,fontWeight:600,marginBottom:10,textAlign:"center"}}>{syncBadge.t}</div>}

            {/* Datumkiezer compact */}
            <div style={{background:C.card,borderRadius:12,padding:"10px 14px",border:"1px solid "+C.border,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <i className="ti ti-calendar" style={{fontSize:16,color:C.muted}} aria-hidden="true"></i>
              <span style={{fontSize:12,color:C.muted,fontWeight:600}}>Datum</span>
              <input type="date" value={regDate} onChange={e=>setRegDate(e.target.value)} style={{...inp,flex:1,padding:"5px 10px",fontSize:13}}/>
            </div>

            <div style={regSec?{order:1,opacity:0.4,transition:"opacity 0.2s",marginTop:18}:{}}>
            {/* Sectie 1 — Aanval groot + grid */}
            <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"12px 12px 14px",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:1,marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:C.danger,display:"inline-block"}}/>Aanval & Metingen
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {RTABS_S1.map(t=>{
                  const locked=PRO_TABS.includes(t.id)&&!isPro;
                  const isAanval=t.id==="aanval";
                  return(
                  <button key={t.id} onClick={()=>locked?(setUpgradeFrom(t.label),setShowUpgrade(true)):(setRegSec(t.id),window.scrollTo({top:0,behavior:"smooth"}))}
                    style={{padding:"12px 4px",border:"1.5px solid "+(regSec===t.id?(isAanval?C.danger:C.primary):locked?C.proL:C.border),borderRadius:14,background:regSec===t.id?(t.id==="aanval"?C.danger:C.primary):locked?C.proL:C.card,color:regSec===t.id?"#fff":locked?C.pro:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,position:"relative",boxShadow:regSec===t.id?"0 4px 14px rgba(14,124,134,0.28)":"none",transition:"all 0.15s",height:90}}>
                    {locked&&<span style={{position:"absolute",top:5,right:5,fontSize:9,fontWeight:700,background:C.pro,color:"#fff",padding:"2px 5px",borderRadius:5}}>PRO</span>}
                    <i className={"ti "+t.icon} style={{fontSize:26,display:"block",lineHeight:1}} aria-hidden="true"></i>
                    <span style={{fontSize:13,fontWeight:700,color:regSec===t.id?"#fff":C.text}}>{t.label}</span>
                  </button>);})}
              </div>
            </div>
            {/* Sectie 2 — Invloeden */}
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Invloeden</div>
            <div style={{marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {RTABS_S2.map(t=>{
                  const locked=PRO_TABS.includes(t.id)&&!isPro;
                  return(
                  <button key={t.id} onClick={()=>locked?(setUpgradeFrom(t.label),setShowUpgrade(true)):(setRegSec(t.id),window.scrollTo({top:0,behavior:"smooth"}))}
                    style={{padding:"12px 4px",border:"1.5px solid "+(regSec===t.id?C.primary:locked?C.proL:C.border),borderRadius:14,background:regSec===t.id?(t.id==="aanval"?C.danger:C.primary):locked?C.proL:C.card,color:regSec===t.id?"#fff":locked?C.pro:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,position:"relative",boxShadow:regSec===t.id?"0 4px 14px rgba(14,124,134,0.28)":"none",transition:"all 0.15s",height:90}}>
                    {locked&&<span style={{position:"absolute",top:5,right:5,fontSize:9,fontWeight:700,background:C.pro,color:"#fff",padding:"2px 5px",borderRadius:5}}>PRO</span>}
                    <i className={"ti "+t.icon} style={{fontSize:26,display:"block",lineHeight:1}} aria-hidden="true"></i>
                    <span style={{fontSize:13,fontWeight:700,color:regSec===t.id?"#fff":C.text}}>{t.label}</span>
                  </button>);})}
              </div>
            </div>

            </div>
            {/* Terugknop */}
            {regSec&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,marginTop:4}}>
                <button onClick={()=>setRegSec(null)} style={{background:"none",border:"none",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",padding:"4px 0",display:"flex",alignItems:"center",gap:4}}>
                  <i className="ti ti-arrow-left" style={{fontSize:16}} aria-hidden="true"></i> Terug
                </button>
                <div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderTop:"8px solid "+(RTABS_S1.some(t=>t.id===regSec)?C.accent:C.primary)}}/>
                <div style={{width:40}}/>
              </div>
            )}

            {regSec==="eten"&&(
              <Card title="Voeding registreren" icon="ti-salad" accentColor={C.primary}>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                  {MMT.map(m=><button key={m} onClick={()=>setEtenMom(m)} style={{padding:"5px 11px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(etenMom===m?C.primary:C.border),background:etenMom===m?C.pL:C.card,color:etenMom===m?C.primary:C.muted,fontWeight:etenMom===m?700:400}}>{m}</button>)}
                </div>
                {SCAN_AAN&&(<div style={{display:"flex",gap:8,marginBottom:8}}>
                  <FotoScan onResult={tekst=>{if(tekst)setEtenTxt(tekst);}}/>
                </div>)}
                <textarea value={etenTxt} onChange={e=>setEtenTxt(e.target.value)} placeholder="Wat heb je gegeten?" rows={2} style={{...inp,resize:"vertical",marginBottom:8}}/>
                <button onClick={addEten} disabled={!etenTxt.trim()} style={{background:etenTxt.trim()?C.primary:C.border,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:13,fontWeight:600,cursor:etenTxt.trim()?"pointer":"default",width:"100%"}}>+ Toevoegen</button>
                {dag.eten.logs.length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:10}}>{dag.eten.logs.map((l,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,fontWeight:700,color:C.primary,minWidth:70}}>{l.moment}</span><span style={{fontSize:12,flex:1}}>{l.tekst}</span><button onClick={()=>remEten(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button></div>)}</div>}
              </Card>
            )}

            {regSec==="drinken"&&(
              <Card title="Drinken registreren" icon="ti-droplets" accentColor={C.primary}>
                <div style={{background:C.bg,borderRadius:10,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:C.muted,fontWeight:600,flexShrink:0}}>Dagdoel:</span>
                  <div style={{display:"flex",gap:5,flex:1}}>
                    {[1500,2000,2500,3000].map(ml=>(
                      <button key={ml} onClick={async()=>{setWaterDoel(ml);if(!isDemo)await upsertProfile({water_doel:ml},token);}} style={{flex:1,padding:"5px 2px",borderRadius:8,fontSize:11,cursor:"pointer",border:"1.5px solid "+(waterDoel===ml?C.primary:C.border),background:waterDoel===ml?C.pL:C.card,color:waterDoel===ml?C.primary:C.muted,fontWeight:waterDoel===ml?700:400}}>
                        {ml/1000}L
                      </button>
                    ))}
                  </div>
                </div>
                {(()=>{ const tot=dag.drinken.logs.reduce((s,l)=>s+(l.ml||0),0);
                  const pct=Math.min(100,Math.round(tot/waterDoel*100));
                  const kleur=pct>=100?C.success:pct>=60?C.accent:C.danger;
                  return(
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:700,color:kleur}}><i className="ti ti-droplets" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>{tot}ml / {waterDoel}ml dagdoel</span>
                        <span style={{fontSize:12,color:kleur,fontWeight:700}}>{pct}%</span>
                      </div>
                      <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden"}}>
                        <div style={{width:pct+"%",height:"100%",background:kleur,borderRadius:4,transition:"width 0.3s"}}/>
                      </div>
                      {pct>=100&&<div style={{fontSize:11,color:C.success,marginTop:4,fontWeight:600}}><i className="ti ti-circle-check" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Dagdoel behaald!</div>}
                    </div>
                  );
                })()}
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {DCAT.map(d=><button key={d} onClick={()=>{setDCat(d);const e=(PORTIE[d]||PORTIE["Anders"])[0];setDMl(e.ml);setDPortie(e.l);}} style={{padding:"5px 11px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(dCat===d?C.primary:C.border),background:dCat===d?C.pL:C.card,color:dCat===d?C.primary:C.muted,fontWeight:dCat===d?700:400}}>{d}</button>)}
                </div>
                {(dCat==="Anders"||dCat==="Alcohol"||dCat==="Frisdrank")&&<input value={dTxt} onChange={e=>setDTxt(e.target.value)} placeholder={dCat==="Alcohol"?"Bijv. bier, rode wijn...":"Omschrijving"} style={{...inp,marginBottom:12}}/>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                  {(PORTIE[dCat]||PORTIE["Anders"]).map(p=><button key={p.l} onClick={()=>{setDMl(p.ml);setDPortie(p.l);}} style={{padding:"7px 3px",borderRadius:10,border:"2px solid "+(dMl===p.ml&&dPortie===p.l?C.primary:C.border),background:dMl===p.ml&&dPortie===p.l?C.pL:C.card,color:dMl===p.ml&&dPortie===p.l?C.primary:C.muted,fontSize:10,fontWeight:dMl===p.ml&&dPortie===p.l?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><i className={"ti "+(p.i==="kop"?"ti-cup":p.i==="mok"?"ti-coffee":p.i==="bier"?"ti-beer":p.i==="wijn"?"ti-glass-full":p.i==="fles"?"ti-bottle":p.i==="shot"?"ti-glass-cocktail":"ti-glass")} style={{fontSize:20}} aria-hidden="true"></i><span>{p.l}</span><span style={{fontSize:9,color:C.muted}}>{p.ml}ml</span></button>)}
                </div>
                {SCAN_AAN&&(<div style={{display:"flex",gap:8,marginBottom:10}}>
                  <FotoScan onResult={tekst=>{if(tekst)setDTxt(tekst);}}/>
                </div>)}
                <button onClick={addDrinken} style={{background:C.primary,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%",marginBottom:10}}>+ Registreren</button>
                {dag.drinken.logs.length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10}}>{dag.drinken.logs.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{l.tijd}</span><span style={{fontSize:12,fontWeight:700,color:C.primary,flex:1}}>{l.categorie}{l.tekst?" · "+l.tekst:""}</span><span style={{fontSize:11,color:C.muted,background:C.pL,padding:"2px 7px",borderRadius:8}}>{l.portie} · {l.ml}ml</span><button onClick={()=>remDrinken(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button></div>)}</div>}
              </Card>
            )}

            {regSec==="bewegen"&&isPro&&(
              <Card title="Beweging registreren" icon="ti-run" accentColor={C.primary}>
                {(dag.bewegen?.logs||[]).length>0&&(()=>{const tot=(dag.bewegen.logs).reduce((s,l)=>s+(parseInt(l.minuten)||0),0);return<div style={{background:C.pL,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.primary,fontWeight:700}}>{dag.bewegen.logs.length} {dag.bewegen.logs.length>1?"sessies":"sessie"}</span><span style={{fontSize:12,color:C.primary}}>{tot} min totaal</span></div>;})()}
                <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-end"}}>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tijdstip</div><input type="time" value={bTijd} onChange={e=>setBTijd(e.target.value)} style={{...inp,width:100}}/></div>
                  <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Minuten</div><input type="number" value={bMin} onChange={e=>setBMin(e.target.value)} placeholder="0" min={0} style={{...inp,width:75,textAlign:"center",fontSize:17,fontWeight:700}}/></div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {[15,20,30,45,60,90].map(m=><button key={m} onClick={()=>setBMin(String(m))} style={{padding:"5px 12px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1.5px solid "+(bMin===String(m)?C.primary:C.border),background:bMin===String(m)?C.pL:C.card,color:bMin===String(m)?C.primary:C.muted,fontWeight:bMin===String(m)?700:400}}>{m}min</button>)}
                </div>
                <Chips opts={BEWEGING} sel={bAct} onToggle={item=>setBAct(a=>a.includes(item)?a.filter(x=>x!==item):[...a,item])}/>
                <button onClick={addBewegen} disabled={!bMin&&bAct.length===0} style={{background:(bMin||bAct.length>0)?C.primary:C.border,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontSize:13,fontWeight:700,cursor:(bMin||bAct.length>0)?"pointer":"default",width:"100%",marginTop:12}}>+ Sessie toevoegen</button>
                {(dag.bewegen?.logs||[]).length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>{dag.bewegen.logs.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{l.tijd}</span><span style={{fontSize:12,fontWeight:700,color:C.primary,flex:1}}>{l.activiteiten?.join(", ")||"Activiteit"}</span><span style={{fontSize:11,color:C.muted,background:C.pL,padding:"2px 7px",borderRadius:8}}>{l.minuten}min</span><button onClick={()=>remBewegen(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button></div>)}</div>}
              </Card>
            )}

            {regSec==="slaap"&&isPro&&(
              <Card title="Slaap registreren" icon="ti-moon" accentColor={C.primary}>
                <div style={{display:"flex",gap:12,marginBottom:16}}>
                  <div style={{flex:1}}><div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Gisteravond naar bed</div><input type="time" value={dag.slaap.bedtijd} onChange={e=>setDag(d=>({...d,slaap:{...d.slaap,bedtijd:e.target.value}}))} style={{...inp,fontSize:17,fontWeight:700,textAlign:"center",padding:"11px"}}/></div>
                  <div style={{flex:1}}><div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Vanochtend wakker</div><input type="time" value={dag.slaap.wektijd} onChange={e=>setDag(d=>({...d,slaap:{...d.slaap,wektijd:e.target.value}}))} style={{...inp,fontSize:17,fontWeight:700,textAlign:"center",padding:"11px"}}/></div>
                </div>
                {slaap?(
                  <div style={{background:slaap.totaalMin>=420?C.sL:slaap.totaalMin>=360?C.aL:C.dL,border:"1px solid "+(slaap.totaalMin>=420?"#81C784":slaap.totaalMin>=360?C.accent:C.danger),borderRadius:12,padding:16,textAlign:"center"}}>
                    <div style={{fontSize:34,fontWeight:700,color:slaap.totaalMin>=420?C.success:slaap.totaalMin>=360?C.aT:C.danger}}>{slaap.label}</div>
                    <div style={{fontSize:13,color:C.muted,marginTop:4}}>{slaap.totaalMin>=420?"Goede nachtrust":slaap.totaalMin>=360?"Redelijke nachtrust":"Te weinig slaap"}</div>
                  </div>
                ):(
                  <div style={{background:C.bg,borderRadius:12,padding:20,textAlign:"center",color:C.muted,border:"1px dashed "+C.border}}>
                    <div style={{fontSize:26,marginBottom:6}}><i className="ti ti-moon" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></div>
                    <div style={{fontSize:13}}>Vul beide tijden in om de slaapduur te berekenen</div>
                  </div>
                )}
                <button onClick={closeReg} disabled={!slaap} style={{background:slaap?C.primary:C.border,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:slaap?"pointer":"default",width:"100%",marginTop:14}}>Slaap opslaan</button>
                <div style={{fontSize:11,color:C.muted,marginTop:10,textAlign:"center"}}>Slaapduur wordt automatisch berekend en opgeslagen</div>
              </Card>
            )}

            {regSec==="pijn"&&(
              <Card title="Pijn registreren" icon="ti-mood-sad" accentColor={C.danger}>
                <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.6}}>Tijdstip wordt automatisch opgeslagen. Meerdere metingen per dag mogelijk.</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Ervaar je op dit moment pijn?</div>
                <div style={{display:"flex",gap:10,marginBottom:pLevel>0?18:4}}>
                  <button onClick={()=>setPLevel(pLevel>0?0:1)} style={{flex:1,padding:"11px 8px",borderRadius:10,border:"2px solid "+(pLevel>0?C.danger:C.border),background:pLevel>0?C.dL:C.card,color:pLevel>0?C.danger:C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}><i className="ti ti-mood-sad" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Ja, pijn</button>
                  <button onClick={()=>{setDag(d=>({...d,pijnLogs:[...d.pijnLogs,{tijd:nowT(),level:0,label:"Geen pijn"}]}));setPLevel(0);}} style={{flex:1,padding:"11px 8px",borderRadius:10,border:"2px solid "+C.border,background:C.card,color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}><i className="ti ti-mood-smile" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Geen pijn</button>
                </div>
                {pLevel>0&&(
                  <>
                    <div style={{position:"relative",marginBottom:8,padding:"0 8px"}}>
                      <div style={{height:12,borderRadius:6,background:PG,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.2)",position:"relative"}}>
                        <div style={{position:"absolute",top:"50%",left:((pLevel-1)/4*100)+"%",transform:"translate(-50%,-50%)",width:28,height:28,borderRadius:"50%",background:PC[pLevel],border:"3px solid white",boxShadow:"0 2px 8px "+PC[pLevel]+"80",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,transition:"left 0.15s"}}>{pLevel}</div>
                      </div>
                      <input type="range" min={1} max={5} step={1} value={pLevel} onChange={e=>setPLevel(Number(e.target.value))} style={{position:"absolute",top:0,left:8,right:8,width:"calc(100% - 16px)",height:12,opacity:0,cursor:"pointer",zIndex:3,margin:0}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"0 4px",marginTop:12,marginBottom:14}}>
                      {[["1","Licht","#4CAF50"],["2","Matig","#8BC34A"],["3","Ernstig","#FF9800"],["4","Hevig","#F44336"],["5","Ondraag.","#B71C1C"]].map(([n,l,c])=>(
                        <div key={n} onClick={()=>setPLevel(Number(n))} style={{textAlign:"center",cursor:"pointer",opacity:pLevel===Number(n)?1:0.45}}>
                          <div style={{fontWeight:700,fontSize:14,color:c}}>{n}</div>
                          <div style={{fontSize:9,color:c,fontWeight:600}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={addPijn} style={{background:C.danger,color:"#fff",border:"none",borderRadius:12,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>+ Pijnmeting opslaan ({nowT()})</button>
                  </>
                )}
                {dag.pijnLogs.length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.pijnLogs.map((p,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}>
                        <span style={{fontSize:11,color:C.muted,minWidth:36}}>{p.tijd}</span>
                        {p.level===0?<span style={{fontSize:12,color:C.success,fontWeight:600,flex:1}}><i className="ti ti-mood-smile" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Geen pijn</span>:(
                          <><div style={{width:10,height:10,borderRadius:"50%",background:PC[p.level],flexShrink:0}}/><div style={{flex:1,height:6,borderRadius:3,background:"#eee",overflow:"hidden"}}><div style={{width:((p.level-1)/4*100)+"%",height:"100%",background:PG,minWidth:8}}/></div><span style={{fontSize:12,fontWeight:700,color:PC[p.level],minWidth:32}}>{p.level}/5</span><span style={{fontSize:11,color:C.muted}}>{PL[p.level]}</span></>
                        )}
                        <button onClick={()=>remPijn(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0,marginLeft:"auto"}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {regSec==="aanval"&&(
              <Card title="Aanval registreren" icon="ti-alert-triangle" accentColor={C.danger}>
                {(dag.aanval?.logs||[]).length>0&&<div style={{background:C.dL,borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.danger,fontWeight:700}}>{dag.aanval.logs.length} {dag.aanval.logs.length>1?"registraties":"registratie"} vandaag</span></div>}
                <div style={{fontSize:12,color:C.muted,marginBottom:8,fontWeight:600}}>Situatie op dit moment:</div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {[["signalen","Waarschuwingssignalen","Mogelijk aanval op komst",C.accent,C.aL],["actief","Actieve aanval","Nu een actieve aanval",C.danger,C.dL],["afnemend","Aanval neemt af","Ergste pijn voorbij",C.accent,C.aL],["voorbij","Aanval voorbij","Geen klachten meer",C.success,C.sL]].map(([v,lbl,sub,col,bg])=>(
                    <button key={v} onClick={()=>setAType(v)} style={{padding:"10px 14px",borderRadius:10,textAlign:"left",cursor:"pointer",border:"2px solid "+(aType===v?col:C.border),background:aType===v?bg:C.card}}>
                      <div style={{fontWeight:600,fontSize:13,color:aType===v?(col===C.accent?C.aT:col):C.text,display:"flex",alignItems:"center",gap:8}}><i className={"ti "+({signalen:"ti-bell-ringing",actief:"ti-urgent",afnemend:"ti-trending-down",voorbij:"ti-circle-check"}[v])} style={{fontSize:18}} aria-hidden="true"></i>{lbl}</div>
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
                <button onClick={addAanval} style={{background:C.danger,color:"#fff",border:"none",borderRadius:12,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>+ Registratie opslaan</button>
                {(dag.aanval?.logs||[]).length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.aanval.logs.map((a,i)=>{ const kleur=a.type==="actief"?C.danger:a.type==="voorbij"?C.success:C.accent;
                      const bg=a.type==="actief"?C.dL:a.type==="voorbij"?C.sL:C.aL;
                      const icon=a.type==="actief"?"ti-urgent":a.type==="voorbij"?"ti-circle-check":a.type==="afnemend"?"ti-trending-down":"ti-bell-ringing";
                      const lbl={"actief":"Actieve aanval","voorbij":"Aanval voorbij","afnemend":"Aanval neemt af","signalen":"Waarschuwingssignalen"}[a.type];
                      return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:7,background:C.bg,borderRadius:8,padding:"8px 10px"}}>
                        <span style={{fontSize:11,color:C.muted,minWidth:36,paddingTop:2}}>{a.tijd}</span>
                        <div style={{flex:1}}><span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:8,background:bg,color:kleur,display:"inline-flex",alignItems:"center",gap:5}}><i className={"ti "+icon} aria-hidden="true"></i>{lbl}</span>{a.symptomen?.length>0&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{a.symptomen.join(", ")}</div>}</div>
                        <button onClick={()=>remAanval(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button>
                      </div>;
                    })}
                  </div>
                )}
              </Card>
            )}

            {regSec==="medsupp"&&isPro&&(
              <div>
                <Card title="Medicatie vandaag" icon="ti-pill" accentColor={C.primary}>
                  {(dag.med?.logs||[]).length>0&&<div style={{background:C.pL,borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.primary,fontWeight:700}}>{dag.med.logs.length} {dag.med.logs.length>1?"innames":"inname"} vandaag</span></div>}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tijdstip</div><input type="time" value={mTijd} onChange={e=>setMTijd(e.target.value)} style={{...inp,width:100}}/></div>
                    <div style={{flex:1}}><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Type</div><div style={{display:"flex",gap:6}}>{[["preventie","Preventief"],["aanval","Aanval/pijn"]].map(([v,l])=><button key={v} onClick={()=>{setMType(v);setMNaam("");}} style={{flex:1,padding:"7px 4px",borderRadius:8,fontSize:12,cursor:"pointer",border:"1.5px solid "+(mType===v?(v==="preventie"?C.primary:C.danger):C.border),background:mType===v?(v==="preventie"?C.pL:C.dL):C.card,color:mType===v?(v==="preventie"?C.primary:C.danger):C.muted,fontWeight:mType===v?700:400}}>{l}</button>)}</div></div>
                  </div>
                  <Chips opts={mType==="preventie"?MEDP:MEDA} sel={mNaam?[mNaam]:[]} onToggle={item=>setMNaam(mNaam===item?"":item)} col={mType==="preventie"?C.primary:C.danger} bg={mType==="preventie"?C.pL:C.dL}/>
                  <input value={mAnders} onChange={e=>setMAnders(e.target.value)} placeholder="Of typ een ander medicijn..." style={{...inp,marginTop:10}}/>
                  <button onClick={addMed} disabled={!mNaam&&!mAnders} style={{background:(mNaam||mAnders)?C.primary:C.border,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontSize:13,fontWeight:700,cursor:(mNaam||mAnders)?"pointer":"default",width:"100%",marginTop:10}}>+ Inname registreren</button>
                  {(dag.med?.logs||[]).length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>{dag.med.logs.map((m,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{m.tijd}</span><span style={{fontSize:13,padding:"2px 7px",borderRadius:8,fontWeight:700,background:m.type==="preventie"?C.pL:C.dL,color:m.type==="preventie"?C.primary:C.danger,display:"inline-flex"}}><i className={"ti "+(m.type==="preventie"?"ti-shield-check":"ti-urgent")} aria-hidden="true"></i></span><span style={{fontSize:12,fontWeight:600,flex:1}}>{m.naam}</span><button onClick={()=>remMed(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button></div>)}</div>}
                </Card>
                <div style={{marginTop:12}}>
                <Card title="Supplementen vandaag" icon="ti-leaf" accentColor={C.primary}>
                  {(dag.suppl?.logs||[]).length>0&&<div style={{background:C.sL,borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.success,fontWeight:700}}>{dag.suppl.logs.length} {dag.suppl.logs.length>1?"innames":"inname"} vandaag</span></div>}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tijdstip</div><input type="time" value={sTijd} onChange={e=>setSTijd(e.target.value)} style={{...inp,width:100}}/></div></div>
                  {SCAN_AAN&&(<div style={{display:"flex",gap:8,marginBottom:10}}>
                    <FotoScan onResult={tekst=>{if(tekst)setSAnders(tekst);}}/>
                    <BarcodeScan onResult={(naam)=>{if(naam)setSAnders(naam);}}/>
                  </div>)}
                  <Chips opts={SUPPL} sel={sNaam?[sNaam]:[]} onToggle={item=>setSNaam(sNaam===item?"":item)} col={C.success} bg={C.sL}/>
                  <input value={sAnders} onChange={e=>setSAnders(e.target.value)} placeholder="Of typ een supplement..." style={{...inp,marginTop:10}}/>
                  <button onClick={addSuppl} disabled={!sNaam&&!sAnders} style={{background:(sNaam||sAnders)?C.success:C.border,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontSize:13,fontWeight:700,cursor:(sNaam||sAnders)?"pointer":"default",width:"100%",marginTop:10}}>+ Inname registreren</button>
                  {(dag.suppl?.logs||[]).length>0&&<div style={{borderTop:"1px solid "+C.border,paddingTop:10,marginTop:12}}>{dag.suppl.logs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"7px 10px"}}><span style={{fontSize:11,color:C.muted,minWidth:36}}>{s.tijd}</span><span style={{fontSize:12,fontWeight:600,flex:1}}>{s.naam}</span><button onClick={()=>remSuppl(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button></div>)}</div>}
                </Card>
                </div>
              </div>
            )}

            {regSec==="urinezuur"&&isPro&&(
              <Card title="Urinezuurwaarde" icon="ti-droplet" accentColor={C.danger}>
                {(dag.urinezuur?.logs||[]).length>0&&<div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",marginBottom:12}}><span style={{fontSize:13,color:C.danger,fontWeight:700}}>{dag.urinezuur.logs.length} {dag.urinezuur.logs.length>1?"metingen":"meting"} vandaag</span></div>}
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
                      <div style={{fontSize:22,fontWeight:700,color:goed?C.success:grens?C.aT:C.danger}}>{uzEenheid==="mmol"?v+" mmol/L":v+" mg/dL · "+inMmol.toFixed(2)+" mmol/L"}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:4}}>{goed?"Onder streefwaarde":grens?"Verhoogd":"Fors verhoogd"}</div>
                    </div>
                  );
                })()}
                <button onClick={addUZ} disabled={!uzWaarde} style={{background:uzWaarde?C.danger:C.border,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontSize:13,fontWeight:700,cursor:uzWaarde?"pointer":"default",width:"100%",marginBottom:4}}>+ Meting opslaan ({nowT()})</button>
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
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:goed?C.sL:grens?C.aL:C.dL,color:goed?C.success:grens?C.aT:C.danger,fontWeight:600}}>{goed?"OK":grens?"Verhoogd":"Hoog"}</span>
                          <button onClick={()=>remUZ(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {regSec==="weer"&&isPro&&(
              <Card title="Weer registreren" icon="ti-cloud-sun" accentColor={C.primary}>
                <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.6}}>
                  Registreer het huidige weer automatisch via je locatie. Weersomstandigheden kunnen een trigger zijn voor jichtaanvallen.
                </div>
                <button onClick={fetchWeer} disabled={weerLoading} style={{background:weerLoading?C.border:C.primary,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:weerLoading?"not-allowed":"pointer",width:"100%",marginBottom:12,opacity:weerLoading?0.7:1}}>
                  {weerLoading?"Locatie ophalen...":"Registreer huidig weer"}
                </button>
                {(dag.weer?.logs||[]).length>0&&(
                  <div style={{borderTop:"1px solid "+C.border,paddingTop:10}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:7}}>Log vandaag:</div>
                    {dag.weer.logs.map((w,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                        <i className={"ti "+({"☀":"ti-sun","⛅":"ti-cloud-sun","🌫":"ti-mist","🌧":"ti-cloud-rain","❄":"ti-snowflake","🌦":"ti-cloud-rain","⛈":"ti-cloud-storm"}[(w.icon||"").replace("\ufe0f","")]||"ti-cloud")} style={{fontSize:24,color:C.primary}} aria-hidden="true"></i>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:C.text}}>{w.omschrijving}</div>
                          <div style={{fontSize:11,color:C.muted}}>{w.temp}°C · {w.vochtigheid}% vochtig · wind {w.wind} km/u</div>
                        </div>
                        <span style={{fontSize:11,color:C.muted}}>{w.tijd}</span>
                        <button onClick={()=>setDag(d=>({...d,weer:{...d.weer,logs:d.weer.logs.filter((_,j)=>j!==i)}}))} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0}}><i className="ti ti-x" style={{verticalAlign:"-0.12em"}} aria-hidden="true"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:10}}><i className="ti ti-cloud" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Data wordt automatisch opgeslagen</div>
          </div>
        )}

        {/* ══ OVERZICHT ══ */}
        {mainTab==="overzicht"&&(
          <div>
            <div style={{background:C.pL,borderRadius:16,padding:"12px 14px",marginBottom:14,border:"1px solid "+C.border}}>
              <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:4}}><i className="ti ti-book" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Dagboek</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Een overzicht van al je dagregistraties. Tik op een dag voor alle details.</div>
            </div>
            {entries.length===0?<Empty icon="ti-book" text="Nog geen registraties. Start met de Registreer tab!"/>:(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {entries.map(e=>{ const pijns=e.pijn_logs||e.pijnLogs||[];
                  const topP=pijns.length?Math.max(...pijns.map(p=>p.level)):0;
                  return (
                    <div key={e.id} style={{background:C.card,borderRadius:16,padding:14,border:"1px solid "+C.border,borderLeft:"4px solid "+(topP>0?PC[topP]:C.border),boxShadow:"0 1px 3px rgba(18,48,61,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15}}>{fmt(e.date)}</div>
                          {(e.aanval?.logs||[]).some(a=>a.type==="actief")&&<span style={{fontSize:11,background:C.dL,color:C.danger,padding:"2px 8px",borderRadius:10,fontWeight:700}}><i className="ti ti-urgent" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>AANVAL</span>}
                        </div>
                        {topP>0&&<div style={{width:34,height:34,borderRadius:8,background:PC[topP],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16}}>{topP}</div>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        {e.eten?.logs?.length>0&&<Row icon="ti-salad" label="Eten" val={e.eten.logs.map(l=>l.moment+": "+l.tekst).join(" · ")}/>}
                        {e.drinken?.logs?.length>0&&<Row icon="ti-droplets" label="Drinken" val={e.drinken.logs.length+"x · "+e.drinken.logs.reduce((s,l)=>s+(l.ml||0),0)+"ml"}/>}
                        {e.bewegen?.logs?.length>0&&<Row icon="ti-run" label="Beweging" val={e.bewegen.logs.reduce((s,l)=>s+(parseInt(l.minuten)||0),0)+"min"}/>}
                        {e.slaap?.uren&&<Row icon="ti-moon" label="Slaap" val={e.slaap.uren+"u"}/>}
                        {pijns.length>0&&<Row icon="ti-mood-sad" label="Pijn" val={pijns.map(p=>p.tijd+": "+(p.level>0?p.level+"/5":"geen")).join(", ")}/>}
                        {(e.aanval?.logs||[]).length>0&&<Row icon="ti-alert-triangle" label="Aanval" val={(e.aanval.logs).map(a=>a.tijd+" "+({actief:"actief",voorbij:"voorbij",afnemend:"afnemend"}[a.type]||"signalen")).join(" · ")}/>}
                        {(e.med?.logs||[]).length>0&&<Row icon="ti-pill" label="Meds" val={(e.med.logs).map(m=>m.naam).join(", ")}/>}
                        {(e.suppl?.logs||[]).length>0&&<Row icon="ti-leaf" label="Supplementen" val={(e.suppl.logs).map(s=>s.naam).join(", ")}/>
                        }{(e.urinezuur?.logs||[]).length>0&&<Row icon="ti-droplet" label="Urinezuur" val={(e.urinezuur.logs).map(l=>l.waarde+" "+(l.eenheid==="mmol"?"mmol/L":"mg/dL")).join(", ")}/>}
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
            <div style={{background:C.pL,borderRadius:16,padding:"12px 14px",border:"1px solid "+C.border}}>
              <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:4}}><i className="ti ti-chart-line" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Trends</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Maandelijkse samenvattingen en grafieken van je aanvallen, pijnscores en slaappatroon.</div>
            </div>
            {entries.length===0?<Empty icon="ti-chart-line" text="Voeg registraties toe om trends te zien."/>:(
              <>
                <Card title="Maandoverzicht" icon="ti-calendar">
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
                {recent.length>=2&&<Card title="Aanvallen per maand" icon="ti-circle-filled"><BarChart data={recent} vk="attacks" color={C.danger} maxV={Math.max(...recent.map(m=>m.attacks),1)}/></Card>}
                {recent.filter(m=>m.avgPain).length>=2&&<Card title="Gem. pijn per maand" icon="ti-mood-sad"><BarChart data={recent} vk="avgPain" color={C.accent} maxV={5} unit="/5"/></Card>}
                {recent.filter(m=>m.avgUZ).length>=2&&(
                  <Card title="Gem. urinezuur per maand (mmol/L)" icon="ti-droplet">
                    <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Streefwaarde: onder 0.36 mmol/L</div>
                    <BarChart data={recent} vk="avgUZ" color={C.danger} maxV={Math.max(...recent.map(m=>parseFloat(m.avgUZ)||0),0.6)}/>
                    <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"center"}}>
                      <div style={{width:12,height:4,background:C.success,borderRadius:2,alignSelf:"center"}}/>
                      <span style={{fontSize:10,color:C.muted}}>Doel: 0.36</span>
                    </div>
                  </Card>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[{l:"Totaal aanvallen",v:totalAttacks,icon:"ti-alert-triangle",col:C.danger},{l:"Gem. pijnscore",v:avgPain,icon:"ti-mood-sad",col:C.accent},{l:"Registraties",v:entries.length,icon:"ti-notes",col:C.primary},{l:"Maanden gevolgd",v:monthly.length,icon:"ti-calendar",col:C.success}].map((s,i)=>(
                    <div key={i} style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,textAlign:"center"}}>
                      <div style={{width:36,height:36,borderRadius:11,background:s.col+"1A",display:"inline-flex",alignItems:"center",justifyContent:"center"}}><i className={"ti "+s.icon} style={{fontSize:19,color:s.col}} aria-hidden="true"></i></div>
                      <div style={{fontSize:24,fontWeight:700,color:s.col,marginTop:6}}>{s.v}</div>
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
            <div style={{background:C.pL,borderRadius:16,padding:14,border:"1px solid "+C.border}}>
              <div style={{fontWeight:700,color:C.primary,fontSize:15,marginBottom:5}}><i className="ti ti-bulb" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>Persoonlijk Jicht Advies</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Analyseert jouw registraties en geeft persoonlijk advies over patronen, triggers en verbeterpunten.</div>
              <div style={{fontSize:12,color:C.pD,marginTop:6,fontWeight:500}}>Persoonlijk advies en rapporten kun je samen maximaal 1 keer per dag laten maken.</div>
              <div style={{fontSize:11,color:C.muted,marginTop:6}}><i className="ti ti-chart-bar" style={{verticalAlign:"-0.12em",marginRight:6}} aria-hidden="true"></i>{entries.length} dag(en) · {profile.meds?.length||0} vaste medicatie(s)</div>
            </div>
            <button onClick={async()=>{setAiLoading(true);const r=await callAI("analyse");setAiResult(r);setAiLoading(false);}} disabled={aiLoading||entries.length<5} style={{background:entries.length>=5?C.accent:C.border,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:entries.length>=5?"pointer":"not-allowed",width:"100%",opacity:aiLoading?0.7:1}}>
              {aiLoading?"Analyseren...":"Genereer mijn persoonlijk advies"}
            </button>
            {entries.length<5&&<div style={{textAlign:"center",color:C.muted,fontSize:13}}>Minimaal 5 registraties nodig.</div>}
            {aiResult&&<div style={{background:C.card,borderRadius:12,padding:18,border:"1px solid "+C.border}}><div style={{fontSize:14,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap"}}>{aiResult}</div></div>}
          </div>
        )}

      </div>
    </div>
  );
}

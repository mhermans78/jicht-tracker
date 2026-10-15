// Dagelijkse e-mailherinnering voor Pro-gebruikers die een paar dagen niets hebben geregistreerd.
// Draait via netlify.toml ([functions."reminder"] schedule). Vereist env: RESEND_API_KEY,
// SUPABASE_URL, SUPABASE_SERVICE_KEY. Optioneel: REMINDER_FROM, SITE_URL, REMINDER_SECRET, REMINDER_DRY_RUN=1
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SITE = (process.env.SITE_URL || "https://jichttracker.nl").replace(/\/$/, "");
const FROM = process.env.REMINDER_FROM || "JichtTracker <herinnering@jichttracker.nl>";
const DAYS_INACTIVE = 3;   // na zoveel dagen zonder registratie
const MIN_GAP_DAYS = 7;    // maximaal 1 herinnering per week
const MAX_PER_RUN = 200;
const DAY = 24 * 60 * 60 * 1000;

function sign(uid) {
  return crypto.createHmac("sha256", process.env.REMINDER_SECRET || process.env.SUPABASE_SERVICE_KEY).update(uid).digest("hex");
}

const TXT = {
  nl: {
    subject: "Je jicht-dagboek wacht op je", app: "Jicht", hi: "Hoi", html: "nl",
    body: (d) => `Je hebt de afgelopen ${d} dagen niets geregistreerd. Een paar seconden per dag is genoeg: hoe vaker je invult, hoe beter je ziet wat je jicht beïnvloedt.`,
    btn: "Registreer vandaag",
    foot: "Je krijgt deze mail als Pro-gebruiker.", unsub: "Geen herinneringen meer ontvangen", foot2: "Je kunt dit ook aanpassen in je profiel.",
  },
  de: {
    subject: "Dein Gicht-Tagebuch wartet auf dich", app: "Gicht", hi: "Hallo", html: "de",
    body: (d) => `Du hast in den letzten ${d} Tagen nichts erfasst. Ein paar Sekunden pro Tag genügen: Je öfter du einträgst, desto besser erkennst du, was deine Gicht beeinflusst.`,
    btn: "Heute erfassen",
    foot: "Du erhältst diese E-Mail als Pro-Nutzer.", unsub: "Keine Erinnerungen mehr erhalten", foot2: "Du kannst das auch in deinem Profil ändern.",
  },
};

function mailHtml(naam, dagen, unsubUrl, lang) {
  const T = TXT[lang] || TXT.nl;
  const hallo = naam ? T.hi + " " + naam.split(" ")[0] + "," : T.hi + ",";
  return `<!doctype html><html lang="${T.html}"><body style="margin:0;background:#F3F8FB;font-family:Arial,Helvetica,sans-serif;color:#12303D">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
 <div style="background:#fff;border:1px solid #D9E6EC;border-radius:16px;padding:28px">
  <div style="font-size:22px;font-weight:700;margin-bottom:16px">${T.app}<span style="color:#0E7C86">Tracker</span></div>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${hallo}</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${T.body(dagen)}</p>
  <p style="margin:20px 0"><a href="${SITE}" style="background:#0E7C86;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px;display:inline-block">${T.btn}</a></p>
  <p style="font-size:12px;color:#6B8794;line-height:1.6;margin:0">${T.foot} <a href="${unsubUrl}" style="color:#0E7C86">${T.unsub}</a>. ${T.foot2}</p>
 </div>
</div></body></html>`;
}

async function sendMail(to, subject, html) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error("Resend " + r.status + ": " + (await r.text()));
}

exports.handler = async () => {
  const now = Date.now();
  const dry = process.env.REMINDER_DRY_RUN === "1";
  const { data: profs, error } = await supabase
    .from("profiles")
    .select("id,name,lang,last_reminder_at")
    .eq("plan", "pro")
    .or("reminder_enabled.is.null,reminder_enabled.eq.true");
  if (error) { console.error("Profielen ophalen mislukt:", error.message); return { statusCode: 500, body: error.message }; }

  let sent = 0, skipped = 0, failed = 0;
  for (const p of profs || []) {
    if (sent >= MAX_PER_RUN) break;
    try {
      if (p.last_reminder_at && now - new Date(p.last_reminder_at).getTime() < MIN_GAP_DAYS * DAY) { skipped++; continue; }
      const { data: u } = await supabase.auth.admin.getUserById(p.id);
      const email = u?.user?.email;
      if (!email || email.endsWith("@verwijderd.nl")) { skipped++; continue; }
      const { data: last, error: eErr } = await supabase.from("entries").select("date").eq("user_id", p.id).order("date", { ascending: false }).limit(1);
      if (eErr) { failed++; console.error("Entries ophalen mislukt voor", p.id, eErr.message); continue; } // bij twijfel niet mailen
      const lastDate = last?.[0]?.date || null;
      const ref = lastDate ? new Date(String(lastDate).slice(0, 10) + "T12:00:00Z").getTime() : new Date(u.user.created_at).getTime();
      if (!isFinite(ref)) { failed++; console.error("Ongeldige datum voor", p.id, lastDate); continue; }
      const dagen = Math.floor((now - ref) / DAY);
      console.log("[reminder]", p.id, "laatste registratie:", lastDate || "geen (accountdatum gebruikt)", "->", dagen, "dagen");
      if (dagen < DAYS_INACTIVE) { skipped++; continue; }
      const unsub = SITE + "/.netlify/functions/reminder-unsub?uid=" + p.id + "&t=" + sign(p.id);
      if (dry) { console.log("[dry-run] zou mailen:", email, p.lang || "nl", dagen, "dagen"); sent++; continue; }
      const lang = p.lang === "de" ? "de" : "nl";
      await sendMail(email, TXT[lang].subject, mailHtml(p.name, dagen, unsub, lang));
      await supabase.from("profiles").update({ last_reminder_at: new Date().toISOString() }).eq("id", p.id);
      sent++;
    } catch (e) { failed++; console.error("Herinnering mislukt voor", p.id, e.message); }
  }
  console.log(`Herinneringen: verstuurd ${sent}, overgeslagen ${skipped}, mislukt ${failed}`);
  return { statusCode: 200, body: JSON.stringify({ sent, skipped, failed }) };
};

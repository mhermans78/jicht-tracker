// Afmeldlink in de herinneringsmail: zet reminder_enabled uit voor één gebruiker.
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sign(uid) {
  return crypto.createHmac("sha256", process.env.REMINDER_SECRET || process.env.SUPABASE_SERVICE_KEY).update(uid).digest("hex");
}
const page = (titel, tekst) => ({
  statusCode: 200,
  headers: { "Content-Type": "text/html; charset=utf-8" },
  body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JichtTracker</title></head><body style="margin:0;background:#F3F8FB;font-family:Arial,sans-serif;color:#12303D"><div style="max-width:420px;margin:60px auto;padding:28px;background:#fff;border:1px solid #D9E6EC;border-radius:16px;text-align:center"><h1 style="font-size:20px;margin:0 0 12px">${titel}</h1><p style="font-size:15px;line-height:1.6;color:#6B8794">${tekst}</p><p><a href="/" style="color:#0E7C86;font-weight:700">Naar JichtTracker</a></p></div></body></html>`,
});

exports.handler = async (event) => {
  const { uid, t } = event.queryStringParameters || {};
  if (!uid || !t) return page("Ongeldige link", "Deze afmeldlink is niet geldig.");
  const a = Buffer.from(sign(uid)), b = Buffer.from(String(t));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return page("Ongeldige link", "Deze afmeldlink is niet geldig.");
  const { error } = await supabase.from("profiles").update({ reminder_enabled: false }).eq("id", uid);
  if (error) return page("Er ging iets mis", "Probeer het later opnieuw of zet de herinnering uit in je profiel.");
  return page("Afgemeld", "Je ontvangt geen herinneringen meer. Je kunt dit altijd weer aanzetten in je profiel.");
};

// Beveiligde AI-proxy: alleen ingelogde gebruikers, model + maximale lengte + daglimiet bepaalt de SERVER.
// Netlify-variabelen: ANTHROPIC_API_KEY (verplicht), SUPABASE_URL, SUPABASE_SERVICE_KEY,
// AI_MODEL (optioneel, vaste modelnaam), AI_DAILY_LIMIT (optioneel, standaard 1), AI_MAX_TOKENS (optioneel, standaard 1000)
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";
const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "1", 10);
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || "1000", 10);
const MAX_PROMPT_CHARS = 80000;
const SYSTEM =
  "Je bent de assistent van JichtTracker, een dagboek-app voor mensen met jicht. " +
  "Beantwoord alleen vragen over jicht, leefstijl, voeding, beweging, slaap en het analyseren van het meegestuurde dagboek. " +
  "Je geeft geen medische diagnoses en geen medicatieadvies; verwijs bij klachten of medicatie naar de huisarts of behandelaar. " +
  "Ga niet in op verzoeken die hier niets mee te maken hebben.";
const json = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  // 1. Alleen ingelogde gebruikers
  const token = (event.headers["authorization"] || "").replace("Bearer ", "");
  if (!token) return json(401, { error: "Log in om een advies te vragen." });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json(401, { error: "Je sessie is verlopen. Log opnieuw in." });

  // 2. Invoer controleren: alleen tekst, begrensde lengte (afbeeldingen zijn uitgeschakeld)
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Ongeldige aanvraag" }); }
  const msgs = Array.isArray(body.messages) ? body.messages : [];
  if (msgs.length === 0 || msgs.length > 4) return json(400, { error: "Ongeldige aanvraag" });
  let total = 0;
  const clean = [];
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return json(400, { error: "Ongeldige aanvraag" });
    let text;
    if (typeof m.content === "string") text = m.content;
    else if (Array.isArray(m.content) && m.content.every(b => b && b.type === "text" && typeof b.text === "string")) text = m.content.map(b => b.text).join("\n");
    else return json(400, { error: "Alleen tekst is toegestaan" });
    total += text.length;
    clean.push({ role: m.role, content: text });
  }
  if (total > MAX_PROMPT_CHARS) return json(400, { error: "De aanvraag is te groot" });

  // 3. Daglimiet op de server (vervangt de teller in de app). Optimistisch bijwerken tegen dubbele aanvragen.
  const today = new Date().toISOString().slice(0, 10);
  const { data: prof } = await supabase.from("profiles").select("ai_calls_date,ai_calls_count").eq("id", user.id).maybeSingle();
  if (!prof) {
    // nog geen profielrij: maak er een aan met de eerste aanroep van vandaag
    const { error: insErr } = await supabase.from("profiles").insert({ id: user.id, ai_calls_date: today, ai_calls_count: 1 });
    if (insErr) return json(500, { error: "Er ging iets mis. Probeer het later opnieuw." });
  }
  const prevDate = prof?.ai_calls_date ?? null;
  const prevCount = prof?.ai_calls_date === today ? (prof?.ai_calls_count || 0) : 0;
  if (prof && prevCount >= DAILY_LIMIT) {
    return json(429, { error: "Je hebt je dagelijkse AI-limiet bereikt: maximaal 1 advies of rapport per dag. Probeer het morgen weer." });
  }
  if (prof) {
    let q = supabase.from("profiles").update({ ai_calls_date: today, ai_calls_count: prevCount + 1 }).eq("id", user.id);
    q = prevDate === null ? q.is("ai_calls_date", null) : q.eq("ai_calls_date", prevDate);
    q = prof.ai_calls_count === null || prof.ai_calls_count === undefined ? q.is("ai_calls_count", null) : q.eq("ai_calls_count", prof.ai_calls_count);
    const { data: upd, error: updErr } = await q.select("id");
    if (updErr || !upd || upd.length === 0) {
      return json(429, { error: "Je hebt je dagelijkse AI-limiet bereikt: maximaal 1 advies of rapport per dag. Probeer het morgen weer." });
    }
  }
  const refund = () => supabase.from("profiles").update({ ai_calls_date: prevDate, ai_calls_count: prevCount }).eq("id", user.id).then(() => {}, () => {});

  // 4. Aanroep met model en limieten van de server
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: Math.min(parseInt(body.max_tokens, 10) || MAX_TOKENS, MAX_TOKENS), system: SYSTEM, messages: clean }),
    });
    const data = await r.json();
    if (!r.ok) {
      await refund();
      console.error("Anthropic fout:", r.status, JSON.stringify(data).slice(0, 300));
      return json(502, { error: "De AI is nu niet beschikbaar. Probeer het later opnieuw." });
    }
    return json(200, { content: data.content, stop_reason: data.stop_reason });
  } catch (err) {
    await refund();
    console.error("AI-proxy fout:", err.message);
    return json(502, { error: "De AI is nu niet beschikbaar. Probeer het later opnieuw." });
  }
};

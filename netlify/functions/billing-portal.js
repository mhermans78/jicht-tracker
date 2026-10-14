// Stripe-klantportaal: de ingelogde gebruiker beheert zijn abonnement (opzeggen, betaalmethode, facturen).
// Vereist in Stripe: Instellingen -> Billing -> Klantportaal activeren (live-modus).
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SITE = (process.env.SITE_URL || "https://jichttracker.nl").replace(/\/$/, "");
const json = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const token = (event.headers["authorization"] || "").replace("Bearer ", "");
  if (!token) return json(401, { error: "Geen token" });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json(401, { error: "Ongeldig token" });

  const { data: prof } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  let customerId = prof?.stripe_customer_id;
  if (!customerId && user.email) {
    // vangnet: zoek de klant in Stripe op e-mailadres
    const found = await stripe.customers.list({ email: user.email, limit: 1 });
    customerId = found.data[0]?.id;
  }
  if (!customerId) return json(404, { error: "Geen abonnement gevonden" });

  try {
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: SITE });
    return json(200, { url: portal.url });
  } catch (e) {
    console.error("Klantportaal mislukt:", e.message);
    return json(500, { error: "Klantportaal niet beschikbaar" });
  }
};

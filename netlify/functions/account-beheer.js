const { createClient } = require("@supabase/supabase-js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const authHeader = event.headers["authorization"];
  if (!authHeader) return { statusCode: 401, body: "Geen token" };
  const token = authHeader.replace("Bearer ", "");

  // Verifieer token en haal gebruiker op
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { statusCode: 401, body: "Ongeldig token" };

  const { actie } = JSON.parse(event.body || "{}");

  // ── Wachtwoord wijzigen ──────────────────────────────────────────────────
  if (actie === "wachtwoord") {
    const { nieuwWachtwoord } = JSON.parse(event.body);
    if (!nieuwWachtwoord || nieuwWachtwoord.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ error: "Wachtwoord moet minimaal 6 tekens zijn" }) };
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: nieuwWachtwoord
    });
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // ── Account verwijderen + anonimiseren ───────────────────────────────────
  if (actie === "verwijder") {
    const anoniemEmail = "anoniem-" + user.id + "@verwijderd.nl";

    // 0. Stop eerst een lopend Stripe-abonnement (ook tijdens de proefperiode), anders blijft de klant betalen
    try {
      const { data: sp } = await supabase.from("profiles").select("stripe_subscription_id,stripe_customer_id").eq("id", user.id).maybeSingle();
      const ids = new Set();
      if (sp?.stripe_subscription_id) ids.add(sp.stripe_subscription_id);
      if (sp?.stripe_customer_id) {
        const subs = await stripe.subscriptions.list({ customer: sp.stripe_customer_id, status: "all", limit: 20 });
        for (const sub of subs.data) if (["active", "trialing", "past_due", "unpaid"].includes(sub.status)) ids.add(sub.id);
      }
      for (const id of ids) {
        try { await stripe.subscriptions.cancel(id); }
        catch (e) { if (!/No such subscription|already been canceled/i.test(e.message)) throw e; }
      }
    } catch (e) {
      console.error("Abonnement stopzetten mislukt:", e.message);
      return { statusCode: 500, body: JSON.stringify({ error: "Je abonnement kon niet worden stopgezet. Je account is niet verwijderd. Probeer het later opnieuw of neem contact op." }) };
    }

    // 1. Anonimiseer profiel
    await supabase.from("profiles").update({
      name: null,
      photo: null,
      meds: []
    }).eq("id", user.id);

    // 2. Anonimiseer e-mail in auth
    await supabase.auth.admin.updateUserById(user.id, {
      email: anoniemEmail
    });

    // 3. Verwijder auth account
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 400, body: "Onbekende actie" };
};

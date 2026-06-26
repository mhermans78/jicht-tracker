const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook verificatie mislukt:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const customerEmail = session.customer_details?.email;
    const subscriptionId = session.subscription;
    const priceId = session.line_items?.data?.[0]?.price?.id;

    // Bepaal plan duur op basis van price
    // Maandelijks of jaarlijks — beide zijn 'pro'
    const planExpiry = new Date();
    if (session.mode === "subscription") {
      // Haal subscription op voor exacte vervaldatum
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      planExpiry.setTime(subscription.current_period_end * 1000);
    }

    // Zoek gebruiker op via email in Supabase Auth
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Fout bij ophalen users:", userError);
      return { statusCode: 500, body: "Database fout" };
    }

    const user = users.users.find(u => u.email === customerEmail);
    if (!user) {
      console.error("Gebruiker niet gevonden voor email:", customerEmail);
      return { statusCode: 404, body: "Gebruiker niet gevonden" };
    }

    // Update plan naar pro in profiles tabel
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: "pro",
        plan_expiry: planExpiry.toISOString(),
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Fout bij updaten profiel:", updateError);
      return { statusCode: 500, body: "Update mislukt" };
    }

    console.log(`✅ Pro geactiveerd voor ${customerEmail}`);
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    // Abonnement opgezegd — plan terugzetten naar free
    const subscription = stripeEvent.data.object;
    const customerId = subscription.customer;

    const { error } = await supabase
      .from("profiles")
      .update({ plan: "free", plan_expiry: null })
      .eq("stripe_customer_id", customerId);

    if (error) console.error("Fout bij downgraden:", error);
    else console.log(`↩️ Plan teruggezet naar free voor customer ${customerId}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

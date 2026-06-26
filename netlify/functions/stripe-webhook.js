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
    const customerId = session.customer;

    console.log("Betaling ontvangen voor:", customerEmail);

    // Bepaal vervaldatum
    let planExpiry = null;
    try {
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.current_period_end) {
          planExpiry = new Date(subscription.current_period_end * 1000).toISOString();
        }
      }
    } catch (err) {
      console.error("Kon subscription niet ophalen:", err.message);
    }

    // Zoek gebruiker op via email
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Fout bij ophalen users:", userError);
      return { statusCode: 500, body: "Database fout" };
    }

    const user = usersData.users.find(u => u.email === customerEmail);
    if (!user) {
      console.error("Gebruiker niet gevonden voor email:", customerEmail);
      return { statusCode: 404, body: "Gebruiker niet gevonden" };
    }

    // Update plan naar pro
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: "pro",
        plan_expiry: planExpiry,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Fout bij updaten profiel:", updateError);
      return { statusCode: 500, body: "Update mislukt" };
    }

    console.log("Pro geactiveerd voor:", customerEmail);
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    const subscription = stripeEvent.data.object;
    const customerId = subscription.customer;

    const { error } = await supabase
      .from("profiles")
      .update({ plan: "free", plan_expiry: null })
      .eq("stripe_customer_id", customerId);

    if (error) console.error("Fout bij downgraden:", error);
    else console.log("Plan teruggezet naar free voor customer:", customerId);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
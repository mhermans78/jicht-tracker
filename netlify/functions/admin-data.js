// netlify/functions/admin-data.js
// Proxy voor admin dashboard — gebruikt service role key

const SUPABASE_URL = "https://vblvtkykrcgjaovhqqlg.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN || "jicht-admin-2026";

async function query(path) {
  const r = await fetch(SUPABASE_URL + "/rest/v1" + path, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
    },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  // Simple token check
  const auth = event.headers["authorization"] || "";
  if (auth !== "Bearer " + ADMIN_TOKEN) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const [profiles, entries] = await Promise.all([
      query("/profiles?select=id,created_at,plan"),
      query("/entries?select=user_id,date&order=date.desc&limit=5000"),
    ]);

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const MN = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

    const newThis  = profiles.filter(p => p.created_at?.startsWith(thisMonth)).length;
    const newPrev  = profiles.filter(p => p.created_at?.startsWith(prevMonth)).length;
    const proCount = profiles.filter(p => p.plan === "pro").length;
    const freeCount= profiles.length - proCount;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 3);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const activeIds = new Set(entries.filter(e => e.date >= cutoffStr).map(e => e.user_id));

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = d.toISOString().slice(0, 7);
      return { label: MN[d.getMonth()], count: profiles.filter(p => p.created_at?.startsWith(key)).length };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total:     profiles.length,
        newThis,
        newPrev,
        growth:    newPrev > 0 ? Math.round((newThis / newPrev - 1) * 100) : null,
        proCount,
        freeCount,
        active:    activeIds.size,
        inactive:  profiles.length - activeIds.size,
        months,
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

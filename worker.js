/**
 * RBX404 — optional Telegram proxy (Cloudflare Worker)
 * ---------------------------------------------------------
 * Keeps the bot token out of the public HTML.
 *
 * Deploy:
 *   1. Create a Worker at https://workers.cloudflare.com (free plan is fine)
 *   2. Bind these variables (Settings → Variables and Secrets):
 *        BOT_TOKEN       = 123456789:AAH...        (secret)
 *        CHAT_ID         = 123456789               (secret)
 *        ALLOWED_ORIGIN  = https://your-site.com   (optional, recommended)
 *   3. Paste this file into the Worker editor and deploy.
 *   4. In app.js set:
 *        botToken: "",
 *        chatId:   "123456789",
 *        proxyUrl: "https://<worker-name>.<subdomain>.workers.dev"
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";

    const cors = {
      "Access-Control-Allow-Origin": allowed === "*" ? "*" : allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ ok: false, description: "POST only" }, 405, cors);
    }

    if (allowed !== "*" && origin !== allowed) {
      return json({ ok: false, description: "Origin not allowed" }, 403, cors);
    }

    if (!env.BOT_TOKEN || !env.CHAT_ID) {
      return json({ ok: false, description: "Worker is missing BOT_TOKEN or CHAT_ID" }, 500, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, description: "Invalid JSON" }, 400, cors);
    }

    let text = typeof payload?.text === "string" ? payload.text : "";
    if (!text || text.length > 4000) {
      return json({ ok: false, description: "Missing or oversized text" }, 400, cors);
    }

    // On Cloudflare the real client IP is available without a third-party lookup.
    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp && !text.includes("<b>IP:</b>")) {
      const cf = request.cf || {};
      const place = [cf.city, cf.region, cf.country].filter(Boolean).join(", ");
      text += `\n📍 <b>IP:</b> ${escapeHtml(clientIp)}${place ? " — " + escapeHtml(place) : ""}`;
    }

    // Use the chat id from the Worker secret, never from the client.
    const tg = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      }
    );

    const body = await tg.text();
    return new Response(body, {
      status: tg.status,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

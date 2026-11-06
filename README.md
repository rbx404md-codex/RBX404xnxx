# CyberAware 🛡️

A mobile-first cybersecurity learning site: 9 short lessons, a 7-question
phishing quiz, a private password lab, and **a Telegram notification each time
someone opens the site**.

Everything runs in the browser. No build step, no dependencies.

```
cyberaware/
├── index.html   the page
├── styles.css   mobile-first styling
├── app.js       lessons, quiz, password lab + Telegram notifier
├── worker.js    optional secure proxy for the bot token
└── README.md
```

## 1. See it

Open `index.html` in a phone browser, or host the folder (GitHub Pages,
Netlify Drop, Cloudflare Pages, or any static host).

## 2. Connect your Telegram bot (2 minutes)

**a. Create a bot**

1. Open Telegram and message **@BotFather**.
2. Send `/newbot`, pick a name and a username.
3. Copy the token it gives you — looks like `123456789:AAH...`.

**b. Get your chat ID**

1. Open your new bot and send it any message (e.g. `hi`).
2. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
3. Find `"chat":{"id":123456789,...}` — that number is your chat ID.

**c. Paste both values into `app.js`**

At the top of `app.js`:

```js
const TELEGRAM = {
  enabled: true,
  botToken: "123456789:AAH...",
  chatId: "123456789",
  proxyUrl: "",
  cooldownSeconds: 60,
  notifyOnEveryVisit: true,
  repeatWhileOpen: true,
  lookupIp: true
};
```

**d. Test it**

Open `index.html?test=1` (or `https://your-site.com/?test=1`) and confirm the
message arrives in Telegram. The toast on the page tells you if something failed.

After that, the page sends a notification **on load and then again every
`cooldownSeconds` while it stays open** (`repeatWhileOpen: true`). Set
`cooldownSeconds: 10` and you get a message every 10 seconds; set
`repeatWhileOpen: false` to alert only on page loads.

Every message is **exactly this fixed ASCII log box** — no extra text, no screen
size, no page URL and no referrer URL:

```
╭─[ CYBERAWARE // LOG ]
│
├─ EVENT    :: NEW_VISITOR
├─ DATE     :: 2026-11-06
├─ TIME     :: 10:55 AM
├─ DEVICE   :: Redmi Note 8
├─ PLATFORM :: Android 16
├─ BROWSER  :: Chrome
├─ LOCALE   :: en-US
│
├─ NETWORK
│  ├─ IP    :: 103.191.174.192
│  ├─ GEO   :: Bogura, BD
│  └─ ISP   :: M/s. Chesta
│
├─ SESSION
│  ├─ PAGE  :: CyberAware
│  ├─ SOURCE:: Direct
│  ├─ USER  :: First Visit
│  ├─ LEARN :: 0/9 Lessons
│  └─ MODE  :: LIVE
│
╰─[ SYSTEM : MONITORING ]
```

Fields: `SOURCE` is `Direct` or the referring hostname; `PAGE` is always the site
name; `USER` is `First Visit` / `Returning`; `MODE` is `LIVE` / `TEST`. Repeat
messages keep the exact same box and only change `EVENT` to `SESSION_ALIVE`.

**How the IP is found:** in static mode the page asks `ipinfo.io` (falling back to
`ipwho.is`, then `ipify.org` for the bare IP) — these are the only third-party
requests besides Telegram. In Worker mode, Cloudflare supplies the real IP via
`CF-Connecting-IP`, with no third party. Set `lookupIp: false` to disable the
lookup completely.

**How the phone name is found:** browsers do not expose the custom device name you
set in Settings. On Android/Chromium the page reads the model via UA Client Hints
(e.g. `Pixel 7`, `SM-G991B`); otherwise it falls back to parsing the user agent
(`iPhone`, `Windows PC`, …). iOS never reveals the exact model.

## 3. ⚠️ About the token

This is a static site, so a token pasted into `app.js` **is visible to anyone who
views the page source**. That is usually fine for a personal/demo page, but
anyone with the token can send messages as your bot, and Telegram can rate-limit
or revoke it.

For a public site, use the proxy in `worker.js`:

1. Deploy it as a Cloudflare Worker (free plan).
2. Add secrets `BOT_TOKEN` and `CHAT_ID`, optionally `ALLOWED_ORIGIN`.
3. In `app.js`, set `proxyUrl` to the Worker URL and leave `botToken` empty.

The token then never reaches the browser.

## 4. Customise

- **Lessons** live in `index.html` — copy an `<article class="lesson">` block.
- **Quiz questions** are the `QUIZ` array in `app.js`.
- **Tips** are the `TIPS` array in `app.js`.
- **Colours** are CSS variables at the top of `styles.css`.
- **Cooldown / every visit** are in the `TELEGRAM` object.

When you add or remove a lesson, update the hard-coded `0 / 9 learned` text in
`index.html` — the counter recalculates itself after load, but the placeholder is
what shows before JavaScript runs.

## Notes

- Progress is stored in `localStorage`. `cooldownSeconds` controls both the gap
  between page-load alerts and the live repeat interval. Keep it at **2 seconds
  or more** — Telegram allows roughly one message per second per chat, and
  mobile browsers throttle timers in background tabs (often to once a minute),
  so exact seconds are only guaranteed while the page is in the foreground.
  The page sends nothing when closed — for true background alerts you need Web
  Push with a service worker and a backend.
- The password lab never sends the password anywhere — it only feeds the local
  meter. Test it with the browser's network tab open.
- The IP lookup shares the visitor's IP with `ipinfo.io` (or its fallbacks
  `ipwho.is` / `ipify.org`). That is expected for a visitor-notification feature,
  but you should mention it on a public site. With the Worker, Cloudflare provides
  the IP instead.
- Content is general educational guidance, not professional security advice.
- The bot API allows cross-origin `POST` with form-encoded bodies, which is why
  this works with no backend. `OPTIONS` is not implemented by Telegram, so the
  notifier deliberately avoids JSON / custom headers in direct mode.

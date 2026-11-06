/* =========================================================
   CyberAware — app logic
   ---------------------------------------------------------
   Everything except the optional Telegram notification runs
   locally in the browser.
   ========================================================= */

const TELEGRAM = {
  enabled: true,
  botToken: "8815029020:AAGCPaEh2z0AFQp6gqvoUSBjx-fOato9kxI", // enter your BOT API
  chatId: "7294948308",     // enter your TG chat ID
  proxyUrl: "",                          // optional, e.g. "https://cyberaware-bot.you.workers.dev"
  cooldownSeconds: 30,                   // notify you again every N seconds while the page is open
  notifyOnEveryVisit: true,              // false = page-load alert only once per session
  repeatWhileOpen: true,                 // keep sending every cooldownSeconds while open
  lookupIp: true                         // public IP lookup (ipinfo.io) — set false to skip
};

/* --------------------------------------------------------- */

const STORE_KEY = "cyberaware.v1";
const LAST_NOTIFY_KEY = "cyberaware.lastNotify";
const SEEN_KEY = "cyberaware.seen";

const params = new URLSearchParams(location.search);
const testMode = params.has("test");
const debugMode = testMode || params.has("debug");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* -------------------------- state ------------------------- */

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return {
      done: Array.isArray(raw.done) ? raw.done : [],
      best: Number.isFinite(raw.best) ? raw.best : 0
    };
  } catch {
    return { done: [], best: 0 };
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage disabled — the site still works */
  }
}

/* -------------------------- toast ------------------------- */

let toastTimer;
function toast(message, kind = "ok", ms = 4800) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

/* ------------------------- progress ----------------------- */

const lessonEls = $$(".lesson");

function renderProgress() {
  const total = lessonEls.length;
  const done = state.done.filter(id => lessonEls.some(l => l.dataset.lesson === id)).length;

  $("#progressText").textContent = `${done} / ${total} learned`;
  $("#progressBar").style.width = `${total ? (done / total) * 100 : 0}%`;

  lessonEls.forEach(card => {
    const id = card.dataset.lesson;
    const isDone = state.done.includes(id);
    card.classList.toggle("is-done", isDone);
    const btn = $('[data-done="' + id + '"]', card);
    if (btn) {
      btn.textContent = isDone ? "Learned ✓" : "Mark as learned";
      btn.setAttribute("aria-pressed", String(isDone));
    }
  });
}

/* ------------------------- accordion ---------------------- */

$$(".lesson-head").forEach(head => {
  head.addEventListener("click", () => {
    const body = document.getElementById(head.getAttribute("aria-controls"));
    const isOpen = head.getAttribute("aria-expanded") === "true";
    head.setAttribute("aria-expanded", String(!isOpen));
    if (body) body.hidden = isOpen;
  });
});

/* ---------------------- mark as learned ------------------- */

$$("[data-done]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.done;
    if (state.done.includes(id)) {
      state.done = state.done.filter(x => x !== id);
      toast("Marked as not learned. You can revisit it anytime.");
    } else {
      state.done.push(id);
      const done = state.done.length;
      toast(`Lesson saved — ${done} of ${lessonEls.length} complete.`);
    }
    saveState();
    renderProgress();
  });
});

/* ------------------------- filters ------------------------ */

$$(".chip[data-filter]").forEach(chip => {
  chip.addEventListener("click", () => {
    $$(".chip[data-filter]").forEach(c => c.classList.toggle("is-active", c === chip));
    const filter = chip.dataset.filter;
    lessonEls.forEach(card => {
      const show = filter === "all" || card.dataset.cat === filter;
      card.hidden = !show;
    });
  });
});

/* --------------------------- tips ------------------------- */

const TIPS = [
  "Long-press a link on your phone to preview where it really goes before tapping.",
  "Your email account can reset every other password. Give it the strongest password and 2FA you have.",
  "A bank will never ask for your OTP, PIN or card CVV — not by call, SMS or chat.",
  "Turn on “Find My Device”. It locates a lost phone and can wipe it remotely.",
  "Check haveibeenpwned.com once in a while; change any password that shows up in a breach.",
  "Public charging cables can carry data. Use your own charger and a power-only cable.",
  "Screenshot your recovery codes and store them in a password manager — not in your gallery.",
  "If an app asks for SMS or accessibility access and it is not an accessibility tool, say no.",
  "Update your phone tonight. Most exploits target bugs that were fixed months ago.",
  "When in doubt, hang up and call the organisation back on the number from its official app.",
  "Use a SIM PIN. It makes SIM-swap attacks slower and noisier.",
  "Back up once, then test a restore. A backup you have never restored is only a rumour."
];

let tipIndex = Math.floor(Math.random() * TIPS.length);
function showTip() {
  $("#tipText").textContent = TIPS[tipIndex % TIPS.length];
  tipIndex++;
}
showTip();
$("#tipNext").addEventListener("click", showTip);

/* --------------------------- quiz ------------------------- */

const QUIZ = [
  {
    q: "An SMS says your card is blocked and asks you to “verify” at a link. What is the safest move?",
    a: [
      "Tap the link quickly — the card may be blocked",
      "Reply “STOP” to cancel the block",
      "Open your bank's app yourself, or call the number on your card",
      "Forward it to a friend to check if it is real"
    ],
    correct: 2,
    why: "Never use contact details or links from the message itself. Open the official app or call the number printed on your card."
  },
  {
    q: "Why is reusing one password across sites so dangerous?",
    a: [
      "It makes websites load slower",
      "One breached site lets attackers try the same login everywhere",
      "Browsers refuse to save reused passwords",
      "It uses more mobile data"
    ],
    correct: 1,
    why: "Attackers call this “credential stuffing”: leaked email/password pairs are replayed against banks, email and social accounts automatically."
  },
  {
    q: "Someone claiming to be support asks for the 6-digit code you just received. What do you do?",
    a: [
      "Read it out — they are from support",
      "Read only the first three digits",
      "Never share it, hang up, and contact support through the official app",
      "Send it by SMS instead of saying it aloud"
    ],
    correct: 2,
    why: "That code is the second factor protecting you. Anyone who asks for it is trying to log in as you. There are no exceptions."
  },
  {
    q: "You need to check your bank balance while on café Wi-Fi. What is the safest option?",
    a: [
      "Use the café Wi-Fi — the padlock icon makes it safe",
      "Turn on mobile data or a trusted VPN",
      "Use the Wi-Fi but log out afterwards",
      "Use the Wi-Fi and clear your browser history"
    ],
    correct: 1,
    why: "HTTPS protects the connection, but a fake hotspot can still redirect you to a convincing fake page. Mobile data avoids the middleman."
  },
  {
    q: "A free flashlight app asks for SMS and contacts access. What is the best response?",
    a: [
      "Allow it — permissions are only for the app's features",
      "Deny it and choose an app that does not need those permissions",
      "Allow it once and revoke it later",
      "Install it from a third-party site to avoid the permission prompt"
    ],
    correct: 1,
    why: "A flashlight has no reason to read messages or contacts. Excessive permissions are a classic sign of adware or spyware."
  },
  {
    q: "Which backup setup actually survives ransomware and a stolen phone?",
    a: [
      "One copy in the phone's gallery",
      "One cloud copy that syncs instantly",
      "Three copies, on two kinds of media, with one kept off-site and offline",
      "Screenshots of important files in a chat app"
    ],
    correct: 2,
    why: "This is the 3-2-1 rule. An offline copy cannot be encrypted by ransomware or erased along with a lost device."
  },
  {
    q: "You get 2FA login prompts you did not trigger, again and again. What should you do?",
    a: [
      "Approve one to stop the prompts",
      "Ignore them and wait for them to stop",
      "Change that account's password, revoke sessions and keep 2FA on",
      "Turn off 2FA so nobody can trigger prompts"
    ],
    correct: 2,
    why: "Repeated prompts mean someone already has your password. Approving one completes their login; turning 2FA off removes your last lock."
  }
];

let qIndex = 0;
let qScore = 0;
let answered = false;

function startQuiz() {
  qIndex = 0;
  qScore = 0;
  answered = false;
  $("#quizPlay").hidden = false;
  $("#quizResult").hidden = true;
  renderQuestion();
}

function renderQuestion() {
  answered = false;
  const item = QUIZ[qIndex];

  $("#quizStep").textContent = `Question ${qIndex + 1} of ${QUIZ.length}`;
  $("#quizScore").textContent = `Score ${qScore}`;
  $("#quizBar").style.width = `${(qIndex / QUIZ.length) * 100}%`;
  $("#quizQuestion").textContent = item.q;

  const box = $("#quizOptions");
  box.innerHTML = "";

  item.a.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.i = String(i);

    const key = document.createElement("span");
    key.className = "key";
    key.textContent = String.fromCharCode(65 + i);

    const label = document.createElement("span");
    label.textContent = text;

    btn.append(key, label);
    btn.addEventListener("click", () => chooseAnswer(i));
    box.appendChild(btn);
  });

  const fb = $("#quizFeedback");
  fb.hidden = true;
  fb.className = "feedback";
  fb.textContent = "";
  $("#quizNext").hidden = true;
}

function chooseAnswer(index) {
  if (answered) return;
  answered = true;

  const item = QUIZ[qIndex];
  const correct = index === item.correct;

  $$("#quizOptions .option").forEach(btn => {
    const i = Number(btn.dataset.i);
    btn.disabled = true;
    if (i === item.correct) btn.classList.add("correct");
    if (i === index && !correct) btn.classList.add("wrong");
  });

  if (correct) {
    qScore++;
    $("#quizScore").textContent = `Score ${qScore}`;
  }

  const fb = $("#quizFeedback");
  fb.hidden = false;
  fb.className = "feedback" + (correct ? "" : " bad");
  fb.innerHTML = `<b>${correct ? "Correct." : "Not quite."}</b> ${item.why}`;

  const next = $("#quizNext");
  next.hidden = false;
  next.textContent = qIndex === QUIZ.length - 1 ? "See my result →" : "Next question →";
}

function nextQuestion() {
  if (!answered) return;
  qIndex++;
  if (qIndex >= QUIZ.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function finishQuiz() {
  $("#quizPlay").hidden = true;
  const result = $("#quizResult");
  result.hidden = false;

  $("#quizFinal").textContent = `${qScore} / ${QUIZ.length}`;
  $("#quizBar").style.width = "100%";

  let verdict;
  let summary;
  if (qScore === QUIZ.length) {
    verdict = "Spotless.";
    summary = "You would catch the classics. Now help someone else spot them.";
  } else if (qScore >= 5) {
    verdict = "Strong instincts.";
    summary = "A couple of gaps worth revisiting — open the lessons that cover them.";
  } else if (qScore >= 3) {
    verdict = "Getting there.";
    summary = "The basics are landing. Re-read the phishing and OTP lessons — those two stop most attacks.";
  } else {
    verdict = "Worth another pass.";
    summary = "Good news: nine short lessons can close most of these gaps. Start with passwords and phishing.";
  }
  $("#quizVerdict").textContent = verdict;
  $("#quizSummary").textContent = summary;

  if (qScore > state.best) {
    state.best = qScore;
    saveState();
    summary += " New personal best!";
    $("#quizSummary").textContent = summary;
  }
}

$("#quizNext").addEventListener("click", nextQuestion);
$("#quizRestart").addEventListener("click", startQuiz);

/* ----------------------- password lab --------------------- */

const COMMON = new Set([
  "password", "password1", "password123", "123456", "1234567", "12345678",
  "123456789", "1234567890", "qwerty", "qwerty123", "abc123", "letmein",
  "admin", "admin123", "welcome", "welcome1", "iloveyou", "monkey", "dragon",
  "football", "baseball", "sunshine", "princess", "master", "shadow",
  "superman", "michael", "trustno1", "1q2w3e4r", "000000", "111111"
]);

const SEQUENCES = ["1234", "12345", "123456", "qwerty", "asdf", "abcdef", "password", "1111", "0000", "654321"];

const WORDS = [
  "amber", "anchor", "apricot", "basil", "beacon", "canyon", "cedar", "cobalt",
  "comet", "copper", "coral", "cricket", "delta", "ember", "falcon", "fern",
  "flint", "galaxy", "garnet", "glacier", "harbor", "hazel", "indigo", "ivory",
  "jade", "juniper", "kettle", "lantern", "lily", "lunar", "maple", "meadow",
  "meteor", "mint", "nebula", "nickel", "oak", "onyx", "orbit", "pebble",
  "pepper", "pilot", "quartz", "quill", "raven", "river", "saffron", "silver",
  "solar", "spice", "storm", "summit", "thunder", "tiger", "tulip", "umber",
  "velvet", "violet", "walnut", "willow", "zephyr", "aurora", "birch", "breeze"
];

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+?";

function randInt(n) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % n;
}

function randomChars(length = 18) {
  let out = "";
  for (let i = 0; i < length; i++) out += CHARSET[randInt(CHARSET.length)];
  return out;
}

function randomPassphrase() {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const w = WORDS[randInt(WORDS.length)];
    parts.push(w[0].toUpperCase() + w.slice(1));
  }
  return parts.join("-") + "-" + String(10 + randInt(90)) + "!";
}

function analyze(pw) {
  const len = pw.length;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;

  let bits = len ? len * Math.log2(pool || 1) : 0;
  const lower = pw.toLowerCase();

  const isCommon = COMMON.has(lower);
  const hasSequence = SEQUENCES.some(s => lower.includes(s));
  const isRepeat = /^(.)\1+$/.test(pw);

  if (isCommon) bits = Math.min(bits, 10);
  if (isRepeat) bits = Math.min(bits, 8);
  if (hasSequence) bits *= 0.7;

  // A passphrase looks strong to a character-pool estimate, but if every
  // alphabetic chunk is a dictionary word its real search space is far smaller.
  const chunks = lower.split(/[^a-z]+/).filter(Boolean);
  const dictChunks = chunks.filter(c => WORDS.includes(c)).length;
  if (chunks.length >= 3 && dictChunks === chunks.length && len >= 16) {
    bits = chunks.length * Math.log2(WORDS.length) + Math.log2(90) + 5;
  }

  return {
    len,
    bits,
    checks: {
      length: len >= 12,
      case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
      symbol: /[^A-Za-z0-9]/.test(pw),
      common: len > 0 && !isCommon,
      sequence: len > 0 && !hasSequence
    }
  };
}

function humanCrackTime(bits) {
  if (!bits) return "—";
  const seconds = Math.pow(2, bits) / 2 / 1e10; // ~10 billion guesses/sec
  if (!isFinite(seconds) || seconds > 3.15e9) return "100+ years";
  if (seconds < 1) return "instantly";

  const units = [
    [31557600, "year"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"]
  ];
  for (const [size, name] of units) {
    if (seconds >= size) {
      const value = Math.round(seconds / size);
      return `${value.toLocaleString()} ${name}${value === 1 ? "" : "s"}`;
    }
  }
  return "instantly";
}

function strengthLabel(bits) {
  if (!bits) return "—";
  if (bits < 28) return "Very weak";
  if (bits < 40) return "Weak";
  if (bits < 60) return "Reasonable";
  if (bits < 80) return "Strong";
  return "Excellent";
}

function strengthColor(bits) {
  if (!bits) return "#fb7185";
  if (bits < 28) return "#fb7185";
  if (bits < 40) return "#fbbf24";
  if (bits < 60) return "#22d3ee";
  if (bits < 80) return "#34d399";
  return "#a78bfa";
}

function renderPassword() {
  const input = $("#pwInput");
  const pw = input.value;
  const result = analyze(pw);
  const meter = $("#pwMeter");
  const label = strengthLabel(result.bits);

  meter.style.width = `${Math.min(100, (result.bits / 90) * 100)}%`;
  meter.style.background = strengthColor(result.bits);
  $("#pwMeterText").innerHTML = `Strength: <b>${label}</b>`;
  $("#pwTime").textContent = humanCrackTime(result.bits);

  Object.entries(result.checks).forEach(([key, ok]) => {
    const row = $(`.pw-check[data-check="${key}"]`);
    if (row) row.classList.toggle("ok", ok);
  });
}

function setPassword(value) {
  const input = $("#pwInput");
  input.value = value;
  input.type = "text";
  $("#pwToggle").setAttribute("aria-pressed", "true");
  $("#pwToggle").setAttribute("aria-label", "Hide password");
  $("#pwToggle").textContent = "🙈";
  renderPassword();
  input.focus();
  input.setSelectionRange(0, value.length);
}

$("#pwInput").addEventListener("input", renderPassword);

$("#pwToggle").addEventListener("click", () => {
  const input = $("#pwInput");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  const btn = $("#pwToggle");
  btn.setAttribute("aria-pressed", String(show));
  btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  btn.textContent = show ? "🙈" : "👁";
});

$("#genChars").addEventListener("click", () => {
  setPassword(randomChars());
  toast("Generated an 18-character random password. Save it in your password manager.", "ok");
});

$("#genWords").addEventListener("click", () => {
  setPassword(randomPassphrase());
  toast("Passphrase generated — easy to type. It is memorable, not bulletproof: pair it with 2FA.", "ok");
});

/* ---------------------- reset / scroll -------------------- */

$("#resetProgress").addEventListener("click", () => {
  if (!confirm("Reset all lesson progress and your quiz best score?")) return;
  state = { done: [], best: 0 };
  saveState();
  renderProgress();
  toast("Progress reset.");
});

$("#backTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* -------------------- scroll reveal ----------------------- */

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

  $$(".section-head, .tip-card, .quiz-card, .tools-card").forEach(el => {
    el.classList.add("reveal");
    io.observe(el);
  });

  // Safety net: never leave content invisible if the observer misbehaves.
  setTimeout(() => $$(".reveal").forEach(el => el.classList.add("in")), 2500);
}

/* =========================================================
   Telegram notification — "someone opened the site"
   ========================================================= */

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function sessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

function localGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function localSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function describeDevice(ua) {
  let os = "Unknown OS";
  let m;
  if ((m = /Android\s([\d.]+)/.exec(ua))) os = `Android ${m[1]}`;
  else if ((m = /iPhone OS ([\d_]+)/.exec(ua))) os = `iOS ${m[1].replace(/_/g, ".")}`;
  else if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Unknown browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";

  return { os, browser };
}

async function fetchJson(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function lookupIP() {
  const cached = sessionGet("cyberaware.ip.v2");
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore bad cache */ }
  }

  let info = null;

  // 1) ipinfo.io — city/country/ISP, tolerant free tier
  try {
    const d = await fetchJson("https://ipinfo.io/json", 3500);
    if (d && d.ip) {
      info = {
        ip: d.ip,
        city: d.city || "",
        country: d.country || "",
        isp: d.org ? d.org.replace(/^AS\d+\s+/, "") : ""
      };
    }
  } catch { /* try the next service */ }

  // 2) ipwho.is — richer but frequently rate-limited
  if (!info) {
    try {
      const d = await fetchJson("https://ipwho.is/", 3000);
      if (d && d.ip && d.success !== false) {
        info = {
          ip: d.ip,
          city: d.city || "",
          country: d.country_code || "",
          isp: (d.connection && d.connection.isp) || ""
        };
      }
    } catch { /* try the next service */ }
  }

  // 3) ipify — IP only, very reliable
  if (!info) {
    try {
      const d = await fetchJson("https://api.ipify.org?format=json", 2500);
      if (d && d.ip) info = { ip: d.ip, city: "", country: "", isp: "" };
    } catch { /* unavailable */ }
  }

  if (info) sessionSet("cyberaware.ip.v2", JSON.stringify(info));
  return info;
}

async function getDeviceModel() {
  const ua = navigator.userAgent;
  let model = "";

  // Chromium on Android can expose the real model name (Pixel 7, SM-G991B…).
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === "function") {
      const hints = await navigator.userAgentData.getHighEntropyValues(["model"]);
      if (hints && hints.model) model = hints.model;
    }
  } catch { /* permission or support issue — fall back to the UA string */ }

  if (!model) {
    const m = /Android\s[\d.]+;\s*([^;)]+?)(?:\s+Build|\))/.exec(ua);
    if (m) model = m[1].trim();
  }

  if (!model) {
    if (/iPhone/.test(ua)) model = "iPhone";
    else if (/iPad/.test(ua)) model = "iPad";
    else if (/Windows NT 10/.test(ua)) model = "Windows PC";
    else if (/Macintosh/.test(ua)) model = "Mac";
    else if (/Linux/.test(ua)) model = "Linux device";
  }

  // Some Android builds send placeholders like "K" or "wv".
  if (/^(k|wv)$/i.test(model)) model = "";
  return model || "unknown model";
}

const FIRST_VISIT = localGet(SEEN_KEY) !== "1";
let notifyInFlight = false;
let notifyTimer = null;

function sourceLabel() {
  if (!document.referrer) return "Direct";
  try {
    const url = new URL(document.referrer);
    if (url.origin === location.origin) return "Direct";
    return url.hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Direct";
  }
}

async function buildVisitMessage(reason = "visit") {
  const isRepeat = reason === "repeat";
  const { os, browser } = describeDevice(navigator.userAgent);
  const [model, ipInfo] = await Promise.all([
    getDeviceModel(),
    TELEGRAM.lookupIp ? lookupIP() : Promise.resolve(null)
  ]);

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const hour12 = now.getHours() % 12 || 12;
  const time = `${pad(hour12)}:${pad(now.getMinutes())} ${now.getHours() >= 12 ? "PM" : "AM"}`;

  const done = state.done.filter(id => lessonEls.some(l => l.dataset.lesson === id)).length;
  const geo = ipInfo && (ipInfo.city || ipInfo.country)
    ? [ipInfo.city, ipInfo.country].filter(Boolean).join(", ")
    : "Unavailable";

  const lines = [
    "╭─[ CYBERAWARE // LOG ]",
    "│",
    `├─ EVENT    :: ${isRepeat ? "SESSION_ALIVE" : "NEW_VISITOR"}`,
    `├─ DATE     :: ${date}`,
    `├─ TIME     :: ${time}`,
    `├─ DEVICE   :: ${model === "unknown model" ? "Unknown" : model}`,
    `├─ PLATFORM :: ${os}`,
    `├─ BROWSER  :: ${browser === "Unknown browser" ? "Unknown" : browser}`,
    `├─ LOCALE   :: ${navigator.language || "Unknown"}`,
    "│",
    "├─ NETWORK",
    `│  ├─ IP    :: ${ipInfo ? ipInfo.ip : "Unavailable"}`,
    `│  ├─ GEO   :: ${geo}`,
    `│  └─ ISP   :: ${ipInfo && ipInfo.isp ? ipInfo.isp : "Unavailable"}`,
    "│",
    "├─ SESSION",
    "│  ├─ PAGE  :: CyberAware",
    `│  ├─ SOURCE:: ${sourceLabel()}`,
    `│  ├─ USER  :: ${FIRST_VISIT ? "First Visit" : "Returning"}`,
    `│  ├─ LEARN :: ${done}/${lessonEls.length} Lessons`,
    `│  └─ MODE  :: ${testMode ? "TEST" : "LIVE"}`,
    "│",
    "╰─[ SYSTEM : MONITORING ]"
  ];

  return `<pre>${lines.map(esc).join("\n")}</pre>`;
}

async function sendTelegram(text) {
  const useProxy = Boolean(TELEGRAM.proxyUrl);

  if (!useProxy && !/^\d{5,}:[\w-]{30,}$/.test(TELEGRAM.botToken)) {
    return { ok: false, description: "Bot token is not set yet — open app.js and paste it in." };
  }
  if (!useProxy && !/^(@[\w]{4,}|-?\d+)$/.test(String(TELEGRAM.chatId).trim())) {
    return { ok: false, description: "Chat ID is not set yet — open app.js and paste it in." };
  }
  if (!useProxy && TELEGRAM.chatId.startsWith("PASTE")) {
    return { ok: false, description: "Chat ID is not set yet." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    let response;

    if (useProxy) {
      response = await fetch(TELEGRAM.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, chatId: TELEGRAM.chatId }),
        signal: controller.signal
      });
    } else {
      // URLSearchParams keeps this a "simple" request, so no CORS preflight
      // (Telegram's API allows cross-origin requests but not OPTIONS).
      const body = new URLSearchParams({
        chat_id: TELEGRAM.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: "true"
      });
      response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: "POST",
        body,
        signal: controller.signal
      });
    }

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.ok !== false) {
      localSet(LAST_NOTIFY_KEY, String(Date.now()));
      return { ok: true };
    }
    return { ok: false, description: data.description || `HTTP ${response.status}` };
  } catch (error) {
    const reason = error.name === "AbortError" ? "request timed out" : error.message;
    return { ok: false, description: reason };
  } finally {
    clearTimeout(timer);
  }
}

async function notifyOwner(reason = "visit") {
  if (!TELEGRAM.enabled) {
    if (testMode && reason === "visit") toast("Notifications are disabled in app.js.", "err");
    return;
  }
  if (notifyInFlight) return;

  // Page-load alerts respect the cooldown and the once-per-session option.
  // Repeats are timed by scheduleRepeats(), so they skip this gate.
  if (reason === "visit") {
    const alreadyNotifiedThisSession = sessionGet("cyberaware.sessionNotified") === "1";
    if (!testMode && !TELEGRAM.notifyOnEveryVisit && alreadyNotifiedThisSession) return;

    const last = Number(localGet(LAST_NOTIFY_KEY) || 0);
    const cooldownMs = Math.max(0, Number(TELEGRAM.cooldownSeconds) || 0) * 1000;
    if (!testMode && Date.now() - last < cooldownMs) return;
  }

  notifyInFlight = true;
  try {
    const text = await buildVisitMessage(reason);
    const result = await sendTelegram(text);

    if (result.ok) {
      localSet(SEEN_KEY, "1");
      sessionSet("cyberaware.sessionNotified", "1");
      if (testMode && reason === "visit") {
        toast("Telegram test sent. Check your chat with the bot.", "ok", 6000);
      }
    } else {
      console.warn("[CyberAware] Telegram notification failed:", result.description);
      if (debugMode && reason === "visit") {
        toast("Telegram error: " + result.description, "err", 8000);
      }
    }
  } finally {
    notifyInFlight = false;
  }
}

function scheduleRepeats() {
  if (!TELEGRAM.repeatWhileOpen || !TELEGRAM.enabled) return;

  // Telegram allows roughly one message per second to a single chat.
  const seconds = Math.max(1, Number(TELEGRAM.cooldownSeconds) || 1);
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(async () => {
    await notifyOwner("repeat");
    scheduleRepeats();
  }, seconds * 1000);
}

async function startNotifications() {
  await notifyOwner("visit");
  scheduleRepeats();
}

/* ------------------------- boot --------------------------- */

renderProgress();
startQuiz();

window.addEventListener("load", () => {
  setTimeout(startNotifications, 600);
}, { once: true });

if (debugMode) {
  console.info("[CyberAware] Debug mode on. Visit ?test=1 to force a Telegram test.");
}

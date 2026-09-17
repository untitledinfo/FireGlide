/* =========================================================
   FIREGLIDE — script.js
   Vanilla JS only. Everything configurable lives in section 1.
   ========================================================= */
"use strict";

/* =========================================================
   1. CONFIGURATION
   ---------------------------------------------------------
   IMAGES — hosted on GitHub Raw, pointed at untitledinfo/FireGlide@main
   below. Change GH_USER / GH_REPO / GH_BRANCH if that ever moves. Nothing is bundled:
   the browser loads these straight from raw.githubusercontent.com.
   If a URL 404s the image hides itself and a CSS placeholder shows.
   ========================================================= */
const GH_USER   = "untitledinfo";
const GH_REPO   = "FireGlide";
const GH_BRANCH = "main";
const raw = (file) =>
  `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/assets/${file}`;

const FIREGLIDE_IMAGES = {
  logo:     raw("logo.png"),
  favicon:  raw("favicon.png"),
  hero:     raw("hero.png"),
  firepdx:  raw("firepdx.png"),
  glidux:   raw("glidux.png"),
  discord:  raw("discord.png"),
  minecraft: raw("minecraft.png"),
  roblox:    raw("roblox.png"),
  fortnite:  raw("fortnite.png"),
  valorant:  raw("valorant.png"),
  gta:       raw("gta.png"),
  cod:       raw("cod.png"),
  tournament: raw("events/tournament.png"),
  giveaway:   raw("events/giveaway.png"),
  community:  raw("events/community.png")
};

const LINKS = {
  firepdx: "https://www.youtube.com/@Firepdx",
  glidux:  "https://www.youtube.com/@Glidux",
  discord: "https://discord.gg/zVZvjDcu"
};

/* ---------------------------------------------------------
   YOUTUBE — live uploads, shorts and streams
   ---------------------------------------------------------
   endpoint : your own serverless function. The API key lives there,
              never in this file. A ready-made one ships in api/youtube.js.
   apiKey   : optional. A *browser* YouTube Data API key, locked to your
              domain under "HTTP referrers" in Google Cloud Console. It is
              visible in view-source by design — that is why it must be
              referrer-restricted and must never be a bot token or a
              service-account key. Leave it empty to stay on the endpoint.
   handle   : the @handle. Channel IDs are resolved at runtime, so nothing
              has to be guessed or hardcoded.
   --------------------------------------------------------- */
const YOUTUBE = {
  endpoint: "/api/youtube",   // optional backend; also keyless (see api/youtube.js)
  maxPerChannel: 24,          // pull every recent upload + short, not just a handful
  refreshMs: 300000,          // re-check every 5 min while the tab is open — live status stays fresh
  cacheMs: 21600000,          // keep the last good list for 6 h between visits
  channels: [
    // Real channel ids, resolved once from the @handles and pinned here so the
    // page never depends on scraping YouTube to find them at runtime.
    { id: "firepdx", name: "Firepdx", handle: "@Firepdx", channelId: "UCqMhiwQeuH69NLRtEbg-SDg", accent: "#ff4d1c",
      live: "https://www.youtube.com/@Firepdx/live" },
    { id: "glidux",  name: "Glidux",  handle: "@Glidux",  channelId: "UCU7K7YkRhMtCgZSc1g_ahFg", accent: "#00d4ff",
      live: "https://www.youtube.com/@Glidux/live" }
  ]
};

/* PIPED — keyless, CORS-friendly YouTube mirrors.
   ---------------------------------------------------------
   The RSS feed carries no duration and no live flag. These public Piped API
   instances do, and they answer with permissive CORS headers, so a browser can
   read them directly with no key, no quota and no relay. Tried in order; the
   first instance that answers wins, the rest are fallback. */
const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
  "https://pipedapi.reallyaweso.me"
];

/* Backend endpoint for live Discord numbers. See README notes at the
   bottom of this file — a bot token must never live in frontend code. */
const DISCORD_ENDPOINT = "/api/discord";
const DISCORD_REFRESH_MS = 60000;

const CREATORS = [
  {
    id: "firepdx",
    name: "FIREPDX",
    role: "Gaming creator",
    accent: "#ff4d1c",
    accentSoft: "rgba(255,77,28,.22)",
    icon: "fa-fire",
    glyph: "F",
    image: FIREGLIDE_IMAGES.firepdx,
    bio: "Survival worlds, redstone chaos and long-form builds. Firepdx brings the heat and runs most of the community tournaments.",
    tags: ["Minecraft", "Builds", "Tournaments"],
    link: LINKS.firepdx
  },
  {
    id: "glidux",
    name: "GLIDUX",
    role: "Gaming creator",
    accent: "#00d4ff",
    accentSoft: "rgba(0,212,255,.22)",
    icon: "fa-bolt",
    glyph: "G",
    image: FIREGLIDE_IMAGES.glidux,
    bio: "Fast, competitive and edited to the frame. Glidux covers shooters, Roblox experiments and the shorts that pull new people in.",
    tags: ["Roblox", "Competitive", "Shorts"],
    link: LINKS.glidux
  }
];

/* Real snapshot of both channels' public RSS feeds.
   ---------------------------------------------------------
   Every entry below is a real upload: a real video id and a YouTube-hosted
   thumbnail (i.ytimg.com), not a demo placeholder. This powers the very first
   paint so the grid is never empty, and it is replaced the moment any live
   source in loadYouTube() answers. No fabricated videos anywhere on the page. */
const VIDEOS = [
  { videoId:"x-R3U8D2vqE", creator:"Firepdx", title:"then legend?",                       publishedAt:"2026-09-10T07:41:10Z", isShort:true,  views:5258 },
  { videoId:"17B7BEKkbLA", creator:"Glidux",  title:"I can't afford verity mod",           publishedAt:"2026-09-14T14:34:14Z", isShort:true,  views:2758 },
  { videoId:"gDPz2pO1epM", creator:"Glidux",  title:"when your ego is activated",          publishedAt:"2026-09-07T16:59:02Z", isShort:true,  views:1328 },
  { videoId:"MATUK_bUReM", creator:"Glidux",  title:"which is most powerful",              publishedAt:"2026-08-29T02:48:12Z", isShort:true,  views:1719 },
  { videoId:"Q9jJJSdxhtE", creator:"Glidux",  title:"BOOM SHAKALAKA",                      publishedAt:"2026-08-25T06:25:21Z", isShort:true,  views:1829 },
  { videoId:"bVvamRcJxpc", creator:"Glidux",  title:"me promoting products in free",       publishedAt:"2026-08-23T07:46:51Z", isShort:true,  views:1149 },
  { videoId:"sX6rai1BTDA", creator:"Glidux",  title:"GLIDUX EDIT",                         publishedAt:"2026-08-18T02:17:12Z", isShort:true,  views:191 },
  { videoId:"Dt6eLfIoiQo", creator:"Glidux",  title:"HOLD IT !",                           publishedAt:"2026-08-15T06:49:15Z", isShort:true,  views:1446 },
  { videoId:"_qNmzOFFgvI", creator:"Glidux",  title:"PC LOVER'S",                          publishedAt:"2026-08-10T10:22:24Z", isShort:true,  views:1509 },
  { videoId:"xPvLIyg_Gvg", creator:"Glidux",  title:"WAIT FOR LAST",                       publishedAt:"2026-08-08T06:53:22Z", isShort:true,  views:662 },
  { videoId:"FH0i-Yz76SM", creator:"Glidux",  title:"Minecraft Face Reveal",               publishedAt:"2026-08-04T09:56:38Z", isShort:false, views:21 },
  { videoId:"nhxYbTjLuiA", creator:"Glidux",  title:"POV: You are the main character",     publishedAt:"2026-08-01T13:52:02Z", isShort:true,  views:1089 },
  { videoId:"TahC5D03g3o", creator:"Glidux",  title:"why police officers so massy",        publishedAt:"2026-07-24T08:39:08Z", isShort:true,  views:533 },
  { videoId:"d6MbDocE7_g", creator:"Glidux",  title:"LOW QUALITY VERITY",                  publishedAt:"2026-07-16T10:16:53Z", isShort:false, views:272 },
  { videoId:"g5kWB6MjJuY", creator:"Glidux",  title:"MAA BANE WALA HOON?",                 publishedAt:"2026-07-14T15:52:26Z", isShort:true,  views:1240 },
  { videoId:"EghLGu0gcZQ", creator:"Glidux",  title:"I MAKE THE YOUTUBE LOGO IN MINECRAFT",publishedAt:"2026-07-11T16:01:15Z", isShort:false, views:30 }
];

/* The featured slot always shows a real video — the newest full upload, or the
   newest short if a channel has only posted shorts. It is never fabricated. */

const VIDEO_FILTERS = [
  { id:"all",       label:"All" },
  { id:"live",      label:"Live" },
  { id:"firepdx",   label:"Firepdx" },
  { id:"glidux",    label:"Glidux" },
  { id:"shorts",    label:"Shorts" },
  { id:"long",      label:"Full videos" },
  { id:"minecraft", label:"Minecraft" },
  { id:"roblox",    label:"Roblox" },
  { id:"gaming",    label:"Gaming" },
  { id:"saved",     label:"Saved" }
];

/* Dates are ISO strings. The countdown picks the next one that hasn't passed. */
const EVENTS = [
  { id:"e1", icon:"T", title:"Community tournament", date:"2026-10-04T18:00:00Z", prize:"Nitro × 5 + role", status:"open",  participants:"64 slots", link: LINKS.discord },
  { id:"e2", icon:"C", title:"Creator challenge",     date:"2026-10-18T17:00:00Z", prize:"Featured on both channels", status:"soon", participants:"Open entry", link: LINKS.discord },
  { id:"e3", icon:"B", title:"Minecraft build event", date:"2026-11-01T16:00:00Z", prize:"Server spotlight", status:"open", participants:"32 teams", link: LINKS.discord },
  { id:"e4", icon:"N", title:"Gaming night",          date:"2026-11-08T19:00:00Z", prize:"Bragging rights",  status:"open", participants:"Unlimited", link: LINKS.discord },
  { id:"e5", icon:"G", title:"Community giveaway",    date:"2026-11-22T18:00:00Z", prize:"3 game keys",      status:"soon", participants:"Members only", link: LINKS.discord }
];

const GAMES = [
  { name:"Minecraft", glyph:"M", icon:"fa-cube",           accent:"#6ee06e", activity:"Most played · events weekly", level:94, image: FIREGLIDE_IMAGES.minecraft },
  { name:"Roblox", glyph:"R",    icon:"fa-shapes",         accent:"#ff5d5d", activity:"Obbies and custom rounds",    level:81, image: FIREGLIDE_IMAGES.roblox },
  { name:"Fortnite", glyph:"F",  icon:"fa-parachute-box",  accent:"#9b6bff", activity:"Duos night every Friday",     level:68, image: FIREGLIDE_IMAGES.fortnite },
  { name:"Valorant", glyph:"V",  icon:"fa-bullseye",       accent:"#ff4d6d", activity:"Ranked stacks and scrims",    level:73, image: FIREGLIDE_IMAGES.valorant },
  { name:"GTA", glyph:"G",       icon:"fa-car-side",       accent:"#ffb03a", activity:"Roleplay and heist runs",     level:57, image: FIREGLIDE_IMAGES.gta },
  { name:"Call of Duty", glyph:"C", icon:"fa-crosshairs",  accent:"#00d4ff", activity:"Late-night lobbies",          level:64, image: FIREGLIDE_IMAGES.cod }
];

const COUNTERS = [
  { label:"Discord members", value:12400, suffix:"+" },
  { label:"YouTube creators", value:2 },
  { label:"Videos", value:340, suffix:"+" },
  { label:"Events", value:48 },
  { label:"Staff", value:14 },
  { label:"Countries", value:37 }
];

const STAFF_ROLES = [
  "Moderator","Trial moderator","Community manager","Event manager",
  "Support","Designer","Developer","Content manager","Social media manager"
];

const FAQS = [
  { q:"What is FireGlide?", a:"FireGlide is a gaming community built around two creators, Firepdx and Glidux. One Discord server, one event calendar, and content from both channels in one place." },
  { q:"Who are Firepdx and Glidux?", a:"Firepdx makes survival and build content, mostly Minecraft. Glidux makes fast competitive content and shorts. They run the community together." },
  { q:"How do I join Discord?", a:`Use any Join Discord button on this page, or go straight to ${LINKS.discord}. There's no application to be a member — read the rules channel and you're in.` },
  { q:"How can I become staff?", a:"Fill in the staff form on this page, then post your answers in the application channel on Discord. Applications are reviewed by the current team, usually within a week." },
  { q:"How can I participate in events?", a:"Every event is announced in Discord first. Sign-ups open in the events channel — most tournaments have limited slots, so turning on event notifications helps." },
  { q:"Where can I watch Firepdx?", a:`On YouTube at ${LINKS.firepdx}.` },
  { q:"Where can I watch Glidux?", a:`On YouTube at ${LINKS.glidux}.` },
  { q:"Can creators join FireGlide?", a:"Yes. Open a ticket in Discord with your channel and what you make. Creator collabs and guest spots in events are how most of the roster grew." }
];

const TOASTS = [
  { title:"FireGlide community online", body:"Members are in voice right now.", icon:"fa-fire", accent:"#ff4d1c" },
  { dynamic:"video" },                                  // newest real upload, built at toast time
  { title:"Glidux content available", body:"Shorts and edits land as they're posted.", icon:"fa-bolt", accent:"#00d4ff" },
  { title:"New event announced", body:"Community tournament — sign-ups open.", icon:"fa-trophy", accent:"#ffb03a" },
  { title:"Join the Discord", body:"Members are in voice right now.", icon:"fa-discord", accent:"#5865f2", brand:true }
];

/* ---------------------------------------------------------
   HD THUMBNAILS — maxres first, with an automatic quality fallback
   ---------------------------------------------------------
   YouTube only generates a 1280×720 maxresdefault.jpg for some uploads
   (never for older or low-res ones), so requesting it blind causes a lot
   of broken/blank thumbs. This renders the best quality first and, on a
   404, steps down through the same chain YouTube itself uses — the image
   never breaks, it just quietly gets a little smaller. */
const THUMB_CHAIN = ["maxresdefault", "sddefault", "hqdefault", "mqdefault", "default"];
const thumbQ = (videoId, q) => `https://i.ytimg.com/vi/${videoId}/${q}.jpg`;
const thumbFor = (videoId) => videoId ? thumbQ(videoId, THUMB_CHAIN[0]) : "";

/* attached to window so the inline onerror= string in the rendered HTML can
   reach it — cheaper than a delegated error listener for image events,
   which don't bubble. */
window.fgThumbStep = function (img) {
  const vid = img.dataset.vid;
  const next = (Number(img.dataset.qi) || 0) + 1;
  if (!vid || next >= THUMB_CHAIN.length) { markBroken(img); return; }
  img.dataset.qi = String(next);
  img.src = thumbQ(vid, THUMB_CHAIN[next]);
};

/* Renders the <img> for any video card, thumb strip or featured slot.
   Always re-derives from the videoId (ignoring a low-res thumb a feed may
   have supplied) so every real upload gets the HD treatment; falls back to
   whatever URL was actually provided when there is no videoId at all. */
function thumbImg(v, extraAttrs = "") {
  const src = v.videoId ? thumbFor(v.videoId) : v.thumb;
  if (!src) return "";
  const err = v.videoId ? ` data-vid="${v.videoId}" data-qi="0" onerror="fgThumbStep(this)"` : ` onerror="markBroken(this)"`;
  return `<img src="${src}" alt=""${extraAttrs}${err}>`;
}

/* Hexagonal monogram used wherever an image is missing — an engraved mark
   rather than an emoji, so the page reads as an org, not a sticker book. */
function mark(letter, size = 64) {
  return `<span class="mark" style="--s:${size}px" aria-hidden="true">
    <svg viewBox="0 0 40 44" focusable="false">
      <polygon class="mark__ring" points="20,1.5 38.5,12 38.5,32 20,42.5 1.5,32 1.5,12"/>
      <polygon class="mark__fill" points="20,6 34,14 34,30 20,38 6,30 6,14"/>
    </svg><b>${letter}</b></span>`;
}

/* =========================================================
   2. SMALL HELPERS
   ========================================================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const MOBILE = window.matchMedia("(max-width: 880px)").matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s)]+)/g,
  '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

function throttle(fn, wait) {
  let last = 0, timer = null;
  return (...a) => {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn(...a); }
    else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn(...a); }, wait - (now - last)); }
  };
}

/* fetch with a hard deadline, so a hanging relay or API can't stall the grid */
function fetchTimeout(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

/* =========================================================
   3. IMAGES — inject GitHub Raw URLs + fallback handling
   ========================================================= */
function applyImages() {
  const logo = $("#brandLogo");
  if (logo) logo.src = FIREGLIDE_IMAGES.logo;

  const heroArt = $("#heroArt");
  if (heroArt) { heroArt.src = FIREGLIDE_IMAGES.hero; heroArt.alt = "FireGlide key art"; }

  const disc = $("#discordArt");
  if (disc) { disc.src = FIREGLIDE_IMAGES.discord; disc.alt = ""; }
}

function markBroken(img) {
  img.classList.add("image-error");
  img.removeAttribute("alt");
  const brand = img.closest(".brand");
  if (brand) brand.classList.add("is-fallback");
  console.warn("[FireGlide] image unavailable, showing CSS placeholder:", img.dataset.src || img.src);
}

function setupImageFallback(root = document) {
  $$("img", root).forEach((img) => {
    if (img.dataset.fbBound) return;
    img.dataset.fbBound = "1";
    // Thumbnail <img>s built by thumbImg() already carry their own
    // onerror= quality-fallback chain (fgThumbStep) and only reach
    // markBroken once that chain is exhausted — attaching a second,
    // generic listener here would mark them broken on the very first
    // 404 instead of letting the chain step down to the next quality.
    if (img.dataset.vid) return;
    img.addEventListener("error", () => markBroken(img), { once: true });
    // Already failed before the listener attached
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markBroken(img);
  });
}

/* =========================================================
   4. LOADING SCREEN
   ========================================================= */
function runLoader() {
  const loader = $("#loader"), fill = $("#loaderFill"),
        pct = $("#loaderPct"), msg = $("#loaderMsg");
  const steps = ["Initializing community…", "Loading creators…", "Syncing Discord…", "Ready"];
  let p = 0, si = 0;
  document.body.classList.add("is-locked");

  if (REDUCED) { finish(); return; }

  const tick = setInterval(() => {
    p = Math.min(100, p + Math.random() * 16 + 7);
    fill.style.width = p + "%";
    pct.textContent = Math.round(p);
    const next = Math.min(steps.length - 1, Math.floor(p / 26));
    if (next !== si) { si = next; msg.textContent = steps[si]; }
    if (p >= 100) { clearInterval(tick); setTimeout(finish, 280); }
  }, 130);

  function finish() {
    loader.classList.add("is-done");
    document.body.classList.remove("is-locked", "is-loading");
    setTimeout(() => { loader.style.display = "none"; }, 650);
    if (!REDUCED) heroCollision();
    setTimeout(() => toast(TOASTS[0]), 1800);
  }
}

/* =========================================================
   5. HERO COLLISION INTRO (canvas, runs once)
   ========================================================= */
function heroCollision() {
  const cv = $("#collide");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h;

  function size() {
    const r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();

  const COUNT = MOBILE ? 34 : 70;
  const parts = [];
  for (let i = 0; i < COUNT; i++) {
    const fire = i % 2 === 0;
    parts.push({
      fire,
      x: fire ? -40 - Math.random() * w * 0.4 : w + 40 + Math.random() * w * 0.4,
      y: h * 0.5 + (Math.random() - 0.5) * h * 0.55,
      tx: w / 2 + (Math.random() - 0.5) * 30,
      ty: h * 0.42 + (Math.random() - 0.5) * 30,
      r: Math.random() * 2.6 + 1.2,
      vx: 0, vy: 0
    });
  }

  const start = performance.now();
  const DUR = 1100, FADE = 700;

  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);

    if (t < DUR) {
      const k = Math.min(1, t / DUR);
      const e = 1 - Math.pow(1 - k, 3);
      parts.forEach((p) => {
        const x = p.x + (p.tx - p.x) * e;
        const y = p.y + (p.ty - p.y) * e;
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 - e * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = p.fire ? "rgba(255,110,40,.9)" : "rgba(0,200,255,.9)";
        ctx.shadowBlur = 14;
        ctx.shadowColor = p.fire ? "#ff6e28" : "#00c8ff";
        ctx.fill();
      });
      requestAnimationFrame(frame);
    } else if (t < DUR + FADE) {
      const k = (t - DUR) / FADE;
      const R = 40 + k * Math.max(w, h) * 0.75;
      const g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, R);
      g.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - k)})`);
      g.addColorStop(0.35, `rgba(255,140,50,${0.4 * (1 - k)})`);
      g.addColorStop(0.7, `rgba(0,190,255,${0.26 * (1 - k)})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
      cv.style.display = "none";
    }
  }
  requestAnimationFrame(frame);
  window.addEventListener("resize", throttle(size, 250), { passive: true });
}

/* =========================================================
   6. AMBIENT PARTICLE FIELD
   ========================================================= */
function particleField() {
  const cv = $("#particles");
  if (!cv || REDUCED) return;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0, raf = null, running = true;
  const COUNT = MOBILE ? 32 : 76;          // mobile performance mode
  const LINK = MOBILE ? 0 : 118;
  const mouse = { x: -9999, y: -9999 };
  let parts = [];

  function size() {
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    parts = Array.from({ length: COUNT }, () => {
      const x = Math.random() * w;
      return {
        x, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.8 + 0.7,
        fire: x < w / 2                    // fire on the left, glide on the right
      };
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;

      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 14000) {                    // gentle mouse push
        const d = Math.sqrt(d2) || 1;
        p.x += (dx / d) * 0.9;
        p.y += (dy / d) * 0.9;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.fire ? "rgba(255,110,40,.55)" : "rgba(0,200,255,.5)";
      ctx.fill();

      if (LINK) {
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          if (q.fire !== p.fire) continue;
          const ax = p.x - q.x, ay = p.y - q.y;
          const dist = Math.hypot(ax, ay);
          if (dist < LINK) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.fire
              ? `rgba(255,110,40,${0.10 * (1 - dist / LINK)})`
              : `rgba(0,200,255,${0.10 * (1 - dist / LINK)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }

  size(); seed(); draw();

  window.addEventListener("resize", throttle(() => { size(); seed(); }, 250), { passive: true });
  if (!TOUCH) window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) { cancelAnimationFrame(raf); running = false; }
    else if (!document.hidden && !running) { running = true; draw(); }
  });
}

/* =========================================================
   7. CUSTOM CURSOR (desktop only)
   ========================================================= */
function customCursor() {
  if (TOUCH || REDUCED) return;
  const ring = $("#cursorRing"), dot = $("#cursorDot");
  let rx = 0, ry = 0, mx = 0, my = 0, shown = false;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    // Always restore opacity on move, not just the first time — previously
    // this was gated behind `shown`, so once the pointer left the window
    // (mouseleave hides it below) it never came back on re-entry.
    ring.style.opacity = dot.style.opacity = "1";
    if (!shown) { shown = true; document.body.classList.add("has-cursor"); }
  }, { passive: true });

  (function loop() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  })();

  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("a, button, input, select, textarea, [data-magnetic], .faq-item__q"))
      ring.classList.add("is-hot");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("a, button, input, select, textarea, [data-magnetic], .faq-item__q"))
      ring.classList.remove("is-hot");
  });
  document.addEventListener("mouseleave", () => { ring.style.opacity = dot.style.opacity = "0"; });
}

/* =========================================================
   7b. THEME SWITCHER
   ---------------------------------------------------------
   Four moods on the same fire/glide identity. The swatch colors below only
   drive the little preview dots in the menu — the actual palette swap
   happens in CSS via :root[data-theme="…"], so nothing here needs to know
   what any given theme actually looks like beyond that preview. */
const THEMES = [
  { id: "fireglide", label: "FireGlide", fire: "#ff4d1c", glide: "#00d4ff" },
  { id: "noir",      label: "Noir",      fire: "#ff6a3d", glide: "#5fd0ff" },
  { id: "neon",      label: "Neon",      fire: "#ff3d6e", glide: "#00f0ff" },
  { id: "sunset",    label: "Sunset",    fire: "#ff5277", glide: "#20d6c7" }
];

function applyTheme(id, { persist = true } = {}) {
  const valid = THEMES.some((t) => t.id === id) ? id : "fireglide";
  if (valid === "fireglide") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", valid);
  if (persist) { try { localStorage.setItem("fg:theme", valid); } catch { /* private mode */ } }
  $$(".theme-swatch").forEach((b) => b.classList.toggle("is-active", b.dataset.theme === valid));
  return valid;
}

function themeSwitcher() {
  const wrap = $("#themeSwitch"), open = $("#themeOpen"), menu = $("#themeMenu");
  if (!wrap || !open || !menu) return;

  const current = document.documentElement.getAttribute("data-theme") || "fireglide";
  menu.innerHTML = THEMES.map((t) => `
    <button class="theme-swatch${t.id === current ? " is-active" : ""}" type="button" role="menuitem" data-theme="${t.id}">
      <span class="theme-swatch__dot" style="background:linear-gradient(135deg,${t.fire},${t.glide})"></span>
      ${esc(t.label)}
    </button>`).join("");

  const toggle = (show) => {
    menu.hidden = !show;
    open.setAttribute("aria-expanded", String(show));
  };

  open.addEventListener("click", (e) => { e.stopPropagation(); toggle(menu.hidden); });
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme]");
    if (!b) return;
    applyTheme(b.dataset.theme);
    toggle(false);
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) toggle(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { toggle(false); open.focus(); } });
}

/* =========================================================
   8. NAVBAR, SCROLL PROGRESS, BACK TO TOP, ACTIVE LINK
   ========================================================= */
function navigation() {
  const nav = $("#nav"), links = $("#navLinks"), burger = $("#burger"), toTop = $("#toTop");

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-stuck", y > 40);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    $("#scrollProgress").style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

    const show = y > 700;
    toTop.hidden = !show;
    toTop.classList.toggle("is-shown", show);
  };
  window.addEventListener("scroll", throttle(onScroll, 60), { passive: true });
  onScroll();

  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));

  /* mobile menu */
  const closeMenu = () => {
    links.classList.remove("is-open");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("is-locked");
  };
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("is-locked", open);
  });
  links.addEventListener("click", (e) => { if (e.target.tagName === "A") closeMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  /* active section highlighting */
  const map = new Map();
  $$("#navLinks a").forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(sec, a);
  });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        $$("#navLinks a").forEach((a) => a.classList.remove("is-active"));
        map.get(en.target)?.classList.add("is-active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, sec) => spy.observe(sec));
}

/* =========================================================
   9. REVEAL ON SCROLL
   ========================================================= */
function reveals() {
  const items = $$("[data-reveal]");
  if (REDUCED || !("IntersectionObserver" in window)) {
    items.forEach((i) => i.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); obs.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px" });
  items.forEach((i) => io.observe(i));
}

/* =========================================================
   10. HERO PARALLAX
   ========================================================= */
function heroParallax() {
  if (TOUCH || REDUCED) return;
  const el = $("#heroParallax");
  const hero = $(".hero");
  if (!el || !hero) return;
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.width / 2) / r.width;
    const y = (e.clientY - r.height / 2) / r.height;
    el.style.transform = `translate3d(${x * -16}px, ${y * -12}px, 0)`;
  }, { passive: true });
  hero.addEventListener("mouseleave", () => { el.style.transform = ""; });
}

/* =========================================================
   11. RENDER — CREATORS
   ========================================================= */
function renderCreators() {
  const grid = $("#creatorGrid");
  grid.innerHTML = CREATORS.map((c) => `
    <article class="creator-card" style="--accent:${c.accent};--accent-soft:${c.accentSoft}">
      <div class="creator-card__media">
        <img src="${c.image}" alt="${esc(c.name)} channel artwork" loading="lazy" width="600" height="340">
        <span class="creator-card__ph">${mark(c.glyph, 88)}</span>
      </div>
      <div class="creator-card__body">
        <h3 class="creator-card__name">${esc(c.name)}</h3>
        <p class="creator-card__role">${esc(c.role)}</p>
        <p class="creator-card__bio">${esc(c.bio)}</p>
        <div class="creator-card__tags">${c.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <a class="btn ${c.id === "firepdx" ? "btn--fire" : "btn--glide"}" data-magnetic
           href="${c.link}" target="_blank" rel="noopener noreferrer">
          Watch channel <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      </div>
    </article>`).join("");
}

/* =========================================================
   12. YOUTUBE — live videos + shorts, with graceful fallback
   ---------------------------------------------------------
   Four ways to get real data, tried in order:
     1. /api/youtube        — your own endpoint, API key stays on the server
     2. Piped API           — keyless CORS mirrors, real durations + live flags
     3. the public RSS feed — read through a CORS relay
     4. cache / VIDEOS      — the real snapshot in section 1, so the page is
                             never empty and never fake
   ========================================================= */
const STATE = {
  videos: [],      // normalised video objects
  live: [],        // whatever is streaming right now
  source: "cached",
  updated: null,
  loading: true,
  filter: "all",
  sort: "date",    // "date" | "views"
  visible: 12      // how many cards the grid currently shows ("Load more" raises this)
};
const PAGE_SIZE = 12;

/* ---------------------------------------------------------
   SAVED / WATCH LATER — persisted locally, per browser
   --------------------------------------------------------- */
function loadSaved() {
  try { return new Set(JSON.parse(localStorage.getItem("fg:saved") || "[]")); }
  catch { return new Set(); }
}
const SAVED = loadSaved();
function isSaved(id) { return !!id && SAVED.has(id); }
function persistSaved() {
  try { localStorage.setItem("fg:saved", JSON.stringify([...SAVED])); } catch { /* private mode */ }
}
function toggleSaved(id) {
  if (!id) return false;
  if (SAVED.has(id)) SAVED.delete(id); else SAVED.add(id);
  persistSaved();
  return SAVED.has(id);
}

const GAME_WORDS = {
  minecraft: "Minecraft", roblox: "Roblox", fortnite: "Fortnite",
  valorant: "Valorant", gta: "GTA", warzone: "Call of Duty",
  "call of duty": "Call of Duty", cod: "Call of Duty"
};

function detectGame(text = "") {
  const t = text.toLowerCase();
  for (const [k, v] of Object.entries(GAME_WORDS)) if (t.includes(k)) return v;
  return "Gaming";
}

function isoToSeconds(iso = "") {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}
function clock(sec) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}
function ago(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const units = [[31536000,"year"],[2592000,"month"],[604800,"week"],[86400,"day"],[3600,"hour"],[60,"minute"]];
  for (const [s, label] of units) {
    if (diff >= s) { const n = Math.floor(diff / s); return `${n} ${label}${n > 1 ? "s" : ""} ago`; }
  }
  return "just now";
}
function compact(n) {
  if (n == null || isNaN(n)) return "";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/* ---- normalise anything into one shape the cards understand ---- */
function clockToSeconds(str = "") {
  const p = String(str).split(":").map(Number);
  if (p.some(isNaN) || p.length < 2) return 0;
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}

function normalise(v, channel) {
  const seconds = v.seconds
    ?? (String(v.duration || "").startsWith("PT") ? isoToSeconds(v.duration) : clockToSeconds(v.duration));
  const short = v.isShort ?? (seconds > 0 && seconds <= 60);
  const game = v.game || detectGame(`${v.title} ${v.description || ""}`);
  const creatorId = channel ? channel.id : String(v.creator || "").toLowerCase();
  return {
    id: v.videoId || v.id,
    videoId: v.videoId || null,
    creator: channel ? channel.name : v.creator,
    creatorId,
    title: v.title,
    game,
    date: v.date || v.publishedAt,
    duration: v.duration && !v.duration.startsWith("PT") ? v.duration : clock(seconds),
    seconds,
    isShort: short,
    isLive: !!v.isLive,
    views: v.views != null ? Number(v.views) : null,
    thumb: v.thumb || (v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : ""),
    link: v.videoId
      ? (short ? `https://www.youtube.com/shorts/${v.videoId}` : `https://www.youtube.com/watch?v=${v.videoId}`)
      : v.link,
    tags: [creatorId, game.toLowerCase(), "gaming", short ? "shorts" : "long", v.isLive ? "live" : ""]
      .filter(Boolean)
  };
}

/* ---------------------------------------------------------
   ROUTE 1 — your own endpoint (optional, still keyless)
   --------------------------------------------------------- */
async function fromEndpoint() {
  const res = await fetchTimeout(YOUTUBE.endpoint, { headers: { Accept: "application/json" } }, 8000);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const items = (data.videos || []).map((v) => normalise(v, null));
  if (!items.length) throw new Error("endpoint returned nothing");
  return { items, source: "live" };
}

/* ---------------------------------------------------------
   ROUTE 2 — Piped API (keyless, CORS-enabled)
   ---------------------------------------------------------
   Public Piped instances proxy YouTube and send permissive CORS headers, so
   the browser reads them directly. Unlike the RSS feed they return real
   durations and livestream flags, which is what makes the Live band and the
   duration badges accurate. */
async function fromPiped() {
  let lastErr;
  for (const base of PIPED) {
    try {
      const groups = await Promise.all(YOUTUBE.channels.map(async (channel) => {
        const res = await fetchTimeout(
          `${base}/channel/${channel.channelId}/videos`,
          { headers: { Accept: "application/json" } }, 8000);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        return (data.relatedStreams || data.items || [])
          .slice(0, YOUTUBE.maxPerChannel)
          .map((s) => {
            const videoId = String(s.url || s.videoId || "").match(/(?:watch\?v=|shorts\/|embed\/)([\w-]{11})/)?.[1] || "";
            return normalise({
              videoId,
              title: s.title,
              publishedAt: s.uploaded ? new Date(s.uploaded * 1000).toISOString() : new Date().toISOString(),
              seconds: Number(s.duration) || 0,
              isShort: !!s.isShort,
              isLive: !!s.livestream,
              views: Number(s.views) || null,
              thumb: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""
            }, channel);
          })
          .filter((v) => v.id);
      }));

      const items = groups.flat();
      if (items.length) return { items, source: "piped" };
      throw new Error("instance returned no videos");
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("no piped instance available");
}

/* ---------------------------------------------------------
   ROUTE 2 — the public RSS feed, read through a CORS relay
   ---------------------------------------------------------
   Every YouTube channel publishes an open feed at
   youtube.com/feeds/videos.xml?channel_id=UC... — no key, no quota,
   no sign-up. The only catch is that YouTube doesn't send CORS headers,
   so a browser can't read it directly. These relays forward the request.
   They are public services: if one is rate-limited the next is tried.
   --------------------------------------------------------- */
const RELAYS = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://cors.isomorphic-git.org/${u}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`
];

async function relayText(url) {
  let lastErr;
  for (const build of RELAYS) {
    try {
      const res = await fetchTimeout(build(url), { headers: { Accept: "text/plain,*/*" } }, 8000);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (text && text.length > 200) return text;
      throw new Error("empty response");
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("no relay available");
}

/* channel handle -> UC… id, cached so it is looked up once, not every visit */
async function resolveChannelId(channel) {
  if (channel.channelId) return channel.channelId;

  const key = "fg:cid:" + channel.handle;
  try {
    const hit = localStorage.getItem(key);
    if (hit && /^UC[\w-]{22}$/.test(hit)) { channel.channelId = hit; return hit; }
  } catch { /* storage blocked — just look it up again */ }

  const html = await relayText(`https://www.youtube.com/${channel.handle}`);
  const found = html.match(/"channelId":"(UC[\w-]{22})"/) ||
                html.match(/channel_id=(UC[\w-]{22})/) ||
                html.match(/\/channel\/(UC[\w-]{22})/);
  if (!found) throw new Error("could not read the channel id for " + channel.handle);

  channel.channelId = found[1];
  try { localStorage.setItem(key, found[1]); } catch { /* fine */ }
  return found[1];
}

function parseFeed(xmlText, channel) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("feed did not parse");

  const pick = (el, tag) => {
    const n = el.getElementsByTagName(tag)[0];
    return n ? n.textContent.trim() : "";
  };

  return Array.from(doc.getElementsByTagName("entry")).map((e) => {
    const videoId = pick(e, "yt:videoId");
    const title = pick(e, "title");
    const description = pick(e, "media:description");
    const statsEl = e.getElementsByTagName("media:statistics")[0];
    const views = statsEl ? Number(statsEl.getAttribute("views")) : null;
    const short = /#shorts?\b/i.test(title + " " + description);

    return normalise({
      videoId,
      title,
      description,
      publishedAt: pick(e, "published"),
      seconds: 0,                 // the feed carries no duration
      isShort: short,
      isLive: false,              // the feed carries no live flag either
      views: Number.isFinite(views) ? views : null,
      thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }, channel);
  }).filter((v) => v.id);
}

async function fromFeeds() {
  const groups = await Promise.all(YOUTUBE.channels.map(async (channel) => {
    const id = await resolveChannelId(channel);
    const xml = await relayText(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
    return parseFeed(xml, channel).slice(0, YOUTUBE.maxPerChannel);
  }));

  const items = groups.flat();
  if (!items.length) throw new Error("feeds returned nothing");
  return { items, source: "feed" };
}

/* ---------------------------------------------------------
   ROUTE 3 — whatever was loaded last, kept for a day
   --------------------------------------------------------- */
function readCache() {
  try {
    const raw = localStorage.getItem("fg:videos");
    if (!raw) return null;
    const box = JSON.parse(raw);
    if (Date.now() - box.at > YOUTUBE.cacheMs) return null;
    return { items: box.items, source: box.source, cached: true, at: box.at };
  } catch { return null; }
}
function writeCache(items, source) {
  try { localStorage.setItem("fg:videos", JSON.stringify({ at: Date.now(), items, source })); }
  catch { /* private mode, file:// — not important */ }
}

/* ---------------------------------------------------------
   ROUTE 4 — the bundled list, so the grid is never empty
   --------------------------------------------------------- */
function fromSeed() {
  return {
    items: VIDEOS.map((v) => normalise({ ...v, publishedAt: v.date }, null)),
    source: "seed"
  };
}

/* Tracks which video ids have already been shown/announced, so polling can
   tell "this is a genuinely new upload" apart from "this is the same list
   arriving again" and toast exactly once per real new video. */
const ANNOUNCED_IDS = new Set();
let SYNCED_ONCE = false;
const BASE_TITLE = document.title;

async function apply(result) {
  STATE.videos = result.items.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  STATE.live = STATE.videos.filter((v) => v.isLive);
  STATE.liveKnown = result.source === "live" || result.source === "piped";
  STATE.source = result.source;
  STATE.cached = !!result.cached;
  STATE.updated = result.at ? new Date(result.at) : new Date();
  STATE.loading = false;

  const isRealSource = ["live", "piped", "feed"].includes(result.source);
  if (isRealSource) {
    if (SYNCED_ONCE) {
      const fresh = STATE.videos.find((v) => v.videoId && !v.isLive && !ANNOUNCED_IDS.has(v.videoId));
      if (fresh) {
        toast({
          title: `New ${fresh.isShort ? "short" : "upload"} from ${fresh.creator}`,
          body: fresh.title,
          icon: fresh.isShort ? "fa-bolt" : "fa-film",
          accent: fresh.creatorId === "firepdx" ? "#ff4d1c" : "#00d4ff"
        });
      }
    }
    STATE.videos.forEach((v) => v.videoId && ANNOUNCED_IDS.add(v.videoId));
    SYNCED_ONCE = true;
  }

  document.title = STATE.live.length ? "\u25CF LIVE \u2014 " + BASE_TITLE : BASE_TITLE;

  renderStatus();
  renderFeatured();
  renderVideos();
  renderLive();
  rebuildSearchIndex();
}

async function loadYouTube({ silent = false, force = false } = {}) {
  // 1. paint whatever was stored last visit straight away, so nothing blinks
  if (!force) {
    const cached = readCache();
    if (cached) await apply(cached);
  }
  if (STATE.loading && !silent) { renderVideos(); renderLive(); }

  // 2. then go and get the current list
  let result;
  try {
    result = await fromEndpoint();
  } catch (e1) {
    try {
      result = await fromPiped();
    } catch (e2) {
      try {
        result = await fromFeeds();
      } catch (e3) {
        console.log("[FireGlide] live video sources unreachable:",
          e1.message, "|", e2.message, "|", e3.message);
        result = readCache() || fromSeed();
      }
    }
  }

  if (["live", "piped", "feed"].includes(result.source)) writeCache(result.items, result.source);
  await apply(result);

  if (STATE.live.length && !loadYouTube._announced) {
    loadYouTube._announced = true;
    toast({ title: STATE.live[0].creator + " is live", body: STATE.live[0].title,
            icon: "fa-tower-broadcast", accent: "#ff3b3b" });
  }
}

function startYouTubePolling() {
  setInterval(() => { if (!document.hidden) loadYouTube({ silent: true }); }, YOUTUBE.refreshMs);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && STATE.updated && Date.now() - STATE.updated > YOUTUBE.refreshMs)
      loadYouTube({ silent: true });
  });
}

function renderStatus() {
  const el = $("#ytStatus");
  if (!el) return;
  const t = STATE.updated ? STATE.updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const label = {
    live: `Live from YouTube · ${t}`,
    piped: `Real uploads synced · ${t}`,
    feed: `Real uploads from both channels · ${t}`,
    seed: `Last synced real uploads · ${t}`
  }[STATE.source] || "Loading";
  const good = ["live", "piped", "feed"].includes(STATE.source);

  el.className = "yt-status" + (good ? " is-live" : "");
  el.innerHTML = `<i class="dot${good ? "" : " dot--idle"}" aria-hidden="true"></i> ${label}
    <button class="yt-status__refresh" id="ytRefresh">${good ? "Refresh" : "Retry"}</button>`;
  $("#ytRefresh").addEventListener("click", () => loadYouTube({ force: true }));
}

/* =========================================================
   12b. LIVE BAND
   ========================================================= */
function renderLive() {
  const grid = $("#liveGrid"), off = $("#liveOffline"), band = $("#live");
  if (!grid) return;

  if (STATE.loading) {
    band.dataset.state = "loading";
    off.hidden = true;
    grid.innerHTML = skeletons(1, "live");
    return;
  }
  if (!STATE.live.length) {
    band.dataset.state = STATE.liveKnown ? "off" : "unknown";
    grid.innerHTML = "";
    off.hidden = false;
    off.innerHTML = STATE.liveKnown
      ? `Neither channel is streaming right now. The newest uploads are in the grid below.`
      : `The public feed doesn't carry a live flag, so these two buttons go straight to each channel's live page —
         they open the current stream if there is one.
         <span class="live-off__actions">
           ${YOUTUBE.channels.map((c) => `<a class="btn btn--${c.id === "firepdx" ? "fire" : "glide"} btn--sm sheen"
              href="${c.live}" target="_blank" rel="noopener noreferrer">${esc(c.name)} live</a>`).join("")}
         </span>`;
    return;
  }
  band.dataset.state = "on";
  off.hidden = true;
  grid.innerHTML = STATE.live.map((v) => {
    const fire = v.creatorId === "firepdx";
    return `
    <a class="live-card sheen" data-play="${v.videoId || ""}" href="${v.link}" target="_blank" rel="noopener noreferrer"
       style="--accent:${fire ? "#ff4d1c" : "#00d4ff"};--accent-soft:${fire ? "rgba(255,77,28,.22)" : "rgba(0,212,255,.22)"}">
      <span class="live-card__thumb">
        ${thumbImg(v, ` loading="lazy"`)}
        <span class="live-card__ph">${mark(fire ? "F" : "G", 52)}</span>
        <span class="live-badge"><i class="dot dot--red" aria-hidden="true"></i> Live</span>
      </span>
      <span class="live-card__body">
        <b>${esc(v.title)}</b>
        <span>${esc(v.creator)}${v.views ? " · " + compact(v.views) + " watching" : ""}</span>
        <span class="live-card__cta">Watch the stream <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </span>
    </a>`;
  }).join("");
  setupImageFallback(grid);
}

/* =========================================================
   12c. RENDER — FEATURED, FILTERS, VIDEO GRID
   ========================================================= */
function skeletons(n, kind = "card") {
  return Array.from({ length: n }, () =>
    `<div class="skeleton skeleton--${kind}" aria-hidden="true">
       <span class="skeleton__thumb"></span>
       <span class="skeleton__line"></span>
       <span class="skeleton__line skeleton__line--short"></span>
     </div>`).join("");
}

function renderFeatured() {
  const host = $("#featured");
  if (!host) return;

  /* Always a real video: live first, then the newest full upload, then the
     newest short. The featured slot is never a fabricated title. */
  const pick = STATE.live[0]
    || STATE.videos.find((v) => !v.isShort)
    || STATE.videos[0]
    || null;

  if (!pick) {
    host.style.setProperty("--accent", "#ff4d1c");
    host.innerHTML = `
      <div class="featured__media">
        <span class="featured__play" aria-hidden="true">▶</span>
      </div>
      <div class="featured__body">
        <p class="featured__kicker">Videos appear here</p>
        <h3>Nothing published yet</h3>
        <p>As soon as either channel uploads, the newest video takes this spot automatically.</p>
        <div class="live-off__actions">
          <a class="btn btn--fire sheen" href="${LINKS.firepdx}" target="_blank" rel="noopener noreferrer">Firepdx on YouTube</a>
          <a class="btn btn--glide sheen" href="${LINKS.glidux}" target="_blank" rel="noopener noreferrer">Glidux on YouTube</a>
        </div>
      </div>`;
    setupImageFallback(host);
    return;
  }

  const f = pick;
  const fire = (f.creatorId || "firepdx") === "firepdx";
  const meta = [
    esc(f.creator),
    esc(f.game),
    f.date ? ago(f.date) : "",
    f.views ? compact(f.views) + " views" : "",
    f.duration || (f.isShort ? "Short" : "")
  ].filter(Boolean);

  host.style.setProperty("--accent", fire ? "#ff4d1c" : "#00d4ff");
  host.innerHTML = `
    <a class="featured__media" data-play="${f.videoId || ""}" href="${f.link}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${esc(f.title)}">
      ${thumbImg(f, ` fetchpriority="high"`)}
      <span class="featured__scan" aria-hidden="true"></span>
      <span class="featured__play" aria-hidden="true">▶</span>
      ${f.isLive ? `<span class="live-badge live-badge--lg"><i class="dot dot--red" aria-hidden="true"></i> Live now</span>` : ""}
    </a>
    <div class="featured__body">
      <p class="featured__kicker">${f.isLive ? "Streaming now" : "Featured drop"}</p>
      <h3>${esc(f.title)}</h3>
      <div class="featured__meta">${meta.map((m) => `<span>${m}</span>`).join("")}</div>
      <p>${esc(f.description || "Straight from the channel — click to play it right here on the site.")}</p>
      <a class="btn ${fire ? "btn--fire" : "btn--glide"} sheen" data-play="${f.videoId || ""}" data-magnetic href="${f.link}" target="_blank" rel="noopener noreferrer">
        ${f.isLive ? "Join the stream" : "Play now"} <i class="fa-solid fa-play" aria-hidden="true"></i>
      </a>
    </div>`;
  setupImageFallback(host);
  bindMagnetic(host);
}

function videoCard(v, i) {
  const fire = v.creatorId === "firepdx";
  const accent = fire ? "#ff4d1c" : "#00d4ff";
  const soft = fire ? "rgba(255,77,28,.2)" : "rgba(0,212,255,.2)";
  const badge = v.isLive
    ? `<span class="live-badge"><i class="dot dot--red" aria-hidden="true"></i> Live</span>`
    : v.isShort ? `<span class="video-card__tagline">Short</span>` : "";
  const saved = isSaved(v.videoId);
  return `
    <article class="video-card sheen" style="--accent:${accent};--accent-soft:${soft};--i:${i}">
      <span class="corner corner--tl" aria-hidden="true"></span>
      <span class="corner corner--br" aria-hidden="true"></span>
      <div class="video-card__actions">
        <button class="video-card__icon-btn${saved ? " is-active" : ""}" type="button" data-save="${v.videoId || ""}"
          aria-pressed="${saved}" aria-label="${saved ? "Remove from saved" : "Save for later"}">
          <i class="fa-${saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i>
        </button>
        <button class="video-card__icon-btn" type="button" data-share="${v.videoId || ""}" aria-label="Share this video">
          <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
        </button>
      </div>
      <a class="video-card__thumb" data-play="${v.videoId || ""}" href="${v.link}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">
        ${thumbImg(v, ` loading="lazy" width="480" height="270"`)}
        <span class="video-card__ph">${mark(fire ? "F" : "G", 56)}</span>
        <span class="video-card__badge">${esc(v.creator)}</span>
        ${badge}
        ${v.duration ? `<span class="video-card__dur">${esc(v.duration)}</span>` : ""}
        <span class="video-card__play" aria-hidden="true">▶</span>
      </a>
      <div class="video-card__body">
        <h3 class="video-card__title">${esc(v.title)}</h3>
        <p class="video-card__meta">
          <span>${esc(v.game)}</span>
          <span>${v.date ? ago(v.date) : ""}</span>
          ${v.views ? `<span>${compact(v.views)} views</span>` : ""}
        </p>
        <a class="btn ${fire ? "btn--fire" : "btn--glide"} sheen" data-play="${v.videoId || ""}" href="${v.link}" target="_blank" rel="noopener noreferrer">
          ${v.isLive ? "Watch live" : "Play"} <i class="fa-solid fa-play" aria-hidden="true"></i>
        </a>
      </div>
    </article>`;
}

/* every video/short matching the active filter, in the active sort order —
   "All" always includes every upload and every short (nothing is dropped),
   this just decides what order they paint in and how many show at once. */
function currentList() {
  const f = STATE.filter;
  const list = f === "all" ? STATE.videos.slice()
    : f === "saved" ? STATE.videos.filter((v) => isSaved(v.videoId))
    : STATE.videos.filter((v) => v.tags.includes(f));
  list.sort((a, b) => STATE.sort === "views"
    ? (b.views || 0) - (a.views || 0)
    : new Date(b.date) - new Date(a.date));
  return list;
}

function renderVideos(filter) {
  if (filter) { STATE.filter = filter; STATE.visible = PAGE_SIZE; }
  const grid = $("#videoGrid"), empty = $("#videoEmpty"), more = $("#videoMore");
  if (!grid) return;

  if (STATE.loading) {
    grid.innerHTML = skeletons(6);
    empty.hidden = true;
    if (more) more.hidden = true;
    return;
  }
  const f = STATE.filter;
  const full = currentList();
  STATE.filteredList = full;   // the on-site player reads this for prev/next
  const list = full.slice(0, STATE.visible);

  grid.innerHTML = list.map(videoCard).join("");
  empty.hidden = full.length > 0;
  empty.textContent = f === "live"
    ? "Nobody is streaming right now. Check the Live section when a stream starts, or browse the latest uploads."
    : f === "shorts"
      ? "No shorts in the current batch yet — they show up here as soon as either channel posts one."
      : f === "saved"
        ? "Nothing saved yet — tap the bookmark icon on any video to keep it here."
        : "Nothing under that filter yet. Pick another one, or check back after the next upload.";

  if (more) {
    const remaining = full.length - list.length;
    more.hidden = remaining <= 0;
    if (remaining > 0) more.textContent = `Load more (${remaining} left)`;
  }

  setupImageFallback(grid);
  bindMagnetic(grid);
  bindTilt(grid);
  updateFilterIndicator();

  /* Stagger the entrance, then hand transform over to the 3D tilt — the
     running animation would otherwise override the inline tilt transform. */
  if (REDUCED) return;
  $$(".video-card", grid).forEach((card, i) => {
    card.style.animationDelay = `${Math.min(i, 11) * 45}ms`;
    card.addEventListener("animationend", () => { card.style.animation = "none"; }, { once: true });
  });
}

/* sliding pill that glides under whichever filter tab is active, instead of
   the active state just popping between buttons */
function updateFilterIndicator() {
  const bar = $("#videoFilters"), ind = $("#filterIndicator");
  if (!bar || !ind) return;
  const active = $(".filter.is-active", bar);
  if (!active) { ind.style.opacity = "0"; return; }
  ind.style.opacity = "1";
  ind.style.width = active.offsetWidth + "px";
  ind.style.transform = `translateX(${active.offsetLeft}px)`;
}

function renderFilters() {
  const bar = $("#videoFilters");
  bar.innerHTML = `<span class="filter__indicator" id="filterIndicator" aria-hidden="true"></span>` +
    VIDEO_FILTERS.map((f, i) =>
    `<button class="filter sheen${i === 0 ? " is-active" : ""}" role="tab"
      aria-selected="${i === 0}" aria-controls="videoGrid" data-filter="${f.id}">${esc(f.label)}</button>`).join("");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    $$(".filter", bar).forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
    renderVideos(btn.dataset.filter);
  });
  window.addEventListener("resize", throttle(updateFilterIndicator, 150));

  const sort = $("#videoSort");
  if (sort && !sort.dataset.bound) {
    sort.dataset.bound = "1";
    sort.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sort]");
      if (!btn) return;
      $$("[data-sort]", sort).forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      STATE.sort = btn.dataset.sort;
      STATE.visible = PAGE_SIZE;
      renderVideos();
    });
  }

  const more = $("#videoMore");
  if (more && !more.dataset.bound) {
    more.dataset.bound = "1";
    more.addEventListener("click", () => { STATE.visible += PAGE_SIZE; renderVideos(); });
  }

  /* delegated — survives every re-render of the grid */
  if (!renderFilters._delegated) {
    renderFilters._delegated = true;
    document.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-save]");
      if (saveBtn && saveBtn.dataset.save) {
        const on = toggleSaved(saveBtn.dataset.save);
        saveBtn.classList.toggle("is-active", on);
        saveBtn.setAttribute("aria-pressed", String(on));
        saveBtn.setAttribute("aria-label", on ? "Remove from saved" : "Save for later");
        saveBtn.querySelector("i").className = `fa-${on ? "solid" : "regular"} fa-bookmark`;
        toast({ title: on ? "Saved" : "Removed from saved",
          body: on ? "Find it under the Saved filter any time." : "It's off your saved list.",
          icon: "fa-bookmark", accent: "#ffb03a" });
        if (STATE.filter === "saved") renderVideos();
        return;
      }
      const shareBtn = e.target.closest("[data-share]");
      if (shareBtn && shareBtn.dataset.share) {
        const v = STATE.videos.find((x) => x.videoId === shareBtn.dataset.share);
        if (v) shareVideo(v);
      }
    });
  }
}

async function shareVideo(v) {
  const data = { title: v.title, text: `${v.title} — ${v.creator} on FireGlide`, url: v.link };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(v.link);
    toast({ title: "Link copied", body: v.title, icon: "fa-link", accent: "#00d4ff" });
  } catch (err) {
    if (err && err.name === "AbortError") return; // user dismissed the native share sheet
    try { await navigator.clipboard.writeText(v.link); toast({ title: "Link copied", body: v.title, icon: "fa-link", accent: "#00d4ff" }); }
    catch { /* clipboard blocked — the direct link is already on the card */ }
  }
}

/* =========================================================
   13. RENDER — EVENTS + COUNTDOWN
   ========================================================= */
const STATUS_TEXT = { open:"Sign-ups open", soon:"Coming soon", live:"Live", closed:"Closed" };

function renderEvents() {
  $("#eventGrid").innerHTML = EVENTS.map((ev) => {
    const live = new Date(ev.date) <= new Date();
    const st = live ? "live" : ev.status;
    const fire = ["e1", "e3", "e5"].includes(ev.id);
    const accent = fire ? "#ff4d1c" : "#00d4ff";
    const soft = fire ? "rgba(255,77,28,.2)" : "rgba(0,212,255,.2)";
    return `
    <article class="event-card" style="--accent:${accent};--accent-soft:${soft}">
      <span class="status status--${st}">${STATUS_TEXT[st]}</span>
      <span class="event-card__icon">${mark(ev.icon, 52)}</span>
      <h3 class="event-card__title">${esc(ev.title)}</h3>
      <div class="event-card__rows">
        <div><span>Date</span><b>${fmtDate(ev.date)}</b></div>
        <div><span>Prize</span><b>${esc(ev.prize)}</b></div>
        <div><span>Entrants</span><b>${esc(ev.participants)}</b></div>
      </div>
      <a class="btn btn--ghost" href="${ev.link}" target="_blank" rel="noopener noreferrer">
        ${live ? "Join now" : "Sign up on Discord"} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </a>
    </article>`;
  }).join("");
  bindMagnetic($("#eventGrid"));
}

function countdown() {
  const now = Date.now();
  const next = EVENTS.map((e) => ({ ...e, ts: new Date(e.date).getTime() }))
                     .filter((e) => e.ts > now)
                     .sort((a, b) => a.ts - b.ts)[0];

  const units = $("#countdownUnits"), live = $("#countdownLive"), name = $("#nextEventName");

  if (!next) {
    units.hidden = true; live.hidden = false;
    name.textContent = "Happening now";
    return;
  }

  name.textContent = next.title;
  const pad = (n) => String(n).padStart(2, "0");

  const tick = () => {
    const diff = next.ts - Date.now();
    if (diff <= 0) {
      clearInterval(timer);
      units.hidden = true; live.hidden = false;
      toast({ title:"Event live now", body:`${next.title} just started.`, icon:"fa-tower-broadcast", accent:"#ff3b3b" });
      return;
    }
    const s = Math.floor(diff / 1000);
    $("#cdDays").textContent  = pad(Math.floor(s / 86400));
    $("#cdHours").textContent = pad(Math.floor(s / 3600) % 24);
    $("#cdMins").textContent  = pad(Math.floor(s / 60) % 60);
    $("#cdSecs").textContent  = pad(s % 60);
  };
  tick();
  const timer = setInterval(tick, 1000);
}

/* =========================================================
   14. RENDER — COUNTERS (IntersectionObserver)
   ========================================================= */
function renderCounters() {
  const wrap = $("#counters");
  wrap.innerHTML = COUNTERS.map((c) => `
    <div class="counter">
      <strong data-to="${c.value}" data-suffix="${c.suffix || ""}">0</strong>
      <span>${esc(c.label)}</span>
    </div>`).join("");

  const run = (el) => {
    const to = Number(el.dataset.to), sfx = el.dataset.suffix || "";
    if (REDUCED) { el.textContent = to.toLocaleString() + sfx; return; }
    const dur = 1500, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e).toLocaleString() + (k === 1 ? sfx : "");
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { run(en.target); obs.unobserve(en.target); }
    });
  }, { threshold: 0.5 });
  $$(".counter strong", wrap).forEach((el) => io.observe(el));
}

/* =========================================================
   15. RENDER — GAMES + 3D TILT
   ========================================================= */
function renderGames() {
  const grid = $("#gameGrid");
  grid.innerHTML = GAMES.map((g) => `
    <article class="game-card" style="--accent:${g.accent};--accent-soft:${g.accent}33">
      <span class="game-card__glow" aria-hidden="true"></span>
      <img class="game-card__img" src="${g.image}" alt="" loading="lazy" width="56" height="56">
      <span class="game-card__icon">${mark(g.glyph, 58)}</span>
      <h3>${esc(g.name)}</h3>
      <p>${esc(g.activity)}</p>
      <div class="game-card__bar" role="img" aria-label="Community activity ${g.level} out of 100">
        <i style="width:${g.level}%"></i>
      </div>
      <a class="btn btn--ghost" href="${LINKS.discord}" target="_blank" rel="noopener noreferrer">Explore</a>
    </article>`).join("");

  setupImageFallback(grid);
  bindMagnetic(grid);
  bindTilt(grid);
}

/* =========================================================
   16. RENDER — FAQ ACCORDION (one open at a time)
   ========================================================= */
function renderFaq() {
  const list = $("#faqList");
  list.innerHTML = FAQS.map((f, i) => `
    <article class="faq-item">
      <h3>
        <button class="faq-item__q" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}">
          ${esc(f.q)} <i class="fa-solid fa-plus" aria-hidden="true"></i>
        </button>
      </h3>
      <div class="faq-item__a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}">
        <p>${linkify(f.a)}</p>
      </div>
    </article>`).join("");

  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq-item__q");
    if (!btn) return;
    const item = btn.closest(".faq-item");
    const panel = item.querySelector(".faq-item__a");
    const open = item.classList.contains("is-open");

    $$(".faq-item", list).forEach((it) => {
      it.classList.remove("is-open");
      it.querySelector(".faq-item__a").style.maxHeight = "";
      it.querySelector(".faq-item__q").setAttribute("aria-expanded", "false");
    });

    if (!open) {
      item.classList.add("is-open");
      panel.style.maxHeight = panel.scrollHeight + "px";
      btn.setAttribute("aria-expanded", "true");
    }
  });
}

/* =========================================================
   17. STAFF FORM
   ========================================================= */
function staffForm() {
  $("#roleList").innerHTML = STAFF_ROLES.map((r) =>
    `<li><i class="fa-solid fa-chevron-right" aria-hidden="true"></i>${esc(r)}</li>`).join("");

  const select = $("#fRole");
  select.innerHTML = `<option value="">Choose a role…</option>` +
    STAFF_ROLES.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("");

  const form = $("#staffForm"), status = $("#formStatus"), done = $("#staffDone");

  const rules = {
    fUser:  (v) => v.trim().length >= 2 || "Enter your Discord username.",
    fAge:   (v) => (Number(v) >= 13 && Number(v) <= 99) || "Age must be between 13 and 99.",
    fRole:  (v) => !!v || "Pick a position.",
    fAvail: (v) => v.trim().length >= 3 || "Roughly when are you around?",
    fExp:   (v) => v.trim().length >= 15 || "Give us at least a sentence or two.",
    fSkills:(v) => v.trim().length >= 3 || "List at least one skill.",
    fWhy:   (v) => v.trim().length >= 25 || "Tell us a bit more — 25 characters minimum.",
    fPort:  (v) => !v.trim() || /^https?:\/\/\S+\.\S+/.test(v.trim()) || "Use a full URL starting with http."
  };

  const validate = (id) => {
    const el = document.getElementById(id);
    const res = rules[id](el.value);
    const field = el.closest(".field");
    const msg = $(`[data-err="${id}"]`);
    const ok = res === true;
    field.classList.toggle("is-bad", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    msg.textContent = ok ? "" : res;
    return ok;
  };

  Object.keys(rules).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => validate(id));
    el.addEventListener("input", () => {
      if (el.closest(".field").classList.contains("is-bad")) validate(id);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = Object.keys(rules).filter((id) => !validate(id));
    if (bad.length) {
      status.className = "form-status is-bad";
      status.textContent = `${bad.length} field${bad.length > 1 ? "s need" : " needs"} attention.`;
      document.getElementById(bad[0]).focus();
      return;
    }
    status.className = "form-status is-ok";
    status.textContent = "Checked in your browser. Nothing was sent anywhere.";
    done.hidden = false;
    done.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    toast({ title:"Application ready", body:"Copy your answers and post them in Discord.", icon:"fa-clipboard-check", accent:"#3ddc84" });
  });

  $("#copyApp").addEventListener("click", async () => {
    const d = new FormData(form);
    const text =
`FireGlide staff application
Discord: ${d.get("user")}
Age: ${d.get("age")}
Position: ${d.get("role")}
Availability: ${d.get("availability")}
Skills: ${d.get("skills")}
Experience: ${d.get("experience")}
Why me: ${d.get("why")}
Portfolio: ${d.get("portfolio") || "—"}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title:"Copied", body:"Your answers are on the clipboard.", icon:"fa-copy", accent:"#00d4ff" });
    } catch {
      toast({ title:"Copy blocked", body:"Your browser refused clipboard access — select the fields and copy manually.", icon:"fa-triangle-exclamation", accent:"#ff9a2e" });
    }
  });
}

/* =========================================================
   18. DISCORD STATS — API-ready, no secrets in the browser
   ---------------------------------------------------------
   The frontend only ever calls your own endpoint. A Discord bot token
   must live on the server, never here. See the notes at the end of
   this file for a minimal backend.
   ========================================================= */
async function updateDiscordStats() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  try {
    const res = await fetch(DISCORD_ENDPOINT, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    set("memberCount", Number(data.members).toLocaleString());
    set("onlineCount", Number(data.online).toLocaleString());
    set("ctaMembers", Number(data.members).toLocaleString());
    set("ctaOnline", Number(data.online).toLocaleString());
    set("serverStatus", data.status || "Online");
    set("memberNote", "Live from Discord");
    set("statusNote", "Updated " + new Date().toLocaleTimeString());
    $("#serverStatus").style.color = "";
  } catch (error) {
    console.log("Discord API unavailable — showing offline state.", error.message);
    set("memberCount", "—");
    set("onlineCount", "—");
    set("ctaMembers", "—");
    set("ctaOnline", "—");
    set("serverStatus", "No live data");
    set("memberNote", "Connect /api/discord to show live numbers");
    set("statusNote", "Endpoint not reachable");
    const s = $("#serverStatus");
    if (s) s.style.color = "var(--muted)";
  }
}

/* =========================================================
   19. TOASTS
   ========================================================= */
function toast({ title, body, icon = "fa-fire", accent = "#ff4d1c", brand = false }) {
  const wrap = $("#toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.style.setProperty("--accent", accent);
  el.innerHTML = `
    <i class="${brand ? "fa-brands" : "fa-solid"} ${icon}" style="color:${accent}" aria-hidden="true"></i>
    <div class="toast__body"><b>${esc(title)}</b><span>${esc(body)}</span></div>
    <button class="toast__x" aria-label="Dismiss notification">✕</button>`;
  wrap.appendChild(el);

  const kill = () => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 350);
  };
  el.querySelector(".toast__x").addEventListener("click", kill);
  setTimeout(kill, 6500);
}

function toastRotation() {
  if (REDUCED) return;
  let i = 1;
  setInterval(() => {
    if (document.hidden) return;
    const t = TOASTS[i % TOASTS.length];
    i++;

    if (t.dynamic === "video") {
      const v = STATE.videos.find((x) => !x.isShort) || STATE.videos[0];
      if (v) {
        toast({
          title: `New ${v.creator} video`,
          body: v.title,
          icon: v.isShort ? "fa-bolt" : "fa-fire",
          accent: v.creatorId === "firepdx" ? "#ff9a2e" : "#00d4ff"
        });
        return;
      }
      toast({ title:"Videos synced", body:"Latest uploads are in the grid below.", icon:"fa-play", accent:"#ff9a2e" });
      return;
    }
    toast(t);
  }, 26000);
}

/* =========================================================
   20. SEARCH (Ctrl/Cmd + K, Esc to close)
   ========================================================= */
let SEARCH_INDEX = [];
function buildIndex() {
  const idx = [];
  CREATORS.forEach((c) => idx.push({ kind:"Creator", title:c.name, sub:c.role + " · " + c.tags.join(", "), icon:"fa-user-astronaut", accent:c.accent, href:c.link, external:true }));
  const vids = STATE.videos.length ? STATE.videos : VIDEOS;
  vids.forEach((v) => idx.push({
    kind: v.isLive ? "Live" : (v.isShort ? "Short" : "Video"),
    title: v.title,
    sub: `${v.creator} · ${v.game}`,
    icon: v.isLive ? "fa-tower-broadcast" : "fa-play",
    accent: v.isLive ? "#ff3b3b" : "#ff9a2e",
    href: v.link, external: true, play: v.videoId || ""
  }));
  EVENTS.forEach((e) => idx.push({ kind:"Event", title:e.title, sub:`${fmtDate(e.date)} · ${e.prize}`, icon:"fa-trophy", accent:"#00d4ff", href:"#events" }));
  GAMES.forEach((g) => idx.push({ kind:"Game", title:g.name, sub:g.activity, icon:g.icon, accent:g.accent, href:"#games" }));
  FAQS.forEach((f) => idx.push({ kind:"FAQ", title:f.q, sub:f.a.slice(0, 80) + "…", icon:"fa-circle-question", accent:"#9aa4b4", href:"#faq" }));
  STAFF_ROLES.forEach((r) => idx.push({ kind:"Staff", title:r, sub:"Open application", icon:"fa-shield-halved", accent:"#3ddc84", href:"#staff" }));
  idx.push({ kind:"Community", title:"Join the Discord", sub:"discord.gg/zVZvjDcu", icon:"fa-discord", accent:"#5865f2", href:LINKS.discord, external:true, brand:true });
  return idx;
}

function rebuildSearchIndex() { SEARCH_INDEX = buildIndex(); }

function search() {
  if (!SEARCH_INDEX.length) rebuildSearchIndex();
  const overlay = $("#search"), input = $("#searchInput"),
        results = $("#searchResults"), openBtn = $("#searchOpen"), closeBtn = $("#searchClose");
  let sel = 0, last = null;

  const open = () => {
    last = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("is-locked");
    input.value = "";
    render("");
    input.focus();
  };
  const close = () => {
    overlay.hidden = true;
    document.body.classList.remove("is-locked");
    last?.focus();
  };

  function render(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      results.innerHTML = `<p class="search__hint">Search creators, videos, events, games, staff roles and FAQ. Use ↑ ↓ to move, Enter to open.</p>`;
      return;
    }
    const hits = SEARCH_INDEX.filter((i) =>
      (i.title + " " + i.sub + " " + i.kind).toLowerCase().includes(query)).slice(0, 12);

    if (!hits.length) {
      results.innerHTML = `<p class="search__hint">Nothing matched “${esc(q)}”. Try a creator name, a game, or “staff”.</p>`;
      return;
    }
    sel = 0;
    results.innerHTML = hits.map((h, i) => `
      <button class="search-result${i === 0 ? " is-sel" : ""}" style="--accent:${h.accent}"
              data-href="${h.href}" data-ext="${h.external ? 1 : 0}" data-play="${h.play || ""}"
              role="option" aria-selected="${i === 0}">
        <span class="search-result__icon"><i class="${h.brand ? "fa-brands" : "fa-solid"} ${h.icon}"></i></span>
        <span class="search-result__txt"><b>${esc(h.title)}</b><span>${esc(h.sub)}</span></span>
        <span class="search-result__kind">${h.kind}</span>
      </button>`).join("");
  }

  function go(btn) {
    if (!btn) return;
    const href = btn.dataset.href;
    close();
    if (btn.dataset.play) {
      const v = STATE.videos.find((x) => x.videoId === btn.dataset.play);
      if (v) { openPlayer(v); return; }
    }
    if (btn.dataset.ext === "1") window.open(href, "_blank", "noopener");
    else document.querySelector(href)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  input.addEventListener("input", () => render(input.value));
  results.addEventListener("click", (e) => go(e.target.closest(".search-result")));

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay.hidden ? open() : close();
      return;
    }
    if (overlay.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }

    const items = $$(".search-result", results);
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => {
        it.classList.toggle("is-sel", i === sel);
        it.setAttribute("aria-selected", String(i === sel));
      });
      items[sel].scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") { e.preventDefault(); go(items[sel]); }
  });
}

/* =========================================================
   20b. ON-SITE PLAYER — real YouTube videos play inside the page
   ---------------------------------------------------------
   Any element marked data-play="<videoId>" opens this modal instead of
   navigating away. The iframe is built on open and torn down on close, so
   nothing keeps loading (or playing) in the background.
   ========================================================= */
let PLAYER_LAST_FOCUS = null;
let PLAYER_CURRENT = null;

function openPlayer(v) {
  const box = $("#player"), frame = $("#playerFrame");
  if (!box || !frame || !v || !v.videoId) return;

  PLAYER_LAST_FOCUS = document.activeElement;
  PLAYER_CURRENT = v;

  // Shorts are filmed vertical — playing them in a forced 16:9 box crops or
  // letterboxes them badly, so the shell switches to a 9:16 frame for those.
  box.dataset.vertical = v.isShort ? "1" : "";
  box.classList.add("is-buffering");

  frame.src = `https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  frame.title = v.title;
  $("#playerTitle").textContent = v.title;
  $("#playerMeta").textContent = [
    v.creator, v.game,
    v.views ? compact(v.views) + " views" : "",
    v.date ? ago(v.date) : ""
  ].filter(Boolean).join(" · ");

  const link = $("#playerLink");
  link.href = v.link;
  link.className = `btn ${v.creatorId === "firepdx" ? "btn--fire" : "btn--glide"} btn--sm sheen`;

  const nav = $("#playerNav");
  if (nav) {
    const list = STATE.filteredList && STATE.filteredList.length ? STATE.filteredList : STATE.videos;
    const idx = list.findIndex((x) => x.videoId === v.videoId);
    nav.hidden = idx < 0 || list.length < 2;
  }

  box.hidden = false;
  document.body.classList.add("is-locked");
  $("#playerClose")?.focus();
}

function closePlayer() {
  const box = $("#player"), frame = $("#playerFrame");
  if (!box || box.hidden) return;
  box.hidden = true;
  box.classList.remove("is-buffering");
  frame.src = "";                        // stops playback and releases the tab
  document.body.classList.remove("is-locked");
  PLAYER_CURRENT = null;
  PLAYER_LAST_FOCUS?.focus();
}

/* steps to the previous/next video in whatever list is currently on screen,
   so the player can be browsed with the arrow keys without closing it */
function stepPlayer(dir) {
  if (!PLAYER_CURRENT) return;
  const list = STATE.filteredList && STATE.filteredList.length ? STATE.filteredList : STATE.videos;
  const idx = list.findIndex((x) => x.videoId === PLAYER_CURRENT.videoId);
  if (idx < 0) return;
  const next = list[(idx + dir + list.length) % list.length];
  if (next) openPlayer(next);
}

function playerModal() {
  const box = $("#player"), frame = $("#playerFrame");
  if (!box) return;

  /* delegated click — survives every re-render of the video grids */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-play]");
    if (!t || !t.dataset.play) return;
    const v = STATE.videos.find((x) => x.videoId === t.dataset.play)
           || STATE.live.find((x) => x.videoId === t.dataset.play);
    if (!v) return;
    e.preventDefault();
    openPlayer(v);
  });

  frame?.addEventListener("load", () => {
    if (frame.src) box.classList.remove("is-buffering");
  });

  $("#playerClose").addEventListener("click", closePlayer);
  $("#playerPrev")?.addEventListener("click", () => stepPlayer(-1));
  $("#playerNext")?.addEventListener("click", () => stepPlayer(1));
  box.addEventListener("click", (e) => { if (e.target === box) closePlayer(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") closePlayer();
    else if (e.key === "ArrowRight") stepPlayer(1);
    else if (e.key === "ArrowLeft") stepPlayer(-1);
  });
}

/* =========================================================
   21. BUTTON EFFECTS — ripple + magnetic
   ========================================================= */
function ripples() {
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn, .filter");
    if (!btn || REDUCED) return;
    const r = btn.getBoundingClientRect();
    const span = document.createElement("span");
    const size = Math.max(r.width, r.height);
    span.className = "ripple";
    span.style.width = span.style.height = size + "px";
    span.style.left = e.clientX - r.left - size / 2 + "px";
    span.style.top = e.clientY - r.top - size / 2 + "px";
    btn.appendChild(span);
    setTimeout(() => span.remove(), 620);
  });
}

function bindMagnetic(root = document) {
  if (TOUCH || REDUCED) return;
  $$("[data-magnetic]", root).forEach((el) => {
    if (el.dataset.magBound) return;
    el.dataset.magBound = "1";
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
}

/* 3D pointer tilt — game cards and video cards follow the cursor.
   Only binds once the entrance animation has finished, so the two
   transform systems never fight. */
function bindTilt(root = document) {
  if (TOUCH || REDUCED) return;
  $$(".game-card, .video-card", root).forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = "1";
    card.addEventListener("mousemove", (e) => {
      if (card.style.animation && card.style.animation !== "none") return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 11}deg) rotateX(${-y * 11}deg) translateY(-5px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* =========================================================
   22. EXTERNAL LINK SAFETY
   ========================================================= */
function externalLinks() {
  $$("a[href^='http']").forEach((a) => {
    if (a.host === location.host) return;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (!a.getAttribute("aria-label") && a.textContent.trim())
      a.setAttribute("aria-label", a.textContent.trim() + " (opens in a new tab)");
  });
}

/* =========================================================
   23. BOOT
   ========================================================= */
function init() {
  applyImages();

  renderCreators();
  renderFilters();
  renderFeatured();
  renderVideos("all");
  renderEvents();
  renderCounters();
  renderGames();
  renderFaq();
  staffForm();

  setupImageFallback();
  externalLinks();
  bindMagnetic();

  navigation();
  reveals();
  heroParallax();
  customCursor();
  themeSwitcher();
  particleField();
  ripples();
  search();
  playerModal();
  countdown();

  updateDiscordStats();
  setInterval(updateDiscordStats, DISCORD_REFRESH_MS);

  loadYouTube();
  startYouTubePolling();

  toastRotation();
  runLoader();

  console.log("%cFIREGLIDE", "color:#ff4d1c;font:700 26px sans-serif", "— where fire meets glide.");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

/* =========================================================
   24. CONNECTING REAL DISCORD NUMBERS (read me)
   ---------------------------------------------------------
   This site is static HTML/CSS/JS, so it cannot talk to the Discord
   bot API directly. Doing that would mean shipping a bot token to every
   visitor, and anyone could read it from view-source and take over the
   bot. Never put DISCORD_BOT_TOKEN in HTML, CSS or JS.

   The frontend above already calls one endpoint: /api/discord.
   Host that endpoint anywhere that runs server code — Vercel, Netlify
   Functions, Cloudflare Workers, Express — and return JSON shaped like:

       { "members": 12480, "online": 843, "status": "Online" }

   Example (Vercel / Netlify, file: api/discord.js):

       export default async function handler(req, res) {
         const r = await fetch(
           `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}?with_counts=true`,
           { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
         );
         const g = await r.json();
         res.setHeader("Cache-Control", "s-maxage=60");
         res.json({
           members: g.approximate_member_count,
           online:  g.approximate_presence_count,
           status:  "Online"
         });
       }

   The token stays in the host's environment variables. The browser only
   ever sees three numbers.

   Simpler option with no backend at all: enable the server widget in
   Discord (Server Settings → Widget) and point DISCORD_ENDPOINT at
   https://discord.com/api/guilds/GUILD_ID/widget.json — that returns
   presence_count publicly, but not total member count.

   Until either is wired up, the panel honestly shows "No live data"
   instead of a fake hardcoded number.
   ========================================================= */

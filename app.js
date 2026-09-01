/* ============================================================
   Lumina Chat — Logique de l'application
   API : https://chat-free-gpt.vercel.app/api/chat
   ============================================================ */
"use strict";

/* ---------- Configuration ---------- */
const API_BASE = "https://chat-free-gpt.vercel.app";
const API_URL = `${API_BASE}/api/chat`;
const API_PLOT_URL = `${API_BASE}/api/plot`; // figures : courbes (expression=) & schémas IA (subject=)
const DEFAULT_MODEL = "gpt-5.6-luna";
const LANG = "fr";
const MAX_IMAGES = 4;
const MAX_IMAGES_PER_REQUEST = 4;

/* ---------- Modèles (liste officielle testée du backend) ---------- */
const MODELS = {
  "OpenAI (GPT)": [
    ["gpt-5.6-luna", "gpt-5.6-luna (défaut)"],
    ["gpt-5", "gpt-5"],
    ["gpt-5-mini", "gpt-5-mini"],
    ["gpt-5-nano", "gpt-5-nano"],
    ["gpt-5.1", "gpt-5.1"],
    ["gpt-5.1-mini", "gpt-5.1-mini"],
    ["gpt-5.1-nano", "gpt-5.1-nano"],
    ["gpt-5.2", "gpt-5.2"],
    ["gpt-4o-mini", "gpt-4o-mini"],
    ["gpt-4-turbo", "gpt-4-turbo"],
    ["gpt-4.1", "gpt-4.1"],
    ["gpt-4.1-mini", "gpt-4.1-mini"],
    ["gpt-4.1-nano", "gpt-4.1-nano"],
    ["gpt-4", "gpt-4"],
    ["gpt-3.5-turbo", "gpt-3.5-turbo"],
    ["o1", "o1"], ["o1-mini", "o1-mini"],
    ["o3", "o3"], ["o3-mini", "o3-mini"], ["o4-mini", "o4-mini"],
  ],
  "DeepSeek": [
    ["deepseek-chat", "deepseek-chat"],
    ["deepseek-reasoner", "deepseek-reasoner"],
    ["deepseek-v3", "deepseek-v3"],
    ["deepseek-r1", "deepseek-r1"],
  ],
  "Claude (Anthropic)": [
    ["claude-3-5-sonnet-20241022", "claude-3.5 sonnet"],
    ["claude-sonnet-4-20250514", "claude sonnet 4"],
    ["claude-3-5-haiku", "claude-3.5 haiku"],
    ["claude-3-opus", "claude-3 opus"],
  ],
  "Gemini (Google)": [
    ["gemini-1.5-pro", "gemini 1.5 pro"],
    ["gemini-2.0-flash", "gemini 2.0 flash"],
    ["gemini-2.5-flash", "gemini 2.5 flash"],
    ["gemini-2.5-pro", "gemini 2.5 pro"],
  ],
  "Llama (Meta)": [
    ["llama-3.3-70b-versatile", "llama 3.3 70b"],
    ["llama-3.1-8b-instant", "llama 3.1 8b"],
  ],
  "Grok (xAI)": [["grok-2", "grok-2"], ["grok-3", "grok-3"]],
  "Autres": [
    ["qwen2.5-72b-instruct", "qwen 2.5 72b"],
    ["mixtral-8x7b-instruct", "mixtral 8x7b"],
  ],
  "Réservés PRO 🔒": [
    ["gpt-5.6-terra", "gpt-5.6-terra (PRO)"],
    ["gpt-4o", "gpt-4o (PRO)"],
  ],
};
const PRO_MODELS = new Set(["gpt-5.6-terra", "gpt-4o"]);

/* ---------- État ---------- */
const store = {
  uid: "",
  history: [],          // conversations
  activeId: null,
  sending: false,
  attachments: [],      // {type:'data'|'url', name, value}
};

const LS_HISTORY = "lumina.chat.history.v1";
const LS_UID = "lumina.chat.uid";
const LS_ACTIVE = "lumina.chat.active.v1";

/* ---------- Helpers DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

function uid() {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
  } catch (e) { /* noop */ }
  return "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---------- Stockage ---------- */
function saveHistory() {
  try {
    localStorage.setItem(LS_HISTORY, JSON.stringify(store.history));
    localStorage.setItem(LS_ACTIVE, store.activeId || "");
  } catch (e) { /* quota */ }
}
function loadHistory() {
  try {
    store.history = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];
    store.activeId = localStorage.getItem(LS_ACTIVE) || null;
  } catch (e) {
    store.history = [];
    store.activeId = null;
  }
}

function getConversation(id) {
  return store.history.find((c) => c.id === id) || null;
}

/* ---------- Rendu Markdown sécurisé ---------- */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderInline(text) {
  let s = escapeHtml(text);
  // images ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, alt, url) => `<img src="${url}" alt="${alt}" loading="lazy" onclick="window.Lumina.openImage('${url.replace(/'/g, "\\'")}')" />`);
  // liens [texte](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  // gras
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italique
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // code inline
  s = s.replace(/`([^`\n]+)`/g, "<code class='inline'>$1</code>");
  return s;
}

function renderMarkdown(src) {
  if (!src) return "";
  const blocks = [];
  let text = src;

  // 1. extraire les blocs de code (protégés : jamais touchés par la suite)
  text = text.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const token = `@@BLOCK${blocks.length}@@`;
    blocks.push({ kind: "code", lang, code });
    return token;
  });

  // 2. normaliser le LaTeX : le modèle double souvent les backslashes (\\frac → \frac)
  text = text.replace(/\\(?=\\)/g, "");

  // 3. extraire les maths « display » multi-lignes ($ … $ et \[ … \])
  text = text.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    const token = `@@BLOCK${blocks.length}@@`;
    blocks.push({ kind: "math", content: m });
    return token;
  });
  text = text.replace(/\\\[[\s\S]*?\\\]/g, (m) => {
    const token = `@@BLOCK${blocks.length}@@`;
    blocks.push({ kind: "math", content: m });
    return token;
  });

  // 4. lignes
  const lines = text.split("\n");
  const out = [];
  let para = [];

  const flush = () => {
    if (para.length) {
      out.push("<p>" + para.map(renderInline).join("<br/>") + "</p>");
      para = [];
    }
  };

  for (let line of lines) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    const m = t.match(/^@@BLOCK(\d+)@@$/);
    if (m) { flush(); out.push(buildBlock(blocks[+m[1]])); continue; }
    if (/^#{1,3}\s/.test(t)) {
      flush();
      const level = t.match(/^#+/)[0].length;
      out.push(`<h${level}>${renderInline(t.replace(/^#{1,3}\s*/, ""))}</h${level}>`);
    } else if (/^---+$/.test(t)) {
      flush(); out.push("<hr/>");
    } else if (/^>\s?/.test(t)) {
      flush();
      out.push(`<blockquote>${renderInline(t.replace(/^>\s?/, ""))}</blockquote>`);
    } else if (/^[-*]\s+/.test(t)) {
      flush();
      out.push(`<ul><li>${renderInline(t.replace(/^[-*]\s+/, ""))}</li></ul>`);
    } else if (/^\d+\.\s+/.test(t)) {
      flush();
      out.push(`<ol><li>${renderInline(t.replace(/^\d+\.\s+/, ""))}</li></ol>`);
    } else {
      para.push(t);
    }
  }
  flush();
  // blocs restants (ex. collés à du texte)
  return out.join("\n").replace(/@@BLOCK(\d+)@@/g, (_m, i) => buildBlock(blocks[+i]));
}

function buildBlock(b) {
  if (b.kind === "code") return buildCodeBlock(b.code, b.lang);
  return `<div class="math-block">${b.content}</div>`;
}

function buildCodeBlock(code, lang) {
  const esc = escapeHtml(code.replace(/\n$/, ""));
  return `<pre><code class="language-${escapeHtml(lang || "text")}">${esc}</code>` +
    `<button class="code-copy" data-code="${encodeURIComponent(code)}">Copier</button></pre>`;
}

/* ---------- Rendu mathématique (KaTeX) ---------- */
const MATH_DELIMITERS = [
  { left: "$", right: "$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "\\(", right: "\\)", display: false },
  { left: "$", right: "$", display: false },
];

function renderMath(root) {
  if (!window.renderMathInElement) {
    // KaTeX pas encore chargé (CDN lent/indisponible) : file d'attente,
    // l'application continue de fonctionner normalement.
    (window.__mathQueue || (window.__mathQueue = [])).push(root);
    return;
  }
  try {
    window.renderMathInElement(root, {
      delimiters: MATH_DELIMITERS,
      throwOnError: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
    });
  } catch (e) { /* KaTeX en erreur : le LaTeX reste affiché en texte brut */ }
}

function flushMathQueue() {
  if (!window.renderMathInElement || !window.__mathQueue || !window.__mathQueue.length) return;
  const q = window.__mathQueue;
  window.__mathQueue = [];
  q.forEach(renderMath);
}
document.addEventListener("DOMContentLoaded", flushMathQueue);
window.addEventListener("load", flushMathQueue);
setTimeout(flushMathQueue, 5000); // filet de sécurité (CDN très lent)

/* ---------- Thèmes dynamiques pour les réponses du bot ----------
   Chaque réponse de l'API reçoit une palette de couleurs calculée
   selon son contenu (mots-clés + empreinte du texte) : les titres,
   sous-titres, gras, puces et la barre de la bulle prennent les
   couleurs du thème. Résultat : une réponse colorée, vivante et
   différente à chaque fois. */
const THEME_KEYWORDS = [
  [/conseil|astuce|routine|guide|méthode|étape/i, "emerald"],
  [/erreur|impossible|échou|refus|⚠|❌|échec|problème/i, "flame"],
  [/explique|défin|qu'est-ce|c'est quoi|histoire|origine/i, "ocean"],
  [/analys|compar|différence|tableau|avantage|inconvénient/i, "royal"],
  [/prix|coût|tarif|€|ariary|\$|budget|💰/i, "gold"],
];
const THEMES = ["aurora", "flame", "ocean", "emerald", "royal", "gold"];

function pickTheme(text) {
  if (!text) return "aurora";
  for (const [re, theme] of THEME_KEYWORDS) {
    if (re.test(text)) return theme;
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return THEMES[h % THEMES.length];
}

/* ---------- Rendu des messages ---------- */
function msgImagesGrid(images) {
  if (!images || !images.length) return "";
  const n = images.length;
  const cls = n === 1 ? "grid-1" : n === 2 ? "grid-2" : "grid-3";
  const imgs = images.slice(0, 12).map((u) =>
    `<img src="${u}" alt="Image générée" loading="lazy" onclick="window.Lumina.openImage(this.src)" />`
  ).join("");
  return `<div class="msg-images ${cls}">${imgs}</div>`;
}

function renderMessage(m) {
  const role = m.role;
  const msg = el("div", `msg ${role}${m.error ? " error" : ""}`);
  if (role === "assistant") msg.classList.add("theme-" + pickTheme(m.text));

  const bubble = el("div", "msg-bubble");
  if (m.text) {
    bubble.innerHTML = renderMarkdown(m.text);
    renderMath(bubble);
  }
  if (m.images && m.images.length) bubble.insertAdjacentHTML("beforeend", msgImagesGrid(m.images));
  if (m.figure && m.figure.svg) bubble.appendChild(buildFigureBlock(m.figure.svg, m.figure.title));

  const meta = el("div", "msg-meta");
  const time = m.time ? new Date(m.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  if (m.model) meta.appendChild(el("span", "m-model", m.model));
  if (time) meta.appendChild(el("span", "m-time", time));
  if (m.completed) meta.appendChild(el("span", "m-note", "✂️ réponse complétée"));
  if (m.images && m.images.length) meta.appendChild(el("span", "m-vision", "🖼️ vision"));
  bubble.appendChild(meta);

  msg.appendChild(bubble);
  return msg;
}

function renderTyping() {
  const msg = el("div", "msg assistant");
  const bubble = el("div", "msg-bubble");
  bubble.appendChild(el("div", "typing", "<span></span><span></span><span></span>"));
  msg.appendChild(bubble);
  return msg;
}

function scrollToBottom(smooth = true) {
  const area = $("#chatArea");
  area.scrollTo({ top: area.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

/* ============================================================
   Figures construites — courbes mathématiques & schémas SVG
   ------------------------------------------------------------
   Quand la demande contient une consigne de dessin (« trace la
   courbe de f(x)=… », « fais le schéma d'un circuit… », ou une
   photo d'exercice avec ce type de question), le site appelle la
   route /api/plot de l'API chat-free-gpt et affiche l'image de la
   figure construite (SVG) à la fin de la réponse du bot, avec une
   petite légende. Deux modes, comme l'API :
     • expression=  → courbe mathématique (déterministe, instantané)
     • subject=     → n'importe quelle figure par IA (schéma…)
   ============================================================ */
const FIGURE_INTENT_RE = /courbe|courbes|trac(er|é|e)|graphe|graphique|représent(er|ation|ative|e)|schéma|schématis|figure|figures|dessin(er|e)?|diagramme|croquis|parabole|hyperbole|allure|montage|circuit|construis|construire/i;
const MATH_FN_RE = /(?:ln|log10|log2|log|exp|sqrt|cbrt|abs|sign|floor|ceil|round|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|min|max)\s*\(/gi;
const EXPR_STOP_WORDS = /\s+(?:où|avec|sur|dans|pour|quand|et|alors|est|soit|telle? que)\b/i;

function hasFigureIntent(text) {
  return FIGURE_INTENT_RE.test(String(text || ""));
}

/* Normalise une expression « scolaire » vers la syntaxe de l'API :
   f(x)=…, y=…, x²/x³ (exposants Unicode), √x, −, ×, ÷, π, virgule décimale. */
function normalizeExpression(raw) {
  let s = String(raw || "").trim();
  s = s.replace(/^[a-z]\s*\(\s*x\s*\)\s*[:=]\s*/i, ""); // f(x)= / g(x): …
  s = s.replace(/^y\s*[:=]\s*/i, "");                    // y =
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => "^" + "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(m));
  s = s.replace(/√\s*\(/g, "sqrt(");                    // √(x+1) → sqrt(x+1)
  s = s.replace(/√\s*([a-zA-Z0-9π]+)/g, "sqrt($1)");    // √x → sqrt(x)
  s = s.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "pi");
  s = s.replace(/(\d),(\d)/g, "$1.$2");                  // 2,5x → 2.5x
  s = s.replace(/\*\*/g, "^");
  return s.replace(/\s+/g, "");
}

/* Vérifie qu'une chaîne ressemble à une expression en x utilisable
   (noms de fonctions connues + constantes pi/e + variable x uniquement). */
function looksLikeExpression(s) {
  if (!s || !/x/i.test(s) || /[=<>]/.test(s)) return false;
  let t = s.replace(MATH_FN_RE, "(");
  t = t.replace(/\b(?:pi|e)\b/g, " ");
  const ids = t.match(/[a-zA-Z]+/g) || [];
  return ids.length > 0 && ids.every((id) => id.toLowerCase() === "x");
}

/* Extrait une expression mathématique d'un texte (mode courbe). */
function extractExpression(text) {
  if (!text) return null;
  const src = String(text);
  let m = src.match(/(?:[a-z]\s*\(\s*x\s*\)\s*[:=]\s*)([^,;.!?…\n]+)/i);   // f(x)=…
  if (!m) m = src.match(/(?:^|[^a-z])y\s*[:=]\s*([^,;.!?…\n]+)/i);       // y = …
  if (!m) m = src.match(/d['’]équation\s+([^,;.!?…\n]+)/i);              // d'équation …
  if (!m) return null;
  const raw = m[1].trim().split(EXPR_STOP_WORDS)[0];
  const send = normalizeExpression(raw);
  if (!looksLikeExpression(send)) return null;
  return { send, display: send };
}

/* Nettoie la question utilisateur pour en faire un sujet de figure IA. */
function cleanSubject(text) {
  let s = String(text || "").trim().replace(/[?!.]+$/, "");
  // 1) ouvertures polies : « peux-tu », « je veux que tu »…
  s = s.replace(/^(?:peux[- ]?tu|pourrais[- ]?tu|peut[- ]?tu|est[- ]?ce que tu peux|tu peux|je veux(?: que tu)?|j'aimerais(?: que tu)?)\s+/i, "");
  // 2) impératifs : « fais-moi », « dessine », « trace »…
  s = s.replace(/^(?:fais[- ]?(?:moi|nous)?|dessine[- ]?(?:moi|nous)?|montre[- ]?(?:moi|nous)?|trace[- ]?(?:moi|nous)?|construis[- ]?(?:moi|nous)?|repr[ée]sente[- ]?(?:moi|nous)?|sch[ée]matise[- ]?(?:moi|nous)?)\s+/i, "");
  // 3) infinitifs précédés d'un pronom : « me dessiner », « nous montrer »…
  s = s.replace(/^(?:me|nous|toi|moi)\s*(?:faire|dessiner|montrer|tracer|construire|repr[ée]senter|sch[ée]matiser)\s+/i, "");
  s = s.replace(/\b(?:s'il te plaît|svp|stp|merci(?: beaucoup)?|please)\b/gi, "");
  s = s.replace(/\s+(?:suivant|suivante|suivants|suivantes|ci-dessous|ci-dessus|ci-contre)\s*$/i, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s.slice(0, 300);
}

/* Extrait de la réponse du bot la phrase contenant la consigne de dessin
   (cas photo d'exercice : la question est dans l'image, le bot la reformule). */
function subjectFromReply(replyText) {
  const t = String(replyText || "");
  const sentences = t.split(/\n+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (hasFigureIntent(s)) {
      return cleanSubject(s.replace(/^\s*(?:\d+[.)]\s*|[a-z][.)]\s*|[-*•]\s+)/i, ""));
    }
  }
  return null;
}

/* ============================================================
   Construction géométrique (moteur déterministe /api/geo)
   ------------------------------------------------------------
   Quand l'énoncé contient des constructions de géométrie (« Tracer
   la droite (AB) », « Placer un point P sur (AB) », « perpendiculaire
   à (AB) passant par P »…) — questions successives d'un exercice —
   le site appelle /api/geo : le moteur CALCULE chaque construction
   (coordonnées exactes, aucune hallucination) et renvoie UNE figure
   cumulative qui les montre toutes.
   ============================================================ */
/* Détecte un énoncé de géométrie (texte utilisateur ou réponse du bot) :
   toutes les constructions (droites, cercles, angles, transformations,
   polygones, concurrence…) → le moteur /api/geo construit la figure exacte,
   ou l'IA en repli si la construction n'est pas reconnue. */
const GEO_INTENT_RE = /construi(?:re|s)\s+(?:un|le|l')?\s*angle|angle\s+[A-Z]{3}|angle\s+(?:de|d')|sym[eé]trique|sym[eé]trie|translation|rotation|homoth[eé]tie|image\s+de\s+[A-Z]\s+par|tangente\s+au\s+cercle|trap[eè]ze|pentagone|hexagone|droite\s+des\s+milieux|[A-Z]{2}\s*=\s*\d+\s*cm|passant\s+par\s+[A-Z]\s+et\s+[A-Z]|perpendiculaire|parall[eè]le|m[eé]diatrice|m[eé]diane\s+issue|hauteur\s+issue|bissectrice|cercle\s+de\s+(?:centre|diam|rayon)|cercle\s+(?:circonscrit|inscrit)|triangle\s+[A-Z]{3}|triangle\s+(?:[eé]quilat[eé]ral|isoc[eè]le|rectangle)|carr[eé]\s+[A-Z]{4}|rectangle\s+[A-Z]{4}|losange|parall[eé]logramme|quadrilat[eè]re\s+[A-Z]{4}|segment\s*\[[A-Z]{2}\]|demi[- ]droite|milieu\s+de\s+\[?[A-Z]{2}\]?|se\s+coupent\s+en|\([A-Z]{2}\)\s*(?:et\s+\([A-Z]{2}\)|passant)?|placer\s+(?:(?:le|un)\s+)?point\s+[A-Z]\s+sur|soi(?:t|ent)\s+[A-Z].{0,40}points?|appartient\s+[àa]\s+(?:la\s+droite|le\s+segment)/i;

/* Détecte un énoncé de géométrie (texte utilisateur ou réponse du bot) et
   renvoie le texte à envoyer au moteur /api/geo (ou null). */
function detectGeometryRequest(userText, replyText) {
  const user = String(userText || "");
  const reply = String(replyText || "");
  if (GEO_INTENT_RE.test(user)) return user;
  if (reply && GEO_INTENT_RE.test(reply)) return reply;
  return null;
}

/* Appelle /api/geo et renvoie { svg, mode, verification } :
   - mode "exact" : figure construite par le moteur déterministe (calculée,
     vraie), vérifiée par l'IA (verification.complet) ;
   - mode "ia"    : l'IA a dessiné la figure — soit en repli (construction
     non reconnue), soit après vérification pour COMPLÉTER ce qui manquait
     (verification.complet === false + verification.manquant). */
async function fetchGeoFigure(text) {
  const params = new URLSearchParams();
  params.set("text", String(text || "").slice(0, 3000));
  params.set("width", "760");
  params.set("height", "540");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75000);
  try {
    const res = await fetch(`${API_BASE}/api/geo?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => null);
    if (!data || !data.success || !data.svg) {
      throw new Error((data && data.error) || `Erreur HTTP ${res.status}`);
    }
    return {
      svg: data.svg,
      mode: data.mode === "ia" ? "ia" : "exact",
      verification: data.verification && typeof data.verification.complet === "boolean"
        ? data.verification
        : null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* Extrait l'abscisse du point de tangence demandé (ex. « tangente au point
   d'abscisse 2 », « tangente en x = -1 », « tangente au point A(2 ; 4) »,
   « tangente en x = π/2 »).
   Renvoie un nombre (fraction 1/2 → 0.5, π/2 → π/2) ou null si aucune
   tangente n'est demandée. La tangente n'est tracée QUE si ce point est donné. */
function extractTangent(text) {
  if (!text || !/tangente/i.test(String(text))) return null;
  const src = String(text);
  const num = "([+-]?\\d+\\s*\\/\\s*\\d+|[+-]?\\d+(?:[.,]\\d+)?|[+-]?π(?:\\s*\\/\\s*\\d+)?)";
  const toNum = (raw) => {
    const s = raw.replace(/\s+/g, "");
    if (s.includes("π")) {
      const parts = s.split("/");
      const base = parts[0].replace(/π/g, "");
      const num = base === "" || base === "+" ? Math.PI : base === "-" ? -Math.PI : Number(base) * Math.PI;
      const den = parts[1] ? Number(parts[1]) : 1;
      return den && Number.isFinite(num / den) ? num / den : null;
    }
    if (s.includes("/")) {
      const [a, b] = s.split("/").map(Number);
      if (b && Number.isFinite(a / b)) return a / b;
      return null;
    }
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };
  let m = src.match(new RegExp("abscisse\\s*" + num, "i"));            // d'abscisse 2
  if (!m) m = src.match(new RegExp("point\\s*[A-Za-z]?\\s*\\(\\s*" + num, "i")); // A(2 ; 4)
  if (!m) m = src.match(new RegExp("tangente\\s+(?:à\\s+la\\s+courbe\\s+)?en\\s*x\\s*=\\s*" + num, "i"));
  if (!m) m = src.match(new RegExp("tangente\\s+en\\s*" + num, "i"));  // tangente en 2
  if (!m) return null;
  const v = toNum(m[1]);
  return v === null ? null : Number(v.toFixed(6));
}

/* Extrait une droite d'équation y = ax+b donnée directement par l'exercice
   (« la droite d'équation y = 2x-3 », « (d) : y = -x + 1 », « la droite y = … »).
   Renvoie { display, expression } (affine validée) ou null. */
function extractLine(text) {
  if (!text || !/droite/i.test(String(text))) return null;
  const src = String(text);
  let m = src.match(/droite\s*(?:\([a-z]\)\s*)?(?::\s*|\s+d['’]équation\s+)?y\s*=\s*([^,;.!?…\n]+)/i);
  if (!m) return null;
  const raw = m[1].trim().split(EXPR_STOP_WORDS)[0];
  const send = normalizeExpression(raw);
  // validation affine : ax+b ou b (pas de x², de sin(x), de produit…)
  if (!/^[+-]?(?:\d*\.?\d+)?x(?:[+-]\d*\.?\d+)?$|^[+-]?\d*\.?\d+$/.test(send)) return null;
  return { display: send, expression: send };
}

/* Détecte si la demande (texte utilisateur + réponse du bot) appelle une figure. */
function detectFigureRequest(userText, replyText, hasImages) {
  const user = String(userText || "");
  const reply = String(replyText || "");
  const intentUser = hasFigureIntent(user);
  const exprUser = extractExpression(user);
  const tangentUser = extractTangent(user);
  const lineUser = extractLine(user);

  // 1) courbe avec expression : « trace la courbe de f(x)=… », « étudie f(x)=… »,
  //    « … et la tangente au point d'abscisse 2 », « … et la droite d'équation y=2x-3 »
  if (exprUser && (intentUser || /étudi/i.test(user) || tangentUser || lineUser)) {
    // si l'expression extraite EST la droite demandée (ex. « la droite d'équation
    // y = 2x-3 »), on ne trace que la droite — pas de doublon courbe+droite
    const lineIsExpression = lineUser && exprUser.send === lineUser.expression;
    const req = {
      expression: lineIsExpression ? undefined : exprUser.send,
      display: exprUser.display,
      subject: cleanSubject(user),
    };
    if (tangentUser !== null) req.tangent = tangentUser;
    if (lineUser) req.line = lineUser.expression;
    return req;
  }
  // 1b) droite y=ax+b donnée directement, sans fonction → figure « droite »
  if (lineUser) {
    const req = { line: lineUser.expression, display: lineUser.display, subject: cleanSubject(user) };
    if (tangentUser !== null) req.tangent = tangentUser;
    return req;
  }
  // 2) figure / schéma demandé sans expression → dessin par IA
  if (intentUser) {
    const subject = cleanSubject(user);
    return { subject, display: subject };
  }
  // 3) photo d'exercice : la consigne de figure est reformulée par le bot
  if (hasImages && reply) {
    const exprReply = extractExpression(reply);
    const intentReply = hasFigureIntent(reply);
    const tangentReply = extractTangent(reply);
    const lineReply = extractLine(reply);
    if (exprReply && (intentReply || tangentReply || lineReply)) {
      const req = { expression: exprReply.send, display: exprReply.display, subject: subjectFromReply(reply) };
      if (tangentReply !== null) req.tangent = tangentReply;
      if (lineReply) req.line = lineReply.expression;
      return req;
    }
    if (lineReply) {
      return { line: lineReply.expression, display: lineReply.display, subject: subjectFromReply(reply) };
    }
    if (intentReply) {
      const subject = subjectFromReply(reply) || cleanSubject(user);
      return { subject, display: subject };
    }
  }
  return null;
}

/* Appelle /api/plot et renvoie { svg, expression | subject, … }.
   Les asymptotes / branches infinies sont détectées par l'API ; la tangente
   n'est demandée que si un point de tangence a été fourni ; la droite y=ax+b
   donnée directement est tracée via le paramètre line. */
async function fetchFigure(req) {
  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("width", "760");
  params.set("height", "520");
  if (req.expression) params.set("expression", req.expression);
  if (req.line) params.set("line", req.line);
  if (!req.expression && !req.line && req.subject) params.set("subject", req.subject);
  if (req.tangent !== undefined && req.tangent !== null) {
    params.set("tangent", req.tangent);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75000);
  try {
    const res = await fetch(`${API_PLOT_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => null);
    if (!data || !data.success || !data.svg) {
      throw new Error((data && data.error) || `Erreur HTTP ${res.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* SVG → data-URI image (affiché en <img> : aucun script ne peut s'exécuter). */
function figureSvgToDataUri(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* Dimensions de la figure (width/height ou viewBox). */
function svgSize(svg) {
  const s = String(svg || "");
  let width = 0, height = 0;
  const w = s.match(/width="(\d+)"/);
  const h = s.match(/height="(\d+)"/);
  const vb = s.match(/viewBox="([\d.\s-]+)"/);
  if (w) width = +w[1];
  if (h) height = +h[1];
  if ((!width || !height) && vb) {
    const p = vb[1].trim().split(/\s+/).map(Number);
    if (p.length === 4) {
      width = width || p[2] - p[0];
      height = height || p[3] - p[1];
    }
  }
  return { width: width || 800, height: height || 600 };
}

function ensureSvgSize(svg, width, height) {
  const s = String(svg);
  if (/width="\d+"/.test(s) && /height="\d+"/.test(s)) return s;
  return s.replace(/<svg\b/, `<svg width="${width}" height="${height}"`);
}

/* Télécharge la figure en PNG (rasterisation via canvas). */
async function downloadFigurePng(svg, baseName) {
  try {
    const size = svgSize(svg);
    const img = new Image();
    img.src = figureSvgToDataUri(ensureSvgSize(svg, size.width, size.height));
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error("SVG illisible"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(img, 0, 0, size.width, size.height);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "figure_" + String(baseName || "construite").replace(/[^\w-]+/g, "_").slice(0, 60) + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    toast("Téléchargement PNG impossible.", "error");
  }
}

/* Bloc figure : légende (petit titre) + image + bouton PNG.
   opts.mode === "ia" → figure générée par IA (approximative), signalée
   honnêtement ; sinon figure construite exactement (moteur déterministe). */
function buildFigureBlock(svg, title, opts) {
  const wrap = document.createElement("figure");
  wrap.className = "figure-block" + (opts && opts.mode === "ia" ? " figure-ia" : "");
  const cap = document.createElement("figcaption");
  if (opts && opts.mode === "ia") {
    cap.appendChild(el("span", "fig-emoji", "🧠"));
    cap.appendChild(el("span", "fig-label", "Figure générée par IA"));
    cap.appendChild(el("span", "fig-note", " (approximative — vérifiez avec l'énoncé)"));
  } else {
    cap.appendChild(el("span", "fig-emoji", "📐"));
    cap.appendChild(el("span", "fig-label", "Figure construite"));
  }
  if (title) cap.appendChild(el("span", "fig-title", "— " + escapeHtml(title)));
  wrap.appendChild(cap);

  const img = document.createElement("img");
  img.className = "figure-img";
  img.alt = "Figure construite" + (title ? " : " + String(title).replace(/<[^>]*>/g, "") : "");
  img.loading = "lazy";
  img.src = figureSvgToDataUri(svg);
  wrap.appendChild(img);

  const dl = el("button", "figure-download", "⬇️ Télécharger en PNG");
  dl.type = "button";
  dl.onclick = () => downloadFigurePng(svg, title);
  wrap.appendChild(dl);
  return wrap;
}

/* Construction asynchrone de la figure, à la fin de la réponse du bot. */
async function maybeBuildFigure(userText, replyText, conv, replyMsg, replyEl, hasImages) {
  // 0) Géométrie (/api/geo) : énoncé avec constructions successives
  //    (droites, perpendiculaires, cercles, transformations…) → UNE figure
  //    cumulative. Moteur déterministe exact d'abord, repli IA sinon.
  const geoText = detectGeometryRequest(userText, replyText);
  if (geoText) {
    const bubble = replyEl.querySelector(".msg-bubble");
    if (bubble) {
      const placeholder = el("div", "figure-block loading",
        "<span class='fig-emoji'>✏️</span> Construction de la figure…");
      bubble.appendChild(placeholder);
      scrollToBottom();
      try {
        const res = await fetchGeoFigure(geoText);
        // mode "ia" + vérification incomplète → l'IA a complété la figure ;
        // mode "ia" seul → repli IA ; sinon figure exacte vérifiée.
        const complete = res.verification && res.verification.complet === false;
        const title = res.mode === "ia"
          ? (complete ? "construction géométrique complétée par l'IA" : "construction géométrique (IA)")
          : "construction géométrique";
        replyMsg.figure = { svg: res.svg, title };
        touchConversation(conv.id);
        saveHistory();
        if (placeholder.isConnected) {
          placeholder.replaceWith(
            res.mode === "ia"
              ? buildFigureBlock(res.svg, title, { mode: "ia" })
              : buildFigureBlock(res.svg, title)
          );
          scrollToBottom();
        }
        return; // géométrie traitée
      } catch (err) {
        // énoncé non reconnu par le moteur ni par l'IA → repli sur la détection classique
        if (placeholder.isConnected) placeholder.remove();
      }
    }
  }

  let req = null;
  try {
    req = detectFigureRequest(userText, replyText, hasImages);
  } catch (e) { return; }
  if (!req) return;

  const bubble = replyEl.querySelector(".msg-bubble");
  if (!bubble) return;
  const placeholder = el("div", "figure-block loading",
    "<span class='fig-emoji'>✏️</span> Construction de la figure…");
  bubble.appendChild(placeholder);
  scrollToBottom();

  let svg = "";
  let title = req.line && !req.expression
    ? `Droite : y = ${req.line}`
    : (req.display || req.subject || "");
  try {
    if (req.expression) {
      try {
        svg = (await fetchFigure({ expression: req.expression, tangent: req.tangent, line: req.line })).svg;
      } catch (err) {
        // expression invalide → repli : dessin IA du sujet
        if (req.subject) {
          svg = (await fetchFigure({ subject: req.subject, tangent: req.tangent, line: req.line })).svg;
          title = req.subject;
        } else throw err;
      }
    } else {
      svg = (await fetchFigure({ subject: req.subject, tangent: req.tangent, line: req.line })).svg;
    }
    svg = String(svg || "").trim();
    if (!svg) throw new Error("SVG vide");

    // persistance dans la conversation (re-rendu de l'historique)
    replyMsg.figure = { svg, title };
    touchConversation(conv.id);
    saveHistory();

    if (placeholder.isConnected) {
      placeholder.replaceWith(buildFigureBlock(svg, title));
      scrollToBottom();
    }
  } catch (err) {
    if (placeholder.isConnected) {
      placeholder.replaceWith(
        el("div", "figure-block error",
          "⚠️ Impossible de construire la figure automatiquement. Réessayez dans quelques secondes.")
      );
    }
  }
}

/* ---------- Rendu de la conversation courante ---------- */
function renderConversation() {
  const area = $("#messages");
  area.innerHTML = "";
  const conv = getConversation(store.activeId);
  const empty = $("#emptyState");

  if (!conv || !conv.messages.length) {
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  conv.messages.forEach((m) => area.appendChild(renderMessage(m)));
  scrollToBottom(false);
}

/* ---------- Modèles : sélecteur ---------- */
function populateModelSelect() {
  const sel = $("#modelSelect");
  sel.innerHTML = "";
  for (const [group, list] of Object.entries(MODELS)) {
    const og = document.createElement("optgroup");
    og.label = group;
    list.forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === DEFAULT_MODEL) opt.selected = true;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  }
}

function currentModel() {
  return $("#modelSelect").value || DEFAULT_MODEL;
}

/* Modèle de VISION : 2 choix uniquement (gpt-5.6-luna par défaut, claude sonnet 4) */
const LS_VISION_MODEL = "lumina.chat.visionmodel";
function visionModel() {
  const sel = $("#visionSelect");
  const v = sel ? sel.value : null;
  return v || DEFAULT_MODEL;
}
function saveVisionModel() {
  try { localStorage.setItem(LS_VISION_MODEL, $("#visionSelect").value); } catch (e) { /* noop */ }
}
function loadVisionModel() {
  try {
    const v = localStorage.getItem(LS_VISION_MODEL);
    if (v && document.querySelector(`#visionSelect option[value="${CSS.escape(v)}"]`)) {
      $("#visionSelect").value = v;
    }
  } catch (e) { /* noop */ }
}

function updateModelPill() {
  const m = currentModel();
  const isPro = PRO_MODELS.has(m);
  $("#modelSelect").classList.toggle("pro-selected", isPro);
}

/* ---------- Historique (sidebar) ---------- */
function renderHistory() {
  const list = $("#historyList");
  list.innerHTML = "";
  if (!store.history.length) {
    list.appendChild(el("div", "history-empty", "Aucune conversation pour le moment.<br/>Cliquez sur « Nouvelle conversation » ✨"));
    return;
  }
  [...store.history].sort((a, b) => b.updatedAt - a.updatedAt).forEach((c) => {
    const item = el("div", "history-item" + (c.id === store.activeId ? " active" : ""));
    const icon = el("div", "h-icon", c.id === store.activeId ? "💬" : "📄");
    const body = el("div", "h-body");
    body.appendChild(el("div", "h-title", escapeHtml(c.title || "Sans titre")));
    const meta = el("div", "h-meta");
    meta.appendChild(el("span", "h-date", new Date(c.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })));
    if (c.model) meta.appendChild(el("span", "h-model", c.model));
    body.appendChild(meta);
    const del = el("button", "h-del", "✕");
    del.setAttribute("aria-label", "Supprimer la conversation");
    del.onclick = (e) => {
      e.stopPropagation();
      deleteConversation(c.id);
    };
    item.append(icon, body, del);
    item.onclick = () => selectConversation(c.id);
    list.appendChild(item);
  });
}

function selectConversation(id) {
  store.activeId = id;
  const conv = getConversation(id);
  if (conv && conv.model && document.querySelector(`#modelSelect option[value="${CSS.escape(conv.model)}"]`)) {
    $("#modelSelect").value = conv.model;
    updateModelPill();
  }
  saveHistory();
  renderConversation();
  renderHistory();
  closeSidebar();
}

function deleteConversation(id) {
  store.history = store.history.filter((c) => c.id !== id);
  if (store.activeId === id) {
    store.activeId = store.history.length ? store.history[0].id : null;
    if (store.activeId) selectConversation(store.activeId);
    else { renderConversation(); }
  }
  saveHistory();
  renderHistory();
}

/* ---------- Suppression de TOUTES les conversations ----------
   Bouton du menu hamburger. Réutilise uniquement la logique existante
   (saveHistory / renderConversation / renderHistory / closeSidebar) :
   aucune fonction existante n'est modifiée. */
function deleteAllConversations() {
  const count = store.history.length;
  if (!count) {
    toast("Aucune conversation à supprimer.", "error");
    return;
  }
  const ok = window.confirm(
    `Supprimer ${count} conversation${count > 1 ? "s" : ""} ?\nCette action est irréversible.`
  );
  if (!ok) return;
  store.history = [];
  store.activeId = null;
  saveHistory();
  renderConversation();
  renderHistory();
  closeSidebar();
  toast("Toutes les conversations ont été supprimées.", "success");
  $("#input").focus();
}

function newConversation() {
  const conv = {
    id: uid(),
    title: "",
    model: currentModel(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  store.history.push(conv);
  store.activeId = conv.id;
  saveHistory();
  renderConversation();
  renderHistory();
  closeSidebar();
  $("#input").focus();
}

function touchConversation(id) {
  const conv = getConversation(id);
  if (!conv) return;
  conv.updatedAt = Date.now();
  if (!conv.model) conv.model = currentModel();
  saveHistory();
}

/* ---------- Réponses coupées par le backend gratuit ----------
   Le service gratuit (aichatting.net) plafonne les réponses longues
   (~4 600 caractères, vérifié). On détecte la coupure et on enchaîne
   automatiquement des demandes « continue » pour compléter la réponse
   (jusqu'à 5 enchaînements : convient aux longues résolutions de maths,
   code, etc.). */
function isTruncated(text) {
  const t = (text || "").trim();
  if (t.length < 1200) return false;           // réponse courte : considérée complète
  const last = t[t.length - 1];
  if (".?!…»\"'$".includes(last)) return false; // fin de phrase/formule normale
  const fences = (t.match(/```/g) || []).length;
  if (fences % 2 === 1) return true;            // bloc de code non fermé
  return true;                                  // fin brutale (lettre, virgule, tiret…)
}

function buildContinuePrompt(partial) {
  const tail = partial.slice(-1800);
  return "Continue directement ce texte sans rien répéter, commence exactement là où il s'arrête, garde le même style et la même langue :\n\n" + tail + "\n\nSuite :";
}

async function completeTruncatedReply(replyText, modelForContinuation) {
  let text = replyText || "";
  let completed = false;
  let guard = 0;
  while (isTruncated(text) && guard < 5) {     // jusqu'à 5 enchaînements
    guard++;
    let cont = await callApi(buildContinuePrompt(text), [], modelForContinuation);
    if (!cont.success) {
      // échec (ex. modèle PRO) : on retente avec le modèle gratuit par défaut
      cont = await callApi(buildContinuePrompt(text), [], modelForContinuation || DEFAULT_MODEL);
    }
    if (!cont.success || !cont.reply || !cont.reply.trim()) break;
    const addition = cont.reply.trim();
    text = text + "\n" + addition;             // on ajoute TOUJOURS la suite
    completed = true;
    // la suite est courte ET se termine proprement → réponse finie
    if (addition.length < 120 && !isTruncated(addition)) break;
  }
  return { text, completed };
}

/* ---------- Rejet de modération / réponse vide du backend ----------
   Le backend gratuit (aichatting.net) rejette parfois les images avec un
   message de modération anglais, ou renvoie une réponse vide. On retente
   une fois, puis on affiche un message clair en français. */
const MODERATION_RE = /sorry|risk level|rephrase|inappropriate|modération|contenu.*risque|immodest/i;

function isModerationRejection(text) {
  return typeof text === "string" && MODERATION_RE.test(text);
}

async function handleVisionOrEmpty(data, text, toSend) {
  const conv = getConversation(store.activeId);
  const chatArea = $("#chatArea");
  const pushError = (msg) => {
    conv.messages.push(msg);
    chatArea.appendChild(renderMessage(msg));
  };
  const mod = isModerationRejection(data.reply) && toSend.length;

  if (mod || !data.reply || !data.reply.trim()) {
    // 1 seule nouvelle tentative (le backend est instable)
    const retry = await callApi(text, toSend).catch(() => null);
    const ok = retry && retry.success &&
      (!isModerationRejection(retry.reply)) &&
      retry.reply && retry.reply.trim();
    if (ok) return retry;

    if (mod) {
      pushError({
        role: "assistant",
        text: "⚠️ **Image refusée par le service gratuit** (filtre de modération de aichatting.net).\n\nRéessayez avec une autre photo ou plus tard — la vision du backend gratuit est parfois instable.",
        error: true,
        model: data.model || currentModel(),
        time: Date.now(),
      });
    } else {
      pushError({
        role: "assistant",
        text: "⚠️ Le service gratuit a renvoyé une **réponse vide**. Réessayez dans quelques secondes.",
        error: true,
        model: data.model || currentModel(),
        time: Date.now(),
      });
    }
    return null;
  }
  return data;
}

/* ---------- Envoi de message ---------- */
/* ----------------------------------------------------------------
 * Mémoire des photos d'exercice
 * ----------------------------------------------------------------
 * Quand l'utilisateur envoie une photo, elle est CONSERVÉE dans la
 * conversation : les questions suivantes (« dans cette photo, où est la
 * solution ? », « et la question 3 ? »…) renvoient automatiquement la
 * photo au bot — sinon il répond « je ne vois pas de photo jointe ».
 * Une nouvelle photo jointe remplace la mémoire ; le bouton ✕ de la
 * pilule l'oublie.
 * ---------------------------------------------------------------- */

/* Images à envoyer : les nouvelles jointes, sinon la mémoire de la
   conversation (dernière photo, jusqu'à MAX_IMAGES_PER_REQUEST). */
function resolveSendImages(attachments, conv) {
  if (attachments && attachments.length) return attachments;
  if (!conv || !conv.messages || typeof conv.lastImageRef !== "number") return [];
  const msg = conv.messages[conv.lastImageRef];
  if (!msg || !msg.images || !msg.images.length) return [];
  return msg.images
    .slice(0, MAX_IMAGES_PER_REQUEST)
    .map((v) => ({ type: "data", name: "photo (mémoire)", value: v }));
}

/* Images mémorisées de la conversation (affichage pilule). */
function rememberedImages(conv) {
  return resolveSendImages([], conv);
}

function clearImageMemory(conv) {
  if (conv) conv.lastImageRef = undefined;
  renderAttachmentTray();
}

/* Pilule « 📷 Exercice en mémoire — ✕ » dans la barre de saisie. */
function renderImageMemoryPill(conv) {
  const tray = $("#attachmentTray");
  if (!tray || !tray.querySelector || !tray.prepend) return;
  const old = tray.querySelector(".attach-chip.memory");
  if (old) old.remove();
  const mem = rememberedImages(conv);
  if (!mem.length) return;
  const chip = el("div", "attach-chip memory", "");
  chip.appendChild(el("img", "", ""));
  chip.querySelector("img").src = mem[0].value;
  chip.appendChild(el("span", "ac-name", escapeHtml("Exercice en mémoire")));
  const rm = el("button", "ac-remove", "✕");
  rm.setAttribute("aria-label", "Oublier la photo (ne plus la renvoyer)");
  rm.title = "Oublier la photo";
  rm.onclick = () => clearImageMemory(conv);
  chip.appendChild(rm);
  tray.prepend(chip);
}

async function sendMessage(text, attachments) {
  const input = $("#input");
  const sendBtn = $("#sendBtn");
  const chatArea = $("#chatArea");
  const empty = $("#emptyState");

  if (store.sending) return;
  if (!text.trim() && (!attachments || !attachments.length)) return;

  // conversation courante
  let conv = getConversation(store.activeId);
  if (!conv) {
    conv = {
      id: uid(), title: "", model: currentModel(),
      createdAt: Date.now(), updatedAt: Date.now(), messages: [],
    };
    store.history.push(conv);
    store.activeId = conv.id;
  }

  // Compression au budget POST (qualité haute : ≤ 1024 px, q 0.8).
  // Le repli GET (ancienne API) re-compressera au budget URL si besoin.
  // Sans nouvelle photo, la DERNIÈRE photo de la conversation est
  // automatiquement renvoyée (mémoire des photos d'exercice).
  const toSend = resolveSendImages(attachments, conv).map((a) => ({ ...a }));
  await fitAttachmentsToBudget(toSend, BODY_BUDGET, BODY_COMBOS, PER_IMAGE_BODY);

  empty.style.display = "none";

  const userMsg = {
    role: "user",
    text: text.trim(),
    images: (attachments || []).map((a) => a.value), // nouvelles photos seulement (affichage)
    model: toSend.length ? visionModel() : currentModel(), // la vision n'utilise que les 2 modèles dédiés
    time: Date.now(),
  };
  conv.messages.push(userMsg);
  if (userMsg.images.length) conv.lastImageRef = conv.messages.length - 1;
  if (!conv.title) conv.title = text.trim().slice(0, 46) || "Conversation";
  conv.model = currentModel();
  touchConversation(conv.id);
  saveHistory();
  renderHistory();

  chatArea.appendChild(renderMessage(userMsg));
  input.value = "";
  autoResize(input);
  store.attachments = [];
  renderAttachmentTray();
  scrollToBottom();

  // indicateur de frappe
  const typing = renderTyping();
  chatArea.appendChild(typing);
  scrollToBottom();

  store.sending = true;
  sendBtn.disabled = true;
  sendBtn.classList.add("sending");

  try {
    const data = await callApi(text, toSend);
    // retirer l'indicateur
    typing.remove();

    if (data.success) {
      // gérer rejet de modération / réponse vide (avec 1 retentative)
      const finalData = await handleVisionOrEmpty(data, text, toSend);
      if (!finalData) { /* erreur déjà affichée */ }
      else {
        // compléter automatiquement si le backend a coupé la réponse
        // (même modèle que la réponse, y compris pour la vision)
        const { text: fullText, completed } = await completeTruncatedReply(finalData.reply, finalData.model);
        const reply = {
          role: "assistant",
          text: fullText || "(réponse vide)",
          images: finalData.images || undefined,
          model: finalData.model || currentModel(),
          time: Date.now(),
          completed,
        };
        conv.messages.push(reply);
        const replyEl = renderMessage(reply);
        chatArea.appendChild(replyEl);
        // Figures : si la demande contient une consigne de dessin (courbe,
        // schéma…) — y compris dans une photo d'exercice — on construit la
        // figure et on l'affiche à la fin de la réponse du bot.
        maybeBuildFigure(text, fullText || finalData.reply, conv, reply, replyEl, toSend.length > 0);
      }
    } else {
      const errMsg = {
        role: "assistant",
        text: "❌ " + (data.error || "Erreur inconnue du serveur."),
        error: true,
        model: data.model || currentModel(),
        time: Date.now(),
      };
      conv.messages.push(errMsg);
      chatArea.appendChild(renderMessage(errMsg));
    }
  } catch (err) {
    typing.remove();
    const errMsg = {
      role: "assistant",
      text: "❌ Impossible de joindre l'API. Vérifiez votre connexion puis réessayez.\n\n`" + escapeHtml(String(err.message || err)) + "`",
      error: true,
      model: currentModel(),
      time: Date.now(),
    };
    conv.messages.push(errMsg);
    chatArea.appendChild(renderMessage(errMsg));
  } finally {
    touchConversation(conv.id);
    saveHistory();
    renderHistory();
    store.sending = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove("sending");
    scrollToBottom();
    input.focus();
  }
}

async function callApi(text, attachments, modelOverride) {
  const hasImages = (attachments || []).length > 0;
  // Vision (image jointe) : 2 modèles uniquement (gpt-5.6-luna ou claude sonnet 4),
  // quel que soit le modèle texte sélectionné (les autres hallucinent en vision).
  const model = hasImages ? visionModel() : (modelOverride || currentModel());
  const imgs = (attachments || []).slice(0, MAX_IMAGES_PER_REQUEST);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  const fetchOpts = {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  };

  // Analyse une réponse de l'API (JSON attendu) → objet {success, reply, …}.
  const handle = async (res) => {
    let data = null;
    try { data = await res.json(); } catch (e) { /* corps non JSON */ }
    if (!data || typeof data !== "object") {
      throw new Error(`Réponse invalide (HTTP ${res.status})`);
    }
    if (res.status === 402) {
      return { success: false, error: data.error || "Ce modèle est réservé aux membres PRO.", model: data.model };
    }
    if (res.status === 429) {
      return { success: false, error: "Quota gratuit momentanément épuisé — réessayez dans quelques secondes.", model: data.model };
    }
    if (!res.ok || data.success === false) {
      return { success: false, error: data.error || `Erreur HTTP ${res.status}`, model: data.model };
    }
    return data;
  };

  try {
    if (hasImages) {
      // --- Vision : POST JSON (v4) — aucune limite de longueur d'URL, image nette ---
      let res = null;
      try {
        res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            prompt: text.trim().slice(0, 4000),
            model,
            uid: store.uid,
            lang: LANG,
            images: imgs.map((a) => a.value),
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          throw new Error("Délai d'attente dépassé (90 s). L'API est peut-être surchargée.");
        }
        res = null; // panne réseau : on tente le repli GET
      }
      // 404/405 = API pas encore à jour : repli GET (recompression au budget URL)
      if (res && res.status !== 404 && res.status !== 405) {
        return await handle(res);
      }
      const forGet = imgs.map((a) => ({ ...a }));
      await fitAttachmentsToBudget(
        forGet, URL_BUDGET, URL_COMBOS,
        Math.floor((URL_BUDGET * 0.95) / Math.max(1, forGet.length))
      );
      const params = new URLSearchParams();
      params.set("prompt", text.trim().slice(0, 4000));
      params.set("model", model);
      params.set("uid", store.uid);
      params.set("lang", LANG);
      forGet.forEach((a) => params.append("image", a.value));
      return await handle(await fetch(`${API_URL}?${params.toString()}`, fetchOpts));
    }

    // --- Texte seul : GET (rapide, sans corps) ---
    const params = new URLSearchParams();
    params.set("prompt", text.trim().slice(0, 4000));
    params.set("model", model);
    params.set("uid", store.uid);
    params.set("lang", LANG);
    return await handle(await fetch(`${API_URL}?${params.toString()}`, fetchOpts));
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Délai d'attente dépassé (90 s). L'API est peut-être surchargée.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Pièces jointes ----------
   Depuis la v4, les images sont envoyées en POST JSON (aucune limite de
   longueur d'URL) : on peut donc monter la qualité — ≤ 1024 px, qualité 0.8
   (le backend aichatting redimensionne lui-même). Le repli GET (ancienne
   API) re-compresse au budget URL (24 Ko, sous la limite 414 de Vercel). */
const URL_BUDGET = 24000;       // repli GET : chars de base64 (toutes images)
const BODY_BUDGET = 1100000;    // POST : budget total (chars base64) — large
const PER_IMAGE_BODY = 350000;  // POST : budget par image (≈ 260 Ko binaire)
const URL_COMBOS = [
  [512, 0.62], [448, 0.55], [384, 0.5], [320, 0.48], [256, 0.45], [192, 0.4],
];
const BODY_COMBOS = [
  [1024, 0.8], [896, 0.75], [768, 0.7], [640, 0.65], [512, 0.6], [384, 0.5],
];

function loadImageFromDataUrl(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Image illisible"));
    img.src = dataUrl;
  });
}

function toJpegDataUrl(img, dim, q) {
  const scale = Math.min(1, dim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", q);
}

async function compressImageFile(file) {
  // 1) décoder (accepte jpg/png/gif/webp mais aussi HEIC/HEIF sur Safari)
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  let img;
  try {
    img = await loadImageFromDataUrl(dataUrl);
  } catch (e) {
    throw new Error("Format d'image non supporté par le navigateur.");
  }
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error("Image illisible.");
  }

  // 2) petites images brutes conservées (png léger, gif animé court…)
  if (file.size <= 15 * 1024 && dataUrl.length <= 20000 &&
      img.naturalWidth <= 384 && img.naturalHeight <= 384) {
    return { name: file.name, value: dataUrl };
  }

  // 3) sinon compression JPEG (HEIC inclus, car le navigateur sait le décoder)
  //    v4 : ≤ 1024 px / qualité 0.8 max — le POST accepte des images bien
  //    plus nettes qu'avant (la vision du modèle en profite).
  let best = null;
  for (const [dim, q] of BODY_COMBOS) {
    const next = toJpegDataUrl(img, dim, q);
    best = next;
    if (next.length <= PER_IMAGE_BODY) break;
  }
  return { name: file.name, value: best };
}

// Re-compresse les images jointes pour tenir dans le budget demandé.
// POST : budget large (qualité conservée) — repli GET : budget URL serré.
async function fitAttachmentsToBudget(attachments, budget = BODY_BUDGET, combos = BODY_COMBOS, perTarget = PER_IMAGE_BODY) {
  const dataItems = attachments.filter((a) => a.value.startsWith("data:"));
  if (!dataItems.length) return;
  const total = dataItems.reduce((s, a) => s + a.value.length, 0);
  if (total <= budget) return;

  const per = Math.min(perTarget, Math.floor((budget * 0.95) / dataItems.length));
  let adjusted = 0;
  for (const item of dataItems) {
    if (item.value.length <= per) continue;
    try {
      const img = await loadImageFromDataUrl(item.value);
      const lastDim = combos[combos.length - 1][0];
      for (const [dim, q] of combos) {
        const next = toJpegDataUrl(img, dim, q);
        if (next.length <= per) { item.value = next; adjusted++; break; }
        if (dim === lastDim) { item.value = next; adjusted++; }
      }
    } catch (e) { /* image illisible : la laisser telle quelle */ }
  }
  if (adjusted) toast("Images compressées automatiquement pour l'envoi.", "success");
}

async function addFiles(files) {
  const list = [...files];
  for (const f of list) {
    if (store.attachments.length >= MAX_IMAGES) {
      toast(`Maximum ${MAX_IMAGES} images par message.`, "error");
      break;
    }
    if (!/^image\//i.test(f.type) && !/\.(jpe?g|png|gif|webp|heic|heif|avif)$/i.test(f.name)) {
      toast(`« ${f.name} » ignoré — ce n'est pas une image.`, "error");
      continue;
    }
    try {
      const item = await compressImageFile(f);
      store.attachments.push(item);
    } catch (e) {
      toast(e.message, "error");
    }
  }
  renderAttachmentTray();
}

function addImageUrl(rawUrl) {
  const url = (rawUrl || "").trim();
  if (!/^https?:\/\/.+/i.test(url)) {
    toast("URL d'image invalide (http/https requis).", "error");
    return;
  }
  if (store.attachments.length >= MAX_IMAGES) {
    toast(`Maximum ${MAX_IMAGES} images par message.`, "error");
    return;
  }
  store.attachments.push({ name: url.length > 34 ? url.slice(0, 34) + "…" : url, value: url });
  renderAttachmentTray();
}

function renderAttachmentTray() {
  const tray = $("#attachmentTray");
  tray.innerHTML = "";
  store.attachments.forEach((a, i) => {
    const chip = el("div", "attach-chip");
    if (/^data:image\//.test(a.value)) {
      chip.appendChild(el("img", "", ""));
      chip.querySelector("img").src = a.value;
    } else {
      chip.appendChild(el("span", "", "🔗"));
    }
    chip.appendChild(el("span", "ac-name", escapeHtml(a.name)));
    const rm = el("button", "ac-remove", "✕");
    rm.setAttribute("aria-label", "Retirer la pièce jointe");
    rm.onclick = () => { store.attachments.splice(i, 1); renderAttachmentTray(); };
    chip.appendChild(rm);
    tray.appendChild(chip);
  });
  // pilule « 📷 Exercice en mémoire » (photo renvoyée automatiquement)
  renderImageMemoryPill(getConversation(store.activeId));
  if (store.attachments.length) {
    const n = el("span", "ac-count", `${store.attachments.length}/${MAX_IMAGES}`);
    n.style.cssText = "margin-left:2px; align-self:center;";
    tray.appendChild(n);
  }
  // le sélecteur de modèle VISION apparaît seulement quand une image est jointe
  $("#visionRow").hidden = store.attachments.length === 0;
}

/* ---------- Sidebar ---------- */
function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.add("show");
  $("#hamburger").classList.add("open");
  $("#hamburger").setAttribute("aria-expanded", "true");
  $("#sidebar").setAttribute("aria-hidden", "false");
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("show");
  $("#hamburger").classList.remove("open");
  $("#hamburger").setAttribute("aria-expanded", "false");
  $("#sidebar").setAttribute("aria-hidden", "true");
}

/* ---------- Toasts ---------- */
function toast(message, type = "") {
  const wrap = $("#toasts");
  const t = el("div", "toast " + type, message);
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 350);
  }, 3400);
}

/* ---------- Lightbox ---------- */
function openImage(src) {
  $("#lightboxImg").src = src;
  $("#lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  $("#lightbox").hidden = true;
  document.body.style.overflow = "";
}

/* ---------- Textarea auto-resize ---------- */
function autoResize(ta) {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
}

/* ---------- Particules ---------- */
function startParticles() {
  const canvas = $("#particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, parts = [];
  const COUNT = 46;

  const resize = () => {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < COUNT; i++) {
    parts.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.15,
    });
  }

  (function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167, 139, 250, ${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
}

/* ---------- Init ---------- */
function init() {
  // uid persistant
  store.uid = localStorage.getItem(LS_UID) || uid();
  localStorage.setItem(LS_UID, store.uid);

  loadHistory();
  populateModelSelect();
  updateModelPill();
  loadVisionModel();

  // si une conversation active existait, la charger
  if (store.activeId && getConversation(store.activeId)) {
    const conv = getConversation(store.activeId);
    if (conv.model && document.querySelector(`#modelSelect option[value="${CSS.escape(conv.model)}"]`)) {
      $("#modelSelect").value = conv.model;
      updateModelPill();
    }
  }

  renderConversation();
  renderHistory();

  startParticles();

  /* --- Événements --- */
  // hamburger
  $("#hamburger").onclick = () => {
    $("#sidebar").classList.contains("open") ? closeSidebar() : openSidebar();
  };
  $("#sidebarOverlay").onclick = closeSidebar;

  // nouvelle conversation
  $("#newConversation").onclick = newConversation;
  // supprimer toutes les conversations (menu hamburger)
  $("#deleteAllConversations").onclick = deleteAllConversations;

  // envoi
  $("#sendBtn").onclick = () => {
    const imgs = [...store.attachments];
    sendMessage($("#input").value, imgs);
  };

  const input = $("#input");
  input.addEventListener("input", () => autoResize(input));
  // Sur écran tactile (mobile/tablette) le clavier virtuel n'a PAS de touche
  // Maj : « Entrée » = saut de ligne (envoi via le bouton ➤ ou Ctrl+Entrée).
  // Sur ordinateur : Entrée = envoyer, Maj+Entrée = saut de ligne.
  const isTouch = (typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
  if (isTouch) {
    input.placeholder = "Écrivez votre message… (Entrée = saut de ligne · bouton ➤ pour envoyer)";
  }
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    const sendShortcut = isTouch ? e.ctrlKey || e.metaKey : !e.shiftKey;
    if (!sendShortcut) return;
    e.preventDefault();
    const imgs = [...store.attachments];
    sendMessage(input.value, imgs);
  });

  // modèle
  $("#modelSelect").addEventListener("change", () => {
    const m = currentModel();
    updateModelPill();
    const conv = getConversation(store.activeId);
    if (conv) { conv.model = m; saveHistory(); renderHistory(); }
    if (PRO_MODELS.has(m)) {
      toast("Modèle réservé aux membres PRO — l'API renverra une erreur 402.", "error");
    }
  });

  // modèle de vision (2 choix uniquement)
  $("#visionSelect").addEventListener("change", () => {
    saveVisionModel();
    toast(`🖼️ Vision : ${visionModel()}`, "success");
  });

  // pièces jointes
  // Le trombone est un <label for="fileInput"> natif : le navigateur ouvre
  // lui-même le sélecteur de fichiers (aucun JS, fiable partout, même Safari/iOS).
  // Support clavier (Enter/Espace) pour le label :
  $("#attachBtn").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("#fileInput").click();
    }
  });
  // URL : bouton dédié qui affiche une barre inline
  $("#urlBtn").onclick = () => {
    const row = $("#urlRow");
    row.hidden = !row.hidden;
    if (!row.hidden) $("#urlInput").focus();
  };
  const addUrl = () => {
    const val = $("#urlInput").value.trim();
    if (!val) return;
    addImageUrl(val);
    $("#urlInput").value = "";
    $("#urlRow").hidden = true;
  };
  $("#urlAdd").onclick = addUrl;
  $("#urlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addUrl(); }
  });
  $("#fileInput").addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  });

  // lightbox
  $("#lightbox").onclick = (e) => { if (e.target === $("#lightbox") || e.target.classList.contains("lightbox-close")) closeLightbox(); };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeLightbox(); closeSidebar(); }
  });

  // copier code
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".code-copy");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(decodeURIComponent(btn.dataset.code));
      btn.textContent = "Copié ✓";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = "Copier"; btn.classList.remove("copied"); }, 1600);
    } catch (err) {
      toast("Copie impossible dans ce navigateur.", "error");
    }
  });

  // chips de suggestions
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.onclick = () => {
      const imgs = [...store.attachments];
      sendMessage(chip.dataset.prompt, imgs);
    };
  });
}

// expose pour le HTML inline (lightbox des images markdown)
window.Lumina = {
  openImage,
  // exposés aussi pour les tests / débogage
  detectFigureRequest, normalizeExpression, extractExpression, extractTangent,
  extractLine, hasFigureIntent, cleanSubject, figureSvgToDataUri, buildFigureBlock,
  fetchFigure, maybeBuildFigure, detectGeometryRequest, fetchGeoFigure,
  resolveSendImages, rememberedImages, clearImageMemory, renderImageMemoryPill,
};

// Affichage des erreurs JS (débogage à distance)
window.addEventListener("error", (e) => {
  if (e && e.message && !e.filename) return; // erreurs de ressource : silencieuses
  try {
    toast("⚠️ Erreur technique : " + (e.message || "inconnue"), "error");
  } catch (err) { /* noop */ }
});

// L'app.js est chargé à la fin du <body> : le DOM est déjà analysé,
// on initialise immédiatement (sans attendre DOMContentLoaded ni KaTeX).
try {
  init();
} catch (err) {
  try {
    toast("⚠️ Erreur d'initialisation : " + (err && err.message ? err.message : err), "error");
  } catch (e2) { /* noop */ }
}

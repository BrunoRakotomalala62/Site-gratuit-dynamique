/* ============================================================
   Lumina Chat — Logique de l'application
   API : https://chat-free-gpt.vercel.app/api/chat
   ============================================================ */
"use strict";

/* ---------- Configuration ---------- */
const API_BASE = "https://chat-free-gpt.vercel.app";
const API_URL = `${API_BASE}/api/chat`;
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
  // 1. extraire les blocs de code
  let text = src.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const token = `@@CODE${blocks.length}@@`;
    blocks.push({ lang, code });
    return token;
  });

  // 2. lignes
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
    } else if (/^@@CODE\d+@@$/.test(t)) {
      flush();
      const idx = +t.match(/@@CODE(\d+)@@/)[1];
      const b = blocks[idx];
      out.push(buildCodeBlock(b.code, b.lang));
    } else {
      para.push(t);
    }
  }
  flush();
  // blocs de code restants (ex. collés à du texte)
  text = out.join("\n");
  text = text.replace(/@@CODE(\d+)@@/g, (_m, i) => {
    const b = blocks[+i];
    return b ? buildCodeBlock(b.code, b.lang) : "";
  });
  return text;
}

function buildCodeBlock(code, lang) {
  const esc = escapeHtml(code.replace(/\n$/, ""));
  return `<pre><code class="language-${escapeHtml(lang || "text")}">${esc}</code>` +
    `<button class="code-copy" data-code="${encodeURIComponent(code)}">Copier</button></pre>`;
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

  const avatar = el("div", "msg-avatar", role === "user" ? "👤" : "✨");
  const bubble = el("div", "msg-bubble");
  if (m.text) bubble.innerHTML = renderMarkdown(m.text);
  if (m.images && m.images.length) bubble.insertAdjacentHTML("beforeend", msgImagesGrid(m.images));

  const meta = el("div", "msg-meta");
  const time = m.time ? new Date(m.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  if (m.model) meta.appendChild(el("span", "m-model", m.model));
  if (time) meta.appendChild(el("span", "m-time", time));
  bubble.appendChild(meta);

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  return msg;
}

function renderTyping() {
  const msg = el("div", "msg assistant");
  const avatar = el("div", "msg-avatar", "✨");
  const bubble = el("div", "msg-bubble");
  bubble.appendChild(el("div", "typing", "<span></span><span></span><span></span>"));
  msg.append(avatar, bubble);
  return msg;
}

function scrollToBottom(smooth = true) {
  const area = $("#chatArea");
  area.scrollTo({ top: area.scrollHeight, behavior: smooth ? "smooth" : "auto" });
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

function updateModelPill() {
  const m = currentModel();
  $("#modelPill").textContent = m;
  const isPro = PRO_MODELS.has(m);
  $("#modelSelect").classList.toggle("pro-selected", isPro);
  $("#modelPill").style.background = isPro
    ? "rgba(244,63,94,0.14)"
    : "rgba(6,182,212,0.12)";
  $("#modelPill").style.borderColor = isPro
    ? "rgba(244,63,94,0.45)"
    : "rgba(6,182,212,0.3)";
  $("#modelPill").style.color = isPro ? "#fda4af" : "#67e8f9";
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

/* ---------- Envoi de message ---------- */
async function sendMessage(text, attachments) {
  const input = $("#input");
  const sendBtn = $("#sendBtn");
  const chatArea = $("#chatArea");
  const empty = $("#emptyState");

  if (store.sending) return;
  if (!text.trim() && (!attachments || !attachments.length)) return;

  // Re-compression si besoin (limite d'URL de l'API : ~32 Ko)
  const toSend = attachments.map((a) => ({ ...a }));
  await fitAttachmentsToBudget(toSend);

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

  empty.style.display = "none";

  const userMsg = {
    role: "user",
    text: text.trim(),
    images: toSend.map((a) => a.value),
    model: currentModel(),
    time: Date.now(),
  };
  conv.messages.push(userMsg);
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
      const reply = {
        role: "assistant",
        text: data.reply || "(réponse vide)",
        images: data.images || undefined,
        model: data.model || currentModel(),
        time: Date.now(),
      };
      conv.messages.push(reply);
      chatArea.appendChild(renderMessage(reply));
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

async function callApi(text, attachments) {
  const params = new URLSearchParams();
  if (text.trim()) params.set("prompt", text.trim().slice(0, 4000));
  params.set("model", currentModel());
  params.set("uid", store.uid);
  params.set("lang", LANG);

  const imgs = (attachments || []).slice(0, MAX_IMAGES_PER_REQUEST);
  imgs.forEach((a) => params.append("image", a.value));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
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
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Délai d'attente dépassé (90 s). L'API est peut-être surchargée.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Pièces jointes ---------- */
const URL_BUDGET = 24000;      // chars de base64 (toutes images) → URL encodée < ~26 Ko, loin des 414
const COMBOS = [
  [512, 0.62], [448, 0.55], [384, 0.5], [320, 0.48], [256, 0.45], [192, 0.4],
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
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  // petites images brutes conservées (png léger, gif animé court…)
  if (file.size <= 15 * 1024 && /^data:image\/.*/.test(dataUrl) && dataUrl.length <= 20000) {
    const probe = await loadImageFromDataUrl(dataUrl).catch(() => null);
    if (probe && probe.naturalWidth <= 384 && probe.naturalHeight <= 384) {
      return { name: file.name, value: dataUrl };
    }
  }

  const img = await loadImageFromDataUrl(dataUrl);
  let best = null;
  for (const [dim, q] of COMBOS) {
    const next = toJpegDataUrl(img, dim, q);
    best = next;
    if (next.length <= 20000) break;
  }
  return { name: file.name, value: best };
}

// Re-compresse les images jointes pour tenir dans la limite d'URL de l'API (~32 Ko).
// Qualité maximale si peu d'images, réduite progressivement si beaucoup.
async function fitAttachmentsToBudget(attachments, budget = URL_BUDGET) {
  const dataItems = attachments.filter((a) => a.value.startsWith("data:"));
  if (!dataItems.length) return;
  const total = dataItems.reduce((s, a) => s + a.value.length, 0);
  if (total <= budget) return;

  const per = Math.floor((budget * 0.95) / dataItems.length);
  let adjusted = 0;
  for (const item of dataItems) {
    if (item.value.length <= per) continue;
    try {
      const img = await loadImageFromDataUrl(item.value);
      for (const [dim, q] of COMBOS) {
        const next = toJpegDataUrl(img, dim, q);
        if (next.length <= per) { item.value = next; adjusted++; break; }
        if (dim === COMBOS[COMBOS.length - 1][0]) { item.value = next; adjusted++; }
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
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.type)) {
      toast(`« ${f.name} » ignoré — seules les images (jpg, png, gif, webp) sont acceptées.`, "error");
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
  if (store.attachments.length) {
    const n = el("span", "ac-count", `${store.attachments.length}/${MAX_IMAGES}`);
    n.style.cssText = "margin-left:2px; align-self:center;";
    tray.appendChild(n);
  }
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

/* ---------- Menu pièces jointes ---------- */
function positionAttachMenu() {
  const btn = $("#attachBtn");
  const menu = $("#attachMenu");
  const r = btn.getBoundingClientRect();
  menu.style.top = Math.max(8, r.top - menu.offsetHeight - 10) + "px";
  menu.style.left = r.left + "px";
}

/* ---------- Init ---------- */
function init() {
  // uid persistant
  store.uid = localStorage.getItem(LS_UID) || uid();
  localStorage.setItem(LS_UID, store.uid);

  loadHistory();
  populateModelSelect();
  updateModelPill();

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

  // envoi
  $("#sendBtn").onclick = () => {
    const imgs = [...store.attachments];
    sendMessage($("#input").value, imgs);
  };

  const input = $("#input");
  input.addEventListener("input", () => autoResize(input));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const imgs = [...store.attachments];
      sendMessage(input.value, imgs);
    }
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

  // pièces jointes
  $("#attachBtn").onclick = (e) => {
    e.stopPropagation();
    const menu = $("#attachMenu");
    if (menu.hidden) {
      menu.hidden = false;
      positionAttachMenu();
      $("#attachBtn").classList.add("active");
    } else {
      menu.hidden = true;
      $("#attachBtn").classList.remove("active");
    }
  };
  $("#attachFileBtn").onclick = () => {
    $("#attachMenu").hidden = true;
    $("#attachBtn").classList.remove("active");
    $("#fileInput").click();
  };
  $("#attachUrlBtn").onclick = () => {
    $("#attachMenu").hidden = true;
    $("#attachBtn").classList.remove("active");
    const raw = prompt("Collez l'URL de l'image :");
    if (raw) addImageUrl(raw);
  };
  $("#fileInput").addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  });
  document.addEventListener("click", (e) => {
    const menu = $("#attachMenu");
    if (!menu.hidden && !menu.contains(e.target) && e.target !== $("#attachBtn")) {
      menu.hidden = true;
      $("#attachBtn").classList.remove("active");
    }
  });
  window.addEventListener("resize", () => {
    if (!$("#attachMenu").hidden) positionAttachMenu();
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
window.Lumina = { openImage };

document.addEventListener("DOMContentLoaded", init);

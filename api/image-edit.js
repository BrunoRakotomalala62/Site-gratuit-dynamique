/* ============================================================
   api/image-edit.js — édition d'image Magic Hour (fonction Vercel)
   ------------------------------------------------------------
   AJOUT (additif) : ce fichier fournit au site une route SOURCE
   pour la modification d'image. La génération/modification ChatiPro
   existante (chatipro.vercel.app/api/image*) n'est pas modifiée.

   La clé MAGIC_HOUR_API_KEY n'est JAMAIS exposée au navigateur :
   elle est lue ici, côté serveur (Vercel > Settings > Environment
   Variables), et seuls les octets de l'image transitent.

   Routes
     POST /api/image-edit
       body JSON { image, prompt, model?, resolution?, wait? }
         image : data URL (« data:image/…;base64,… »), base64 nu,
                 ou URL publique http(s) (avec extension)
       → { success, dataUrl, id, status, model, creditsCharged }   (wait, défaut)
       → { success, pending:true, id, status }                     (wait:false ou budget dépassé)
     GET /api/image-edit?id=…&wait=1
       → état du projet (+ dataUrl si terminé)
     GET /api/image-edit            → { success, models:[…] } (modèles gratuits)
     GET /api/image-edit?all=1      → tout le catalogue

   Dépendances : AUCUNE (fetch global de Node 18+). Le mode simulé
   IMAGE_EDIT_MOCK=1 permet les tests hors ligne (aucune clé, aucun réseau).

   Fournisseur : https://docs.magichour.ai
     POST /v1/files/upload-urls   → URL pré-signée + file_path
     PUT  <upload_url>            → envoi des octets
     POST /v1/ai-image-editor     → création du projet { id, credits_charged }
     GET  /v1/image-projects/{id} → statut + downloads
   ============================================================ */
"use strict";

const MH_BASE = String(process.env.MAGIC_HOUR_BASE_URL || "https://api.magichour.ai").replace(/\/+$/, "");
const DEFAULT_MODEL = process.env.IMAGE_EDIT_MODEL || "flux-2-klein";
const DEFAULT_RESOLUTION = process.env.IMAGE_EDIT_RESOLUTION || "640px";
const DEFAULT_ASPECT_RATIO = process.env.IMAGE_EDIT_ASPECT_RATIO || "auto";
const TIMEOUT_MS = Number(process.env.IMAGE_EDIT_TIMEOUT_MS || 45000);
const WAIT_MS = Number(process.env.IMAGE_EDIT_WAIT_MS || 48000);
/** Plafond dur : on rend TOUJOURS la main avant la limite Vercel de 60 s,
 *  sinon la fonction est coupée sans réponse (le client verrait une erreur
 *  trompeuse). Au-delà, on répond `pending:true` + id, et le client re-sonde. */
const HARD_BUDGET_MS = Number(process.env.IMAGE_EDIT_HARD_BUDGET_MS || 55000);
const POLL_MS = Number(process.env.IMAGE_EDIT_POLL_MS || 2000);
const MAX_BODY_BYTES = Number(process.env.IMAGE_EDIT_MAX_BYTES || Math.floor(4.5 * 1024 * 1024));
const MOCK = /^(1|true|yes|oui)$/i.test(String(process.env.IMAGE_EDIT_MOCK || ""));

/* Modèles d'édition : seuls flux-2-klein / qwen-edit / krea-2 sont en tier gratuit. */
const EDIT_MODELS = [
  { id: "flux-2-klein", label: "Flux 2 Klein", freeTier: true, creditsPerImage: 5, resolutions: ["640px", "1k", "2k"], maxInputImages: 5 },
  { id: "qwen-edit", label: "Qwen Edit", freeTier: true, creditsPerImage: 10, resolutions: ["640px", "1k", "2k"], maxInputImages: 2 },
  { id: "krea-2", label: "Krea 2", freeTier: true, creditsPerImage: 10, resolutions: ["640px", "1k"], maxInputImages: 1 },
  { id: "seedream-v4", label: "Seedream 4", freeTier: false, creditsPerImage: 40, resolutions: ["640px", "1k", "2k", "4k"], maxInputImages: 9 },
  { id: "nano-banana", label: "Nano Banana", freeTier: false, creditsPerImage: 50, resolutions: ["640px", "1k"], maxInputImages: 9 },
  { id: "nano-banana-2-lite", label: "Nano Banana 2 Lite", freeTier: false, creditsPerImage: 50, resolutions: ["640px", "1k"], maxInputImages: 9 },
  { id: "gpt-image-2", label: "GPT Image 2", freeTier: false, creditsPerImage: 50, resolutions: ["640px", "1k", "2k", "4k"], maxInputImages: 9 },
  { id: "seedream-v4.5", label: "Seedream 4.5", freeTier: false, creditsPerImage: 50, resolutions: ["640px", "1k", "2k", "4k"], maxInputImages: 9 },
  { id: "seedream-v5-pro", label: "Seedream 5 Pro", freeTier: false, creditsPerImage: 75, resolutions: ["640px", "1k", "2k"], maxInputImages: 9 },
  { id: "nano-banana-2", label: "Nano Banana 2", freeTier: false, creditsPerImage: 100, resolutions: ["640px", "1k", "2k", "4k"], maxInputImages: 9 },
  { id: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare", freeTier: false, creditsPerImage: 100, resolutions: ["640px", "1k", "2k", "4k"], maxInputImages: 9 },
  { id: "nano-banana-pro", label: "Nano Banana Pro", freeTier: false, creditsPerImage: 150, resolutions: ["1k", "2k", "4k"], maxInputImages: 9 },
];
const MODEL_IDS = EDIT_MODELS.map((m) => m.id);
const RESOLUTIONS = ["auto", "640px", "1k", "2k", "4k"];
const ASPECT_RATIOS = ["auto", "16:9", "9:16", "4:3", "3:2", "1:1", "4:5", "2:3"];
const TERMINAL = new Set(["complete", "error", "canceled"]);

const MIME_TO_EXT = {
  "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/pjpeg": "jpg",
  "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/avif": "avif",
  "image/jp2": "jp2", "image/tiff": "tiff", "image/x-tiff": "tiff", "image/bmp": "bmp",
};
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "jfif", "heic", "heif", "webp", "avif", "jp2", "tiff", "tif", "bmp"]);

/* ---------- Utilitaires HTTP ---------- */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  for (const [k, v] of Object.entries(corsHeaders())) res.setHeader(k, v);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

/** Erreur typée portant un statut HTTP. */
function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

/** Lit le corps brut de la requête (Buffer), avec plafond. */
function readRaw(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(req.body)) return resolve(req.body);
    if (typeof req.body === "string") return resolve(Buffer.from(req.body));
    const chunks = [];
    let size = 0;
    let done = false;
    req.on("data", (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) {
        done = true;
        reject(apiError(413, "payload_too_large", `Corps trop volumineux (max ${Math.round(limit / 1024 / 1024)} Mo).`));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on("error", (e) => { if (!done) { done = true; reject(apiError(400, "bad_request", `Lecture du corps impossible : ${e.message}`)); } });
  });
}

/** Lit et parse le corps JSON (tolère le corps déjà parsé par Vercel). */
async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readRaw(req);
  const text = raw.toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    throw apiError(400, "invalid_json", "Corps JSON invalide.");
  }
}

/* ---------- Utilitaires divers ---------- */

function sleep(ms) { return new Promise((r) => setTimeout(r, Math.max(0, ms))); }

function truthy(v) { return /^(1|true|yes|on|oui|vrai)$/i.test(String(v == null ? "" : v).trim()); }

function isHttpUrl(s) { return /^https?:\/\//i.test(String(s || "").trim()); }

function authHeaders() {
  const key = process.env.MAGIC_HOUR_API_KEY;
  if (!key) {
    throw apiError(500, "config_error", "MAGIC_HOUR_API_KEY est absente côté serveur. Ajoutez-la dans Vercel (Settings > Environment Variables) puis redéployez.");
  }
  return { Authorization: `Bearer ${key}` };
}

function guessExt(mimetype, filename, buffer) {
  const ct = String(mimetype || "").toLowerCase().split(";")[0].trim();
  if (MIME_TO_EXT[ct]) return MIME_TO_EXT[ct];
  const ext = (String(filename || "").match(/\.([a-z0-9]+)$/i) || [])[1];
  if (ext && IMAGE_EXTS.has(ext.toLowerCase())) return ext.toLowerCase();
  if (Buffer.isBuffer(buffer) && buffer.length >= 12) {
    if (buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") return "png";
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
    if (buffer.toString("ascii", 0, 2) === "BM") return "bmp";
  }
  return "png";
}

/** Décode un data URL / base64 en { buffer, mimetype }. */
function decodeImage(value, fallbackMime = "image/jpeg") {
  const s = String(value || "").trim();
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(s);
  if (m) {
    const mime = m[1] || fallbackMime;
    const buf = m[2] ? Buffer.from(m[3] || "", "base64") : Buffer.from(decodeURIComponent(m[3] || ""), "binary");
    if (!buf.length) throw apiError(400, "invalid_image", "Image data URL vide.");
    return { buffer: buf, mimetype: mime };
  }
  const buf = Buffer.from(s, "base64");
  if (!buf.length) throw apiError(400, "invalid_image", "Base64 d'image invalide.");
  return { buffer: buf, mimetype: fallbackMime };
}

/* ---------- Client Magic Hour ---------- */

async function fetchWithTimeout(url, init = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err && err.name === "AbortError") throw apiError(504, "upstream_timeout", `Magic Hour n'a pas répondu en ${timeoutMs} ms.`);
    throw apiError(502, "upstream_unreachable", `Magic Hour injoignable : ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function upstreamError(res, what) {
  let code = "";
  let message = "";
  try {
    const text = (await res.text()).slice(0, 600);
    try { const d = JSON.parse(text); code = d.code || ""; message = d.message || ""; } catch (_) { message = text; }
  } catch (_) { /* ignore */ }
  const detail = [code && `[${code}]`, message].filter(Boolean).join(" ").slice(0, 300) || `HTTP ${res.status}`;
  if (res.status === 402) throw apiError(402, "insufficient_credits", `Crédits Magic Hour insuffisants : ${detail}`);
  if (res.status === 401 || res.status === 403) throw apiError(502, "magichour_unauthorized", `Clé Magic Hour refusée : ${detail}`);
  throw apiError(res.status >= 500 ? 502 : 400, "magichour_error", `${what} : ${detail}`);
}

/** Envoie des octets locaux sur le stockage Magic Hour ; renvoie le file_path. */
async function uploadImage(buffer, mimetype, filename) {
  if (!buffer || !buffer.length) throw apiError(400, "missing_image", "Image vide.");
  if (buffer.length > MAX_BODY_BYTES) throw apiError(413, "image_too_large", `Image trop volumineuse (max ${Math.round(MAX_BODY_BYTES / 1024 / 1024)} Mo).`);
  const extension = guessExt(mimetype, filename, buffer);
  if (MOCK) return `mock-assets/${Date.now()}.${extension}`;

  const res = await fetchWithTimeout(`${MH_BASE}/v1/files/upload-urls`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ items: [{ type: "image", extension }] }),
  });
  if (!res.ok) await upstreamError(res, "Demande d'URL d'upload");
  const data = await res.json().catch(() => null);
  const item = data && data.items && data.items[0];
  if (!item || !item.upload_url || !item.file_path) throw apiError(502, "upload_url_missing", "Magic Hour n'a pas renvoyé d'URL d'upload.");

  const put = await fetchWithTimeout(item.upload_url, { method: "PUT", body: buffer });
  if (!put.ok) throw apiError(502, "upload_failed", `Envoi de l'image refusé (HTTP ${put.status}).`);
  return item.file_path;
}

/** Crée un projet d'édition ; renvoie { id, creditsCharged, model, resolution, aspectRatio }. */
async function createEdit({ imagePaths, prompt, model, resolution, aspectRatio, name }) {
  if (!imagePaths.length) throw apiError(400, "missing_image", "Au moins une image est requise.");
  if (MOCK) return { id: `mock-${Date.now().toString(36)}`, creditsCharged: 0, model, resolution, aspectRatio };

  const res = await fetchWithTimeout(`${MH_BASE}/v1/ai-image-editor`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      name: name || `Image edit - ${new Date().toISOString()}`,
      image_count: 1,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      style: { prompt },
      assets: { image_file_paths: imagePaths },
    }),
  });
  if (!res.ok) await upstreamError(res, "Création de l'édition");
  const data = await res.json().catch(() => null);
  if (!data || !data.id) throw apiError(502, "magichour_bad_response", "Réponse Magic Hour illisible (id absent).");
  return { id: data.id, creditsCharged: Number(data.credits_charged || 0), model, resolution, aspectRatio };
}

const MOCK_DATA_URL =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function getProject(id) {
  if (MOCK) {
    return {
      id, status: "complete", type: "AI_IMAGE_EDITOR", image_count: 1, credits_charged: 0,
      downloads: [{ url: MOCK_DATA_URL, expires_at: new Date(Date.now() + 3600e3).toISOString() }], error: null,
    };
  }
  const res = await fetchWithTimeout(`${MH_BASE}/v1/image-projects/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { ...authHeaders(), accept: "application/json" },
  });
  if (!res.ok) await upstreamError(res, "Lecture du projet");
  const data = await res.json().catch(() => null);
  if (!data || !data.id) throw apiError(502, "magichour_bad_response", "Projet illisible.");
  return data;
}

/** Attend la fin du rendu (ou le budget). */
async function waitProject(id, budgetMs = WAIT_MS, pollMs = POLL_MS) {
  const deadline = Date.now() + Math.max(0, budgetMs);
  let project = await getProject(id);
  while (!TERMINAL.has(project.status)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return project;
    await sleep(Math.min(Math.max(500, pollMs), remaining));
    project = await getProject(id);
  }
  return project;
}

/** Télécharge la 1re sortie et la convertit en data URL (attendu par le site). */
async function projectToDataUrl(project) {
  const url = project.downloads && project.downloads[0] && project.downloads[0].url;
  if (!url) return null;
  if (/^data:/i.test(url)) return url;
  const res = await fetchWithTimeout(url, { method: "GET" });
  if (!res.ok) throw apiError(502, "download_failed", `Téléchargement du résultat refusé (HTTP ${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/png";
  return `data:${ct};base64,${buf.toString("base64")}`;
}

/** Transforme une valeur d'image (URL publique ou base64/data URL) en file_path Magic Hour. */
async function resolveImagePath(value) {
  const s = String(value || "").trim();
  if (!s) throw apiError(400, "missing_image", "Image manquante.");
  if (isHttpUrl(s)) return s; // Magic Hour télécharge l'URL lui-même
  const { buffer, mimetype } = decodeImage(s);
  return await uploadImage(buffer, mimetype, "image");
}

/* ---------- Handlers ---------- */

async function handleModels(res, url) {
  const all = truthy(url.searchParams.get("all"));
  const models = all ? EDIT_MODELS : EDIT_MODELS.filter((m) => m.freeTier);
  sendJson(res, 200, {
    success: true,
    provider: MOCK ? "mock" : process.env.MAGIC_HOUR_API_KEY ? "magichour" : "unconfigured",
    defaultModel: DEFAULT_MODEL,
    defaultResolution: DEFAULT_RESOLUTION,
    freeOnly: !all,
    count: models.length,
    models,
  });
}

async function handleStatus(res, url) {
  const id = url.searchParams.get("id");
  if (!id) throw apiError(400, "missing_id", "Paramètre « id » requis (ou appelez GET /api/image-edit sans id pour la liste des modèles).");
  const wait = truthy(url.searchParams.get("wait"));
  const project = wait ? await waitProject(id, Math.min(WAIT_MS, HARD_BUDGET_MS)) : await getProject(id);
  const payload = {
    success: true,
    id: project.id,
    status: project.status,
    pending: !TERMINAL.has(project.status),
    creditsCharged: project.credits_charged ?? null,
    error: project.error ?? null,
  };
  if (project.status === "complete") {
    payload.dataUrl = await projectToDataUrl(project);
  }
  sendJson(res, 200, payload);
}

async function handleCreate(req, res, url) {
  const t0 = Date.now();
  const body = await readJson(req);
  const prompt = String(body.prompt || body.text || "").trim();
  if (!prompt) throw apiError(400, "empty_prompt", "Le paramètre « prompt » est requis : décrivez la modification.");

  const rawImage = body.image || body.image_url || body.url || (Array.isArray(body.images) ? body.images[0] : "") || (Array.isArray(body.image_paths) ? body.image_paths[0] : "");
  if (!rawImage) throw apiError(400, "missing_image", "Le paramètre « image » est requis (data URL, base64 ou URL publique).");

  const model = String(body.model || url.searchParams.get("model") || DEFAULT_MODEL);
  if (!MODEL_IDS.includes(model)) throw apiError(400, "invalid_model", `Modèle inconnu : « ${model} ». Gratuits : ${EDIT_MODELS.filter((m) => m.freeTier).map((m) => m.id).join(", ")}.`);
  const resolution = String(body.resolution || url.searchParams.get("resolution") || DEFAULT_RESOLUTION);
  if (!RESOLUTIONS.includes(resolution)) throw apiError(400, "invalid_resolution", `Résolution invalide : « ${resolution} ». Valeurs : ${RESOLUTIONS.join(", ")}.`);
  const aspectRatio = String(body.aspect_ratio || body.aspectRatio || url.searchParams.get("aspect_ratio") || DEFAULT_ASPECT_RATIO);
  if (!ASPECT_RATIOS.includes(aspectRatio)) throw apiError(400, "invalid_aspect_ratio", `Format invalide : « ${aspectRatio} ». Valeurs : ${ASPECT_RATIOS.join(", ")}.`);

  const imagePath = await resolveImagePath(rawImage);
  const created = await createEdit({ imagePaths: [imagePath], prompt, model, resolution, aspectRatio, name: body.name });

  // wait : vrai par défaut (le site attend une image prête) ; body.wait === false pour l'asynchrone.
  const wait = body.wait === undefined ? true : truthy(body.wait);

  if (!wait) {
    sendJson(res, 200, { success: true, pending: true, id: created.id, status: "queued", model, resolution, aspectRatio, creditsCharged: created.creditsCharged, poll: `/api/image-edit?id=${encodeURIComponent(created.id)}` });
    return;
  }

  // Le budget d'attente tient compte du temps déjà passé (upload + création) :
  // on rend la main AVANT la limite Vercel de 60 s, quitte à répondre `pending`.
  const remaining = Math.max(3000, HARD_BUDGET_MS - (Date.now() - t0));
  const project = await waitProject(created.id, Math.min(WAIT_MS, remaining));
  const payload = {
    success: true,
    id: project.id,
    status: project.status,
    pending: !TERMINAL.has(project.status),
    model,
    resolution,
    aspectRatio,
    creditsCharged: project.credits_charged ?? created.creditsCharged,
    error: project.error ?? null,
    poll: `/api/image-edit?id=${encodeURIComponent(created.id)}`,
  };
  if (project.status === "complete") {
    payload.dataUrl = await projectToDataUrl(project);
  }
  sendJson(res, 200, payload);
}

/* ---------- Entrée Vercel ---------- */
module.exports = async function handler(req, res) {
  for (const [k, v] of Object.entries(corsHeaders())) res.setHeader(k, v);
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" || req.method === "HEAD") {
      if (url.searchParams.get("id")) return await handleStatus(res, url);
      return await handleModels(res, url);
    }
    if (req.method === "POST") return await handleCreate(req, res, url);
    sendJson(res, 405, { success: false, code: "method_not_allowed", error: "Méthodes acceptées : GET, POST." });
  } catch (err) {
    const status = (err && err.status) || 500;
    if (status >= 500) console.error("[image-edit]", err && err.stack ? err.stack : err);
    sendJson(res, status, { success: false, code: (err && err.code) || "internal_error", error: String((err && err.message) || err) });
  }
};

/* ============================================================
   test-image-edit.js — tests hors ligne de la route /api/image-edit
   ------------------------------------------------------------
     node test-image-edit.js

   La fonction serverless est appelée directement, sans réseau ni clé
   (IMAGE_EDIT_MOCK=1). Aucun autre fichier du site n'est modifié.
   ============================================================ */
"use strict";

const { Readable } = require("node:stream");

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", BOLD = "\x1b[1m", YELLOW = "\x1b[33m", RESET = "\x1b[0m";

let passed = 0, failed = 0;
const failures = [];
const ok = (n, e = "") => { passed++; console.log(`  ${GREEN}✓${RESET} ${n}${e ? ` ${DIM}${e}${RESET}` : ""}`); };
const ko = (n, err) => { failed++; failures.push(n); console.log(`  ${RED}✗${RESET} ${n}\n     ${RED}${err}${RESET}`); };
function assert(c, m) { if (!c) throw new Error(m || "assertion échouée"); }
async function test(name, fn) { try { await fn(); } catch (e) { ko(name, e.message); } }

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const PNG_DATA_URL = "data:image/png;base64," + PNG_1PX.toString("base64");

function fakeRes() {
  const res = {
    statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { res.headers[String(k).toLowerCase()] = v; },
    end(body) { res.body = body; },
  };
  return res;
}

function fakeReq({ method = "GET", url = "/", json } = {}) {
  const req = new Readable({ read() {} });
  req.method = method;
  req.url = url;
  req.headers = {};
  if (json !== undefined) {
    req.headers["content-type"] = "application/json";
    req.push(JSON.stringify(json));
  }
  req.push(null); // fin du flux (le corps est déjà tamponné, la lecture fonctionne)
  return req;
}

/** Appelle le handler et renvoie { status, json }. */
async function call(handler, { method, url, json }) {
  const res = fakeRes();
  await handler(fakeReq({ method, url, json }), res);
  let parsed = null;
  try { parsed = res.body ? JSON.parse(res.body) : null; } catch (_) { /* binaire */ }
  return { status: res.statusCode, json: parsed, headers: res.headers };
}

/** Recharge le module avec l'environnement courant. */
function freshHandler() {
  delete require.cache[require.resolve("./api/image-edit")];
  return require("./api/image-edit");
}

async function main() {
  console.log(`\n${BOLD}Site-gratuit-dynamique — tests /api/image-edit (mode mock)${RESET}\n`);

  process.env.IMAGE_EDIT_MOCK = "1";
  delete process.env.MAGIC_HOUR_API_KEY;
  let handler = freshHandler();

  console.log(`${BOLD}1. GET /api/image-edit (modèles)${RESET}`);
  await test("modèles gratuits par défaut", async () => {
    const r = await call(handler, { method: "GET", url: "/api/image-edit" });
    assert(r.status === 200 && r.json.success, `HTTP ${r.status}`);
    assert(r.json.freeOnly === true, "freeOnly attendu");
    const ids = r.json.models.map((m) => m.id);
    for (const id of ["flux-2-klein", "qwen-edit", "krea-2"]) assert(ids.includes(id), `${id} absent`);
    assert(r.json.models.every((m) => m.freeTier), "modèle payant dans la liste gratuite");
    assert(r.json.defaultModel === "flux-2-klein", "modèle par défaut inattendu");
    ok("modèles gratuits par défaut", ids.join(", "));
  });
  await test("?all=1 → catalogue complet", async () => {
    const r = await call(handler, { method: "GET", url: "/api/image-edit?all=1" });
    assert(r.json.models.some((m) => m.id === "gpt-image-2" && !m.freeTier), "gpt-image-2 absent");
    ok("?all=1 → catalogue complet", `${r.json.count} modèles`);
  });

  console.log(`\n${BOLD}2. POST /api/image-edit (édition synchrone)${RESET}`);
  let projectId = null;
  await test("data URL + prompt → image prête (dataUrl)", async () => {
    const r = await call(handler, {
      method: "POST", url: "/api/image-edit",
      json: { image: PNG_DATA_URL, prompt: "Ajoute des lunettes de soleil" },
    });
    assert(r.status === 200 && r.json.success, `HTTP ${r.status} — ${r.json && r.json.error}`);
    assert(typeof r.json.dataUrl === "string" && r.json.dataUrl.startsWith("data:image/"), "dataUrl manquant");
    assert(r.json.status === "complete" && r.json.pending === false, `statut : ${r.json.status}`);
    assert(r.json.model === "flux-2-klein" && r.json.resolution === "640px", "modèle/résolution par défaut");
    projectId = r.json.id;
    ok("data URL + prompt → image prête (dataUrl)", `id=${r.json.id}`);
  });
  await test("URL publique acceptée telle quelle", async () => {
    const r = await call(handler, {
      method: "POST", url: "/api/image-edit",
      json: { image: "https://example.com/photo.png", prompt: "Change le fond" },
    });
    assert(r.status === 200 && r.json.success, `HTTP ${r.status} — ${r.json && r.json.error}`);
    ok("URL publique acceptée telle quelle");
  });
  await test("wait:false → id seulement (asynchrone)", async () => {
    const r = await call(handler, {
      method: "POST", url: "/api/image-edit",
      json: { image: PNG_DATA_URL, prompt: "Retire le filigrane", wait: false },
    });
    assert(r.status === 200 && r.json.pending === true && r.json.id, `réponse : ${JSON.stringify(r.json)}`);
    assert(!r.json.dataUrl, "dataUrl présent alors que wait:false");
    ok("wait:false → id seulement (asynchrone)", `id=${r.json.id}`);
  });
  await test("modèle qwen-edit (gratuit) accepté", async () => {
    const r = await call(handler, {
      method: "POST", url: "/api/image-edit",
      json: { image: PNG_DATA_URL, prompt: "Colorise", model: "qwen-edit", resolution: "1k" },
    });
    assert(r.status === 200 && r.json.model === "qwen-edit", `HTTP ${r.status} — ${r.json && r.json.error}`);
    ok("modèle qwen-edit (gratuit) accepté");
  });

  console.log(`\n${BOLD}3. GET /api/image-edit?id=…${RESET}`);
  await test("statut d'un projet → complete + dataUrl", async () => {
    const r = await call(handler, { method: "GET", url: `/api/image-edit?id=${encodeURIComponent(projectId)}&wait=1` });
    assert(r.status === 200 && r.json.status === "complete", `statut : ${r.json && r.json.status}`);
    assert(typeof r.json.dataUrl === "string" && r.json.dataUrl.startsWith("data:image/"), "dataUrl manquant");
    ok("statut d'un projet → complete + dataUrl");
  });

  console.log(`\n${BOLD}4. Validation${RESET}`);
  await test("prompt manquant → 400", async () => {
    const r = await call(handler, { method: "POST", url: "/api/image-edit", json: { image: PNG_DATA_URL } });
    assert(r.status === 400 && r.json.code === "empty_prompt", `HTTP ${r.status} code ${r.json && r.json.code}`);
    ok("prompt manquant → 400");
  });
  await test("image manquante → 400", async () => {
    const r = await call(handler, { method: "POST", url: "/api/image-edit", json: { prompt: "test" } });
    assert(r.status === 400 && r.json.code === "missing_image", `code ${r.json && r.json.code}`);
    ok("image manquante → 400");
  });
  await test("modèle inconnu → 400", async () => {
    const r = await call(handler, { method: "POST", url: "/api/image-edit", json: { image: PNG_DATA_URL, prompt: "x", model: "bidon" } });
    assert(r.status === 400 && r.json.code === "invalid_model", `code ${r.json && r.json.code}`);
    ok("modèle inconnu → 400");
  });
  await test("résolution inconnue → 400", async () => {
    const r = await call(handler, { method: "POST", url: "/api/image-edit", json: { image: PNG_DATA_URL, prompt: "x", resolution: "8k" } });
    assert(r.status === 400 && r.json.code === "invalid_resolution", `code ${r.json && r.json.code}`);
    ok("résolution inconnue → 400");
  });
  await test("méthode PUT → 405", async () => {
    const r = await call(handler, { method: "PUT", url: "/api/image-edit" });
    assert(r.status === 405, `attendu 405, reçu ${r.status}`);
    ok("méthode PUT → 405");
  });
  await test("préflight OPTIONS → 204", async () => {
    const r = await call(handler, { method: "OPTIONS", url: "/api/image-edit" });
    assert(r.status === 204 && r.headers["access-control-allow-origin"], `HTTP ${r.status}`);
    ok("préflight OPTIONS → 204");
  });

  console.log(`\n${BOLD}5. Sécurité : clé absente (mode réel)${RESET}`);
  await test("sans MAGIC_HOUR_API_KEY → 500 config_error", async () => {
    delete process.env.IMAGE_EDIT_MOCK;
    delete process.env.MAGIC_HOUR_API_KEY;
    const real = freshHandler();
    const originalError = console.error;
    console.error = () => {}; // la route journalise l'erreur 500 : on masque la trace attendue
    let r;
    try {
      r = await call(real, { method: "POST", url: "/api/image-edit", json: { image: PNG_DATA_URL, prompt: "x" } });
    } finally {
      console.error = originalError;
    }
    assert(r.status === 500 && r.json.code === "config_error", `HTTP ${r.status} code ${r.json && r.json.code}`);
    assert(/MAGIC_HOUR_API_KEY/.test(r.json.error), "message peu explicite");
    ok("sans MAGIC_HOUR_API_KEY → 500 config_error");
    process.env.IMAGE_EDIT_MOCK = "1"; // rétablit le mock pour la suite
  });

  console.log(`\n${BOLD}6. Câblage du site (statique)${RESET}`);
  const fs = require("node:fs");
  await test("index.html : bouton Magic Hour + version app.js", async () => {
    const html = fs.readFileSync("./index.html", "utf8");
    assert(/id="editMhBtn"/.test(html), "bouton #editMhBtn absent");
    assert(/app\.js\?v=\d+/.test(html), "app.js non versionné");
    ok("index.html : bouton Magic Hour + version app.js");
  });
  await test("app.js : route, modèle et fonction branches", async () => {
    const js = fs.readFileSync("./app.js", "utf8");
    assert(/API_IMAGE_EDIT_MH\s*=\s*"\/api\/image-edit"/.test(js), "constante API_IMAGE_EDIT_MH absente");
    assert(/__img_edit_mh__/.test(js), "modèle IMG_EDIT_MH_MODEL absent");
    assert(/function runMagicHourEdit/.test(js), "runMagicHourEdit absent");
    assert(/editMhBtn/.test(js), "câblage #editMhBtn absent");
    assert(/API_IMAGE_EDIT_3/.test(js), "ChatiPro a disparu (régression)");
    ok("app.js : route, modèle et fonction branches");
  });
  await test("vercel.json : maxDuration pour api/image-edit.js", async () => {
    const conf = JSON.parse(fs.readFileSync("./vercel.json", "utf8"));
    assert(conf.functions && conf.functions["api/image-edit.js"], "functions.absent");
    assert(conf.functions["api/image-edit.js"].maxDuration >= 30, "maxDuration trop court");
    ok("vercel.json : maxDuration pour api/image-edit.js");
  });

  console.log(`\n${BOLD}Bilan${RESET}: ${GREEN}${passed} réussis${RESET}, ${failed ? RED : DIM}${failed} échoués${RESET}`);
  if (failed) console.log(`${RED}Échecs :${RESET} ${failures.join(", ")}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`${RED}Erreur de la suite :${RESET}`, err);
  process.exit(1);
});

/* ============================================================
   test-voice-loop.js — tour de parole de la discussion vocale 🎧
   ------------------------------------------------------------
     node test-voice-loop.js

   Vérifie, SANS navigateur ni micro :
     1. le filtre anti-écho (le micro qui capte la voix du bot) ;
     2. le nettoyage du texte lu à voix haute ;
     3. les garanties structurelles du tour de parole (garde-fous
        contre une régression : plus de lecture du champ de saisie
        comme transcription, délai de réarmement, etc.).

   Aucune autre partie du site n'est modifiée.
   ============================================================ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", BOLD = "\x1b[1m", RESET = "\x1b[0m";

let passed = 0, failed = 0;
const failures = [];
const ok = (n, e = "") => { passed++; console.log(`  ${GREEN}✓${RESET} ${n}${e ? ` ${DIM}${e}${RESET}` : ""}`); };
const ko = (n, err) => { failed++; failures.push(n); console.log(`  ${RED}✗${RESET} ${n}\n     ${RED}${err}${RESET}`); };
function assert(c, m) { if (!c) throw new Error(m || "assertion échouée"); }
function test(name, fn) { try { fn(); } catch (e) { ko(name, e.message); } }

/* --- Harnais DOM minimal : app.js s'exécute sans navigateur --- */
global.window = { addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({
    className: "", style: {}, dataset: {},
    appendChild() {}, setAttribute() {},
    classList: { add() {}, remove() {}, toggle() {} },
  }),
  body: { appendChild: () => {} },
};

const APP_PATH = path.join(__dirname, "app.js");
const SOURCE = fs.readFileSync(APP_PATH, "utf8");

console.log(`\n${BOLD}Site-gratuit-dynamique — tour de parole vocal 🎧${RESET}\n`);

console.log(`${BOLD}1. Chargement du module${RESET}`);
let L = null;
test("app.js se charge et expose les helpers vocaux", () => {
  require(APP_PATH);
  L = global.window.Lumina;
  assert(L, "window.Lumina absent");
  for (const fn of ["voiceCleanText", "voiceNormWords", "voiceLooksLikeEcho"]) {
    assert(typeof L[fn] === "function", `${fn} non exposé`);
  }
  ok("app.js se charge et expose les helpers vocaux");
});

if (!L) {
  console.log(`\n${RED}Impossible de continuer : app.js ne s'est pas chargé.${RESET}\n`);
  process.exit(1);
}

console.log(`\n${BOLD}2. voiceNormWords (normalisation)${RESET}`);
test("minuscules, accents et ponctuation retirés", () => {
  assert(JSON.stringify(L.voiceNormWords("Écoute, l'Écho !")) === JSON.stringify(["ecoute", "echo"]),
    `obtenu : ${JSON.stringify(L.voiceNormWords("Écoute, l'Écho !"))}`);
  ok("minuscules, accents et ponctuation retirés");
});
test("mots de ≤ 2 lettres ignorés", () => {
  assert(JSON.stringify(L.voiceNormWords("le chat et la souris")) === JSON.stringify(["chat", "souris"]),
    `obtenu : ${JSON.stringify(L.voiceNormWords("le chat et la souris"))}`);
  ok("mots de ≤ 2 lettres ignorés");
});

console.log(`\n${BOLD}3. Anti-écho : le micro capte le bot${RESET}`);
const BOT = "Bonjour, je suis Bruno. Comment puis-je vous aider aujourd'hui ?";

test("phrase identique au bot → rejetée (echo)", () => {
  assert(L.voiceLooksLikeEcho("Bonjour je suis Bruno comment puis-je vous aider aujourd'hui", BOT) === true,
    "l'écho identique n'est pas détecté");
  ok("phrase identique au bot → rejetée (echo)");
});
test("écho bruité (accents, ponctuation) → rejeté", () => {
  assert(L.voiceLooksLikeEcho("bonjour je suis bruno, comment puis je vous aider aujourd hui", BOT) === true,
    "l'écho bruité n'est pas détecté");
  ok("écho bruité (accents, ponctuation) → rejeté");
});

console.log(`\n${BOLD}4. Anti-écho : la vraie parole n'est PAS filtrée${RESET}`);
test("réponse plus longue que celle du bot → acceptée", () => {
  assert(L.voiceLooksLikeEcho("Bonjour je suis Bruno et je voudrais connaître la météo de demain matin", BOT) === false,
    "une vraie réponse a été prise pour un écho");
  ok("réponse plus longue que celle du bot → acceptée");
});
test("question différente → acceptée", () => {
  assert(L.voiceLooksLikeEcho("Quelle est la capitale de Madagascar", BOT) === false,
    "une question différente a été filtrée");
  ok("question différente → acceptée");
});
test("parole courte (« oui », « d'accord ») → acceptée", () => {
  assert(L.voiceLooksLikeEcho("oui", BOT) === false, "« oui » filtré à tort");
  assert(L.voiceLooksLikeEcho("d'accord merci beaucoup", BOT) === false, "phrase courte filtrée à tort");
  ok("parole courte (« oui », « d'accord ») → acceptée");
});
test("aucune référence (le bot n'a rien dit) → jamais d'écho", () => {
  assert(L.voiceLooksLikeEcho("Bonjour je suis Bruno comment puis-je vous aider aujourd'hui", "") === false,
    "faux positif sans référence");
  ok("aucune référence (le bot n'a rien dit) → jamais d'écho");
});
test("reformulation partielle du bot → acceptée (information nouvelle)", () => {
  const question = "Peux-tu me dire comment puis-je vous aider aujourd'hui ?";
  assert(L.voiceLooksLikeEcho(question, BOT) === false, "reformulation filtrée à tort");
  ok("reformulation partielle du bot → acceptée (information nouvelle)");
});

console.log(`\n${BOLD}5. voiceCleanText (texte lu à voix haute)${RESET}`);
test("code, LaTeX, liens et emojis retirés", () => {
  const out = L.voiceCleanText("Voici **`code`** et \\(x^2\\) 🎉\nhttps://exemple.com");
  assert(!/\*\*|`|https?:\/\/|🎉/.test(out), `nettoyage incomplet : « ${out} »`);
  assert(/code/.test(out), "le texte utile a disparu");
  ok("code, LaTeX, liens et emojis retirés", `« ${out} »`);
});

console.log(`\n${BOLD}6. Garde-fous du tour de parole (anti-régression)${RESET}`);
test("le champ de saisie n'est plus lu comme transcription", () => {
  assert(!/finalText\s*\|\|\s*inputEl\.value/.test(SOURCE),
    "retour de `finalText || inputEl.value` : un brouillon tapé pourrait être envoyé par le micro");
  ok("le champ de saisie n'est plus lu comme transcription");
});
test("transcription = résultats de CE tour (final + provisoire)", () => {
  assert(/const text = \(finalText \+ voiceInterim\)\.trim\(\);/.test(SOURCE),
    "la transcription ne combine plus finalText + voiceInterim");
  assert(/voiceInterim = interim;/.test(SOURCE), "voiceInterim n'est pas alimenté par onresult");
  ok("transcription = résultats de CE tour (final + provisoire)");
});
test("délai de réarmement porté à 900 ms (écho)", () => {
  assert(/voiceState\.since \|\| 0\) < 900\) return;/.test(SOURCE), "délai de réarmement < 900 ms");
  ok("délai de réarmement porté à 900 ms (écho)");
});
test("la dernière phrase du bot est mémorisée pour l'anti-écho", () => {
  assert(/voiceState\.lastSpoken = clean;/.test(SOURCE), "lastSpoken non renseigné par voiceSpeak");
  assert(/voiceLooksLikeEcho\(t\)\) return "echo";/.test(SOURCE), "le verdict « echo » n'est pas branché");
  ok("la dernière phrase du bot est mémorisée pour l'anti-écho");
});

console.log(`\n${BOLD}Bilan${RESET}: ${GREEN}${passed} réussis${RESET}, ${failed ? RED : DIM}${failed} échoués${RESET}`);
if (failed) console.log(`${RED}Échecs :${RESET} ${failures.join(", ")}`);
process.exit(failed ? 1 : 0);

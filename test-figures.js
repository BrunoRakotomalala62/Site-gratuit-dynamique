// Test unitaire des fonctions de détection de figures (app.js)
"use strict";
global.window = { addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({ className: "", appendChild() {}, }),
  body: { appendChild: () => {} },
};
require("/home/user/.workspace/projects/Site-gratuit-dynamique/app.js");
const L = global.window.Lumina;

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log("  \u2713 " + name); }
  else { fail++; console.log("  \u2717 FAIL: " + name); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("--- normalizeExpression ---");
t("x\u00b2-2x+1", L.normalizeExpression("x\u00b2-2x+1") === "x^2-2x+1");
t("f(x)=x\u00b2-2x+1", L.normalizeExpression("f(x)=x\u00b2-2x+1") === "x^2-2x+1");
t("g(x): 2,5x+1", L.normalizeExpression("g(x): 2,5x+1") === "2.5x+1");
t("\u221ax+1", L.normalizeExpression("\u221ax+1") === "sqrt(x)+1");
t("\u221a(x+1)", L.normalizeExpression("\u221a(x+1)") === "sqrt(x+1)");
t("y = x \u2212 3", L.normalizeExpression("y = x \u2212 3") === "x-3");
t("\u03c0x", L.normalizeExpression("\u03c0x") === "pix");
t("x \u00d7 2 \u00f7 3", L.normalizeExpression("x \u00d7 2 \u00f7 3") === "x*2/3");
t("x\u00b3 - 3x", L.normalizeExpression("x\u00b3 - 3x") === "x^3-3x");

console.log("--- extractExpression ---");
t("Trace la courbe de f(x)=x\u00b2-2x+1",
  eq(L.extractExpression("Trace la courbe de f(x)=x\u00b2-2x+1"), { send: "x^2-2x+1", display: "x^2-2x+1" }));
t("f(x) = x - 2ln(x)",
  eq(L.extractExpression("f(x) = x - 2ln(x)"), { send: "x-2ln(x)", display: "x-2ln(x)" }));
t("\u00c9tudie la fonction f d\u00e9finie par f(x)=x\u00b3-3x",
  eq(L.extractExpression("\u00c9tudie la fonction f d\u00e9finie par f(x)=x\u00b3-3x"), { send: "x^3-3x", display: "x^3-3x" }));
t("y = sin(x)",
  eq(L.extractExpression("y = sin(x)"), { send: "sin(x)", display: "sin(x)" }));
t("la courbe d'\u00e9quation y = x+1",
  eq(L.extractExpression("la courbe d'\u00e9quation y = x+1"), { send: "x+1", display: "x+1" }));
t("f(x)=x\u00b2-2x+1 sur l'intervalle [-2;4]",
  eq(L.extractExpression("f(x)=x\u00b2-2x+1 sur l'intervalle [-2;4]"), { send: "x^2-2x+1", display: "x^2-2x+1" }));
t("f(x)=x\u00b2+1 et g(x)=x-1",
  eq(L.extractExpression("f(x)=x\u00b2+1 et g(x)=x-1"), { send: "x^2+1", display: "x^2+1" }));
t("aucune expression (d\u00e9riv\u00e9e)", L.extractExpression("Quelle est la d\u00e9riv\u00e9e de f ?") === null);
t("rejette f(x)+1 (y=f(x)+1)", L.extractExpression("montre que y = f(x) + 1") === null);
t("rejette x=2 (\u00e9quation)", L.extractExpression("r\u00e9sous x=2") === null);
t("rejette 1/x sans x au num\u00e9rateur... non : 1/x accept\u00e9",
  eq(L.extractExpression("f(x)=1/x"), { send: "1/x", display: "1/x" }));

console.log("--- detectFigureRequest ---");
const d = (u, r, imgs) => L.detectFigureRequest(u, r, !!imgs);
t("courbe expr", JSON.stringify(d("Trace la courbe de f(x)=x\u00b2-2x+1", "", false)).includes('"expression":"x^2-2x+1"'));
t("\u00e9tude fonction expr", JSON.stringify(d("\u00c9tudie la fonction f(x)=x\u00b3-3x", "", false)).includes('"expression":"x^3-3x"'));
t("sch\u00e9ma circuit (subject)", JSON.stringify(d("Fais le sch\u00e9ma d'un circuit \u00e9lectrique avec pile et ampoule", "", false)).includes('"subject":"le sch\u00e9ma d\'un circuit \u00e9lectrique avec pile et ampoule"'));
t("pas de figure (d\u00e9riv\u00e9e)", d("Quelle est la d\u00e9riv\u00e9e de f(x)=x\u00b2 ?", "", false) === null);
t("pas de figure (question normale)", d("Explique le machine learning", "", false) === null);
t("photo exercice: repli sur r\u00e9ponse bot (courbe)", JSON.stringify(d("Fais cet exercice", "1. Trace la courbe de f(x)=x\u00b2-2x+1\n2. Calcule la d\u00e9riv\u00e9e", true)).includes('"expression":"x^2-2x+1"'));
t("photo exercice: sch\u00e9ma (subject via r\u00e9ponse)", JSON.stringify(d("Fais cet exercice", "Sch\u00e9matise le circuit \u00e9lectrique suivant", true)).includes('"subject":"le circuit \u00e9lectrique"'));
t("photo sans consigne figure \u2192 null", d("Que dit cet exercice ?", "Cet exercice porte sur les fonctions affines.", true) === null);
t("r\u00e9ponse sans image \u2192 null", d("Fais cet exercice", "Trace la courbe de f(x)=x\u00b2", false) === null);

console.log("--- cleanSubject ---");
t("nettoyage", L.cleanSubject("Peux-tu me dessiner un circuit \u00e9lectrique svp ?") === "un circuit \u00e9lectrique");
t("nettoyage 2", L.cleanSubject("Trace la courbe de f(x)=x\u00b2") === "la courbe de f(x)=x\u00b2");

console.log("--- extractTangent ---");
t("tangente au point d'abscisse 2", L.extractTangent("Trace la courbe et la tangente au point d'abscisse 2") === 2);
t("tangente en x = -1", L.extractTangent("la tangente en x = -1") === -1);
t("tangente au point A(2 ; 4)", L.extractTangent("la tangente au point A(2 ; 4)") === 2);
t("tangente au point B(-1; 3)", L.extractTangent("la tangente au point B(-1; 3)") === -1);
t("tangente en 0,5", L.extractTangent("la tangente en 0,5") === 0.5);
t("tangente au point d'abscisse 1/2", L.extractTangent("la tangente au point d'abscisse 1/2") === 0.5);
t("pas de tangente demandée", L.extractTangent("Trace la courbe de f(x)=x\u00b2") === null);
t("pas de mot tangente", L.extractTangent("calcule la d\u00e9riv\u00e9e en x=2") === null);

console.log("--- detectFigureRequest avec tangente ---");
t("courbe + tangente au point d'abscisse 2", JSON.stringify(d("Trace la courbe de f(x)=x\u00b2-2x+1 et la tangente au point d'abscisse 2", "", false)).includes('"tangent":2'));
t("courbe + tangente en x=-1", JSON.stringify(d("Trace la courbe de f(x)=x\u00b3 et la tangente en x=-1", "", false)).includes('"tangent":-1'));
t("photo exercice avec tangente (via r\u00e9ponse)", JSON.stringify(d("Fais cet exercice", "1. Trace la courbe de f(x)=x\u00b2-2x+1\n2. Trace la tangente au point d'abscisse 2", true)).includes('"tangent":2'));
t("tangente seule avec expression d\u00e9clenche la courbe", d("D\u00e9termine la tangente au point d'abscisse 2 de f(x)=x\u00b2-2x+1", "", false) !== null);
t("sans tangente pas de param\u00e8tre", !JSON.stringify(d("Trace la courbe de f(x)=x\u00b2-2x+1", "", false)).includes("tangent"));

console.log("--- extractTangent (π) ---");
t("tangente en x = \u03c0/2", Math.abs(L.extractTangent("la tangente en x = \u03c0/2") - Math.PI / 2) < 1e-4);
t("tangente au point d'abscisse \u03c0", Math.abs(L.extractTangent("la tangente au point d'abscisse \u03c0") - Math.PI) < 1e-4);

console.log("--- extractLine (droite y=ax+b donnée directement) ---");
t("droite d'équation y = 2x-3", JSON.stringify(L.extractLine("la droite d'équation y = 2x-3")) === JSON.stringify({ display: "2x-3", expression: "2x-3" }));
t("la droite (d) : y = -x + 1", JSON.stringify(L.extractLine("la droite (d) : y = -x + 1")) === JSON.stringify({ display: "-x+1", expression: "-x+1" }));
t("la droite y = 0.5x", L.extractLine("Trace la droite y = 0.5x") !== null);
t("rejette x\u00b2 (pas une droite)", L.extractLine("la droite d'équation y = x\u00b2") === null);
t("rejette sans mot droite", L.extractLine("Trace la courbe de y = 2x-3") === null);
t("rejette sin(x)", L.extractLine("la droite d'équation y = sin(x)") === null);

console.log("--- detectFigureRequest avec droite ---");
t("courbe + droite d'équation", JSON.stringify(d("Trace la courbe de f(x)=x\u00b2-2x+1 et la droite d'équation y=2x-3", "", false)).includes('"line":"2x-3"'));
t("droite seule (sans fonction)", JSON.stringify(d("Trace la droite d'équation y = -x+1", "", false)).includes('"line":"-x+1"'));
t("droite seule : pas d'expression en doublon", !JSON.stringify(d("Trace la droite d'équation y = -x+1", "", false)).includes('"expression"'));
t("photo exercice avec droite (via réponse)", JSON.stringify(d("Fais cet exercice", "1. f(x)=x\u00b2-2x+1\n2. Montrer que la droite d'équation y=2x-3 est tangente", true)).includes('"line":"2x-3"'));
t("courbe + droite + tangente", JSON.stringify(d("Trace f(x)=x\u00b2-2x+1, la droite d'équation y=2x-3 et la tangente au point d'abscisse 2", "", false)).includes('"tangent":2') && JSON.stringify(d("Trace f(x)=x\u00b2-2x+1, la droite d'équation y=2x-3 et la tangente au point d'abscisse 2", "", false)).includes('"line":"2x-3"'));

console.log("--- fetchFigure (URL /api/plot) ---");
const runPlotFetchTests = async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg></svg>" }) };
  };
  const { fetchFigure } = global.window.Lumina;
  await fetchFigure({ expression: "x^2-2x+1", tangent: 2 });
  await fetchFigure({ subject: "un circuit" });
  await fetchFigure({ expression: "1/x" });
  await fetchFigure({ expression: "x^2-2x+1", line: "2x-3" });
  await fetchFigure({ line: "-x+1" });
  t("tangent transmis à l'URL", calls[0].includes("tangent=2"));
  t("expression transmise", calls[0].includes("expression=x%5E2-2x%2B1"));
  t("subject transmis", decodeURIComponent(calls[1]).replace(/\+/g, " ").includes("subject=un circuit"));
  t("sans tangent → pas de paramètre", !calls[2].includes("tangent"));
  t("line transmis avec la courbe", calls[3].includes("line=2x-3") && calls[3].includes("expression=x%5E2-2x%2B1"));
  t("droite seule : line sans expression", calls[4].includes("line=-x%2B1") && !calls[4].includes("expression="));
  delete global.fetch;

  // --- intégration maybeBuildFigure : la chaîne complète transmet tout ---
  const { maybeBuildFigure } = global.window.Lumina;
  const figureUrl = [];
  global.fetch = async (url) => {
    figureUrl.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"white\"/></svg>" }) };
  };
  const conv = { id: "c1" };
  const replyMsg = { role: "assistant", text: "ok" };
  const replyEl = {
    querySelector: () => ({
      appendChild: () => {},
      isConnected: true,
      replaceWith: (node) => { node.isConnected = false; },
      remove: () => {},
    }),
  };
  global.document.querySelector = () => ({ scrollTo: () => {}, style: {} });
  await maybeBuildFigure("Trace la courbe de f(x)=x\u00b2-2x+1 et la droite d'\u00e9quation y=2x-3", "", conv, replyMsg, replyEl, false);
  t("INTÉGRATION : line transmis via maybeBuildFigure", figureUrl[0].includes("line=2x-3"));
  t("INTÉGRATION : expression transmise", figureUrl[0].includes("expression=x%5E2-2x%2B1"));
  t("INTÉGRATION : figure persistée", replyMsg.figure && replyMsg.figure.svg && replyMsg.figure.title === "x^2-2x+1");
  await maybeBuildFigure("Trace la courbe de f(x)=x\u00b2-2x+1 et la tangente au point d'abscisse 2", "", conv, replyMsg, replyEl, false);
  t("INTÉGRATION : tangent transmis", figureUrl[1].includes("tangent=2"));
  delete global.fetch;
};

console.log("--- detectGeometryRequest / fetchGeoFigure ---");
t("géo : droite passant par A et B", L.detectGeometryRequest("Tracer la droite passant par A et B", "") !== null);
t("géo : perpendiculaire", L.detectGeometryRequest("Tracer la droite passant par P perpendiculaire à (AB)", "") !== null);
t("géo : (AB) parenthèses", L.detectGeometryRequest("Tracer (AB)", "") !== null);
t("géo : cercle de centre", L.detectGeometryRequest("Cercle de centre O de rayon 3 cm", "") !== null);
t("géo : triangle ABC", L.detectGeometryRequest("Tracer le triangle ABC", "") !== null);
t("géo : angle de 30°", L.detectGeometryRequest("Construire un angle de 30° avec le rapporteur", "") !== null);
t("géo : angle ABC = 45°", L.detectGeometryRequest("L'angle ABC = 45°", "") !== null);
t("géo : symétrie", L.detectGeometryRequest("Tracer le symétrique de A par rapport à la droite (BC)", "") !== null);
t("géo : translation", L.detectGeometryRequest("Tracer l'image de C par la translation qui transforme A en B", "") !== null);
t("géo : rotation", L.detectGeometryRequest("Tracer la rotation de centre A et d'angle 90° appliquée au point B", "") !== null);
t("géo : homothétie", L.detectGeometryRequest("Tracer l'homothétie de centre A et de rapport 2 appliquée au point B", "") !== null);
t("géo : trapèze", L.detectGeometryRequest("Tracer le trapèze ABCD", "") !== null);
t("géo : droite des milieux", L.detectGeometryRequest("Tracer la droite des milieux du triangle ABC", "") !== null);
t("géo : longueur AB = 5 cm", L.detectGeometryRequest("Soit AB = 5 cm", "") !== null);
t("géo : concurrence", L.detectGeometryRequest("Les médianes se coupent en G", "") !== null);
t("géo : tangente au cercle", L.detectGeometryRequest("Tracer la tangente au cercle en A", "") !== null);
t("géo : photo d'exercice (via réponse)", L.detectGeometryRequest("Fais cet exercice", "1) Tracer la droite (AB). 2) Placer un point P sur (AB).", true) !== null);
t("pas géo : courbe de fonction", L.detectGeometryRequest("Trace la courbe de f(x)=x\u00b2", "") === null);
t("pas géo : réponse de courbe avec axe de symétrie", L.detectGeometryRequest("Trace la courbe de f(x)=x²-2x+1 et sa tangente au point d'abscisse 2", "d'axe de symétrie x=1, ouverte vers le haut. La tangente est y=2x-3") === null);
t("géo : symétrie axiale", L.detectGeometryRequest("Tracer la symétrie axiale par rapport à (AB)", "") !== null);
t("géo : symétrique de A", L.detectGeometryRequest("Tracer le symétrique de A par rapport à (BC)", "") !== null);
t("pas géo : droite d'équation y=2x-3", L.detectGeometryRequest("Trace la droite d'équation y = 2x-3", "") === null);
t("pas géo : question théorique", L.detectGeometryRequest("Explique-moi ce qu'est une droite", "") === null);

console.log("--- fetchGeoFigure (URL /api/geo) ---");
(async () => {
  await runPlotFetchTests();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg></svg>" }) };
  };
  const { fetchGeoFigure } = global.window.Lumina;
  const r1 = await fetchGeoFigure("Tracer (AB)");
  t("URL /api/geo avec text", urls[0].includes("/api/geo?") && decodeURIComponent(urls[0]).replace(/\+/g, " ").includes("text=Tracer (AB)"));
  t("mode par défaut = exact", r1 && r1.mode === "exact" && r1.svg === "<svg></svg>", JSON.stringify(r1));
  delete global.fetch;

  global.fetch = async () => ({ json: async () => ({ success: true, svg: "<svg></svg>", mode: "ia" }) });
  const r2 = await fetchGeoFigure("Construire un angle de 30°");
  t("mode ia transmis par l'API", r2 && r2.mode === "ia" && r2.verification === null, JSON.stringify(r2));
  delete global.fetch;

  global.fetch = async () => ({ json: async () => ({ success: true, svg: "<svg></svg>", mode: "ia", verification: { complet: false, manquant: ["triangle DEF (dimensions)"], note: "dimensions absentes" } }) });
  const r3 = await fetchGeoFigure("Tracer le triangle DEF tel que DE = 3 cm, DF = 4 cm, EF = 5 cm.");
  t("verification transmise par l'API", r3 && r3.verification && r3.verification.complet === false && r3.verification.manquant.length === 1, JSON.stringify(r3));
  delete global.fetch;

  // intégration : maybeBuildFigure route un énoncé géométrique vers /api/geo
  const urls2 = [];
  global.fetch = async (url) => {
    urls2.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"white\"/></svg>" }) };
  };
  const conv = { id: "c2" };
  const replyMsg = { role: "assistant", text: "ok" };
  const replyEl = { querySelector: () => ({ appendChild: () => {}, isConnected: true, replaceWith: () => {}, remove: () => {} }) };
  global.document.querySelector = () => ({ scrollTo: () => {}, style: {} });
  await window.Lumina.maybeBuildFigure("Fais cet exercice", "1) Tracer la droite (AB). 2) Placer un point P sur (AB). 3) Tracer la droite passant par P perpendiculaire à (AB).", conv, replyMsg, replyEl, true);
  t("INTÉGRATION : énoncé géométrique → /api/geo", urls2[0] && urls2[0].includes("/api/geo?"));
  t("INTÉGRATION : figure géométrique persistée (exact)", replyMsg.figure && replyMsg.figure.title === "construction géométrique");
  delete global.fetch;

  // intégration : repli IA → légende honnête + classe figure-ia
  const urls3 = [];
  let replacedNode = null;
  global.fetch = async (url) => {
    urls3.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"white\"/></svg>", mode: "ia" }) };
  };
  const conv3 = { id: "c3" };
  const replyMsg3 = { role: "assistant", text: "ok" };
  const created = [];
  global.document.createElement = (tag) => {
    const node = { tagName: tag, className: "", innerHTML: "", isConnected: true, children: [], appendChild(c) { this.children.push(c); }, replaceWith(n) { replacedNode = n; }, remove() {} };
    created.push(node);
    return node;
  };
  const replyEl3 = { querySelector: () => ({ appendChild: () => {}, isConnected: true, replaceWith: (node) => { replacedNode = node; }, remove: () => {} }) };
  global.document.querySelector = () => ({ scrollTo: () => {}, style: {} });
  await window.Lumina.maybeBuildFigure("Construire un angle de 30° avec le rapporteur", "", conv3, replyMsg3, replyEl3, false);
  const labelSpan = created.find((n) => n.className === "fig-label");
  const noteSpan = created.find((n) => n.className === "fig-note");
  t("INTÉGRATION : repli IA → mode ia persisté", replyMsg3.figure && replyMsg3.figure.title === "construction géométrique (IA)", JSON.stringify(replyMsg3.figure));
  t("INTÉGRATION : bloc marqué figure-ia", replacedNode && /figure-ia/.test(replacedNode.className), replacedNode && replacedNode.className);
  t("INTÉGRATION : légende « générée par IA »", labelSpan && labelSpan.innerHTML === "Figure générée par IA", labelSpan && labelSpan.innerHTML);
  t("INTÉGRATION : note approximative affichée", noteSpan && /approximative/.test(noteSpan.innerHTML), noteSpan && noteSpan.innerHTML);
  delete global.fetch;

  // intégration : vérification IA incomplète → « complétée par l'IA »
  const urls4 = [];
  global.fetch = async (url) => {
    urls4.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"white\"/></svg>", mode: "ia", verification: { complet: false, manquant: ["triangle DEF (dimensions)"], note: "dimensions absentes" } }) };
  };
  const conv4 = { id: "c4" };
  const replyMsg4 = { role: "assistant", text: "ok" };
  const replyEl4 = { querySelector: () => ({ appendChild: () => {}, isConnected: true, replaceWith: () => {}, remove: () => {} }) };
  global.document.querySelector = () => ({ scrollTo: () => {}, style: {} });
  await window.Lumina.maybeBuildFigure("Tracer le triangle DEF tel que DE = 3 cm, DF = 4 cm, EF = 5 cm.", "", conv4, replyMsg4, replyEl4, false);
  t("INTÉGRATION : vérification incomplète → titre « complétée par l'IA »", replyMsg4.figure && replyMsg4.figure.title === "construction géométrique complétée par l'IA", JSON.stringify(replyMsg4.figure));
  delete global.fetch;

  // question sur une figure EXISTANTE → pas de nouvelle figure
  const urls5 = [];
  global.fetch = async (url) => { urls5.push(String(url)); return { json: async () => ({ success: true, svg: "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"white\"/></svg>" }) }; };
  const conv5 = { id: "c5", messages: [{ role: "assistant", text: "voici la figure", figure: { svg: "<svg></svg>", title: "courbe" } }] };
  const replyMsg5 = { role: "assistant", text: "ok" };
  const replyEl5 = { querySelector: () => ({ appendChild: () => {}, isConnected: true, replaceWith: () => {}, remove: () => {} }) };
  global.document.querySelector = () => ({ scrollTo: () => {}, style: {} });
  await window.Lumina.maybeBuildFigure("Explique-moi cette figure : pourquoi la tangente coupe-t-elle en un seul point ?", "La parabole est f(x)=x²-2x+1, tangente y=2x-3.", conv5, replyMsg5, replyEl5, false);
  t("INTÉGRATION : question sur la figure → AUCUNE nouvelle figure", urls5.length === 0, String(urls5.length));
  await window.Lumina.maybeBuildFigure("Trace aussi la courbe de g(x)=x+1", "ok", conv5, replyMsg5, replyEl5, false);
  t("INTÉGRATION : nouvelle demande de dessin → figure construite", urls5.length === 1, String(urls5.length));
  await window.Lumina.maybeBuildFigure("Que représente le point de contact sur cette figure ?", "La courbe est une parabole.", conv5, replyMsg5, replyEl5, false);
  t("INTÉGRATION : « que représente » → AUCUNE nouvelle figure", urls5.length === 1, String(urls5.length));
  delete global.fetch;

  // intégration : remarque de modification → l'IA refait la figure
  const urls6 = [];
  global.fetch = async (url) => {
    urls6.push(String(url));
    return { json: async () => ({ success: true, svg: "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"white\"/></svg>" }) };
  };
  const conv6 = { id: "c6", messages: [{ role: "assistant", text: "voici", figure: { svg: "<svg></svg>", title: "courbe" } }], lastFigure: { png: "data:image/png;base64,F", desc: "Figure : courbe de f(x)=x^2-2x+1", title: "courbe" } };
  const replyMsg6 = { role: "assistant", text: "ok" };
  const replyEl6 = { querySelector: () => ({ appendChild: () => {}, isConnected: true, replaceWith: () => {}, remove: () => {} }) };
  global.document.querySelector = () => ({ scrollTo: () => {}, style: {} });
  global.document.querySelectorAll = () => [];
  await window.Lumina.maybeBuildFigure("Ajoute la zone de solution pour f(x) ≤ 0", "", conv6, replyMsg6, replyEl6, false);
  t("INTÉGRATION : remarque → /api/plot subject=modification", urls6[0] && urls6[0].includes("/api/plot?") && decodeURIComponent(urls6[0]).replace(/\+/g, " ").includes("modification demandée"), urls6[0]);
  t("INTÉGRATION : figure remplacée dans l'historique", conv6.messages[0].figure && conv6.messages[0].figure.title === "figure modifiée par l'IA", JSON.stringify(conv6.messages[0].figure));
  t("INTÉGRATION : mémoire mise à jour", conv6.lastFigure && /remarque/.test(conv6.lastFigure.desc), JSON.stringify(conv6.lastFigure && conv6.lastFigure.desc));
  delete global.fetch;

  // --- mémoire des photos d'exercice ---
  console.log("--- mémoire des photos (resolveSendImages) ---");
  const convPhoto = { id: "p1", messages: [
    { role: "user", text: "Fais cet exercice", images: ["data:image/png;base64,AAAA"] },
  ], lastImageRef: 0 };
  const rMem = L.resolveSendImages([], convPhoto);
  t("question suivante → photo renvoyée automatiquement", rMem.length === 1 && rMem[0].value === "data:image/png;base64,AAAA" && rMem[0].name === "photo (mémoire)", JSON.stringify(rMem));
  t("rememberedImages = mêmes images", L.rememberedImages(convPhoto).length === 1, JSON.stringify(L.rememberedImages(convPhoto)));
  const newImg = { type: "data", name: "nouvelle.png", value: "data:image/png;base64,BBBB" };
  const rNew = L.resolveSendImages([newImg], convPhoto);
  t("nouvelle photo jointe → remplace la mémoire", rNew.length === 1 && rNew[0].value === "data:image/png;base64,BBBB", JSON.stringify(rNew));
  const convSans = { id: "p2", messages: [] };
  t("sans mémoire → rien", L.resolveSendImages([], convSans).length === 0);
  const convStale = { id: "p3", messages: [], lastImageRef: 5 };
  t("référence périmée → rien (pas de crash)", L.resolveSendImages([], convStale).length === 0);
  const convMsgSansImg = { id: "p4", messages: [{ role: "user", text: "bonjour", images: [] }], lastImageRef: 0 };
  t("message sans image → rien", L.resolveSendImages([], convMsgSansImg).length === 0);
  L.clearImageMemory(convPhoto);
  t("clearImageMemory oublie la photo", convPhoto.lastImageRef === undefined, String(convPhoto.lastImageRef));

  console.log("--- remarques de modification de la figure ---");
  const convR = { id: "r1", messages: [], lastFigure: { png: "data:image/png;base64,F", desc: "Figure : courbe de f(x)=x^2-2x+1", title: "courbe" } };
  t("remarque : ajouter la zone de solution", L.detectFigureRemark("Ajoute la zone de solution pour cette inéquation graphique", convR) !== null);
  t("remarque : colorie le triangle", L.detectFigureRemark("Colorie le triangle ABC en bleu", convR) !== null);
  t("remarque : trace aussi la droite y=x", L.detectFigureRemark("Trace aussi la droite y=x sur la figure", convR) !== null);
  t("remarque : complète avec l'asymptote", L.detectFigureRemark("Complète la figure avec l'asymptote horizontale", convR) !== null);
  t("remarque : change la couleur", L.detectFigureRemark("Change la couleur de la courbe en rouge", convR) !== null);
  t("pas remarque : nouvelle courbe", L.detectFigureRemark("Trace la courbe de f(x)=x²-2x+1", convR) === null);
  t("pas remarque : question théorique", L.detectFigureRemark("Explique-moi le théorème de Pythagore", convR) === null);
  t("pas remarque : sans figure mémorisée", L.detectFigureRemark("Ajoute la zone de solution", { id: "r2", messages: [] }) === null);

  console.log("--- rendu LaTeX / tableaux (renderMarkdown) ---");
  const R2 = L.renderMarkdown;
  const fence = "Voici le tableau :\n```latex\n\\[\n\\begin{array}{c|ccc}\nx & -1 & 0 & 2\\\\ \\hline\n\\end{array}\n\\]\n```";
  t("fence latex → math-block (pas de pre/code)", R2(fence).includes("math-block") && !R2(fence).includes("<pre><code"), R2(fence).slice(0, 120));
  const bare2 = "5. Quelques points\n\\begin{array}{c|c} x & f(x)\\\\ \\hline -\\frac12 & -2+\\ln 2 \\end{array}";
  const outBare = R2(bare2);
  t("tableau nu → enveloppé en display", outBare.includes("math-block") && outBare.includes("\\[\\begin{array}"), outBare);
  t("tableau nu : séparateur \\\\ préservé", /f\(x\)\\\\ /.test(outBare), outBare);
  t("commande doublée \\\\frac → \\frac", R2("\\\\frac{1}{2}").includes("\\frac{1}{2}"));
  t("code js reste code", R2("```js\nconsole.log(1)\n```").includes("language-js"));
  t("$$…$$ pas de double enveloppe", !R2("$$\\begin{array}{c} a\\\\ b \\end{array}$$").includes("\\[\\["));

  console.log("--- mémoire de la figure construite ---");
  const convFig = { id: "f1", messages: [], lastFigure: { png: "data:image/png;base64,FIG1", title: "courbe", desc: "Courbe de f(x)=x^2, tangente en x=2" } };
  const rFig = L.resolveSendImages([], convFig, { figure: true });
  t("figure jointe aux questions suivantes", rFig.length === 1 && rFig[0].value === "data:image/png;base64,FIG1" && rFig[0].name === "figure (mémoire)", JSON.stringify(rFig));
  t("sans option figure → pas de figure", L.resolveSendImages([], convFig).length === 0);
  const convFigPhoto = { id: "f2", messages: [{ role: "user", text: "x", images: ["data:image/png;base64,PHOTO"] }], lastImageRef: 0, lastFigure: { png: "data:image/png;base64,FIG2", desc: "d" } };
  const rBoth = L.resolveSendImages([], convFigPhoto, { figure: true });
  t("photo + figure combinées", rBoth.length === 2 && rBoth[0].value === "data:image/png;base64,PHOTO" && rBoth[1].value === "data:image/png;base64,FIG2", JSON.stringify(rBoth.map((x) => x.name)));
  const rNew2 = L.resolveSendImages([{ type: "data", name: "n.png", value: "data:image/png;base64,NEW" }], convFigPhoto, { figure: true });
  t("nouvelle photo → remplace photo ET figure", rNew2.length === 1 && rNew2[0].value === "data:image/png;base64,NEW", JSON.stringify(rNew2));
  const convFigSansPng = { id: "f3", messages: [], lastFigure: { png: null, desc: "d" } };
  t("figure sans png → rien", L.resolveSendImages([], convFigSansPng, { figure: true }).length === 0);
  t("svgToPngDataUri sans canvas → null (pas de crash)", L.svgToPngDataUri("<svg width='10' height='10'></svg>") instanceof Promise);
  L.clearFigureMemory(convFig);
  t("clearFigureMemory oublie la figure", convFig.lastFigure === undefined, String(convFig.lastFigure));

  console.log("");
  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();

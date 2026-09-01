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
t("photo exercice avec droite (via réponse)", JSON.stringify(d("Fais cet exercice", "1. f(x)=x\u00b2-2x+1\n2. Montrer que la droite d'équation y=2x-3 est tangente", true)).includes('"line":"2x-3"'));
t("courbe + droite + tangente", JSON.stringify(d("Trace f(x)=x\u00b2-2x+1, la droite d'équation y=2x-3 et la tangente au point d'abscisse 2", "", false)).includes('"tangent":2') && JSON.stringify(d("Trace f(x)=x\u00b2-2x+1, la droite d'équation y=2x-3 et la tangente au point d'abscisse 2", "", false)).includes('"line":"2x-3"'));

console.log("--- fetchFigure (URL /api/plot) ---");
(async () => {
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

  console.log("");
  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();

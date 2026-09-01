# Site-gratuit-dynamique — Lumina Chat ✨

Interface de **chat IA premium, gratuite et dynamique** — site statique déployable
sur Vercel, branché sur l'API gratuite
[`chat-free-gpt`](https://github.com/BrunoRakotomalala62/chat-free-gpt)
(`https://chat-free-gpt.vercel.app/api/chat`).

## ✨ Fonctionnalités

- 🎨 **UI premium & dynamique** : thème sombre, glassmorphism, fond animé
  (orbs aurora + particules), animations fluides, responsive mobile.
- 🤖 **Menu déroulant multi-modèles** placé **sous la zone de saisie** : GPT
  (o1, o3, gpt-5.x, gpt-4.x…), DeepSeek, Claude, Gemini, Llama, Grok, Qwen,
  Mixtral — liste exacte des modèles gratuits testés du backend. Les modèles
  **PRO** (`gpt-5.6-terra`, `gpt-4o`) sont signalés 🔒.
- 📐 **Notation mathématique (KaTeX)** : indices, puissances, fractions à
  barre horizontale, racines, intégrales, matrices… rendus dans les réponses
  (inline `$…# Site-gratuit-dynamique — Lumina Chat ✨

Interface de **chat IA premium, gratuite et dynamique** — site statique déployable
sur Vercel, branché sur l'API gratuite
[`chat-free-gpt`](https://github.com/BrunoRakotomalala62/chat-free-gpt)
(`https://chat-free-gpt.vercel.app/api/chat`).

, `\(…\)` et display `$…$`, `\[…\]`), avec normalisation
  automatique des backslashes doublés du modèle.
- 📎 **Pièces jointes** : jusqu'à **4 images** par message — le bouton
  trombone est un `<label>` natif (le navigateur ouvre directement le
  sélecteur de fichiers, zéro JS : fiable sur tous les navigateurs, Safari/iOS
  inclus), formats HEIC/HEIF acceptés, compression automatique ≤ 1024 px,
  qualité 0.8 max (vision nette).
  Un bouton lien 🔗 dédié ajoute une image **par URL** (barre inline).
  Envoi en **POST JSON** (tableau `images`) — repli GET automatique si l'API
  n'est pas encore à jour.
- 🖼️ **Réponses multi-images** : l'API renvoie un tableau `images[]` — toutes
  les images sont affichées en grille cliquable (lightbox).
- 📜 **Menu hamburger** (en haut à gauche) : bouton **Nouvelle conversation** +
  **historique complet** des conversations (localStorage), avec chargement,
  suppression, titre auto, date et modèle.
- 🧾 **Rendu Markdown** dans les réponses : gras, listes, liens, citations,
  blocs de code avec bouton « Copier ».
- 📈 **Figures construites (courbes & schémas)** : quand la demande contient
  une consigne de dessin (« trace la courbe de f(x)=… », « fais le schéma d'un
  circuit électrique », ou une **photo d'exercice** avec ce type de question),
  Lumina appelle `/api/plot` de l'API et affiche **l'image de la figure
  construite à la fin de la réponse du bot**, avec une petite légende
  « 📐 Figure construite ». Deux modes :
  - **courbe mathématique** (déterministe, instantané) : détection de
    l'expression `f(x)=…`/`y=…` (gère `x²`, `x³`, `√x`, `π`, `−`, virgule
    décimale…), ex. « Trace la courbe de f(x)=x²-2x+1 » ;
  - **figure par IA** (n'importe quel sujet : physique, chimie, circuits…),
    ex. « Fais le schéma d'un circuit électrique avec pile et ampoule » ;
  - **photo d'exercice** : si une image est jointe, la consigne de dessin est
    repérée dans la réponse du bot (qui reformule l'exercice) et la figure est
    construite automatiquement.
  La figure est affichée en image (SVG), avec un bouton **« ⬇️ Télécharger en
  PNG »**, et elle est conservée dans l'historique (localStorage).
- 🧭 **Branches infinies, asymptotes, tangente & droite** (mode courbe) : le
  moteur détecte automatiquement les **asymptotes verticales, horizontales,
  obliques** et les **branches paraboliques** de la fonction, les **trace en
  pointillés** avec une légende. S'il n'y en a pas, seule la courbe est
  tracée. La **tangente** n'est dessinée que si un point est donné
  (« … et la tangente au point d'abscisse 2 », « tangente en x = -1 »,
  « tangente au point A(2 ; 4) », « en x = π/2 ») — équation calculée avec
  **`(T) : y = f'(x₀)(x − x₀) + f(x₀)`** affichée dans la légende. Si
  l'exercice **donne directement la droite** (« la droite d'équation
  y = 2x-3 », « (d) : y = -x + 1 »), elle est **tracée en vert** avec sa
  légende, en plus de la courbe ou seule.
- 📊 **Toutes les fonctions usuelles** tracées dynamiquement : `exp`/`e^x`,
  `ln`, `log`, `sqrt`, `sin`, `cos`, `tan`, `sinh`, `cosh`… avec asymptotes
  et tangentes (chips de démonstration : `e^(-x)`, `sin(x)` + tangente en
  `π/2`).
- 🌍 100 % côté client, zéro build, pas de clé API.

## 🚀 Déploiement

```bash
# 1. Pousser ce dépôt sur GitHub
# 2. Sur vercel.com : importer le repo (framework : Other) → déployer
# ou en CLI :
npx vercel --prod
```

`vercel.json` configure les headers de sécurité et les URL propres.

## 🔌 API utilisée

```
GET  https://chat-free-gpt.vercel.app/api/chat?prompt=bonjour&model=gpt-5.6-luna&uid=123&lang=fr
POST https://chat-free-gpt.vercel.app/api/chat   (JSON { prompt, model, images })
```

| Paramètre | Description |
|---|---|
| `prompt` | Texte à envoyer (obligatoire, sauf si image) |
| `model` | Modèle (défaut : `gpt-5.6-luna`) |
| `image` / `images` | Image(s) (vision) — GET : `image=` répété ; POST : tableau `images`, max 4 |
| `uid` | Identifiant client (renvoyé tel quel) |
| `lang` | Langue du backend (défaut : `fr`) |

Réponse : `{ success, reply, model, uid, images?, conversationId, source }`.

> ⚠️ **Vision (v4)** : les images locales sont envoyées en **POST JSON** — plus de
> limite de longueur d'URL (Vercel renvoyait HTTP 414 avec les data-URI en GET).
> La compression est donc bien moins agressive : **≤ 1024 px, qualité 0.8 max**
> (le backend redimensionne lui-même) → la vision est nettement plus précise.
> En cas d'API pas encore à jour (404/405), le site retombe automatiquement sur
> le GET avec re-compression au budget URL.

## 📁 Structure

```
index.html      → interface (hamburger, composer, lightbox…, chip « Trace une courbe »)
styles.css      → thème premium (glassmorphism, animations, responsive, bloc figure)
app.js          → logique (API, modèles, historique, pièces jointes, markdown, figures)
test-figures.js → tests unitaires de la détection des figures (node test-figures.js)
vercel.json     → configuration Vercel (headers + cleanUrls)
```

## 🧪 Tests API effectués

- ✅ Chat texte : `GET /api/chat?prompt=…&model=…&uid=…` → 200 JSON
- ✅ Vision 1 image (URL & data-URI) → réponse + `images[]`
- ✅ Vision multi-images (2 data-URI) → comparaison + 2 entrées dans `images[]`
- ✅ Modèles gratuits (~37 noms) vs PRO (`gpt-4o`, `gpt-5.6-terra` → 402)
- ✅ Figures : `GET /api/plot?expression=x-2ln(x)` (courbe) et
  `GET /api/plot?subject=circuit+électrique…` (schéma IA) → `{ svg }`
- ✅ Détection figures : `node test-figures.js` (31 tests)

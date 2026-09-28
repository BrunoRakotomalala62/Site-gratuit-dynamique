# Site-gratuit-dynamique — Lumina Chat ✨

Interface de **chat IA premium, gratuite et dynamique** — site statique déployable
sur Vercel, branché sur l'API gratuite
[`chat-free-gpt`](https://github.com/BrunoRakotomalala62/chat-free-gpt)
(`https://chat-free-gpt.vercel.app/api/chat`).

**AJOUT (API secondaire)** : le groupe de modèles *« UnlimitedAI (sans
inscription) »* (claude, chatgpt, gemini, deepseek, grok, perplexity, meta,
qwen) est routé vers une seconde API
[`bon-api-fiable`](https://github.com/BrunoRakotomalala62/bon-api-fiable)
(`https://bon-api-fiable.vercel.app/api/chat`). L'API historique
`chat-free-gpt` et toute la logique existante restent inchangées — le choix
de l'API se fait automatiquement selon le modèle sélectionné.

**Vision** : quand une image est jointe, le site utilise le modèle choisi
dans le menu si celui-ci est compatible image (gpt-5.6-luna + les modèles
vision UnlimitedAI : claude, chatgpt, gemini, grok, perplexity) ; sinon il
se replie sur le sélecteur « 🖼️ Vision » (lui aussi rempli avec tous les
modèles vision). Les images sont envoyées en base64 ou par URL à l'API
correspondante.

**AJOUT (API ChatiPro)** : le groupe *« ChatiPro (chati.pro) »* ajoute
10 modèles (gemini 3.5 flash, gpt-5.4 nano, claude 3 haiku, deepseek v4
flash, qwen 3.5 flash, nemotron 3, glm-4.7, minimax m2.7, mistral small,
llama 4 maverick) routés vers `https://chatipro.vercel.app/api/chat`, plus
deux nouvelles fonctionnalités dans le composer :
- 🎨 **Génération d'image** (bouton 🎨) : le prompt est envoyé à
  `https://chatipro.vercel.app/api/image`, l'image générée s'affiche dans le chat ;
- 🖌️ **Image-to-image** (bouton 🖌️, visible quand une image est jointe) :
  l'image + le prompt vont à `https://chatipro.vercel.app/api/image/edit`,
  l'image modifiée s'affiche dans le chat.
La logique existante (chat, vision, figures, maths, PRO) n'est pas modifiée.

## ✨ Fonctionnalités

- 🧩 **Barre de saisie épurée** : le champ de message occupe **toute la largeur**
  (~87 % de la barre). Toutes les actions sont regroupées dans un **menu
  déroulant « ＋ »** qui s'ouvre au-dessus (il ne pousse pas la mise en page),
  avec des sections claires : **Joindre** (images, image par URL, PDF),
  **Images** (générer, modifier) et **Voix** (dicter, réponse vocale, discussion
  mains libres). Une **pastille verte** sur le ＋ signale qu'une option est
  active. Fermeture par clic extérieur ou Échap. Le champ s'agrandit avec le
  texte (jusqu'à 168 px).
- 🎙️ **Mode vocal — discussion « voix à voix »** : un seul bouton, **🎧** (menu ＋),
  et on ne touche plus à rien :
  **on parle → le message part tout seul → le bot répond à voix haute → le micro
  se rouvre tout seul → on reparle…** C'est une vraie conversation mains libres.
  Le micro **ne se rouvre jamais pendant que le bot parle** — ni pendant la
  synthèse de sa voix (aucun écho). Il faut juste le micro du navigateur :
  aucune saisie de texte, aucun clavier.
  Les deux réglages séparés restent disponibles : **🎤** dicter un seul message,
  **🔊** lire les réponses à voix haute. Un petit **🔊** sur chaque réponse du bot
  permet de la réécouter.
  La dictée utilise la reconnaissance vocale du navigateur (**fr-FR**), la voix
  est la synthèse Microsoft Edge via `/api/tts` de `chat-free-gpt` (**gratuite,
  sans clé**). Le texte lu est nettoyé (code, LaTeX, markdown, emojis, URL
  retirés) et coupé proprement à la dernière phrase (700 caractères).
  Le mode vocal s'arrête en recliquant **🎧** (ou **🎤**), en coupant **🔊**, ou
  automatiquement si l'onglet passe en arrière-plan ou après 6 silences.
  Tous ces ajouts sont **additifs** : le chat, les figures et les pièces jointes
  ne sont pas modifiés.
- 🎨 **UI premium & dynamique** : thème sombre, glassmorphism, fond animé
  (orbs aurora + particules), animations fluides, responsive mobile.
- 🤖 **Menu déroulant multi-modèles** placé **sous la zone de saisie** :
  `ChatGPT` → gpt-5.6-luna (seul modèle gratuit authentique
  de l'API historique, vérifié le 2026-09-05), plus les groupes
  **UnlimitedAI**, **ChatiPro**, **Lumo (Proton)** et **🖼️ Images** servis
  par leurs propres APIs. Les anciens noms d'emprunt (gpt-5.x, gpt-4.x,
  o1/o3, claude-*, gemini-*, deepseek-*, llama, grok, qwen, mixtral) ont été
  **retirés** : ils ne faisaient pas tourner le modèle annoncé. Les modèles
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
- 📄 **Pièces jointes PDF** : jusqu'à **3 PDF** par message (bouton 📄). Le
  texte du PDF est extrait **dans le navigateur** (pdf.js via jsDelivr, le
  même CDN que KaTeX) puis **ajouté à la demande** envoyée à l'API : le chat
  répond donc au sujet du document, **quel que soit le modèle** choisi. Le
  PDF n'est jamais transmis tel quel (l'API n'accepte que texte + images), et
  la logique existante (images/vision, figures, suites de conversation) reste
  inchangée. Les PDF scannés (images) nécessitent un OCR et sont refusés avec
  un message clair.
- 🧩 **PDF longs — découpage puis recombinaison** : si le document dépasse le
  budget d'un seul appel (~3 200 car.), il est **découpé** en morceaux (aux
  frontières de lignes/phrases/mots), le modèle est interrogé **sur chaque
  morceau** (progression « 📄 Analyse du document — partie i/n… »), puis
  **toutes les réponses sont recombinées** en une seule réponse complète (une
  section « 📄 Partie i/n » par morceau). Garde-fou : les **10 premiers
  morceaux** sont analysés (au-delà, le document est signalé comme tronqué).
  Un PDF court garde le chemin en **un seul appel** (comportement inchangé).
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
- 📐 **Constructions géométriques exactes** (questions successives en une
  figure) : quand l'énoncé contient des constructions (« Tracer la droite
  (AB) », « Placer un point P sur (AB) », « la droite passant par P
  perpendiculaire à (AB) », « cercle de centre O de rayon 3 cm »…) — tapées
  ou **repérées dans la réponse du bot** (photo d'exercice) — Lumina appelle
  `/api/geo` : un **moteur déterministe** (coordonnées calculées, zéro
  hallucination) construit **une seule figure cumulative** avec toutes les
  questions, chaque étape dans une couleur + légende des étapes
  (« 1) droite (AB) 2) point P sur (AB) 3) (d) ⊥ (AB) en P »). Gère droites,
  segments, demi-droites, points sur droite/segment/cercle, perpendiculaires
  (marque ∟), parallèles, cercles (dont de diamètre, circonscrit, inscrit),
  tangente au cercle, milieux, médiatrices, médianes, hauteurs, bissectrices,
  intersections, concurrence (G, H, O, I), triangles (équilatéral, isocèle,
  rectangle en A ∟), carrés, rectangles, losanges, parallélogrammes,
  trapèzes, pentagones, hexagones, symétries centrale/axiale, translation,
  rotation, homothétie, longueurs (« AB = 5 cm »), angles mesurés
  (« ABC = 45° »).
- 🧠 **Vérification IA + complétion** : après le tracé exact, l'IA contrôle
  que la figure couvre tout l'énoncé (dimensions données, points, angles,
  transformations…). Si des éléments manquent, l'IA **refait la figure
  complète** et les ajoute (légende « Figure générée par IA » + titre
  « complétée par l'IA ») ; sinon la figure exacte est affichée.
- 🧠 **Repli IA pour toutes les constructions** : si le moteur exact ne
  reconnaît pas la construction (« Construis un angle de 30° »…), l'IA
  dessine quand même un SVG (légende honnête « Figure générée par IA
  (approximative) ») — toute demande de figure géométrique aboutit à une
  image.
- 📐 **Le bot connaît la figure qu'il construit** : la figure (courbe,
  géométrie, schéma IA) est mémorisée — image PNG + description (étapes,
  expression, tangente, droite…). Les questions suivantes (« explique-moi
  cette figure », « pourquoi cette asymptote ? »…) partent AVEC l'image de
  la figure + une note de contexte → le bot voit la figure et répond
  précisément. Pilule « 📐 Figure en mémoire ✕ ». Une question sur la
  figure existante ne reconstruit pas de nouvelle figure.
- 🔁 **Remarques sur la figure → l'IA refait la construction** : l'utilisateur
  peut demander de retoucher la figure (« ajoute la zone de solution pour
  l'inéquation », « colorie le triangle ABC », « trace aussi la droite
  y=x », « change la couleur »…) → l'IA redessine la figure en tenant
  compte de la remarque et la figure est **remplacée en place** (mémoire et
  historique mis à jour, label « figure modifiée par l'IA »).
- 📷 **Mémoire des photos d'exercice** : la photo jointe est conservée dans
  la conversation et renvoyée automatiquement avec les questions suivantes
  (« dans cette photo, où est la solution ? »…) — le bot ne répond plus
  « je ne vois pas de photo jointe ». Une pilule « 📷 Exercice en mémoire »
  l'affiche ; une nouvelle photo la remplace, le bouton ✕ l'oublie.
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
app.js          → logique (API, modèles, historique, pièces jointes, markdown, figures, mode vocal)
test-figures.js → tests unitaires de la détection des figures (node test-figures.js)
vercel.json     → configuration Vercel (headers + cleanUrls)
```

## 🧪 Tests API effectués

- ✅ Chat texte : `GET /api/chat?prompt=…&model=…&uid=…` → 200 JSON
- ✅ Vision 1 image (URL & data-URI) → réponse + `images[]`
- ✅ Vision multi-images (2 data-URI) → comparaison + 2 entrées dans `images[]`
- ✅ Modèles gratuits : gpt-5.6-luna (seul modèle authentique de l'API
  historique — les 37 autres noms testés répondaient tous « ChatGPT » et ont
  été retirés) ; PRO (`gpt-4o`, `gpt-5.6-terra` → 402)
- ✅ Figures : `GET /api/plot?expression=x-2ln(x)` (courbe) et
  `GET /api/plot?subject=circuit+électrique…` (schéma IA) → `{ svg }`
- ✅ Détection figures : `node test-figures.js` (31 tests)
- ✅ **Barre de saisie + menu ＋** (2026-09-28, Chrome headless) : le champ
  occupe **87 %** de la barre (702/806 px) et ne reste que **2 boutons** dans la
  barre (＋ et ➤) ; menu fermé au départ puis ouvert/positionné **au-dessus** ;
  les **8 actions** sont regroupées et étiquetées ; un interrupteur (🔊/🎧) garde
  le panneau ouvert, allume la pastille du ＋, et les deux états sont visuellement
  distincts (violet / vert) ; fermeture par clic extérieur **et** Échap ; le champ
  passe de 44 → 85 px avec le texte ; composer existant intact. **13/13**.
- ✅ **Mode vocal** (2026-09-28, Chrome headless) : boutons 🎤/🔊/🎧 présents ;
  bascule 🔊 mémorisée dans `localStorage` ; **appel réel** à
  `https://chat-free-gpt.vercel.app/api/tts` → 200, ~31 Ko de MP3 en ~2 s ;
  bouton « réécouter » rendu sur les réponses ; nettoyage du texte vérifié ;
  **aucune erreur JS**. Le composer existant (📎 🔗 📄 🎨 ➤) est intact.
- ✅ **Discussion vocale mains libres 🎧** (reconnaissance vocale simulée pour
  rendre le tour déterministe) : activation → micro ouvert ; parole → envoi
  automatique à la vraie API ; réponse affichée ; voix générée puis jouée ;
  **micro rouvert seulement après la fin de la lecture**. Cette vérification
  « aucune réouverture du micro avant la fin de la voix » a d'ailleurs révélé
  une **course intermittente** (entre l'affichage de la réponse et le début de
  la lecture, la synthèse prenait ~0,5 s pendant lesquelles le micro pouvait
  se rouvrir) : corrigée par un drapeau `awaitingSpeech` posé dès l'annonce de
  la lecture. Test relancé **3 fois de suite** → 9/9 à chaque fois.
  Arrêt par 🎤 et par coupure du 🔊 ; plus aucune réouverture après l'arrêt. **9/9**.

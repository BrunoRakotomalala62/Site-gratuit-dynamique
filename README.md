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
  **Deux modes de dictée, choisis automatiquement :**
  1. **Web Speech API** (Chrome) — transcription native du navigateur, mot à mot.
  2. **Enregistreur** (si la Web Speech API est absente) — le site enregistre
     l'audio avec `MediaRecorder`, détecte la fin de la parole (seuil sonore) et
     le fait transcrire par **`/api/stt`** de `chat-free-gpt` (Whisper).
     **Indispensable dans l'application Android** : une WebView Android
     n'implémente pas la Web Speech API (Chromium issue 40417848). Fait aussi
     marcher la voix sur **Firefox**.
  Les deux réglages séparés restent disponibles : **🎤** dicter un seul message,
  **🔊** lire les réponses à voix haute. Un petit **🔊** sur chaque réponse du bot
  permet de la réécouter.
  La voix de sortie est la synthèse Microsoft Edge via `/api/tts` de
  `chat-free-gpt` (**gratuite, sans clé**). Le texte lu est nettoyé (code, LaTeX,
  markdown, emojis, URL retirés) et coupé proprement à la dernière phrase
  (700 caractères).
  Le mode vocal s'arrête en recliquant **🎧** (ou **🎤**), en coupant **🔊**, ou
  automatiquement si l'onglet passe en arrière-plan ou après 6 silences.
- 🔁 **Tour de parole strict (le bot ne se répond jamais tout seul)**. Le bot
  attend que **vous** parliez, répond, puis attend de nouveau. Trois garde-fous :
  1. **Aucun envoi si personne n'a parlé** — l'enregistrement n'est transmis que
     si du son a réellement dépassé le seuil (≥ 250 ms). Sans ça, Whisper
     *invente* du texte sur le silence (« sous-titres réalisés par… »), ce texte
     partait comme message et le bot discutait tout seul, indéfiniment.
  2. **Filtre anti-hallucination** — les phrases typiques inventées par Whisper
     sur du silence sont rejetées, dans les deux modes de dictée.
  3. **Détection d'écho** — si la même phrase revient plusieurs fois d'affilée,
     le micro capte la voix du bot : la discussion s'arrête avec un message
     conseillant un écouteur, au lieu de boucler.
  Vérifié : micro **totalement silencieux** → **0 réponse** du bot en 70 s
  (avant correction : **10 réponses**), et **0 appel inutile** à `/api/stt`.
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
- 🌍 100 % côté client, zéro build, pas de clé API — **sauf** l'édition d'image
  Magic Hour, servie par une fonction Vercel (voir § Édition d'image Magic Hour).
- ✨ **Édition d'image Magic Hour** (ajout) : bouton « Modifier · Magic Hour »
  (modèles **gratuits**) via la route serveur `POST /api/image-edit`.

## 🚀 Déploiement

```bash
# 1. Pousser ce dépôt sur GitHub
# 2. Sur vercel.com : importer le repo (framework : Other) → déployer
# ou en CLI :
npx vercel --prod
```

`vercel.json` configure les headers de sécurité et les URL propres.

> 🔑 **Édition d'image Magic Hour** : ajoutez la variable d'environnement
> `MAGIC_HOUR_API_KEY` dans Vercel (Settings > Environment Variables) — clé créée
> sur https://magichour.ai/developer (crédits gratuits à l'inscription) — puis
> **redéployez**. Sans elle, `/api/image-edit` renvoie une erreur `config_error`.
> Le chat, les figures et les autres fonctionnalités n'en ont pas besoin.

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

## ✨ Édition d'image Magic Hour — `POST /api/image-edit` (ajout)

Cette fonctionnalité **s'ajoute** aux modes image existants : la génération et la
modification **ChatiPro** (`chatipro.vercel.app/api/image*`) restent intactes.
Elle apporte un second chemin de modification d'image, **gratuit**, servi par la
fonction serverless `api/image-edit.js` de **ce site**.

**Pourquoi côté serveur ?** La clé `MAGIC_HOUR_API_KEY` ne doit jamais atteindre
le navigateur. Le site envoie l'image à `/api/image-edit` (même origine), la
fonction appelle Magic Hour avec la clé, puis renvoie l'image prête.

**Utilisation dans le site** — deux entrées, mêmes effets :
- menu **＋ → 🎨 Images → « ✨ Modifier · Magic Hour »** (visible dès qu'une image est jointe) ;
- sélecteur de modèle → groupe **🖼️ Images → « ✨ modifier · Magic Hour (gratuit) »**.

On joint une image, on choisit l'option, on écrit ce qu'on veut changer
(ex. « ajoute des lunettes de soleil »), puis on envoie. Le rendu arrive comme une
image dans la conversation.

### API de la route

| Route | Rôle |
|---|---|
| `GET /api/image-edit` | Modèles **gratuits** disponibles (`?all=1` = catalogue complet) |
| `POST /api/image-edit` | Modifie une image : `{ image, prompt, model?, resolution?, wait? }` |
| `GET /api/image-edit?id=…` | État d'un rendu (`&wait=1` pour attendre) |

- `image` : data URL (`data:image/…;base64,…`), base64 nu, ou URL publique http(s).
- `wait` : `true` par défaut (la route attend et renvoie `dataUrl` ; si le budget
  serveur est dépassé, elle renvoie `pending:true` + `id`, et le site interroge
  `GET /api/image-edit?id=…`).
- Réponse : `{ success, dataUrl, id, status, model, creditsCharged }`.

### Modèles gratuits (« free »)

| Modèle | Coût | Résolutions | Idéal pour |
|---|---|---|---|
| `flux-2-klein` *(défaut)* | **5 crédits/image** | 640px, 1k, 2k | Retouche, restyle, ajout/retrait d'objets |
| `qwen-edit` | 10 crédits/image | 640px, 1k, 2k | Inpainting guidé, suppression d'objets |
| `krea-2` | 10 crédits/image | 640px, 1k | Restyle depuis une seule image |

> ⚡ En **compte gratuit**, restez en résolution **`640px`** (défaut). Les modèles
> `nano-banana*`, `gpt-image-2*`, `seedream-*` et les résolutions `1k`/`2k`/`4k`
> nécessitent un plan payant.

### Variables d'environnement (Vercel)

| Variable | Rôle |
|---|---|
| `MAGIC_HOUR_API_KEY` | **Requise.** Clé Magic Hour (crédits gratuits) |
| `IMAGE_EDIT_MODEL` | Modèle par défaut (défaut `flux-2-klein`, gratuit) |
| `IMAGE_EDIT_RESOLUTION` | Résolution par défaut (défaut `640px`, gratuite) |
| `IMAGE_EDIT_WAIT_MS` | Budget d'attente synchrone (défaut 48 s) |
| `IMAGE_EDIT_HARD_BUDGET_MS` | Plafond dur avant la limite Vercel de 60 s (défaut 55 s) |
| `IMAGE_EDIT_MAX_BYTES` | Taille maximale d'une image (défaut ~4,5 Mo) |
| `IMAGE_EDIT_MOCK` | `1` = rendu simulé hors ligne (tests, aucune clé) |

## 📁 Structure

```
index.html      → interface (hamburger, composer, lightbox…, chip « Trace une courbe »)
styles.css      → thème premium (glassmorphism, animations, responsive, bloc figure)
app.js          → logique (API, modèles, historique, pièces jointes, markdown, figures, mode vocal)
api/image-edit.js     → (ajout) fonction Vercel : édition d'image Magic Hour (clé côté serveur)
test-figures.js → tests unitaires de la détection des figures (node test-figures.js)
test-voice-loop.js     → (ajout) tests du tour de parole vocal 🎧 — anti-écho (node test-voice-loop.js)
test-image-edit.js    → (ajout) tests hors ligne de /api/image-edit (node test-image-edit.js)
vercel.json     → configuration Vercel (headers + cleanUrls + maxDuration de la fonction)
```

## 🧪 Tests API effectués

- ✅ **Tour de parole vocal 🎧 — anti-écho** — `node test-voice-loop.js` : **17/17**
  sans navigateur ni micro. Couvre la cause du « le bot répond puis envoie
  n'importe quoi tout seul, en boucle ». Deux mécanismes sont verrouillés :
  **(1)** le micro ne se rouvre plus tant que la transcription Whisper du tour
  précédent n'est pas terminée (verrou `transcribing`) — sans lui, un 2ᵉ
  enregistrement partait pendant l'attente et envoyait un message de plus, en
  boucle ; **(2)** le filtre anti-écho compare la transcription à la dernière
  phrase prononcée par le bot (≥ 5 mots, ≥ 90 % communs, pas plus longue) et la
  **rejette**. Vérifie aussi que le champ de saisie n'est **plus** lu comme
  transcription, le seuil de parole relevé, et le délai de réarmement à 900 ms.
- ✅ **Édition d'image Magic Hour** — `node test-image-edit.js` : **17/17** hors ligne
  (mode `IMAGE_EDIT_MOCK=1`, sans clé ni réseau) : modèles gratuits, édition data URL
  et URL publique, mode asynchrone (`wait:false`), lecture de statut, validations
  (prompt/image/modèle/résolution), 405, préflight CORS, erreur `config_error` sans clé,
  et contrôle du câblage du site (bouton, route, `maxDuration`).
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
- ✅ **Tour de parole / anti-boucle** (2026-09-28) : boucle 🎧 lancée avec un
  micro **totalement silencieux** pendant 70 s → **0 réponse** du bot et **0 appel
  à `/api/stt`** (avant correction : **10 réponses**, le bot se parlait à lui-même
  parce que Whisper inventait du texte sur le silence). La même vérification avec
  une vraie phrase donne toujours la transcription exacte.
- ✅ **Mode « enregistreur »** (dictée sans Web Speech API — cas de l'APK Android
  et de Firefox), testé avec **`SpeechRecognition` supprimé** et un **faux micro**
  (fichier WAV français + silence, Chrome) : mode choisi automatiquement ;
  boutons 🎤/🎧 **visibles** (avant, ils étaient masqués — c'était le bug de
  l'APK) ; enregistrement → silence détecté → **`/api/stt` HTTP 200** →
  transcription exacte (« …pourquoi le ciel est bleu ? ») → envoi → réponse ;
  puis **boucle 🎧** : réponse obtenue **et micro réarmé tout seul**, réponse lue
  à voix haute, arrêt par 🎤. **10/10**.
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

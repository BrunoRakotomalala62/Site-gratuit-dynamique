# Site-gratuit-dynamique — Lumina Chat ✨

Interface de **chat IA premium, gratuite et dynamique** — site statique déployable
sur Vercel, branché sur l'API gratuite
[`chat-free-gpt`](https://github.com/BrunoRakotomalala62/chat-free-gpt)
(`https://chat-free-gpt.vercel.app/api/chat`).

## ✨ Fonctionnalités

- 🎨 **UI premium & dynamique** : thème sombre, glassmorphism, fond animé
  (orbs aurora + particules), animations fluides, responsive mobile.
- 🤖 **Menu déroulant multi-modèles** à côté du bouton envoyer : GPT (o1, o3,
  gpt-5.x, gpt-4.x…), DeepSeek, Claude, Gemini, Llama, Grok, Qwen, Mixtral —
  liste exacte des modèles gratuits testés du backend. Les modèles **PRO**
  (`gpt-5.6-terra`, `gpt-4o`) sont signalés 🔒.
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
  inclus), formats HEIC/HEIF acceptés, compression automatique ≤ 512 px.
  Un bouton lien 🔗 dédié ajoute une image **par URL** (barre inline).
  Envoi via le paramètre `image=` répété (route vision de l'API).
- 🖼️ **Réponses multi-images** : l'API renvoie un tableau `images[]` — toutes
  les images sont affichées en grille cliquable (lightbox).
- 📜 **Menu hamburger** (en haut à gauche) : bouton **Nouvelle conversation** +
  **historique complet** des conversations (localStorage), avec chargement,
  suppression, titre auto, date et modèle.
- 🧾 **Rendu Markdown** dans les réponses : gras, listes, liens, citations,
  blocs de code avec bouton « Copier ».
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
GET https://chat-free-gpt.vercel.app/api/chat?prompt=bonjour&model=gpt-5.6-luna&uid=123&lang=fr
```

| Paramètre | Description |
|---|---|
| `prompt` | Texte à envoyer (obligatoire, sauf si `image`) |
| `model` | Modèle (défaut : `gpt-5.6-luna`) |
| `image` | URL ou data-URI d'une image (vision) — répéter, max 4 |
| `uid` | Identifiant client (renvoyé tel quel) |
| `lang` | Langue du backend (défaut : `fr`) |

Réponse : `{ success, reply, model, uid, images?, conversationId, source }`.

> ⚠️ **Vision** : les images locales sont compressées côté client (≤ 512 px,
> JPEG) pour rester sous les limites d'URL du GET — comportement testé avec
> 1 et 2 images (data-URI et URL).

## 📁 Structure

```
index.html      → interface (hamburger, composer, lightbox…)
styles.css      → thème premium (glassmorphism, animations, responsive)
app.js          → logique (API, modèles, historique, pièces jointes, markdown)
vercel.json     → configuration Vercel (headers + cleanUrls)
```

## 🧪 Tests API effectués

- ✅ Chat texte : `GET /api/chat?prompt=…&model=…&uid=…` → 200 JSON
- ✅ Vision 1 image (URL & data-URI) → réponse + `images[]`
- ✅ Vision multi-images (2 data-URI) → comparaison + 2 entrées dans `images[]`
- ✅ Modèles gratuits (~37 noms) vs PRO (`gpt-4o`, `gpt-5.6-terra` → 402)

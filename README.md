# READER.EXE

**A calmer internet, one article at a time.**

READER.EXE is a resurrection of Google Reader with a green-phosphor terminal skin. You subscribe to the sources you like, read them in a raw chronological feed, and get a separate curated tab where every recommendation comes with a stated reason. There are no accounts and no endless scroll.

Built for the [Kiroween 2026 hackathon](https://kiroween.devpost.com/) in the **Resurrection** category.

## How it works

- **Curated** ranks articles by how well they match what you read, flags anything outside your subscriptions, and explains each pick.
- **Feed** is the unranked stream of everything you subscribe to. It updates live, filters by source, and lets you mark articles read without opening them.
- **Subscriptions** lets you search for sources, inspect them and unsubscribe.
- Everything is driven from the keyboard: arrow keys, `SPACE`, `TAB`, `ESC`.

## Under the hood

- **Local-first.** All state lives in the browser in IndexedDB (Dexie), so there is no backend or account system.
- **Transparent recommendations.** Article embeddings (`all-MiniLM-L6-v2` through Transformers.js) run in a Web Worker, so ranking happens on your device and can be explained.
- **Thin RSS proxy.** Next.js API routes fetch feeds to get around CORS.
- **Stack:** Next.js, React, TypeScript, Tailwind CSS.

The design notes are in [`docs/`](docs/): [initial idea](docs/INITIAL_IDEA.md), [product direction](docs/PRODUCT_DIRECTION.md) and [low-level design](docs/DESIGN.md).

## Run it locally

```bash
cd app
npm install
npm run dev
```

Then open http://localhost:3000.

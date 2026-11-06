# Design — READER.EXE

For the full canonical low-level design, see [`docs/DESIGN.md`](../../../docs/DESIGN.md).

This file documents the key architectural decisions made during the design phase.

---

## Key Design Decisions

### Local-First Architecture
All user state lives in IndexedDB via Dexie.js. There is no user authentication and no managed database. The Vercel deployment only provides serverless API routes that act as RSS proxies. This keeps the project deployable for free indefinitely.

The designed "sync later" bridge is OPML export/import (subscriptions) and JSON export/import (full state). A future backend could accept the same payloads.

### RSS Proxy via Next.js API Routes
RSS feeds cannot be fetched directly from the browser due to CORS restrictions on most feed servers. Next.js API routes running as Vercel serverless functions act as a thin proxy: receive a feed URL, fetch the XML server-side, parse with `rss-parser`, and return normalized JSON. A 5-minute Vercel edge cache is applied to avoid redundant fetches.

### Embedding Model Choice
`Xenova/all-MiniLM-L6-v2` via Transformers.js:
- ~23MB model size — acceptable one-time download
- 384-dimension output vectors — compact and fast to compute cosine similarity over
- Runs entirely in the browser via WASM
- Cached in browser Cache API after first load — subsequent sessions load instantly
- Processed in a Web Worker to avoid blocking the UI thread
- No external API calls, no API keys, no per-request cost

### Interest Profile: Multi-Vector Approach
Rather than a single user interest vector (which averages out across diverse interests and becomes meaningless), the profile maintains one vector per inferred topic cluster. Topic clusters are seeded from the feed category taxonomy (tech, finance, science, gaming, culture) and refined as the user reads.

This allows someone interested in both AI and finance to receive good recommendations in both areas without the vectors cancelling each other out.

### Keyboard Navigation Architecture
A single `useKeyboard` hook at the app root intercepts all `keydown` events. It reads the current `FocusContext` (which tab/view is active) and dispatches the appropriate action. This centralizes all keyboard logic in one place, making it easy to audit and extend, while keeping individual components free of keyboard handling code.

### Recommendation Pipeline Summary
```
CandidatePool (unread, 7 days, has embedding)
  → Scorer (cosine similarity vs topic vectors)
  → Ranker (similarity + recency decay + diversity bonus)
  → DiversityReranker (MMR pass)
  → ExplorationSampler (inject diversityRatio% from non-subscribed sources)
  → ExplainerService (attach reason strings)
  → curatedCache (written to IndexedDB)
```

### Polling vs WebSockets for Real-Time Feed
A persistent WebSocket server would require managed infrastructure. Instead, the Feed tab uses interval-based polling (15-minute default) combined with browser `CustomEvent` dispatching. When the `FeedIngestionService` writes new articles, it fires `feed:updated` on `window` and the `<LiveFeed>` component reacts. This gives the appearance of real-time updates without any persistent connection.

---

## Tech Stack Summary

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Full-stack JS, serverless API routes, great DX |
| Styling | Tailwind CSS + CSS variables | Design tokens, utility classes, easy theming |
| Local DB | Dexie.js (IndexedDB wrapper) | TypeScript-first, reactive queries, good DX |
| Embeddings | Transformers.js `all-MiniLM-L6-v2` | Free, browser-native, no API keys |
| RSS parsing | `rss-parser` (serverless) | Reliable, handles RSS 2.0 + Atom |
| HTML sanitization | `dompurify` | Required for rendering feed HTML safely |
| Font | IBM Plex Mono | Monospace, terminal feel, free via Google Fonts |
| Deployment | Vercel free tier | Zero config, serverless functions included |

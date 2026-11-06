# READER.EXE — Low-Level Design

## Overview

A local-first, terminal-aesthetic RSS reader with a transparent content-based recommendation engine. No backend infrastructure required — all state lives in the browser (IndexedDB), with Next.js API routes on Vercel acting as a lightweight RSS proxy to bypass CORS.

**Stack:**
- Frontend: Next.js (React) + TypeScript + Tailwind CSS
- Persistence: IndexedDB via Dexie.js (local-first)
- Embeddings: Transformers.js (`Xenova/all-MiniLM-L6-v2`) in a Web Worker
- RSS Proxy: Next.js API routes (`rss-parser`) deployed on Vercel free tier
- Deployment: Vercel (no managed backend infrastructure)

---

## Architecture

```mermaid
graph TD
    subgraph Browser
        UI[Next.js React UI]
        KBD[Keyboard Navigation Layer]
        DB[(IndexedDB / Dexie)]
        EMB[Transformers.js\nall-MiniLM-L6-v2]
        REC[Recommendation Engine]
        TEL[Telemetry Collector]
    end

    subgraph Vercel Serverless
        PROXY[/api/feed\nRSS Proxy + Parser]
        DISC[/api/discover\nFeed Search/Validate]
    end

    subgraph External
        RSS[RSS/Atom Sources]
    end

    UI --> KBD
    UI --> DB
    UI --> REC
    KBD --> TEL
    TEL --> DB
    DB --> REC
    EMB --> REC
    REC --> UI
    PROXY --> RSS
    UI --> PROXY
    UI --> DISC
```

---

## Data Layer — IndexedDB Schema (Dexie.js)

### `articles`
| Field | Type | Description |
|---|---|---|
| id | string | Unique ID (hash of feed URL + item GUID) |
| feedId | string | Foreign key to feeds |
| title | string | Article title |
| url | string | Original article URL |
| content | string | Full content or summary HTML |
| summary | string | Plain text excerpt |
| publishedAt | number | Unix timestamp |
| readAt | number \| null | Timestamp when first opened |
| savedAt | number \| null | Timestamp when saved |
| readProgress | number | 0–100, percentage scrolled |
| estimatedReadTime | number | Minutes, derived from word count |
| embedding | Float32Array \| null | 384-dim semantic vector |

### `feeds`
| Field | Type | Description |
|---|---|---|
| id | string | Hash of feed URL |
| url | string | RSS/Atom feed URL |
| title | string | Feed display name |
| category | string | tech \| finance \| science \| gaming \| culture |
| favicon | string \| null | Favicon URL |
| subscribedAt | number | Timestamp |
| lastFetchedAt | number \| null | Last successful fetch timestamp |
| isSubscribed | boolean | Whether the user is actively subscribed |

### `feedDirectory`
| Field | Type | Description |
|---|---|---|
| id | string | Stable ID |
| url | string | RSS/Atom feed URL |
| title | string | Feed display name |
| category | string | Category |
| description | string | Short description |

Seeded at build time with 30+ predefined sources.

### `userProfile` (singleton, id = "default")
| Field | Type | Description |
|---|---|---|
| id | string | Always "default" |
| interestVectors | Record<string, Float32Array> | One vector per inferred topic cluster |
| topicWeights | Record<string, number> | Relative weight per topic |
| explicitSignals | Signal[] | Log of B/L/X signals |
| telemetryEnabled | boolean | Whether passive telemetry is collected |
| diversityRatio | number | 0–1, portion of curated feed that is exploratory |

### `curatedCache`
| Field | Type | Description |
|---|---|---|
| id | string | |
| articleId | string | |
| score | number | Final ranking score |
| reason | string | Human-readable explanation |
| generatedAt | number | Timestamp |

### `collections`
| Field | Type | Description |
|---|---|---|
| id | string | |
| articleId | string | |
| type | 'bookmark' \| 'read' \| 'saved' | |
| createdAt | number | |

### `telemetry`
| Field | Type | Description |
|---|---|---|
| id | string | |
| articleId | string | |
| event | 'open' \| 'read_50' \| 'read_80' \| 'quick_exit' | |
| timestamp | number | Unix timestamp |

---

## API Routes

### `GET /api/feed?url=<encoded_feed_url>`
- Fetches RSS/Atom XML server-side (bypasses CORS)
- Parses with `rss-parser`
- Returns normalized JSON:
  ```json
  {
    "title": "Feed Title",
    "items": [
      {
        "title": "Article Title",
        "link": "https://...",
        "contentSnippet": "Plain text excerpt...",
        "pubDate": "2026-11-04T12:00:00Z",
        "categories": ["tech"]
      }
    ]
  }
  ```
- Cache-Control: `s-maxage=300` (5 min Vercel edge cache)
- Returns 400 for missing/invalid URL, 502 if upstream fetch fails

### `GET /api/discover?url=<encoded_url>`
- Validates a custom feed URL by fetching and attempting to parse it
- Returns `{ valid: true, title: "...", category: null }` or `{ valid: false, error: "..." }`

---

## RSS Ingestion Service (client-side)

- Polls all subscribed feeds on a 15-minute interval via `setInterval`
- Each poll calls `/api/feed?url=<feedUrl>`
- New articles are diffed against existing IDs in IndexedDB (no duplicates)
- New articles are written to the `articles` table with `embedding: null`
- Estimate reading time: `Math.ceil(wordCount / 200)` minutes
- After writing, dispatches `new CustomEvent('feed:updated', { detail: { feedId, newCount } })` on `window`
- New articles are queued for background embedding generation

---

## Embedding Pipeline (client-side)

- A dedicated Web Worker loads `Xenova/all-MiniLM-L6-v2` via Transformers.js
- Worker message interface:
  - Send: `{ type: 'EMBED', id: string, text: string }`
  - Receive: `{ type: 'EMBEDDING_DONE', id: string, embedding: number[] }`
  - Sends: `{ type: 'MODEL_LOADING', progress: number }` during model download
  - Sends: `{ type: 'MODEL_READY' }` when model is loaded
- Input text: `"${article.title}. ${article.summary}"` (truncated to 512 tokens)
- Output: 384-dimension vector stored as `Float32Array` on the article record
- An `EmbeddingQueue` class manages the backlog, processing items via `requestIdleCallback`
- The model (~23MB) is cached in the browser Cache API after first load — subsequent sessions load instantly

---

## Recommendation Engine

### Components

**UserInterestProfile**
- Maintains N topic vectors (one per inferred interest cluster, e.g. "AI/ML", "Finance", "Gaming")
- Each vector is a 384-dim `Float32Array` in the same embedding space as articles
- Topic clusters are seeded from the feed category taxonomy and refined as the user reads
- Avoids the single-vector averaging problem — someone interested in both AI and finance gets good results in both

**CandidatePool**
- Unread articles from the past 7 days with non-null embeddings
- Excludes articles already in `curatedCache` generated < 1 hour ago

**Scorer**
- For each candidate article, compute cosine similarity against each topic vector
- Final similarity = max(topic similarities) weighted by topicWeight

**Ranker**
- `score = (α × similarity) + (β × recency_decay) + (γ × source_diversity_bonus)`
- `recency_decay = e^(-λ × hours_since_published)` where λ ≈ 0.01
- `source_diversity_bonus` rewards articles from feeds not heavily represented in the current batch

**DiversityReranker**
- Applies Maximal Marginal Relevance (MMR) pass after initial ranking
- Prevents the top N results from being near-identical articles
- `MMR score = λ × relevance - (1-λ) × max_similarity_to_already_selected`

**ExplainerService**
- Maps the top-scoring topic vector back to its label
- Generates reason strings like:
  - "Matches your interest in AI/ML"
  - "From a source you frequently read"
  - "Exploratory pick outside your subscriptions"

**ExplorationSampler**
- `diversityRatio` (default 0.2) determines what fraction of curated slots are exploratory
- Exploratory picks are sampled from the feed directory (non-subscribed sources)

### Interest Vector Update Rules

| Signal | Weight Delta | Trigger |
|---|---|---|
| Article opened | +0.2 | Content page opened |
| Read >50% | +0.5 | readProgress crosses 50 |
| Read >80% | +0.8 | readProgress crosses 80 |
| `L` — more like this | +1.5 | Explicit keyboard shortcut |
| `B` — bookmark | +0.6 | Explicit keyboard shortcut |
| `X` — less like this | −1.5 | Explicit keyboard shortcut |
| Tab away < 10s | −0.3 | Article opened but closed quickly |

Vector updates use a momentum-weighted moving average:
`new_vector = normalize((1 - momentum) * current_vector + momentum * article_embedding)`
where `momentum` scales with the weight delta.

---

## Keyboard Navigation

A single global `useKeyboard` hook intercepts `keydown` events and dispatches actions based on the current focus context. Focus context is managed via a React `FocusContext` provider.

| Context | Key | Action |
|---|---|---|
| `FEED_LIST` | J / ↓ | Move cursor down |
| `FEED_LIST` | K / ↑ | Move cursor up |
| `FEED_LIST` | ENTER | Open article |
| `FEED_LIST` | SPACE | Mark article as read |
| `FEED_LIST` | M | Mark all visible as read |
| `CURATED_LIST` | J / K | Move cursor |
| `CURATED_LIST` | ENTER | Open article |
| `CURATED_LIST` | R | Refresh curated feed |
| `CONTENT_PAGE` | ↑ / ↓ | Scroll content |
| `CONTENT_PAGE` | N | Next article |
| `CONTENT_PAGE` | ESC | Return to previous tab |
| `CONTENT_PAGE` | B | Bookmark article |
| `CONTENT_PAGE` | L | More like this |
| `CONTENT_PAGE` | X | Less like this |
| `CONTENT_PAGE` | O | Open original URL in new tab |
| `SUBSCRIPTIONS` | J / K | Move cursor |
| `SUBSCRIPTIONS` | SPACE | Toggle select feed |
| `SUBSCRIPTIONS` | ENTER | View feed details |
| `SUBSCRIPTIONS` | U | Unsubscribe selected |
| `COLLECTION` | J / K | Move cursor |
| `COLLECTION` | ENTER | Open article |

**Global tab switching (any context):**
- `1` → Curated tab
- `2` → Feed tab
- `3` → Subscriptions tab
- `4` → Collection tab
- `?` → Settings/algorithm controls

---

## UI Component Hierarchy

```
<TerminalShell>
  <BootSequence />           ← First-run only, typewriter boot messages
  <StatusBar />              ← "READER.EXE" + "SYSTEM ONLINE_" + live clock
  <TabBar />                 ← 01 CURATED / 02 FEED / 03 SUBSCRIPTIONS / 04 COLLECTION
  <TabPanel tab="curated">
    <CuratedFeed />
      <ArticleRow reason={...} isExploration={...} />
  </TabPanel>
  <TabPanel tab="feed">
    <FeedSourceFilter />     ← Multi-select SPACE-toggle top bar
    <LiveFeed />
      <ArticleRow />
  </TabPanel>
  <TabPanel tab="subscriptions">
    <FeedSearchBar />
    <SubscriptionList />
      <FeedRow isSubscribed={...} />
  </TabPanel>
  <TabPanel tab="collection">
    <CollectionList />
      <CollectionFilter />   ← ALL / BOOKMARKS / READ / SAVED
      <ArticleRow />
  </TabPanel>
  <ContentPage />            ← Full-screen overlay when article is open
    <ReadingProgressBar />
    <ArticleBody />
    <KeyboardHintBar />      ← "ESC EXIT · N NEXT · B BOOKMARK · L MORE · X LESS"
  <SettingsPanel />          ← Overlay for algorithm controls, export/import
  <KeyboardHintBar />        ← Context-sensitive, bottom of shell
</TerminalShell>
```

---

## Terminal Aesthetic — Design Tokens

```css
--color-bg:           #0d1a0d;   /* near-black, green-tinted */
--color-primary:      #39ff14;   /* phosphor green, primary text */
--color-dim:          #2a6b2a;   /* dimmed green, metadata/secondary */
--color-border:       #1e4a1e;   /* subtle borders */
--color-cursor:       #39ff14;   /* cursor/selection highlight */
--color-bg-selected:  #0f2e0f;   /* selected row background */

--font-mono:          'IBM Plex Mono', 'Courier New', monospace;
--font-size-base:     14px;
--line-height-base:   1.6;

--scanline-opacity:   0.03;      /* CRT scanline overlay */
--glow-spread:        0 0 8px rgba(57, 255, 20, 0.4);
--glow-text:          0 0 4px rgba(57, 255, 20, 0.6);
```

- CRT scanlines: CSS `repeating-linear-gradient` overlay fixed to the viewport
- Cursor blink: `@keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }`
- All animations respect `prefers-reduced-motion: reduce`

---

## Boot Sequence (First-Run)

Typewriter-style terminal messages displayed on first load. Detected via IndexedDB: if `userProfile` does not exist, show boot sequence and create the default profile record.

```
READER.EXE v1.0.0
INITIALIZING SYSTEM...
LOADING FEED DIRECTORY............. OK
CHECKING LOCAL STORAGE............. OK
CALIBRATING INTEREST ENGINE........ OK
LOADING LANGUAGE MODEL............. [████████░░] 80%
SYSTEM ONLINE_
```

---

## State Export / Sync Hook

**Export:**
- Subscriptions → OPML 2.0 XML file download
- Full state → JSON blob (interest vectors, collections, read history, settings)

**Import:**
- OPML: parse and merge subscriptions (add new, keep existing)
- JSON: merge with conflict resolution (newer `updatedAt` timestamp wins)

This is the designed bridge for a future backend sync feature — the same payloads can be accepted by a server.

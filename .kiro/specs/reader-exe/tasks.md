# Tasks — READER.EXE

## Task 1: Project scaffold and terminal shell

**Objective:** Bootstrap the Next.js app with TypeScript and Tailwind, and establish the complete terminal visual design system as a working navigable shell.

**Implementation guidance:**
- Run `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- Configure Tailwind with the design token CSS variables from `docs/DESIGN.md`
- Add IBM Plex Mono via `next/font/google`
- Build static versions of:
  - `<TerminalShell>` — root layout wrapper with CRT scanline overlay and phosphor glow
  - `<StatusBar>` — displays "READER.EXE" on left, "SYSTEM ONLINE_" + live clock on right (updates every second)
  - `<TabBar>` — renders "01 CURATED / 02 FEED / 03 SUBSCRIPTIONS / 04 COLLECTION", highlights active tab
  - `<KeyboardHintBar>` — bottom bar, static placeholder hints for now
- Add CRT scanline overlay as a fixed CSS pseudo-element using `repeating-linear-gradient`
- Add phosphor glow effect on primary text via `text-shadow`
- Set up `FocusContext` provider with types for all contexts (`FEED_LIST`, `CURATED_LIST`, `CONTENT_PAGE`, `SUBSCRIPTIONS`, `COLLECTION`) — empty handlers for now
- Wire tab switching with number keys 1–4 using a basic `useKeyboard` hook stub
- All animations must respect `prefers-reduced-motion`

**Test requirements:**
- Visually confirm: dark background (#0d1a0d), phosphor green text (#39ff14), monospace font, scanline overlay renders, glow effect on text
- Tab switching with keyboard keys 1–4 updates the active tab highlight
- Live clock in status bar updates every second
- `prefers-reduced-motion` disables scanline and glow animations

**Demo:** A working terminal shell with 4 keyboard-navigable placeholder tabs, correct visual aesthetic, and a ticking clock in the status bar.

---

## Task 2: Data layer — Dexie.js schema and seed data

**Objective:** Set up IndexedDB with the full schema and seed the predefined feed directory with 30+ sources.

**Implementation guidance:**
- Install `dexie`
- Define all tables from `docs/DESIGN.md`: `articles`, `feeds`, `feedDirectory`, `userProfile`, `curatedCache`, `collections`, `telemetry`
- Write typed TypeScript interfaces for all entities (e.g., `Article`, `Feed`, `FeedDirectoryEntry`, `UserProfile`, `Collection`, `TelemetryEvent`)
- Write repository classes with typed CRUD methods:
  - `ArticleRepo` — create, getById, getByFeedId, getUnread, updateProgress, markRead
  - `FeedRepo` — create, getSubscribed, subscribe, unsubscribe, updateLastFetched
  - `FeedDirectoryRepo` — getAll, search, getByCategory
  - `UserProfileRepo` — get, update, reset
  - `CollectionRepo` — add, getAll, getByType, remove
  - `TelemetryRepo` — record, getByArticle
- Write `seedFeedDirectory()` with 30+ curated sources across 5 categories:
  - **Technology (8+):** Hacker News, The Verge, Ars Technica, TechCrunch, Wired, MIT Tech Review, Stack Overflow Blog, GitHub Blog
  - **Finance (6+):** Financial Times, Bloomberg, Investopedia, Wall Street Journal, The Economist, MarketWatch
  - **Science (6+):** NASA, New Scientist, Nature News, Scientific American, Quanta Magazine, Science Daily
  - **Gaming (5+):** IGN, Kotaku, Rock Paper Shotgun, Eurogamer, Polygon
  - **Culture (5+):** The Atlantic, Pitchfork, The Guardian, Aeon, Longreads
- `seedFeedDirectory()` must be idempotent (check count before inserting)
- Write `initializeUserProfile()` that creates the default profile singleton if absent, with `telemetryEnabled: true`, `diversityRatio: 0.2`, empty vectors

**Test requirements:**
- Install `fake-indexeddb` and configure with Dexie for tests
- Unit test each repo: create, read, update, delete operations
- Test `seedFeedDirectory()` idempotency — calling twice results in the same count
- Test `initializeUserProfile()` creates a valid default profile with correct defaults
- Test that all 30+ sources are present after seeding, distributed across all 5 categories

**Demo:** Open browser DevTools → Application → IndexedDB → show the `feedDirectory` table populated with 30+ sources across all 5 categories.

---

## Task 3: RSS proxy API route and feed ingestion service

**Objective:** Implement the server-side RSS proxy and client-side ingestion pipeline.

**Implementation guidance:**
- Build `GET /api/feed?url=<encoded>`:
  - Install `rss-parser`
  - Validate and decode the `url` query param
  - Fetch raw XML and parse with `rss-parser`
  - Return normalized JSON (see schema in `docs/DESIGN.md`)
  - Set `Cache-Control: s-maxage=300, stale-while-revalidate`
  - Return HTTP 400 for missing/invalid URL param, HTTP 502 if upstream fetch fails
- Build `GET /api/discover?url=<encoded>`:
  - Attempt to fetch and parse the URL as RSS/Atom
  - Return `{ valid: true, title: string, category: null }` on success
  - Return `{ valid: false, error: string }` on failure
- Build client-side `FeedIngestionService` class:
  - `fetchAndIngest(feedId: string): Promise<number>` — calls `/api/feed`, diffs new items against existing IDs in IndexedDB, writes new articles, returns count of new articles
  - `startPolling(intervalMs = 900000)` — polls all subscribed feeds on interval
  - `stopPolling()` — clears all intervals
  - After writing new articles: dispatches `new CustomEvent('feed:updated', { detail: { feedId, newCount } })` on `window`
  - Enqueues new articles for background embedding (stub call for now, wired in Task 7)
- Reading time estimation: `Math.ceil(wordCount / 200)` minutes

**Test requirements:**
- Integration test `/api/feed` with at least 2 real feed URLs (e.g. Hacker News RSS, NASA news) — assert correct response shape
- Unit test the diff logic: mock 5 existing articles, ingest 7 (2 are new), assert only 2 are written to DB
- Unit test reading time: 400 words → 2 min, 50 words → 1 min
- Unit test error handling: invalid URL returns 400, unreachable host returns 502

**Demo:** Use the browser console to call `FeedIngestionService.fetchAndIngest()` with a Hacker News feed URL. Show articles appearing in the IndexedDB `articles` table.

---

## Task 4: Feed tab with live updates and keyboard navigation

**Objective:** Render the full Feed tab with real-time article push-down and complete keyboard navigation.

**Implementation guidance:**
- Build `<LiveFeed>` component:
  - Reads articles from IndexedDB sorted by `publishedAt` descending
  - Applies active `FeedSourceFilter` selections to filter results
  - Listens for `feed:updated` CustomEvent on `window` to trigger a re-read and push new articles to top
- Build `<ArticleRow>` component:
  - Displays: row number (01, 02...), title, category label, estimated read time, source name
  - Dimmed styling for read articles (`readAt` is set)
  - Highlighted/bordered styling when cursor is on this row
- Build `<FeedSourceFilter>` top bar:
  - Lists all subscribed feed names as selectable chips
  - SPACE key toggles selection of focused chip
  - Filtered state persists in component state (not DB)
- Wire full `FocusContext` for `FEED_LIST`:
  - J / ↓ — move cursor down (wraps at bottom)
  - K / ↑ — move cursor up (wraps at top)
  - ENTER — opens article (navigate to `<ContentPage>` — placeholder transition for now)
  - SPACE — marks focused article as read in IndexedDB, dims the row
  - M — marks all currently visible articles as read
- Pagination: show `PAGE X/Y` in the bottom right corner of the hint bar
- Start `FeedIngestionService.startPolling()` on tab mount
- Update `<KeyboardHintBar>` with Feed context hints: `J/K NAVIGATE · ENTER READ · SPACE MARK READ · M MARK ALL`

**Test requirements:**
- Test that `feed:updated` event causes new articles to prepend to the top of the list
- Test that multi-select filter correctly hides articles from unselected sources
- Test SPACE marks the correct article as read and updates its visual state
- Test J/K cursor movement stops at top and bottom boundaries (no wrap-around off the list)

**Demo:** A live-updating keyboard-navigable feed. Subscribe to Hacker News in Subscriptions tab, watch articles appear. Use J/K to navigate, SPACE to mark individual articles as read, M to mark all.

---

## Task 5: Content page and reading telemetry

**Objective:** Full-screen article reader with scroll navigation, keyboard shortcuts, and behavior tracking.

**Implementation guidance:**
- Build `<ContentPage>` as a full-screen overlay (renders over `<TerminalShell>`)
- Header row: `READER / ARTICLE 014` on left, `ESC EXIT` on right
- Metadata row: category · read time · source name
- Render article body — sanitize HTML with `dompurify` before rendering
- Arrow key scrolling (↑/↓) — smooth scroll the content container
- `<ReadingProgressBar>` at bottom: fills left-to-right as user scrolls, shows `42% READ` label
- Keyboard shortcuts (hint bar: `↓ CONTINUE · N NEXT · B BOOKMARK · L MORE · X LESS · O OPEN`):
  - ESC — close content page, return to previous tab and restore cursor position
  - N — advance to next article in the current list context
  - O — `window.open(article.url, '_blank')`
  - B, L, X — stub handlers that log to console (fully wired in Task 8)
- Wire `FocusContext` to `CONTENT_PAGE` on open, restore previous context on close
- `TelemetryCollector` service:
  - Records `{ articleId, event: 'open', timestamp }` on open
  - Records `{ articleId, event: 'read_50', timestamp }` when `readProgress` first crosses 50%
  - Records `{ articleId, event: 'read_80', timestamp }` when `readProgress` first crosses 80%
  - Records `{ articleId, event: 'quick_exit', timestamp }` if ESC is pressed within 10 seconds of open
  - Writes events to `telemetry` table in IndexedDB
  - Checks `userProfile.telemetryEnabled` — no-ops if false
- Update `article.readProgress` in IndexedDB when content page closes

**Test requirements:**
- Test reading progress calculation: scrollTop=0 → 0%, scrolled halfway → ~50%, scrolled to bottom → 100%
- Test telemetry: open event fires immediately; read_50 fires exactly once when crossing 50%; read_80 fires once at 80%
- Test quick_exit: ESC at 8 seconds → writes quick_exit event; ESC at 12 seconds → does not
- Test telemetry is fully suppressed when `telemetryEnabled = false`

**Demo:** Open an article, scroll to 60%. Press ESC. Open DevTools → IndexedDB → `telemetry` table — show `open` and `read_50` events. Show `readProgress: 60` on the article record.

---

## Task 6: Subscriptions tab and feed directory

**Objective:** Full Subscriptions tab with search, subscribe, unsubscribe, and custom URL validation.

**Implementation guidance:**
- Build `<FeedSearchBar>`:
  - Text input at the top of the Subscriptions tab
  - Searches `feedDirectory` by title and category (case-insensitive substring match)
  - Search ranking: subscribed feeds first, then alphabetical by title
  - Empty query shows all subscribed feeds
- Build `<SubscriptionList>` and `<FeedRow>`:
  - Shows feed name, category badge, subscription status indicator
  - SPACE toggles selection (visual checkbox `[x]` / `[ ]`)
  - ENTER shows feed details inline (title, description, category, article count from `articles` table)
  - U key unsubscribes all selected feeds (`isSubscribed = false` in `feeds` table)
- Subscribe flow:
  - User navigates to an unsubscribed directory entry and presses ENTER or a subscribe shortcut
  - Copies the `feedDirectory` entry to the `feeds` table with `isSubscribed: true, subscribedAt: now()`
  - Immediately triggers `FeedIngestionService.fetchAndIngest()` for the new feed
- Custom URL flow:
  - Separate input field below the search bar with label `PASTE CUSTOM FEED URL`
  - On ENTER: calls `/api/discover?url=<encoded>`
  - Shows title on success or error message on failure
  - On confirm: subscribes and ingests
- Wire `FocusContext` for `SUBSCRIPTIONS`
- Update `<KeyboardHintBar>` with Subscriptions hints: `J/K NAVIGATE · SPACE SELECT · ENTER DETAILS · U UNSUBSCRIBE`

**Test requirements:**
- Test search ranking: subscribed items appear before unsubscribed items in results
- Test custom URL flow: valid RSS URL returns feed title; invalid URL shows error
- Test subscribing a directory entry writes a correct record to `feeds` table
- Test unsubscribing sets `isSubscribed: false` and the feed no longer appears in Feed tab articles

**Demo:** Search "Hacker News", subscribe. Search "Ars Technica", subscribe. Go to Feed tab — articles from both feeds appear. Return to Subscriptions, select Hacker News with SPACE, press U to unsubscribe. Verify it's removed.

---

## Task 7: Embedding pipeline with Transformers.js

**Objective:** Generate semantic embeddings for all articles in the background without blocking the UI.

**Implementation guidance:**
- Install `@xenova/transformers`
- Create `src/workers/embedding.worker.ts`:
  - Imports `pipeline` from `@xenova/transformers`
  - On first `EMBED` message: loads `Xenova/all-MiniLM-L6-v2`, sends `MODEL_LOADING` progress events, then `MODEL_READY`
  - Message protocol:
    - Receives: `{ type: 'EMBED', id: string, text: string }`
    - Sends: `{ type: 'EMBEDDING_DONE', id: string, embedding: number[] }`
    - Sends: `{ type: 'MODEL_LOADING', progress: number }`
    - Sends: `{ type: 'MODEL_READY' }`
  - Input is the article text, truncated to 512 tokens
- Build `EmbeddingQueue` class (main thread):
  - Instantiates the worker on first use
  - Exposes `enqueue(id: string, text: string): void`
  - Processes items via `requestIdleCallback` (or `setTimeout` fallback) to avoid competing with user interaction
  - On `EMBEDDING_DONE`: converts `number[]` to `Float32Array`, writes to `article.embedding` in IndexedDB via `ArticleRepo`
  - Handles worker errors gracefully — logs and skips failed items
- Wire `EmbeddingQueue` into `FeedIngestionService`: after new articles are written, enqueue each one with `"${title}. ${summary}"` as the text
- Show a subtle status indicator in `<StatusBar>` when model is loading: `[CALIBRATING ENGINE...]`
- Hide the indicator once `MODEL_READY` is received

**Test requirements:**
- Test worker message protocol with a mocked Worker class
- Test `EmbeddingQueue` processes items in FIFO order
- Test error handling: if worker sends an error for item N, item N+1 is still processed
- Test that resulting embeddings have exactly 384 dimensions
- Test that `Float32Array` is correctly stored and retrieved from Dexie (Dexie supports typed arrays natively)

**Demo:** Subscribe to a feed with 10+ articles. Open DevTools → IndexedDB → `articles` table. Watch `embedding` fields change from `null` to populated `Float32Array` values over ~30 seconds as the queue processes.

---

## Task 8: Recommendation engine and Curated tab

**Objective:** Build the full recommendation pipeline, render the Curated tab with reason strings, and wire learning from user feedback.

**Implementation guidance:**
- Build utility: `cosineSimilarity(a: Float32Array, b: Float32Array): number`
- Build `UserInterestProfile` service:
  - `updateVector(topicKey: string, articleEmbedding: Float32Array, weightDelta: number)`: applies momentum-weighted moving average: `new_vector = normalize((1 - m) * current + m * article)` where `m` scales with `weightDelta`
  - `getTopics()`: returns `{ key, label, vector, weight }[]`
  - Reads/writes `userProfile.interestVectors` and `topicWeights` in IndexedDB
- Build `RecommendationEngine`:
  - `getCandidates()`: unread articles from past 7 days with non-null embeddings
  - `score(article, profile)`: max weighted cosine similarity across all topic vectors
  - `rank(candidates, profile)`: `score + recencyDecay + sourceDiversityBonus`
    - `recencyDecay = Math.exp(-0.01 * hoursSincePublished)`
    - `sourceDiversityBonus` = +0.05 if fewer than 2 articles from this source are already ranked higher
  - `mmrRerank(ranked, λ = 0.7)`: MMR pass — iteratively selects next item maximizing `λ × score - (1-λ) × maxSimToSelected`
  - `explain(article, topTopic)`: returns reason string (see examples in `docs/DESIGN.md`)
  - `sample(ranked, diversityRatio)`: fills `(1 - diversityRatio)` slots from ranked, `diversityRatio` slots from non-subscribed `feedDirectory` sources
  - `run()`: orchestrates full pipeline, writes results to `curatedCache` table
- Wire telemetry signals to interest vector updates (in `TelemetryCollector` or a new `SignalProcessor`):
  - `open` event → `updateVector(topicKey, embedding, +0.2)`
  - `read_50` → `+0.5`
  - `read_80` → `+0.8`
  - `quick_exit` → `-0.3`
  - B shortcut → `+0.6`
  - L shortcut → `+1.5`
  - X shortcut → `-1.5`
- Build `<CuratedFeed>` component:
  - Reads from `curatedCache`, joins with `articles`
  - `<ArticleRow>` shows reason string as a second line below the title (dimmed green)
  - Articles from non-subscribed sources show `[EXPLORE]` badge
  - R key triggers `RecommendationEngine.run()` and refreshes the cache + UI
- Wire B, L, X shortcuts in `<ContentPage>` to call the appropriate `updateVector` calls
- Wire `FocusContext` for `CURATED_LIST`
- Update `<KeyboardHintBar>` for Curated context: `J/K NAVIGATE · ENTER READ · R REFRESH`

**Test requirements:**
- Unit test `cosineSimilarity`: perpendicular vectors → 0, identical vectors → 1, known pair
- Unit test `mmrRerank`: given 5 similar articles, output should be more diverse than input order
- Unit test `updateVector`: after positive signal, new vector should be closer to article embedding than before
- Unit test `explain`: returns a non-empty, contextually appropriate string for each reason type
- Integration test: seed 20 articles with pre-computed embeddings, run full pipeline, apply an L signal, re-run — assert top results shift toward the liked article's topic

**Demo:** Read 4–5 articles across different topics. Press L on 2 tech articles. Navigate to Curated tab — top results should be tech-heavy with visible reason strings. Press X on a finance article — finance should drop in ranking. Press R to refresh and see the reordered list.

---

## Task 9: Collection tab and complete signal wiring

**Objective:** Build the Collection tab and ensure all bookmark/save/read states are fully consistent across the app.

**Implementation guidance:**
- Build `<CollectionList>` with filter sub-tabs: ALL / BOOKMARKS / READ / SAVED
  - Filter sub-tabs are switched with left/right arrow keys when in `COLLECTION` context
- `<ArticleRow>` in collection context shows: title, source name, date, read progress percentage (if > 0%), collection type badge
- Wire B shortcut end-to-end: `ContentPage` B key → `CollectionRepo.add({ articleId, type: 'bookmark', createdAt: now() })`
- Wire SPACE on Feed tab row to also write `{ articleId, type: 'read' }` to `collections` (in addition to setting `article.readAt`)
- Add S key shortcut on `<ContentPage>`: saves article → `CollectionRepo.add({ articleId, type: 'saved' })`
- Update `<KeyboardHintBar>` hint on ContentPage to include `S SAVE`
- Prevent duplicate `collections` entries: upsert by `(articleId, type)` — use Dexie compound index
- Articles from unsubscribed feeds must still appear in Collection if they were bookmarked/saved
- Wire `FocusContext` for `COLLECTION`
- Update `<KeyboardHintBar>` for Collection context: `J/K NAVIGATE · ENTER READ · ←/→ FILTER`

**Test requirements:**
- Test that bookmarking writes the correct `collections` entry and the article appears in BOOKMARKS filter
- Test that ALL filter shows items across all three types without duplicates
- Test that an article can appear in multiple collection types (e.g., both BOOKMARKS and READ)
- Test read progress is retrieved and displayed correctly for partially-read articles
- Test upsert: bookmarking the same article twice results in exactly one entry

**Demo:** Read an article to 60% and press ESC. Open a second article and press B. Open a third and press S. Navigate to Collection tab. Show all three articles in ALL filter. Switch filters with arrow keys. Confirm read progress shows on the 60% article.

---

## Task 10: Boot sequence, algorithm controls, OPML export/import, and polish

**Objective:** Complete the first-run experience, expose algorithm controls, implement state portability, and apply final visual polish.

**Implementation guidance:**
- Build `<BootSequence>` component:
  - Detects first run: if `UserProfileRepo.get()` returns null, show boot sequence
  - Typewriter animation: each line appears character-by-character (15ms per character)
  - Boot text (from `docs/DESIGN.md`): READER.EXE v1.0.0, INITIALIZING SYSTEM..., LOADING FEED DIRECTORY... OK, CHECKING LOCAL STORAGE... OK, CALIBRATING INTEREST ENGINE... OK, LOADING LANGUAGE MODEL... [████░░] %, SYSTEM ONLINE_
  - Wire model loading progress bar to `EmbeddingQueue` MODEL_LOADING events
  - On complete: call `initializeUserProfile()`, seed `feedDirectory`, animate fade-out, reveal app
- Build `<SettingsPanel>` overlay (triggered by `?` key, any context):
  - **Diversity ratio:** labeled slider 0%–50%, updates `userProfile.diversityRatio`
  - **Behavioral telemetry:** toggle on/off, updates `userProfile.telemetryEnabled`
  - **Reset preferences:** confirmation prompt → zeroes all interest vectors, clears `telemetry` table
  - **Inferred interests:** lists all topic keys with weights, allows deleting individual topics
  - **Export OPML:** button → calls `StateExportService.exportOPML()`
  - **Export JSON:** button → calls `StateExportService.exportJSON()`
  - **Import file:** file input → calls appropriate import function based on file extension
  - ESC closes the panel
- Build `StateExportService`:
  - `exportOPML()`: serializes all `isSubscribed: true` feeds to OPML 2.0 XML, triggers browser download
  - `exportJSON()`: serializes full IndexedDB state (all tables) to JSON blob, triggers download
  - `importOPML(file: File)`: parses OPML, subscribes to any new feeds not already in `feeds` table
  - `importJSON(file: File)`: merges state using newer-`createdAt`/`updatedAt` wins conflict resolution
- Final visual polish:
  - Blinking cursor block on the selected row (`|` or `█` character, CSS blink animation)
  - All `<KeyboardHintBar>` instances are accurate for every focus context
  - `<StatusBar>` shows contextual system messages: `FETCHING FEEDS...`, `UPDATING ENGINE...`, `EMBEDDING ARTICLES...`
  - Loading states with `[...]` animation for all async operations
  - Graceful mobile degradation: keyboard hints hidden on narrow viewports, touch scroll works in content page

**Test requirements:**
- Test boot sequence plays on first run (no profile in DB) and is skipped on subsequent loads
- Test OPML round-trip: export 3 subscribed feeds → clear DB → import OPML → assert all 3 are re-subscribed
- Test JSON round-trip: export state → clear DB → import JSON → assert collections and profile are restored
- Test diversity ratio change affects curated feed composition (higher ratio → more EXPLORE badges)
- Test telemetry toggle: enable → read article → telemetry recorded; disable → read article → no telemetry written

**Demo — full end-to-end:**
1. Clear all IndexedDB data → reload → watch boot sequence play to "SYSTEM ONLINE_"
2. Subscribe to 3 feeds from the directory
3. Read 5 articles across different topics
4. Use B, L, X shortcuts on articles
5. Navigate to Curated tab — show personalized results with reason strings and EXPLORE badges
6. Press `?` to open Settings, adjust diversity ratio to 40%, press R on Curated — more exploratory picks appear
7. Export OPML, clear storage, import OPML — subscriptions restored

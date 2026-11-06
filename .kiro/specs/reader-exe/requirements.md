# Requirements — READER.EXE

## Overview

A local-first, terminal-aesthetic RSS reader that resurrects the Google Reader experience with a modern content-based recommendation engine. No backend infrastructure required — the app is fully usable on first visit with no account creation.

---

## Functional Requirements

### FR-1: Terminal Shell
- FR-1.1: The application must render with a dark green phosphor terminal aesthetic (see design tokens in `docs/DESIGN.md`)
- FR-1.2: All navigation must be operable via keyboard (mouse is secondary)
- FR-1.3: A context-sensitive keyboard hint bar must be visible at the bottom of the screen at all times
- FR-1.4: On first run, a theatrical boot sequence must play before revealing the application

### FR-2: Feed Tab
- FR-2.1: Display a chronological list of articles from all subscribed feeds
- FR-2.2: Show article title, category label, estimated read time, and source name per row
- FR-2.3: New articles must automatically appear at the top without a manual refresh (polling-based)
- FR-2.4: A multi-select filter bar at the top allows filtering by feed source (SPACE to toggle)
- FR-2.5: J/K keys navigate the list; ENTER opens an article; SPACE marks as read without opening
- FR-2.6: M key marks all visible articles as read

### FR-3: Curated Tab
- FR-3.1: Display a ranked list of recommended articles ordered by predicted user interest
- FR-3.2: Each article row must display a reason string explaining why it was recommended
- FR-3.3: Articles from outside the user's subscriptions must show an "EXPLORE" badge
- FR-3.4: A distinct R key refresh re-runs the ranking algorithm and updates the list
- FR-3.5: The ratio of personalized vs exploratory content is configurable (default 80/20)

### FR-4: Subscriptions Tab
- FR-4.1: Display a list of current subscriptions with SPACE-toggle selection and unsubscribe action
- FR-4.2: A search bar at the top searches the predefined feed directory (30+ sources)
- FR-4.3: Subscribed sources appear first in search results
- FR-4.4: Users can paste a custom RSS/Atom URL to validate and subscribe to it
- FR-4.5: The feed directory must include sources across technology, finance, science, gaming, and culture

### FR-5: Collection Tab
- FR-5.1: Display articles that have been bookmarked, read, or saved
- FR-5.2: Filter sub-tabs for ALL / BOOKMARKS / READ / SAVED
- FR-5.3: Read articles show their last read progress percentage

### FR-6: Content Page
- FR-6.1: Opening an article renders a full-screen reading view with no sidebars or distractions
- FR-6.2: Arrow keys scroll the content; ESC returns to the previous tab
- FR-6.3: N advances to the next article without returning to the list
- FR-6.4: O opens the original URL in a new browser tab
- FR-6.5: A reading progress bar is visible at the bottom
- FR-6.6: Keyboard shortcuts available: B (bookmark), L (more like this), X (less like this)
- FR-6.7: Reading behavior is tracked: open event, scroll depth at 50% and 80%, time-on-page

### FR-7: Recommendation Engine
- FR-7.1: Each article must be converted to a 384-dimension semantic embedding using `Xenova/all-MiniLM-L6-v2`
- FR-7.2: A user interest profile must maintain per-topic interest vectors updated by behavior and explicit signals
- FR-7.3: Ranking must incorporate similarity score, recency decay, and source diversity bonus
- FR-7.4: A diversity reranking pass (MMR) must prevent near-duplicate articles in the top results
- FR-7.5: Each recommendation must include a human-readable reason string
- FR-7.6: The user must be able to reset learned preferences
- FR-7.7: The user must be able to disable behavioral telemetry
- FR-7.8: The user must be able to view and edit inferred interest topics

### FR-8: Data Persistence
- FR-8.1: All state (articles, subscriptions, profile, collections) must persist in browser IndexedDB
- FR-8.2: No account creation is required; the app is usable immediately on first visit
- FR-8.3: Users must be able to export subscriptions as OPML and full state as JSON
- FR-8.4: Users must be able to import OPML and JSON state files

---

## Non-Functional Requirements

- NFR-1: The application must be deployable to Vercel free tier with no managed backend
- NFR-2: The embedding model must load in a Web Worker and must not block the UI thread
- NFR-3: All animations must respect `prefers-reduced-motion`
- NFR-4: The application must be keyboard-accessible (WCAG 2.1 AA as a baseline)
- NFR-5: RSS fetching must use Next.js API routes as a server-side CORS proxy
- NFR-6: The embedding model (~23MB) must be cached in the browser after first load

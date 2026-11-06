import type { FeedDirectoryEntry } from "./types";
import { FeedDirectoryRepo } from "./repos/FeedDirectoryRepo";
import { UserProfileRepo } from "./repos/UserProfileRepo";

// ─────────────────────────────────────────────────────────────
// Predefined feed directory — 30+ sources across 5 categories
// ─────────────────────────────────────────────────────────────
export const FEED_DIRECTORY: FeedDirectoryEntry[] = [
  // ── Technology (9 sources) ──────────────────────────────────
  {
    id: "hackernews",
    url: "https://news.ycombinator.com/rss",
    title: "Hacker News",
    category: "technology",
    description: "Social news for hackers and startups. Top stories from the tech community.",
  },
  {
    id: "theverge",
    url: "https://www.theverge.com/rss/index.xml",
    title: "The Verge",
    category: "technology",
    description: "Technology, science, art, and culture for the connected generation.",
  },
  {
    id: "arstechnica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    title: "Ars Technica",
    category: "technology",
    description: "In-depth tech analysis, hardware reviews, and policy coverage.",
  },
  {
    id: "techcrunch",
    url: "https://techcrunch.com/feed/",
    title: "TechCrunch",
    category: "technology",
    description: "Startup and technology news, funding rounds, and product launches.",
  },
  {
    id: "wired",
    url: "https://www.wired.com/feed/rss",
    title: "Wired",
    category: "technology",
    description: "How technology changes everything — culture, business, and science.",
  },
  {
    id: "mittechreview",
    url: "https://www.technologyreview.com/feed/",
    title: "MIT Technology Review",
    category: "technology",
    description: "Authoritative, independent journalism about emerging technology.",
  },
  {
    id: "stackoverflow-blog",
    url: "https://stackoverflow.blog/feed/",
    title: "Stack Overflow Blog",
    category: "technology",
    description: "Insights and best practices from the world's largest developer community.",
  },
  {
    id: "github-blog",
    url: "https://github.blog/feed/",
    title: "GitHub Blog",
    category: "technology",
    description: "Product updates, developer stories, and engineering deep-dives from GitHub.",
  },
  {
    id: "css-tricks",
    url: "https://css-tricks.com/feed/",
    title: "CSS-Tricks",
    category: "technology",
    description: "Daily articles about CSS, HTML, JavaScript, and all things web design.",
  },

  // ── Finance (6 sources) ─────────────────────────────────────
  {
    id: "ft",
    url: "https://www.ft.com/rss/home",
    title: "Financial Times",
    category: "finance",
    description: "Global business and financial news, analysis, and opinion.",
  },
  {
    id: "economist",
    url: "https://www.economist.com/finance-and-economics/rss.xml",
    title: "The Economist — Finance",
    category: "finance",
    description: "Finance and economics analysis from The Economist.",
  },
  {
    id: "investopedia",
    url: "https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline",
    title: "Investopedia",
    category: "finance",
    description: "Financial education, market news, and investment analysis.",
  },
  {
    id: "marketwatch",
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    title: "MarketWatch",
    category: "finance",
    description: "Real-time financial news, stock market data, and business news.",
  },
  {
    id: "wsj-markets",
    url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    title: "WSJ Markets",
    category: "finance",
    description: "Wall Street Journal markets and investing coverage.",
  },
  {
    id: "seeking-alpha",
    url: "https://seekingalpha.com/feed.xml",
    title: "Seeking Alpha",
    category: "finance",
    description: "Crowd-sourced stock analysis and investment ideas.",
  },

  // ── Science (6 sources) ─────────────────────────────────────
  {
    id: "nasa",
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    title: "NASA Breaking News",
    category: "science",
    description: "Latest news and mission updates from NASA.",
  },
  {
    id: "newscientist",
    url: "https://www.newscientist.com/feed/home/",
    title: "New Scientist",
    category: "science",
    description: "Science news, discoveries, and the big ideas shaping our world.",
  },
  {
    id: "nature",
    url: "https://www.nature.com/nature.rss",
    title: "Nature",
    category: "science",
    description: "The world's leading multidisciplinary science journal.",
  },
  {
    id: "scientificamerican",
    url: "https://rss.sciam.com/ScientificAmerican-Global",
    title: "Scientific American",
    category: "science",
    description: "Science, health, and technology for the curious mind.",
  },
  {
    id: "quantamagazine",
    url: "https://api.quantamagazine.org/feed/",
    title: "Quanta Magazine",
    category: "science",
    description: "Illuminating mathematics, physics, biology, and computer science.",
  },
  {
    id: "sciencedaily",
    url: "https://www.sciencedaily.com/rss/all.xml",
    title: "Science Daily",
    category: "science",
    description: "Breaking science news and headlines from research institutions worldwide.",
  },

  // ── Gaming (5 sources) ──────────────────────────────────────
  {
    id: "ign",
    url: "https://feeds.ign.com/ign/all",
    title: "IGN",
    category: "gaming",
    description: "Game reviews, previews, and news covering all platforms.",
  },
  {
    id: "kotaku",
    url: "https://kotaku.com/rss",
    title: "Kotaku",
    category: "gaming",
    description: "Gaming culture, reviews, and the stories behind the games.",
  },
  {
    id: "rockpapershotgun",
    url: "https://www.rockpapershotgun.com/feed",
    title: "Rock Paper Shotgun",
    category: "gaming",
    description: "PC gaming news, reviews, and honest opinions.",
  },
  {
    id: "eurogamer",
    url: "https://www.eurogamer.net/?format=rss",
    title: "Eurogamer",
    category: "gaming",
    description: "European gaming news, reviews, and features.",
  },
  {
    id: "polygon",
    url: "https://www.polygon.com/rss/index.xml",
    title: "Polygon",
    category: "gaming",
    description: "Video game news, reviews, and entertainment journalism.",
  },

  // ── Culture (5 sources) ─────────────────────────────────────
  {
    id: "theatlantic",
    url: "https://feeds.feedburner.com/TheAtlantic",
    title: "The Atlantic",
    category: "culture",
    description: "In-depth writing on politics, business, culture, and technology.",
  },
  {
    id: "theguardian",
    url: "https://www.theguardian.com/world/rss",
    title: "The Guardian",
    category: "culture",
    description: "World news, culture, and commentary from The Guardian.",
  },
  {
    id: "aeon",
    url: "https://aeon.co/feed.rss",
    title: "Aeon",
    category: "culture",
    description: "Long-form essays on ideas, philosophy, and the human condition.",
  },
  {
    id: "longreads",
    url: "https://longreads.com/feed/",
    title: "Longreads",
    category: "culture",
    description: "The best longform stories on the web — curated daily.",
  },
  {
    id: "pitchfork",
    url: "https://pitchfork.com/rss/news/",
    title: "Pitchfork",
    category: "culture",
    description: "Music criticism, reviews, and news from the world of indie and alternative.",
  },
];

// ─────────────────────────────────────────────────────────────
// Seed functions — both are idempotent
// ─────────────────────────────────────────────────────────────

/** Idempotently seeds the feed directory (skips if already populated) */
export async function seedFeedDirectory(): Promise<void> {
  const repo = new FeedDirectoryRepo();
  const existing = await repo.count();
  if (existing >= FEED_DIRECTORY.length) return; // already seeded
  await repo.seedMany(FEED_DIRECTORY);
}

/** Creates the default user profile if it doesn't exist */
export async function initializeUserProfile(): Promise<void> {
  const repo = new UserProfileRepo();
  await repo.getOrCreate(); // creates with defaults if absent
}

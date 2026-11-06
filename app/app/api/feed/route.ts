import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

export interface NormalizedFeedItem {
  title: string;
  link: string;
  contentSnippet: string;
  content: string;
  pubDate: string;
  guid: string;
  categories: string[];
}

export interface NormalizedFeed {
  title: string;
  description: string;
  link: string;
  items: NormalizedFeedItem[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing required query parameter: url" },
      { status: 400 }
    );
  }

  let feedUrl: string;
  try {
    feedUrl = decodeURIComponent(rawUrl);
    new URL(feedUrl); // validate it's a parseable URL
  } catch {
    return NextResponse.json(
      { error: "Invalid URL parameter" },
      { status: 400 }
    );
  }

  try {
    const feed = await parser.parseURL(feedUrl);

    const normalized: NormalizedFeed = {
      title: feed.title ?? "Untitled Feed",
      description: feed.description ?? "",
      link: feed.link ?? feedUrl,
      items: (feed.items ?? []).map((item) => ({
        title: item.title ?? "Untitled",
        link: item.link ?? item.guid ?? "",
        contentSnippet: item.contentSnippet ?? item.summary ?? "",
        // Prefer full HTML content, fall back to snippet
        content:
          (item as unknown as Record<string, string>).contentEncoded ??
          item.content ??
          item.contentSnippet ??
          "",
        pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        guid: item.guid ?? item.link ?? crypto.randomUUID(),
        categories: item.categories ?? [],
      })),
    };

    return NextResponse.json(normalized, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[/api/feed] upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch or parse the feed. The URL may not be a valid RSS/Atom feed." },
      { status: 502 }
    );
  }
}

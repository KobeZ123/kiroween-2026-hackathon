import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser();

export interface DiscoverResult {
  valid: true;
  title: string;
  description: string;
  itemCount: number;
  category: null;
}

export interface DiscoverError {
  valid: false;
  error: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { valid: false, error: "Missing required query parameter: url" } satisfies DiscoverError,
      { status: 400 }
    );
  }

  let feedUrl: string;
  try {
    feedUrl = decodeURIComponent(rawUrl);
    new URL(feedUrl);
  } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid URL format" } satisfies DiscoverError,
      { status: 400 }
    );
  }

  try {
    const feed = await parser.parseURL(feedUrl);

    if (!feed.title && (!feed.items || feed.items.length === 0)) {
      return NextResponse.json(
        {
          valid: false,
          error: "URL was reachable but does not appear to be a valid RSS/Atom feed",
        } satisfies DiscoverError,
        { status: 422 }
      );
    }

    return NextResponse.json({
      valid: true,
      title: feed.title ?? "Untitled Feed",
      description: feed.description ?? "",
      itemCount: feed.items?.length ?? 0,
      category: null,
    } satisfies DiscoverResult);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch or parse the feed";
    return NextResponse.json(
      { valid: false, error: message } satisfies DiscoverError,
      { status: 502 }
    );
  }
}

// Resolve a high-quality English Wikipedia reference link for a game title.
// Uses the public MediaWiki opensearch API (no key, CORS-friendly via origin=*).

/** A safe en.wikipedia search link — always valid, even for obscure titles. */
export function wikipediaSearchUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(title)}`;
}

/**
 * Resolve the best-matching Wikipedia article URL for a title, falling back to
 * a Wikipedia search link if nothing matches or the request fails. Preferred over
 * RAWG's `website` (often a store/marketing page) as the default reference link.
 */
export async function resolveWikipediaUrl(title: string): Promise<string> {
  const query = title.trim();
  if (!query) return wikipediaSearchUrl(title);
  try {
    const url =
      'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&namespace=0&limit=1&origin=*&search=' +
      encodeURIComponent(query);
    const res = await fetch(url);
    if (res.ok) {
      // opensearch shape: [term, [titles], [descriptions], [urls]]
      const data = (await res.json()) as unknown;
      const urls = Array.isArray(data) ? data[3] : undefined;
      const link = Array.isArray(urls) ? urls[0] : undefined;
      if (typeof link === 'string' && link) return link;
    }
  } catch {
    // Network/CORS hiccup — fall through to the search link.
  }
  return wikipediaSearchUrl(query);
}

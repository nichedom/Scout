interface WikiData {
  extract: string;
  title: string;
  url: string;
}

export async function fetchWikipedia(query: string): Promise<WikiData | null> {
  try {
    // Try direct summary first (works well for known places)
    const slug = query.replace(/\s+/g, '_');
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;

    let res = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      // Fallback: search for the query
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
      if (!searchRes.ok) return null;

      const searchData = await searchRes.json() as { query?: { search?: { title: string }[] } };
      const firstTitle = searchData.query?.search?.[0]?.title;
      if (!firstTitle) return null;

      const fallbackUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle)}`;
      res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
    }

    const data = await res.json() as {
      extract?: string;
      title?: string;
      content_urls?: { desktop?: { page?: string } };
    };

    if (!data.extract) return null;

    return {
      extract: data.extract.slice(0, 2000), // cap at 2000 chars for prompt budget
      title: data.title ?? query,
      url: data.content_urls?.desktop?.page ?? '',
    };
  } catch (err) {
    console.warn('[wikipedia] fetch failed:', (err as Error).message);
    return null;
  }
}

import { clipText } from "@/lib/utils";

export async function extractArticleFromUrl(url: string) {
  const [{ JSDOM }, { Readability }] = await Promise.all([
    import("jsdom"),
    import("@mozilla/readability"),
  ]);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ContentMachine/1.0; +https://localhost)",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch article (${response.status})`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent) {
    return {
      title: url,
      byline: "",
      excerpt: "",
      content: clipText(dom.window.document.body.textContent || "", 6000),
    };
  }

  return {
    title: article.title || url,
    byline: article.byline || "",
    excerpt: clipText(article.excerpt || "", 240),
    content: clipText(article.textContent, 12000),
  };
}

export function chunkText(input: string, chunkSize = 3000, overlap = 300) {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const next = input.slice(cursor, cursor + chunkSize);
    chunks.push(next);
    cursor += chunkSize - overlap;
  }

  return chunks;
}

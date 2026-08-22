import config from "../config/config.js";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

// =======================
// TAVILY WEB SEARCH
// =======================

export async function searchWeb(query: string): Promise<string> {
  if (!config.TAVILY_API_KEY) {
    console.warn("TAVILY_API_KEY is not set — skipping web search.");
    return "";
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search returned status ${response.status}`);
    }

    const data = (await response.json()) as TavilyResponse;

    const summary = data.answer ? `Summary: ${data.answer}\n\n` : "";

    const sources = (data.results ?? [])
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`)
      .join("\n\n");

    return `${summary}${sources}`.trim();
  } catch (err) {
    console.error("Tavily search failed:", err);
    return "";
  }
}

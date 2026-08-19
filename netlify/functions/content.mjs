import { queryPublished } from "../lib/notion.mjs";

export default async () => {
  try {
    const items = await queryPublished();
    return new Response(JSON.stringify({ ok: true, items, syncedAt: new Date().toISOString() }), {
      status: 200,
      headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "netlify-cdn-cache-control": "public, durable, max-age=60, stale-while-revalidate=120"
    }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.code || "NOTION_ERROR",
      message: error.message
    }), {
      status: error.status || 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

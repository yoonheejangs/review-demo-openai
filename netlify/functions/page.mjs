import { queryBySlug, pageToContent, getPageBlocks } from "../lib/notion.mjs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim();
    if (!slug) {
      return Response.json({ ok: false, message: "slug가 필요합니다." }, { status: 400 });
    }

    const page = await queryBySlug(slug);
    if (!page) {
      return Response.json({ ok: false, message: "공개된 콘텐츠를 찾지 못했습니다." }, { status: 404 });
    }

    const item = pageToContent(page);
    const blocks = await getPageBlocks(page.id);

    return new Response(JSON.stringify({
      ok: true,
      item,
      blocks,
      syncedAt: new Date().toISOString()
    }), {
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

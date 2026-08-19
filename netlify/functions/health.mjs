import { checkConnection } from "../lib/notion.mjs";

export default async () => {
  try {
    const result = await checkConnection();
    return Response.json({
      ...result,
      checkedAt: new Date().toISOString(),
      message: "Notion ↔ Netlify 연결이 정상입니다."
    }, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    console.error(error);
    return Response.json({
      ok: false,
      error: error.code || "NOTION_ERROR",
      message: error.message,
      checkedAt: new Date().toISOString()
    }, {
      status: error.status || 500,
      headers: { "cache-control": "no-store" }
    });
  }
};

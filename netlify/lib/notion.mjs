const DEFAULT_DATA_SOURCE_ID = "a51af7b0-f4a2-4afc-950c-d4923b59ac08";
const DEFAULT_API_VERSION = "2026-03-11";

export function config() {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID || DEFAULT_DATA_SOURCE_ID;
  const version = process.env.NOTION_API_VERSION || DEFAULT_API_VERSION;

  if (!token) {
    const err = new Error("NOTION_TOKEN 환경변수가 설정되지 않았습니다.");
    err.code = "MISSING_NOTION_TOKEN";
    throw err;
  }
  return { token, dataSourceId, version };
}

function headers() {
  const { token, version } = config();
  return {
    "Authorization": `Bearer ${token}`,
    "Notion-Version": version,
    "Content-Type": "application/json",
  };
}

async function notionFetch(path, options = {}) {
  const res = await fetch(`https://api.notion.com${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.message || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    const err = new Error(`Notion API ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function plainText(rich = []) {
  return (rich || []).map(x => x.plain_text ?? x.text?.content ?? "").join("");
}

export function propText(p) {
  if (!p) return "";
  if (p.type === "title") return plainText(p.title);
  if (p.type === "rich_text") return plainText(p.rich_text);
  return "";
}
export const propSelect = p => p?.select?.name || "";
export const propMulti = p => (p?.multi_select || []).map(x => x.name);
export const propUrl = p => p?.url || "";
export const propCheck = p => !!p?.checkbox;
export const propNumber = p => p?.number ?? null;
export const propDate = p => p?.date?.start || "";
export function propUniqueId(p) {
  const u = p?.unique_id;
  if (!u) return "";
  return `${u.prefix || "DT"}-${u.number}`;
}
export function propFile(p) {
  const f = p?.files?.[0];
  if (!f) return "";
  if (f.type === "external") return f.external?.url || "";
  if (f.type === "file") return f.file?.url || "";
  if (f.type === "file_upload") return f.file_upload?.url || "";
  return "";
}

export function pageToContent(page) {
  const p = page.properties || {};
  const slug = propText(p["슬러그"]);
  return {
    id: propUniqueId(p["콘텐츠 ID"]) || page.id.slice(0, 8),
    pageId: page.id,
    notionUrl: page.url,
    title: propText(p["제목"]),
    status: propSelect(p["상태"]),
    type: propSelect(p["종류"]),
    featured: propCheck(p["메인 노출"]),
    summary: propText(p["한 줄 요약"]),
    question: propText(p["궁금증"]),
    result: propText(p["결과 요약"]),
    rabbit: propText(p["달토끼 한마디"]),
    tools: propMulti(p["사용 AI"]),
    badge: propSelect(p["B급 스티커"]),
    slug,
    published: propDate(p["공개일"]),
    order: propNumber(p["정렬"]) ?? 999,
    youtube: propUrl(p["YouTube"]),
    externalUrl: propUrl(p["외부 링크"]),
    thumb: propUrl(p["썸네일 URL"]) || propFile(p["썸네일"]) || "",
  };
}

export async function queryPublished() {
  const { dataSourceId } = config();
  let cursor;
  const all = [];

  do {
    const body = {
      filter: { property: "상태", select: { equals: "공개" } },
      sorts: [{ property: "정렬", direction: "ascending" }],
      page_size: 100,
      result_type: "page",
    };
    if (cursor) body.start_cursor = cursor;

    const data = await notionFetch(`/v1/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    all.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return all.map(pageToContent);
}

export async function queryBySlug(slug) {
  const { dataSourceId } = config();
  const data = await notionFetch(`/v1/data_sources/${dataSourceId}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        and: [
          { property: "슬러그", rich_text: { equals: slug } },
          { property: "상태", select: { equals: "공개" } }
        ]
      },
      page_size: 1,
      result_type: "page",
    }),
  });
  return data.results?.[0] || null;
}

function normalizeRichText(rich = []) {
  return rich.map(r => ({
    text: r.plain_text ?? r.text?.content ?? "",
    href: r.href || r.text?.link?.url || "",
    bold: !!r.annotations?.bold,
    italic: !!r.annotations?.italic,
    underline: !!r.annotations?.underline,
    strike: !!r.annotations?.strikethrough,
    code: !!r.annotations?.code,
    color: r.annotations?.color || "default",
  }));
}

function fileSource(obj) {
  if (!obj) return "";
  if (obj.type === "external") return obj.external?.url || "";
  if (obj.type === "file") return obj.file?.url || "";
  if (obj.type === "file_upload") return obj.file_upload?.url || "";
  return "";
}

function blockTextObject(block) {
  return block?.[block.type] || {};
}

async function listChildren(blockId) {
  let cursor;
  const all = [];
  do {
    const qs = new URLSearchParams({ page_size: "100" });
    if (cursor) qs.set("start_cursor", cursor);
    const data = await notionFetch(`/v1/blocks/${blockId}/children?${qs.toString()}`, {
      method: "GET",
    });
    all.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return all;
}

async function normalizeBlock(block, depth = 0) {
  const type = block.type;
  const obj = blockTextObject(block);
  const out = { id: block.id, type, children: [] };

  const richTypes = new Set([
    "paragraph", "heading_1", "heading_2", "heading_3", "heading_4",
    "bulleted_list_item", "numbered_list_item", "quote", "toggle",
    "to_do", "callout"
  ]);
  if (richTypes.has(type)) out.rich = normalizeRichText(obj.rich_text || []);

  if (type === "to_do") out.checked = !!obj.checked;
  if (type === "callout") {
    if (obj.icon?.type === "emoji") out.icon = obj.icon.emoji;
    else if (obj.icon?.type === "external") out.iconUrl = obj.icon.external?.url || "";
  }
  if (type === "code") {
    out.rich = normalizeRichText(obj.rich_text || []);
    out.language = obj.language || "plain text";
    out.caption = normalizeRichText(obj.caption || []);
  }
  if (type === "image" || type === "video" || type === "audio" || type === "pdf" || type === "file") {
    out.url = fileSource(obj);
    out.caption = normalizeRichText(obj.caption || []);
    out.name = obj.name || "";
  }
  if (type === "bookmark" || type === "embed" || type === "link_preview") {
    out.url = obj.url || "";
    out.caption = normalizeRichText(obj.caption || []);
  }
  if (type === "equation") out.expression = obj.expression || "";
  if (type === "child_page") out.title = obj.title || "";
  if (type === "child_database") out.title = obj.title || "";
  if (type === "unsupported") out.unsupportedType = obj.block_type || "";

  if (type === "table_row") {
    out.cells = (obj.cells || []).map(cell => normalizeRichText(cell));
  }

  // Prevent pathological recursion but support normal nested Notion pages.
  if (block.has_children && depth < 8) {
    const children = await listChildren(block.id);
    out.children = await Promise.all(children.map(c => normalizeBlock(c, depth + 1)));
  }

  return out;
}

export async function getPageBlocks(pageId) {
  const children = await listChildren(pageId);
  const blocks = [];
  // Sequential fetch reduces rate-limit bursts when a page has many nested blocks.
  for (const child of children) {
    blocks.push(await normalizeBlock(child, 0));
  }
  return blocks;
}

export async function checkConnection() {
  const { dataSourceId, version } = config();
  const data = await notionFetch(`/v1/data_sources/${dataSourceId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 1, result_type: "page" }),
  });
  return { ok: true, apiVersion: version, dataSourceId, reachable: true, sampleCount: data.results?.length || 0 };
}

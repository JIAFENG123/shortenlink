import { getStore } from "@netlify/blobs";

const MAX_RETRY = 10;
const CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FORBIDDEN_RE = /[\s\/\?#&<>\\'"`;]/;
const RESERVED = new Set([
  "api",
  "admin",
  "static",
  "assets",
  "favicon.ico",
  "robots.txt",
  "index.html",
  ".netlify",
]);

function makeCode() {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function validateAlias(alias) {
  const chars = [...alias];
  if (chars.length < 1 || chars.length > 32) {
    return "自定义短码长度需要 1 ~ 32 个字符";
  }
  if (FORBIDDEN_RE.test(alias)) {
    return "不能包含空格、/ ? # & < > \\ 等特殊字符";
  }
  if (alias.startsWith(".") || alias.startsWith("-")) {
    return "不能以 . 或 - 开头";
  }
  if (RESERVED.has(alias.toLowerCase())) {
    return `"${alias}" 是系统保留词，换一个吧`;
  }
  return null;
}

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "请求体不是有效 JSON" }, 400);
  }

  const longUrl = normalizeUrl(body.longUrl || "");
  if (!longUrl) {
    return jsonResp({ error: "请输入有效的 http/https 链接" }, 400);
  }

  const customAlias = (body.alias || "").trim();

  try {
    const store = getStore({ name: "short-links", consistency: "strong" });
    let code;

    if (customAlias) {
      const err = validateAlias(customAlias);
      if (err) return jsonResp({ error: err }, 400);

      const existing = await store.get(customAlias);
      if (existing) {
        return jsonResp({ error: `"${customAlias}" 已被占用，换一个吧` }, 409);
      }
      code = customAlias;
    } else {
      code = null;
      for (let i = 0; i < MAX_RETRY; i++) {
        const candidate = makeCode();
        const existing = await store.get(candidate);
        if (!existing) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return jsonResp({ error: "短码生成失败，请重试" }, 500);
      }
    }

    await store.set(
      code,
      JSON.stringify({
        longUrl,
        createdAt: new Date().toISOString(),
        clicks: 0,
      })
    );

    const origin = new URL(req.url).origin;
    return jsonResp({ code, longUrl, shortUrl: `${origin}/${code}` });
  } catch (error) {
    return jsonResp(
      { error: "生成失败，请稍后重试", detail: error?.message || "unknown" },
      500
    );
  }
};

export const config = {
  path: "/api/shorten",
};

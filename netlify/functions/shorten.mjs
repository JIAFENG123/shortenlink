import { getStore } from "@netlify/blobs";

const CODE_LENGTH = 6;
const MAX_RETRY = 10;
const CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeCode(length = CODE_LENGTH) {
  let code = "";
  for (let i = 0; i < length; i++) {
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

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体不是有效 JSON" }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const longUrl = normalizeUrl(body.longUrl || "");
  if (!longUrl) {
    return new Response(
      JSON.stringify({ error: "请输入有效的 http/https 链接" }),
      { status: 400, headers: jsonHeaders }
    );
  }

  try {
    const store = getStore({ name: "short-links", consistency: "strong" });
    let code = null;

    for (let i = 0; i < MAX_RETRY; i++) {
      const candidate = makeCode();
      const existing = await store.get(candidate);
      if (!existing) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: "短码生成失败，请重试" }),
        { status: 500, headers: jsonHeaders }
      );
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
    return new Response(
      JSON.stringify({ code, longUrl, shortUrl: `${origin}/${code}` }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "生成失败，请稍后重试",
        detail: error?.message || "unknown error",
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const config = {
  path: "/api/shorten",
};

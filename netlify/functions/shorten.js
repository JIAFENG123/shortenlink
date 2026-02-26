const { connectLambda, getStore } = require("@netlify/blobs");

const CODE_LENGTH = 6;
const MAX_RETRY = 10;

function makeCode(length = CODE_LENGTH) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getBaseUrl(event) {
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "请求体不是有效 JSON" }) };
  }

  const longUrl = normalizeUrl(payload.longUrl || "");
  if (!longUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: "请输入有效的 http/https 链接" }) };
  }

  try {
    const store = getStore("short-links");
    let code = null;

    for (let i = 0; i < MAX_RETRY; i += 1) {
      const candidate = makeCode();
      const existing = await store.get(candidate);
      if (!existing) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      return { statusCode: 500, body: JSON.stringify({ error: "短码生成失败，请重试" }) };
    }

    await store.set(
      code,
      JSON.stringify({
        longUrl,
        createdAt: new Date().toISOString(),
        clicks: 0
      })
    );

    const baseUrl = getBaseUrl(event);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        code,
        longUrl,
        shortUrl: `${baseUrl}/${code}`
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: "生成失败，请稍后重试",
        detail: error?.message || "unknown error"
      })
    };
  }
};

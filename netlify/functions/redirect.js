const { connectLambda, getStore } = require("@netlify/blobs");

function getCodeFromEvent(event) {
  const queryCode = event.queryStringParameters?.code;
  if (queryCode) return queryCode;

  const path = event.path || "";
  const pathCode = path.split("/").filter(Boolean).pop();
  if (pathCode && pathCode !== "redirect") return pathCode;

  const rawUrl = event.rawUrl;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const rawPathCode = parsed.pathname.split("/").filter(Boolean).pop();
      if (rawPathCode && rawPathCode !== "redirect") return rawPathCode;
    } catch {
      return null;
    }
  }

  return null;
}

exports.handler = async (event) => {
  connectLambda(event);

  const code = getCodeFromEvent(event);
  if (!code) {
    return { statusCode: 400, body: "缺少短码" };
  }

  try {
    const store = getStore("short-links");
    const data = await store.get(code, { type: "json" });

    if (!data?.longUrl) {
      return {
        statusCode: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: "<h1>404</h1><p>短链接不存在或已失效。</p>"
      };
    }

    const nextClicks = Number(data.clicks || 0) + 1;
    await store.set(
      code,
      JSON.stringify({
        ...data,
        clicks: nextClicks,
        lastVisitedAt: new Date().toISOString()
      })
    );

    return {
      statusCode: 302,
      headers: {
        location: data.longUrl,
        "cache-control": "no-store"
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: `<h1>500</h1><p>短链服务异常：${error?.message || "unknown error"}</p>`
    };
  }
};

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const code = event.queryStringParameters?.code;
  if (!code) {
    return { statusCode: 400, body: "缺少短码" };
  }

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
};

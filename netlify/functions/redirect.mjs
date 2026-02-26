import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const rawCode = context.params.code;

  if (!rawCode) {
    return new Response("缺少短码", { status: 400 });
  }

  let code;
  try {
    code = decodeURIComponent(rawCode);
  } catch {
    code = rawCode;
  }

  try {
    const store = getStore({ name: "short-links", consistency: "strong" });
    const raw = await store.get(code);

    if (!raw) {
      return new Response(
        `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>404</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px">
<h1>404</h1><p>短链接不存在或已失效。</p>
<a href="/">返回首页</a>
</body></html>`,
        { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return new Response("数据解析失败", { status: 500 });
    }

    if (!data.longUrl) {
      return new Response(
        `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>404</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px">
<h1>404</h1><p>短链接不存在或已失效。</p>
<a href="/">返回首页</a>
</body></html>`,
        { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    store
      .set(
        code,
        JSON.stringify({
          ...data,
          clicks: (data.clicks || 0) + 1,
          lastVisitedAt: new Date().toISOString(),
        })
      )
      .catch(() => {});

    return new Response(null, {
      status: 302,
      headers: {
        location: data.longUrl,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>500</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px">
<h1>500</h1><p>短链服务异常：${error?.message || "unknown"}</p>
</body></html>`,
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
};

export const config = {
  path: "/:code",
  preferStatic: true,
};

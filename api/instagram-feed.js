const DEFAULT_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramUserId = process.env.INSTAGRAM_USER_ID || "me";
  const graphHost = process.env.INSTAGRAM_GRAPH_HOST || (
    instagramUserId === "me"
      ? "https://graph.instagram.com"
      : "https://graph.facebook.com/v21.0"
  );

  if (!accessToken) {
    res.status(500).json({
      error: "Missing INSTAGRAM_ACCESS_TOKEN",
      posts: [],
    });
    return;
  }

  const endpoint = new URL(`${graphHost}/${instagramUserId}/media`);
  endpoint.searchParams.set("fields", DEFAULT_FIELDS);
  endpoint.searchParams.set("limit", "6");
  endpoint.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(endpoint);
    const payload = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: payload.error?.message || "Instagram API error",
        posts: [],
      });
      return;
    }

    const posts = (payload.data || []).slice(0, 6).map((post) => ({
      id: post.id,
      caption: post.caption || "",
      media_type: post.media_type,
      media_url: post.media_type === "VIDEO" ? post.thumbnail_url || post.media_url : post.media_url,
      permalink: post.permalink,
      timestamp: post.timestamp,
    }));

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json({ posts });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Instagram feed failed",
      posts: [],
    });
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const feed = url.searchParams.get("feed") || "topstories";
    const limit = Math.min(Number(url.searchParams.get("limit") || 15), 30);

    const idsRes = await fetch(`https://hacker-news.firebaseio.com/v0/${feed}.json`);
    const ids: number[] = await idsRes.json();
    const top = ids.slice(0, limit);
    const stories = await Promise.all(
      top.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json())
      )
    );

    return new Response(
      JSON.stringify({
        stories: stories.filter(Boolean).map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
          score: s.score,
          by: s.by,
          time: s.time,
          comments: s.descendants ?? 0,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

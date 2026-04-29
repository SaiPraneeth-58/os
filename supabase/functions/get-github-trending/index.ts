const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const language = url.searchParams.get("language") || "";
    const since = url.searchParams.get("since") || "7"; // days

    const date = new Date();
    date.setDate(date.getDate() - Number(since));
    const created = date.toISOString().slice(0, 10);

    const q = encodeURIComponent(`created:>${created}${language ? ` language:${language}` : ""}`);
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`,
      { headers: { "User-Agent": "JARVIS-OS", Accept: "application/vnd.github+json" } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "GitHub error");

    return new Response(
      JSON.stringify({
        repos: (data.items || []).map((r: any) => ({
          id: r.id,
          name: r.full_name,
          description: r.description,
          url: r.html_url,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          owner_avatar: r.owner?.avatar_url,
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const ids =
      url.searchParams.get("ids") ||
      "bitcoin,ethereum,solana,cardano,dogecoin,ripple,polkadot,chainlink";
    const vs = url.searchParams.get("vs") || "usd";

    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs}&ids=${ids}&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Markets error");

    return new Response(
      JSON.stringify({
        coins: data.map((c: any) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          image: c.image,
          price: c.current_price,
          change_24h: c.price_change_percentage_24h,
          market_cap: c.market_cap,
          volume: c.total_volume,
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

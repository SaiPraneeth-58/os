const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let lat = url.searchParams.get("lat");
    let lon = url.searchParams.get("lon");
    let place = url.searchParams.get("place") || "";

    if (!lat || !lon) {
      const q = url.searchParams.get("q") || "London";
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
      const geo = await geoRes.json();
      const r = geo.results?.[0];
      if (!r) throw new Error("Location not found");
      lat = String(r.latitude); lon = String(r.longitude);
      place = `${r.name}, ${r.country_code || r.country || ""}`;
    }

    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
    );
    const w = await wRes.json();
    const current = w.current;
    const daily = w.daily;
    const forecast = (daily?.time || []).map((d: string, i: number) => ({
      date: d,
      code: daily.weather_code[i],
      condition: WEATHER_CODES[daily.weather_code[i]] || "Unknown",
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
    }));

    return new Response(
      JSON.stringify({
        place,
        current: {
          temp: current.temperature_2m,
          feels_like: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          wind: current.wind_speed_10m,
          code: current.weather_code,
          condition: WEATHER_CODES[current.weather_code] || "Unknown",
        },
        forecast,
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

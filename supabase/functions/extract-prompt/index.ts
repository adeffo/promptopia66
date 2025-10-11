import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, language = "de", detailLevel = 50 } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Kein Bild bereitgestellt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API-Schlüssel nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine prompt instruction based on language and detail level
    const detailInstruction =
      detailLevel < 33
        ? language === "de"
          ? "Beschreibe das Bild in einem kurzen, präzisen Prompt."
          : "Describe the image in a short, precise prompt."
        : detailLevel < 67
        ? language === "de"
          ? "Beschreibe das Bild als strukturierten Prompt mit Fokus auf Szene, Stil, Beleuchtung und Stimmung."
          : "Describe the image as a structured prompt focusing on scene, style, lighting, and mood."
        : language === "de"
        ? "Beschreibe das Bild als detaillierten, hochqualitativen Bildgenerierungs-Prompt. Inkludiere Details wie Szene, Stil, Beleuchtung, Komposition, Kamera, Farben, Stimmung und wichtige Merkmale."
        : "Describe this image as a detailed, high-quality image generation prompt. Include details such as scene, style, lighting, composition, camera, colors, mood, and key features.";

    const fullInstruction =
      language === "de"
        ? `${detailInstruction} Halte es kurz und klar. Gebe nur den Prompt zurück, ohne zusätzliche Erklärungen.`
        : `${detailInstruction} Keep it short and clear. Return only the prompt without additional explanations.`;

    console.log("Calling OpenRouter API with image...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "Prompt Extractor",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
              {
                type: "text",
                text: fullInstruction,
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Analyse nicht möglich" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content;

    if (!prompt) {
      console.error("No prompt in response:", data);
      return new Response(
        JSON.stringify({ error: "Analyse nicht möglich" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully extracted prompt");

    return new Response(
      JSON.stringify({ prompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-prompt function:", error);
    return new Response(
      JSON.stringify({ error: "Analyse nicht möglich" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

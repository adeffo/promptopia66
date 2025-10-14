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
          ? "Analysiere das Bild präzise und erstelle einen kompakten Prompt mit den wichtigsten visuellen Elementen, Kamerawinkel und Lichtverhältnissen."
          : "Analyze the image precisely and create a compact prompt with the most important visual elements, camera angle, and lighting conditions."
        : detailLevel < 67
        ? language === "de"
          ? "Analysiere das Bild technisch genau und beschreibe: Kameraposition (Winkel, Höhe, Perspektive), Brennweite und Schärfentiefe, Lichtverhältnisse (Richtung, Qualität, Farbtemperatur), Belichtung (Helligkeit, Kontrast, Schatten/Highlights), Komposition und Bildaufbau, Farbgebung und Farbstimmung. Erstelle daraus einen strukturierten Bildgenerierungs-Prompt."
          : "Analyze the image technically and describe: Camera position (angle, height, perspective), focal length and depth of field, lighting conditions (direction, quality, color temperature), exposure (brightness, contrast, shadows/highlights), composition and framing, color palette and color grading. Create a structured image generation prompt from this."
        : language === "de"
        ? "Analysiere das Bild wie ein professioneller Fotograf und beschreibe alle technischen Details: KAMERA: Genaue Position, Winkel, Höhe, Perspektive (z.B. 'eye-level', 'low-angle', 'bird's eye'), geschätzte Brennweite (z.B. 'wide-angle 24mm', 'portrait 85mm'), Schärfentiefe und Bokeh-Effekt. BELICHTUNG: Belichtungsstil (z.B. 'high-key', 'low-key', 'balanced'), Kontrast (soft/hard), Dynamikumfang, Schatten- und Highlight-Details. LICHT: Lichtquelle und -richtung (z.B. 'natural sunlight from right', 'soft diffused overhead lighting'), Lichtqualität (hard/soft), Farbtemperatur (warm/cool/neutral), Schatten-Charakteristik. KOMPOSITION: Bildaufbau, Symmetrie, Führungslinien, Goldener Schnitt, Vorder-/Mittel-/Hintergrund. FARBEN: Farbpalette, Farbstimmung, Sättigung, Farbtemperatur, Color Grading Stil. STIL: Fotografischer Stil, visuelle Ästhetik, Atmosphäre. Erstelle daraus einen detaillierten, technischen Bildgenerierungs-Prompt, der das Bild möglichst exakt reproduzieren würde."
        : "Analyze the image like a professional photographer and describe all technical details: CAMERA: Exact position, angle, height, perspective (e.g., 'eye-level', 'low-angle', 'bird's eye'), estimated focal length (e.g., 'wide-angle 24mm', 'portrait 85mm'), depth of field and bokeh effect. EXPOSURE: Exposure style (e.g., 'high-key', 'low-key', 'balanced'), contrast (soft/hard), dynamic range, shadow and highlight details. LIGHTING: Light source and direction (e.g., 'natural sunlight from right', 'soft diffused overhead lighting'), light quality (hard/soft), color temperature (warm/cool/neutral), shadow characteristics. COMPOSITION: Framing, symmetry, leading lines, rule of thirds, foreground/midground/background. COLORS: Color palette, color mood, saturation, color temperature, color grading style. STYLE: Photographic style, visual aesthetic, atmosphere. Create a detailed, technical image generation prompt that would reproduce this image as accurately as possible.";

    const fullInstruction =
      language === "de"
        ? `${detailInstruction} Gebe nur den technischen Bildgenerierungs-Prompt zurück, ohne zusätzliche Erklärungen oder Kommentare.`
        : `${detailInstruction} Return only the technical image generation prompt without additional explanations or comments.`;

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

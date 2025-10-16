import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea } = await req.json();
    
    if (!idea || idea.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Idee ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY nicht konfiguriert');
    }

    const systemPrompt = `Du bist ein Experte für die Erstellung professioneller Bildprompts für AI-Bildgenerierung. 
Deine Aufgabe ist es, aus einer einfachen Idee einen vollständigen, strukturierten Prompt zu erstellen.

Erstelle aus der Nutzeridee einen detaillierten Prompt mit folgenden Sektionen:

1. Main Scene / Concept: Die zentrale Szene oder das Hauptmotiv
2. Style & Mood: Visueller Stil (z.B. cinematic, watercolor, cyberpunk, photorealistic)
3. Lighting: Lichtbedingungen (z.B. golden hour, volumetric light, soft light, dramatic backlight)
4. Camera Type: DSLR, Mirrorless, Film Camera, Polaroid, etc.
5. Lens & Focal Length: z.B. 85mm f/1.4, 24mm wide angle, 50mm prime
6. Camera Position: eye level, aerial view, macro, low angle, dutch angle
7. Composition: Regel der Drittel, leading lines, centered subject, symmetry
8. Environment & Background: cityscape, forest, desert, underwater, studio
9. Color Palette: neon colors, monochrome, pastel, warm tones, cool tones
10. Details & Enhancements: Texturen, Kleidung, Materialien, Bewegung, Wetter
11. Negative Prompt: Was vermieden werden soll (blurry, low quality, extra limbs, distorted)
12. Model/Engine: Empfohlenes Modell (Midjourney, DALL·E, Stable Diffusion, Gemini)
13. Aspect Ratio / Resolution: 16:9, 3:2, 1:1, 1024×1024px etc.

Antworte ausschließlich mit einem JSON-Objekt in diesem Format:
{
  "mainScene": "...",
  "style": "...",
  "lighting": "...",
  "cameraType": "...",
  "lens": "...",
  "cameraPosition": "...",
  "composition": "...",
  "environment": "...",
  "colorPalette": "...",
  "details": "...",
  "negativePrompt": "...",
  "recommendedModel": "...",
  "aspectRatio": "..."
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Erstelle einen professionellen Bildprompt aus dieser Idee: ${idea}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI Error:', response.status, errorText);
      throw new Error(`API Fehler: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Antwort von der API erhalten');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Keine gültige JSON-Antwort erhalten');
    }

    const promptData = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(promptData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in optimize-prompt:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

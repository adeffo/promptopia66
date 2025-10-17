import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { promptText, gender, hasPhotos } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Personalizing prompt with gender:", gender, "hasPhotos:", hasPhotos);

    const systemPrompt = `Du bist ein Experte für die Personalisierung von AI-Bildgenerierungs-Prompts. 
Deine Aufgabe ist es, den gegebenen Prompt basierend auf dem Geschlecht des Users anzupassen.

WICHTIGE REGELN:
1. Wenn "man" oder "male" im Prompt vorkommt und das Geschlecht "female" ist, ersetze es durch "woman" oder "female"
2. Wenn "woman" oder "female" im Prompt vorkommt und das Geschlecht "male" ist, ersetze es durch "man" oder "male"
3. Wenn das Geschlecht "diverse" oder "prefer_not_to_say" ist, verwende neutrale Begriffe wie "person"
4. Behalte den Rest des Prompts EXAKT bei - ändere nur geschlechtsspezifische Begriffe
5. Achte auf verschiedene Schreibweisen: man/men, woman/women, male/female, männlich/weiblich, etc.
6. Passe auch verwandte Begriffe an wie "his/her", "him/her", "boy/girl", "guy/gal", etc.
7. Gib NUR den angepassten Prompt zurück, keine Erklärungen

Beispiele:
- "Full-body shot of a man" + female = "Full-body shot of a woman"
- "Portrait of a woman" + male = "Portrait of a man"
- "Beautiful man in suit" + diverse = "Beautiful person in suit"`;

    const userPrompt = `Geschlecht: ${gender}
Hat Profilfotos: ${hasPhotos}

Original Prompt:
${promptText}

Bitte passe diesen Prompt an das Geschlecht an. Gib nur den angepassten Prompt zurück.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Zahlungspflicht. Bitte Guthaben aufladen." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const personalizedPrompt = data.choices[0].message.content.trim();

    console.log("Personalized prompt generated successfully");

    return new Response(JSON.stringify({ personalizedPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in personalize-prompt function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

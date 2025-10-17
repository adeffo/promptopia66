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
    const body = await req.json();
    const { promptText, gender, hasPhotos } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const action = body.action || 'personalize';
    
    if (action === 'extract') {
      console.log("Extracting characteristics from prompt");
      
      const extractSystemPrompt = `Du bist ein Experte für die Analyse von AI-Bildgenerierungs-Prompts.
    
Deine Aufgabe: Extrahiere alle persönlichen Merkmale aus dem Prompt und gib sie als JSON zurück.

Zu extrahierende Merkmale:
- gender: z.B. "woman", "man", "person"
- hairColor: z.B. "orange", "blonde", "black"
- hairLength: z.B. "long", "short", "medium"
- eyeColor: z.B. "blue", "brown", "green"
- age: z.B. "young", "middle-aged", "elderly"
- bodyType: z.B. "athletic", "slim", "curvy"
- skinTone: z.B. "pale", "tan", "dark"
- other: Alle anderen persönlichen Beschreibungen

Gib NUR ein JSON-Objekt zurück mit den gefundenen Merkmalen. Wenn ein Merkmal nicht gefunden wird, lass es weg.
Beispiel: {"gender": "woman", "hairColor": "orange", "hairLength": "long"}`;

      const extractUserPrompt = `Prompt: ${promptText}`;

      const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: extractSystemPrompt },
            { role: "user", content: extractUserPrompt }
          ],
        }),
      });

      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        console.error("AI Gateway Error:", extractResponse.status, errorText);
        
        if (extractResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (extractResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Zahlungspflicht. Bitte Guthaben aufladen." }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`AI Gateway Error: ${extractResponse.status}`);
      }

      const extractData = await extractResponse.json();
      const extractedCharacteristics = extractData.choices[0].message.content;
      
      console.log("Extracted characteristics:", extractedCharacteristics);

      return new Response(JSON.stringify({ characteristics: extractedCharacteristics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Personalize with user-provided characteristics
    console.log("Personalizing prompt with gender:", gender, "hasPhotos:", hasPhotos);
    
    const userCharacteristics = body.characteristics || {};

    const systemPrompt = `Du bist ein Experte für die Personalisierung von AI-Bildgenerierungs-Prompts.
  
Deine Aufgabe:
1. Analysiere den gegebenen Prompt
2. Ersetze die persönlichen Merkmale mit den vom Nutzer angegebenen Werten

Wichtige Regeln:
- Verwende GENAU die vom Nutzer angegebenen Merkmale
- Behalte die Struktur und den Stil des Original-Prompts bei
- Ersetze nur die persönlichen Beschreibungen
- Gib NUR den angepassten Prompt zurück, ohne zusätzliche Erklärungen oder Formatierungen.`;

    const userPrompt = `Geschlecht: ${gender}
Hat Profilfotos: ${hasPhotos}
Nutzer-Merkmale: ${JSON.stringify(userCharacteristics)}

Original Prompt:
${promptText}

Bitte passe diesen Prompt mit den angegebenen Merkmalen an. Gib nur den angepassten Prompt zurück.`;

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

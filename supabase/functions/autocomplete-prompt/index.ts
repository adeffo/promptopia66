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
    const { promptText, title } = await req.json();
    
    if (!promptText) {
      return new Response(
        JSON.stringify({ error: 'Prompt text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Du bist ein KI-Assistent, der Prompt-Metadaten analysiert. 
Basierend auf dem gegebenen Prompt-Text, generiere:
1. 3-7 relevante Tags (Schlagwörter)
2. Ein passendes Genre

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "genre": "Genre-Name"
}

Beliebte Genres sind: Fantasy, Sci-Fi, Horror, Romantik, Cyberpunk, Steampunk, Post-Apokalyptisch, Mittelalter, Modern, Abstrakt, Natur, Architektur, Portrait, Landschaft, etc.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Titel: ${title}\n\nPrompt: ${promptText}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate autocomplete suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from the response (sometimes the model includes extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in autocomplete-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
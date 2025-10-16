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
    const { imageData, mode = "quality" } = await req.json();
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Define enhancement prompt based on mode
    const enhancementPrompts = {
      quality: "Apply MAXIMUM quality enhancement to this image at the HIGHEST possible resolution. Transform this into an ultra-high-definition, professional-grade photograph with exceptional clarity. AGGRESSIVELY reduce all noise and grain while MAXIMALLY sharpening every detail. Enhance facial features, skin texture, and fine details to photorealistic perfection. Dramatically improve sharpness, contrast, and color accuracy to achieve studio-quality results. Make this image look like it was captured with professional camera equipment at maximum resolution. Preserve natural appearance while pushing quality to absolute maximum - similar to professional photo restoration software like Remini. Output should be crystal-clear, ultra-sharp, and of the highest possible quality.",
      background: "Enhance the background and environmental details of this image. Bring out the natural beauty of landscapes, objects, and fine details in the background. Improve texture clarity, enhance depth, sharpen background elements, and make environmental details more vivid while maintaining the main subject. Focus on making backgrounds and surroundings more detailed and visually appealing."
    };

    const enhancementPrompt = enhancementPrompts[mode as keyof typeof enhancementPrompts] || enhancementPrompts.quality;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`Enhancing image with Lovable AI using ${mode} mode...`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: enhancementPrompt
              },
              {
                inlineData: {
                  mimeType: imageData.startsWith('data:image/png') ? 'image/png' : 
                            imageData.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/webp',
                  data: imageData.split(',')[1]
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to enhance image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const enhancedImageUrl = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!enhancedImageUrl) {
      throw new Error("No enhanced image received from AI");
    }

    console.log("Image enhanced successfully");

    return new Response(
      JSON.stringify({ enhancedImage: `data:image/png;base64,${enhancedImageUrl}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in enhance-image function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
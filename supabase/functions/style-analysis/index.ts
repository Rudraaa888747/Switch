import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, imageUrl, userId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

    const systemPrompt = `Analyze this fashion/style image and return ONLY valid JSON (no markdown, no code blocks):
{
  "skinTone": "warm/cool/neutral/olive/fair/dark",
  "bodyStructure": "ectomorph/mesomorph/endomorph/hourglass/pear/apple/rectangle",
  "styleCategory": "casual/formal/bohemian/minimalist/streetwear/ethnic/party",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "recommendations": ["style tip 1", "style tip 2", "style tip 3", "style tip 4"]
}`;

    const mimeTypeMatch = imageBase64.match(/^data:([^;]+);/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini error:", response.status, errorText);
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "No JSON in response" };

    // Save to style_analyses table
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from("style_analyses").insert({
          user_id: userId,
          image_url: imageUrl || null,
          skin_tone: result.skinTone || null,
          body_structure: result.bodyStructure || null,
          style_category: result.styleCategory || null,
          color_palette: result.colorPalette || null,
          recommendations: result.recommendations || null,
        });
      } catch (dbErr) {
        console.error("Failed to save analysis:", dbErr);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Style analysis error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

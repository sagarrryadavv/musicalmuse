import { config } from 'dotenv';
config(); 

export default async function handler(req, res) {

    // 1. Standard Security Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { imageBase64, vibe, language, genre, era, userPrompt, avoidSongs } = req.body;
        
        // 2. Load Configuration from ENV
        const provider = process.env.AI_PROVIDER || 'gemini'; // 'gemini', 'xai', 'openai'
        const apiKey = process.env.AI_API_KEY;
        const model = process.env.AI_MODEL || 'gemini-1.5-flash';

        if (!apiKey) throw new Error(`Server Error: AI_API_KEY for ${provider} is missing.`);

        // 3. The Master Prompt (Same for everyone)
        const systemInstruction = `
            You are an expert pop-culture music curator.
            Analyze the image for celebrities (e.g. Billie Eilish), movie scenes, or aesthetics.
            
            RULES:
            1. If a celebrity/movie is found, use them as an "Anchor" for the vibe.
            2. Suggest Max 1-2 songs by the identified artist, and 3-4 from similar artists.
            3. Return ONLY JSON.
            
            User Context: Vibe="${vibe}", Lang="${language}", Genre="${genre}", Era="${era}", Note="${userPrompt}".
            Avoid: "${avoidSongs}".

            JSON Schema:
            {
                "imageAnalysis": "string",
                "songs": [{ "songTitle": "string", "artist": "string", "lyricSnippet": "string" }],
                "caption": "string",
                "hashtags": "string"
            }
        `;

        let resultData;

        // --- STRATEGY A: GOOGLE GEMINI ---
        if (provider === 'gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ 
                        role: "user", 
                        parts: [ 
                            { text: systemInstruction }, 
                            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } } 
                        ] 
                    }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            
            if (!response.ok) throw new Error(`Gemini Error: ${response.status} ${await response.text()}`);
            const data = await response.json();
            let rawText = data.candidates[0].content.parts[0].text;
            resultData = JSON.parse(cleanJson(rawText));
        } 

        // --- STRATEGY B: OPENAI COMPATIBLE (Grok / xAI / OpenAI) ---
        else if (provider === 'xai' || provider === 'openai') {
            const baseUrl = provider === 'xai' ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
            
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: systemInstruction },
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" } // Force JSON
                })
            });

            if (!response.ok) throw new Error(`${provider.toUpperCase()} Error: ${response.status} ${await response.text()}`);
            const data = await response.json();
            resultData = JSON.parse(data.choices[0].message.content);
        } 
        
        else {
            throw new Error(`Unknown AI_PROVIDER: ${provider}`);
        }

        return res.status(200).json(resultData);

    } catch (error) {
        console.error("AI Provider Error:", error);
        return res.status(500).json({ error: error.message });
    }
}

// Helper to remove markdown (```json ... ```) if the AI adds it
function cleanJson(text) {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
}
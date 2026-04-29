const express = require('express');
const cors = require('cors');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3000;

app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const path = require('path');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project_AI.html'));
});

app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3:8b",
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            if (response.status === 404) {
                return res.status(500).json({
                    error: "Ollama model 'llama3:8b' not found. Run: ollama pull llama3:8b"
                });
            }
            throw new Error(`Ollama returned status ${response.status}`);
        }

        const data = await response.json();
        res.json({ result: data.response });

    } catch (error) {
        console.error("Error generating AI text:", error);

        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({
                error: "Ollama is not running. Please start it with: ollama serve"
            });
        }

        res.status(500).json({ error: "Failed to generate text from AI" });
    }
});

// ✅ FIXED: No fetch() here — just return the URL to the browser
// Browser loads the image directly from Pollinations (no 429 errors)
app.post('/generate-image', (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;

    res.json({ imageUrl: imageUrl });
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server running successfully on http://localhost:${PORT}`);
    console.log(`Text generation: Local Ollama LLaMA 3 → http://localhost:11434`);
    console.log(`Image generation: Pollinations.ai (free, no API key)`);
    console.log(`Ready to accept requests from your frontend!`);
});
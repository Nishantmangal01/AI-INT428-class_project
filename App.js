let chatHistory = [];

function toggleTheme() {
    const body    = document.body;
    const icon    = document.getElementById("theme-icon");
    const isLight = body.classList.toggle("light-mode");

    if (icon) {
        icon.className = isLight ? "ph ph-moon" : "ph ph-sun";
    }

    localStorage.setItem("theme", isLight ? "light" : "dark");
}

(function applySavedTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.body.classList.add("light-mode");
        document.addEventListener("DOMContentLoaded", () => {
            const icon = document.getElementById("theme-icon");
            if (icon) icon.className = "ph ph-moon";
        });
    }
})();

window.addEventListener("load", () => {
    setTimeout(() => {
        const loader = document.getElementById("page-loader");
        if (loader) loader.classList.add("hidden");
    }, 2000);
});

async function callx(userPrompt, systemPrompt = "", maxTokens = 1024) {

    const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${userPrompt}\nAssistant:`
        : userPrompt;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch("http://localhost:3000/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: fullPrompt }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Server error ${response.status}`);
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
            throw new Error("Request timed out. LLaMA is taking too long — try a shorter prompt.");
        }
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            throw new Error("Cannot reach backend. Is 'node server.js' running on port 3000?");
        }
        throw error;
    }
}


async function generatePlot() {
    const genre       = document.getElementById("plot-genre").value.trim();
    const theme       = document.getElementById("plot-theme").value.trim();
    const description = document.getElementById("plot-description").value.trim();

    if (!genre && !theme && !description) {
        showToast("Please fill in at least one field.", "error");
        return;
    }

    showLoading("plot");

    const system = `You are an award-winning Hollywood screenwriter known for original, emotionally resonant stories. 
Generate a compelling movie plot with:
- A gripping one-line logline
- A clear three-act structure (Setup, Confrontation, Resolution)
- A compelling protagonist with a clear arc
- A memorable antagonist or central conflict
- A satisfying, unexpected twist
Keep the tone cinematic and vivid. Format with clear section headings.`;

    const prompt = `Write a movie plot with the following details:
Genre: ${genre || "Any"}
Central Theme: ${theme || "Any"}
Additional Details: ${description || "None"}`;

    try {
        const result = await callx(prompt, system, 1200);
        hideLoading("plot");
        showResult("plot", result);
    } catch (error) {
        hideLoading("plot");
        showToast("Error: " + error.message, "error");
    }
}


async function generateCharacter() {
    const description = document.getElementById("char-description").value.trim();
    const style       = document.getElementById("char-style").value;
    const mood        = document.getElementById("char-mood").value;

    if (!description) {
        showToast("Please describe your character.", "error");
        return;
    }

    showLoading("char");

    const imagePrompt = `${description}, ${style} style, ${mood} lighting, cinematic portrait, high detail, professional photography`;

    try {
        const response = await fetch("http://localhost:3000/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: imagePrompt })
        });

        if (!response.ok) throw new Error(`Image server error ${response.status}`);

        const data = await response.json();
        const imageUrl = data.imageUrl;

        hideLoading("char");
        const container = document.getElementById("char-result");

        const rateLimitHTML = `
            <div style="background:#1a0000; border:1px solid #ff4444; border-radius:8px; padding:24px; text-align:center;">
                <div style="font-size:36px;">⚠️</div>
                <div style="color:#ff6666; font-size:16px; font-weight:bold; margin:10px 0;">Pollinations Rate Limit Reached</div>
                <div style="color:#aaa; font-size:13px;">Their free service is temporarily overloaded.</div>
                <div style="color:#aaa; font-size:13px; margin-top:6px;">Please wait <b style="color:#fff;">15–30 minutes</b> and try again.</div>
            </div>`;

        container.innerHTML = `
            <div id="img-status" style="color:#aaa; font-size:13px; margin-bottom:8px;">⏳ Loading image... (up to 20 sec)</div>
            <img id="char-img" src="${imageUrl}" alt="Generated character portrait"
                style="max-width:100%; border-radius:8px; display:none;" />`;

        const img = document.getElementById("char-img");
        const status = document.getElementById("img-status");

        // Auto timeout after 20 seconds
        const timeout = setTimeout(() => {
            img.src = "";
            container.innerHTML = rateLimitHTML;
        }, 20000);

        img.onload = () => {
            clearTimeout(timeout);
            img.style.display = "block";
            status.style.display = "none";
        };

        img.onerror = () => {
            clearTimeout(timeout);
            container.innerHTML = rateLimitHTML;
        };
    } catch (error) {
        hideLoading("char");
        showToast("Image error: " + error.message + " — Is your Node server running?", "error");
    }
}


async function generateScript() {
    const plot     = document.getElementById("script-plot").value.trim();
    const tone     = document.getElementById("script-tone").value.trim();
    const duration = document.getElementById("script-duration").value;

    if (!plot) {
        showToast("Please provide a plot summary.", "error");
        return;
    }

    showLoading("script");

    const system = `You are a Hollywood trailer editor and voiceover writer with decades of experience crafting iconic movie trailers. 
Format the trailer script with:
- SCENE descriptions in ALL CAPS on their own line
- Voiceover lines prefixed with "VO:"
- Sound cues in [brackets]
- Timestamps like (0:00 - 0:10) for each beat
- A dramatic final title card
Make it feel epic, emotional, and irresistible.`;

    const prompt = `Write a ${duration} movie trailer script for the following:

Plot Summary: ${plot}
Tone: ${tone || "Cinematic and dramatic"}

Structure it as a proper timed trailer script with scene beats, voiceover, music cues, and a final title reveal.`;

    try {
        const result = await callx(prompt, system, 1500);
        hideLoading("script");
        showResult("script", result);
    } catch (error) {
        hideLoading("script");
        showToast("Error: " + error.message, "error");
    }
}


async function generateDialogue() {
    const scene      = document.getElementById("dialogue-scene").value.trim();
    const characters = document.getElementById("dialogue-characters").value.trim();
    const mood       = document.getElementById("dialogue-mood").value;
    const context    = document.getElementById("dialogue-context").value.trim();
    const length     = document.getElementById("dialogue-length").value;

    if (!scene || !characters) {
        showToast("Please fill in the scene description and characters.", "error");
        return;
    }

    showLoading("dialogue");

    const system = `You are an Oscar-winning screenwriter known for sharp, emotionally charged dialogue. 
Write in proper screenplay format:
- Character names CENTERED and in ALL CAPS before each line
- Parentheticals (in parentheses) for key actions or delivery notes
- Scene action lines in plain text between dialogue
- Each character should have a distinct voice
- Subtext is more important than text — what is NOT said matters
- End on a powerful beat that leaves the audience wanting more`;

    const prompt = `Write a ${length} screenplay dialogue scene with the following:

Scene: ${scene}
Characters: ${characters}
Emotional Tone: ${mood}
Background Context: ${context || "None provided"}

Write in proper Hollywood screenplay format.`;

    try {
        const result = await callx(prompt, system, 2000);
        hideLoading("dialogue");
        showResult("dialogue", result);
    } catch (error) {
        hideLoading("dialogue");
        showToast("Error: " + error.message, "error");
    }
}


async function sendChatMessage() {
    const input   = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    appendChatMessage("user", message);
    chatHistory.push({ role: "user", content: message });

    const typingId = showTypingIndicator();

    const system = `You are an expert story consultant and script doctor with 30+ years of experience in Hollywood. 
You have deep knowledge of:
- Three-act structure, Save the Cat beats, Hero's Journey
- Character development and psychological depth  
- Dialogue craft and subtext
- Genre conventions and how to subvert them
- Pacing, tension, and emotional resonance
- Real produced films as reference points

Be specific, insightful, and encouraging. Give concrete, actionable advice. 
Reference real films when helpful. Keep responses focused and under 300 words unless asked for more detail.`;

    try {
        const combinedPrompt = chatHistory
            .map(m => `${m.role}: ${m.content}`)
            .join("\n") + `\nuser: ${message}`;

        const reply = await callx(combinedPrompt, system);

        chatHistory.push({ role: "assistant", content: reply });
        removeTypingIndicator(typingId);
        appendChatMessage("ai", reply);

    } catch (error) {
        removeTypingIndicator(typingId);

        const friendlyMsg = error.message.includes("Ollama")
            ? "Ollama is not running. Please start it with: ollama serve"
            : "Sorry, I ran into an error: " + error.message;

        appendChatMessage("ai", friendlyMsg);
        showToast("Chat error: " + error.message, "error");
    }
}

function clearChat() {
    chatHistory = [];
    const container = document.getElementById("chat-messages");
    container.innerHTML = `
        <div class="chat-message ai-message">
            <div class="message-avatar"><i class="ph ph-robot"></i></div>
            <div class="message-content">
                <p>Chat cleared. What would you like to work on? 🎬</p>
                <span class="message-time">Now</span>
            </div>
        </div>`;
}

function switchView(viewName) {
    document.querySelectorAll(".view-container").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const view = document.getElementById(viewName + "-view");
    const nav  = document.querySelector(`[data-view="${viewName}"]`);
    if (view) view.classList.add("active");
    if (nav)  nav.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});

function showLoading(prefix) {
    const loading     = document.getElementById(prefix + "-loading");
    const placeholder = document.getElementById(prefix + "-placeholder");
    const result      = document.getElementById(prefix + "-result");

    if (loading)     loading.style.display = "flex";
    if (placeholder) placeholder.style.display = "none";
    if (result)      result.textContent = "";
}

function hideLoading(prefix) {
    const loading = document.getElementById(prefix + "-loading");
    if (loading) loading.style.display = "none";
}

function showResult(prefix, text) {
    const placeholder = document.getElementById(prefix + "-placeholder");
    const result      = document.getElementById(prefix + "-result");
    if (placeholder) placeholder.style.display = "none";
    if (result) {
        result.textContent = text;
        result.style.display = "block";
    }
}

function copyResult(elementId) {
    const el = document.getElementById(elementId);
    if (!el || !el.textContent.trim()) {
        showToast("Nothing to copy yet.", "error");
        return;
    }
    navigator.clipboard.writeText(el.textContent)
        .then(() => showToast("Copied to clipboard!", "success"))
        .catch(() => showToast("Copy failed.", "error"));
}

function showToast(message, type = "") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show " + type;
    setTimeout(() => { toast.className = "toast"; }, 3500);
}

function appendChatMessage(role, text) {
    const container = document.getElementById("chat-messages");
    const isAI = role === "ai";
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const div = document.createElement("div");
    div.className = `chat-message ${isAI ? "ai-message" : "user-message"}`;
    div.innerHTML = `
        <div class="message-avatar">
            <i class="ph ${isAI ? "ph-robot" : "ph-user"}"></i>
        </div>
        <div class="message-content">
            <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
            <span class="message-time">${now}</span>
        </div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById("chat-messages");
    const id = "typing-" + Date.now();
    const div = document.createElement("div");
    div.className = "chat-message ai-message typing-indicator";
    div.id = id;
    div.innerHTML = `
        <div class="message-avatar"><i class="ph ph-robot"></i></div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

async function runAI() {
    const input  = document.getElementById("inputText");
    const output = document.getElementById("output");
    if (!input || !output) return;

    output.textContent = "Generating...";
    try {
        const result = await callx(input.value, "You are a creative movie idea generator.");
        output.textContent = result;
    } catch (e) {
        output.textContent = "Error: " + e.message;
    }
}
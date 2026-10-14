const vm = require('vm');
const windowsController = require('./windows');
const androidController = require('./android');

/**
 * F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth)
 * Advanced Multi-Tier Cognitive Tactical Engine (Mark LXXXV)
 * Modeled directly after Tony Stark's AI operating system.
 */
class FridayAgent {
    constructor() {
        this.name = 'F.R.I.D.A.Y.';
        // Conversation memory (sliding window of recent turns)
        this.history = [];
        this.maxHistory = 10;
        this.userName = 'Boss';
    }

    /**
     * Record interaction to conversation memory
     */
    recordHistory(userText, agentText) {
        this.history.push({ role: 'user', content: userText });
        this.history.push({ role: 'assistant', content: agentText });
        if (this.history.length > this.maxHistory * 2) {
            this.history = this.history.slice(-this.maxHistory * 2);
        }
    }

    /**
     * Main Command & Query Processor
     */
    async processCommand(rawInput, context = {}) {
        const text = rawInput.trim();
        // Clean away wake-word prefixes
        const lower = text.toLowerCase()
            .replace(/^(hey|hi|hello|ok|okay|yo)?\s*(friday|f\.r\.i\.d\.a\.y\.)[,!?]?\s*/i, '')
            .trim();

        const logEntry = {
            input: rawInput,
            cleaned: lower,
            timestamp: new Date().toISOString(),
            action: null,
            speechResponse: null,
            data: null,
            keepListening: false
        };

        // ==================== 0. WAKE-WORD / AMBIENT CALL ====================
        if (!lower || /^(hey|hello|hi|good morning|good afternoon|good evening|wake up|are you there|standby)$/i.test(lower)) {
            const greetings = [
                "Yes, Boss?",
                "Standing by, Boss.",
                "Online and fully armed. Go ahead.",
                "Tactical core ready, Boss. What do you need?",
                "At your command, Boss."
            ];
            logEntry.action = 'wake_greeting';
            logEntry.speechResponse = greetings[Math.floor(Math.random() * greetings.length)];
            logEntry.keepListening = true;
            return logEntry;
        }

        // ==================== 1. STARK SIGNATURE PROTOCOLS ====================
        // Barn Burner / Dev Suite
        if (/(barn burner|house party protocol|developer protocol|dev mode|workstation protocol|deploy workstations)/i.test(lower)) {
            windowsController.launchApp('code');
            windowsController.launchApp('chrome');
            windowsController.launchApp('spotify');
            windowsController.launchApp('wt');
            logEntry.action = 'stark_protocol_barn_burner';
            logEntry.speechResponse = "Barn Burner protocol engaged. All tactical workstations deployed.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Clean Slate Protocol (System hygiene: DNS flush, recycle bin clear, window minimize)
        if (/(clean slate protocol|clean slate|purge cache|system clean)/i.test(lower)) {
            windowsController.emptyRecycleBin();
            windowsController.flushDns();
            windowsController.minimizeAllWindows();
            logEntry.action = 'stark_protocol_clean_slate';
            logEntry.speechResponse = "Clean Slate protocol authorized. Memory cache purged and workstation cleared.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Stealth Mode / Silent Running
        if (/(stealth mode|silent mode|run silent|be quiet|hush|silence mode)/i.test(lower)) {
            windowsController.volumeMute();
            windowsController.minimizeAllWindows();
            logEntry.action = 'stark_protocol_stealth';
            logEntry.speechResponse = "Stealth mode active. Running silent.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Combat Mode / Red Alert
        if (/(combat mode|red alert|mark lxxxv armor up|shields up|defense mode)/i.test(lower)) {
            windowsController.volumeUp(6);
            logEntry.action = 'stark_protocol_combat';
            logEntry.speechResponse = "Red alert. Combat protocols online. Nanotech shields charged to maximum capacity.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Sentry Mode / Security Watch
        if (/(sentry mode|security watch|intruder alert|scan surroundings)/i.test(lower)) {
            const snap = await windowsController.captureScreen();
            logEntry.action = 'stark_protocol_sentry';
            logEntry.speechResponse = "Sentry mode initialized. Desktop visual captured and perimeter scanned. All clear.";
            logEntry.data = snap;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Rock Music / AC/DC Stark Signature
        if (/(rock music|ac dc|back in black|iron man music|play rock|shoot to thrill)/i.test(lower)) {
            windowsController.openUrl('https://www.youtube.com/results?search_query=AC%2FDC+Back+In+Black');
            logEntry.action = 'stark_play_rock';
            logEntry.speechResponse = "Deploying classic rock, Boss.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Goodnight Boss / Standby Protocol
        if (/(goodnight|stand down|sleep workstation|put pc to sleep|shut it down friday)/i.test(lower)) {
            windowsController.volumeMute();
            windowsController.minimizeAllWindows();
            setTimeout(() => windowsController.lockWorkstation(), 1200);
            logEntry.action = 'stark_protocol_goodnight';
            logEntry.speechResponse = "Standing down. Workstation secured. Goodnight, Boss.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // ==================== 2. WINDOWS WORKSPACE AUTOMATION ====================
        // Screenshots / Desktop Visuals
        if (/(take a screenshot|capture screen|screenshot|screen capture|grab screen)/i.test(lower)) {
            const snap = await windowsController.captureScreen();
            logEntry.action = 'win_screenshot';
            logEntry.speechResponse = "Screen captured, Boss. Displaying visual on tactical HUD.";
            logEntry.data = snap;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // Minimize all windows / Show Desktop
        if (/(minimize all|show desktop|clear screen|hide windows)/i.test(lower)) {
            windowsController.minimizeAllWindows();
            logEntry.action = 'win_minimize_all';
            logEntry.speechResponse = "Minimizing all windows.";
            return logEntry;
        }

        // Restore windows
        if (/(restore windows|show windows|undo minimize)/i.test(lower)) {
            windowsController.undoMinimizeAllWindows();
            logEntry.action = 'win_restore_all';
            logEntry.speechResponse = "Restoring active windows.";
            return logEntry;
        }

        // Close current window / active window
        if (/(close this|close window|exit window|kill window)/i.test(lower)) {
            windowsController.closeActiveWindow();
            logEntry.action = 'win_close_window';
            logEntry.speechResponse = "Closing active window.";
            return logEntry;
        }

        // Kill specific process
        const killMatch = lower.match(/(?:kill|terminate|force close|stop process)\s+([a-z0-9_\-\.]+)/i);
        if (killMatch) {
            const targetProcess = killMatch[1].trim();
            await windowsController.killProcess(targetProcess);
            logEntry.action = 'win_kill_process';
            logEntry.speechResponse = `Terminating process ${targetProcess}.`;
            return logEntry;
        }

        // Open specific user folders
        const folderMatch = lower.match(/open\s+(downloads|documents|desktop|pictures|videos|music|project)\s*(folder)?/i);
        if (folderMatch) {
            const folderName = folderMatch[1];
            windowsController.openFolder(folderName);
            logEntry.action = 'win_open_folder';
            logEntry.speechResponse = `Opening ${folderName} folder.`;
            return logEntry;
        }

        // Clipboard read / write
        if (/(what('s| is) on my clipboard|read clipboard|check clipboard)/i.test(lower)) {
            const clip = await windowsController.getClipboard();
            logEntry.action = 'win_read_clipboard';
            if (clip && clip.trim()) {
                const preview = clip.trim().substring(0, 100);
                logEntry.speechResponse = `Clipboard reads: ${preview}`;
                logEntry.data = { clipboard: clip };
            } else {
                logEntry.speechResponse = "Clipboard is currently empty, Boss.";
            }
            return logEntry;
        }

        // Volume percentage: "set volume to 80" / "volume 50 percent"
        const volPctMatch = lower.match(/(?:set volume to|volume to|volume)\s+(\d{1,3})\s*(%|percent)?/i);
        if (volPctMatch) {
            const pct = parseInt(volPctMatch[1], 10);
            windowsController.setVolumePercent(pct);
            logEntry.action = 'win_volume_percent';
            logEntry.speechResponse = `Volume adjusted to ${pct} percent.`;
            return logEntry;
        }

        // Volume relative controls
        if (/(volume up|turn (it|the volume) up|louder|crank it)/i.test(lower)) {
            windowsController.volumeUp(5);
            logEntry.action = 'win_volume_up';
            logEntry.speechResponse = "Volume up.";
            return logEntry;
        }

        if (/(volume down|turn (it|the volume) down|lower volume|quieter|soften)/i.test(lower)) {
            windowsController.volumeDown(5);
            logEntry.action = 'win_volume_down';
            logEntry.speechResponse = "Volume down.";
            return logEntry;
        }

        if (/(mute|unmute|toggle audio|silence audio)/i.test(lower)) {
            windowsController.volumeMute();
            logEntry.action = 'win_volume_mute';
            logEntry.speechResponse = "Audio toggled.";
            return logEntry;
        }

        // Media controls
        if (/(pause|resume|play pause|toggle music|toggle playback)/i.test(lower)) {
            windowsController.mediaPlayPause();
            logEntry.action = 'win_media_playpause';
            logEntry.speechResponse = "Toggling playback.";
            return logEntry;
        }

        if (/(next track|next song|skip song|skip track)/i.test(lower)) {
            windowsController.mediaNext();
            logEntry.action = 'win_media_next';
            logEntry.speechResponse = "Next track.";
            return logEntry;
        }

        if (/(previous track|previous song|last song)/i.test(lower)) {
            windowsController.mediaPrev();
            logEntry.action = 'win_media_prev';
            logEntry.speechResponse = "Previous track.";
            return logEntry;
        }

        // Lock Workstation
        if (/(lock (my )?(pc|screen|workstation|computer)|lockdown)/i.test(lower)) {
            logEntry.action = 'win_lock';
            logEntry.speechResponse = "Locking workstation.";
            setTimeout(() => windowsController.lockWorkstation(), 800);
            return logEntry;
        }

        // ==================== 3. ANDROID MOBILE ARSENAL ====================
        // Unlock Phone
        if (/(unlock (my )?phone|wake up (my )?phone|wake phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.unlockDevice(devices[0].serial);
                logEntry.action = 'android_unlock';
                logEntry.speechResponse = "Unlocking mobile unit.";
                return logEntry;
            } else {
                logEntry.action = 'android_no_device';
                logEntry.speechResponse = "No Android unit linked, Boss.";
                return logEntry;
            }
        }

        // Lock Phone
        if (/(lock (my )?phone|sleep phone|turn off phone screen)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.lockDevice(devices[0].serial);
                logEntry.action = 'android_lock';
                logEntry.speechResponse = "Mobile screen locked.";
                return logEntry;
            }
        }

        // Phone Camera
        if (/(open camera on phone|phone camera|launch camera on phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.openCamera(devices[0].serial);
                logEntry.action = 'android_camera';
                logEntry.speechResponse = "Opening camera on mobile unit.";
                return logEntry;
            }
        }

        // Phone Flashlight
        if (/(flashlight on phone|phone flashlight|turn on phone torch|toggle flashlight)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.toggleFlashlight(devices[0].serial);
                logEntry.action = 'android_flashlight';
                logEntry.speechResponse = "Toggling mobile flashlight.";
                return logEntry;
            }
        }

        // Phone Home / Back
        if (/(phone home|go home on phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.sendKey(devices[0].serial, 'home');
                logEntry.action = 'android_key_home';
                logEntry.speechResponse = "Mobile home screen.";
                return logEntry;
            }
        }

        // Phone Call
        const callMatch = lower.match(/(?:call|dial)\s+([0-9+*#\s]{3,})/i);
        if (callMatch) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                const phoneNum = callMatch[1].trim();
                androidController.makeCall(devices[0].serial, phoneNum);
                logEntry.action = 'android_call';
                logEntry.speechResponse = `Initiating call to ${phoneNum}.`;
                return logEntry;
            }
        }

        // ==================== 4. LIVE TOOLS: WEATHER (NO API KEY NEEDED) ====================
        if (/(weather|forecast|temperature|how('s| is) the weather)/i.test(lower)) {
            const cityMatch = lower.match(/\b(?:in|for|at)\b\s+([a-z\s]+)/i);
            const cityName = cityMatch ? cityMatch[1].trim() : 'New York';
            const weatherData = await this.fetchLiveWeather(cityName);
            logEntry.action = 'live_weather';
            if (weatherData) {
                logEntry.speechResponse = `Currently in ${weatherData.city}, it is ${weatherData.temp}°C, with wind speeds at ${weatherData.wind} kilometers per hour. ${weatherData.condition}.`;
                logEntry.data = weatherData;
            } else {
                logEntry.speechResponse = `Could not pull atmospheric telemetry for ${cityName}, Boss.`;
            }
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // ==================== 5. LIVE TOOLS: MATH & CALCULATOR ====================
        if (/^(calculate|what is|compute|solve)?\s*([0-9\.\s+\-*/()x%]+(times|plus|minus|divided by|percent of|\*|\+|\/|-)[0-9\.\s+\-*/()x%]+)$/i.test(lower) ||
            /(what is|calculate|solve)\s+([0-9\s+\-*/x%]+)/i.test(lower)) {
            const mathResult = this.evaluateMath(lower);
            if (mathResult !== null) {
                logEntry.action = 'math_calculate';
                logEntry.speechResponse = `The result is ${mathResult}, Boss.`;
                logEntry.data = { expression: lower, result: mathResult };
                this.recordHistory(text, logEntry.speechResponse);
                return logEntry;
            }
        }

        // ==================== 6. APP & SEARCH ROUTERS ====================
        // YouTube Query
        if (/^(youtube)\s*(for|about)?\s*/i.test(lower) || lower.startsWith('play on youtube')) {
            const query = lower.replace(/^(youtube|play on youtube)\s*(for|about)?\s*/i, '').trim();
            if (query) {
                windowsController.openUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
                logEntry.action = 'win_open_youtube';
                logEntry.speechResponse = `Searching YouTube for ${query}.`;
            } else {
                windowsController.openUrl('https://www.youtube.com');
                logEntry.action = 'win_open_youtube';
                logEntry.speechResponse = "Opening YouTube.";
            }
            return logEntry;
        }

        // Google Web Search
        if (/^(google|search|search for)\s+/i.test(lower)) {
            const query = lower.replace(/^(google|search|search for)\s*/i, '').trim();
            windowsController.openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
            logEntry.action = 'win_web_search';
            logEntry.speechResponse = `Executing web search for ${query}.`;
            return logEntry;
        }

        // Instant App Launcher
        const appMatch = lower.match(/^(?:open|launch|start)\s+([a-z0-9_\-\.\s]+)/i);
        if (appMatch) {
            const target = appMatch[1].trim();

            // Mobile app dispatch
            if (target.includes('on phone') || target.includes('on android') || target.includes('on mobile')) {
                const phoneApp = target.replace(/\s*(on phone|on android|on mobile)\s*/gi, '').trim();
                const devices = await androidController.getConnectedDevices();
                if (devices.length > 0) {
                    androidController.launchApp(devices[0].serial, phoneApp);
                    logEntry.action = 'android_launch_app';
                    logEntry.speechResponse = `Deploying ${phoneApp} on mobile.`;
                    return logEntry;
                } else {
                    logEntry.action = 'android_no_device';
                    logEntry.speechResponse = "No Android unit linked, Boss.";
                    return logEntry;
                }
            }

            windowsController.launchApp(target);
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = `Opening ${target}.`;
            return logEntry;
        }

        // ==================== 7. TELEMETRY & SYSTEM REPORTS ====================
        if (/(battery|power level|charge|power cell)/i.test(lower)) {
            const metrics = await windowsController.getSystemMetrics();
            let responseText = "";
            if (metrics.battery.level !== null) {
                responseText = `Power cell at ${metrics.battery.level} percent${metrics.battery.isCharging ? ', charging' : ''}.`;
            } else {
                responseText = "Main power connected to AC mains.";
            }

            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                const phoneBat = await androidController.getDeviceBattery(devices[0].serial);
                if (phoneBat && phoneBat.level !== null) {
                    responseText += ` Mobile unit at ${phoneBat.level} percent.`;
                }
            }

            logEntry.action = 'check_battery';
            logEntry.speechResponse = responseText;
            logEntry.data = metrics;
            return logEntry;
        }

        if (/(diagnostic|system report|briefing|scan systems|tactical report|status report)/i.test(lower)) {
            const metrics = await windowsController.getSystemMetrics();
            const devices = await androidController.getConnectedDevices();
            logEntry.action = 'full_briefing';
            logEntry.speechResponse = `Tactical scan: CPU at ${metrics.cpuPercent} percent, RAM at ${metrics.memory.percent} percent. ${devices.length} Android unit${devices.length === 1 ? '' : 's'} linked. All systems combat-ready.`;
            logEntry.data = { metrics, devices };
            return logEntry;
        }

        if (/(what time is it|current time|tell me the time|time)/i.test(lower)) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            logEntry.action = 'get_time';
            logEntry.speechResponse = `It is ${timeStr}, Boss.`;
            return logEntry;
        }

        // ==================== 8. COGNITIVE LLM / KNOWLEDGE ENGINE ====================
        // If an API key is available (Gemini / Groq / OpenAI), call the LLM!
        const llmResponse = await this.queryLlmIfAvailable(text);
        if (llmResponse) {
            logEntry.action = 'llm_generation';
            logEntry.speechResponse = llmResponse;
            this.recordHistory(text, llmResponse);
            return logEntry;
        }

        // Live Knowledge Fallback (Wikipedia / DuckDuckGo instant answer)
        const knowledgeResponse = await this.fetchInstantKnowledge(lower);
        if (knowledgeResponse) {
            logEntry.action = 'instant_knowledge';
            logEntry.speechResponse = knowledgeResponse;
            this.recordHistory(text, knowledgeResponse);
            return logEntry;
        }

        // Authentic Stark F.R.I.D.A.Y. Tactical Fallback
        const fallbackReplies = [
            `Tactical core standing by. Ready for your next directive, Boss.`,
            `Telemetry recorded. Awaiting instructions.`,
            `Understood, Boss. What's our next move?`
        ];
        logEntry.action = 'general_response';
        logEntry.speechResponse = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        this.recordHistory(text, logEntry.speechResponse);
        return logEntry;
    }

    /**
     * Safe Math Evaluation using Node's sandboxed VM
     */
    evaluateMath(expr) {
        try {
            let sanitized = expr
                .replace(/^(what is|calculate|compute|solve)\s+/i, '')
                .replace(/times/gi, '*')
                .replace(/multiplied by/gi, '*')
                .replace(/divided by/gi, '/')
                .replace(/plus/gi, '+')
                .replace(/minus/gi, '-')
                .replace(/percent of/gi, '* 0.01 *')
                .replace(/%/gi, '* 0.01')
                .replace(/x/gi, '*')
                .replace(/[^0-9+\-*/().\s]/g, '')
                .trim();

            if (!sanitized || !/[0-9]/.test(sanitized)) return null;

            const result = vm.runInNewContext(sanitized, {}, { timeout: 100 });
            if (typeof result === 'number' && !isNaN(result)) {
                return Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
            }
        } catch {
            return null;
        }
        return null;
    }

    /**
     * Live Weather from Open-Meteo (100% Free, Zero API Key Required)
     */
    async fetchLiveWeather(city) {
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { signal: AbortSignal.timeout(5000) });
            const geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) return null;

            const { latitude, longitude, name, country } = geoData.results[0];
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`, { signal: AbortSignal.timeout(5000) });
            const weatherData = await weatherRes.json();
            if (!weatherData.current_weather) return null;

            const curr = weatherData.current_weather;
            const weatherCodes = {
                0: 'Clear skies',
                1: 'Mainly clear',
                2: 'Partly cloudy',
                3: 'Overcast',
                45: 'Foggy',
                48: 'Depositing rime fog',
                51: 'Light drizzle',
                61: 'Slight rain',
                63: 'Moderate rain',
                65: 'Heavy rain',
                71: 'Slight snowfall',
                73: 'Moderate snowfall',
                75: 'Heavy snowfall',
                80: 'Rain showers',
                95: 'Thunderstorm'
            };

            return {
                city: `${name}, ${country || ''}`.trim(),
                temp: Math.round(curr.temperature),
                wind: Math.round(curr.windspeed),
                condition: weatherCodes[curr.weathercode] || 'Clear conditions'
            };
        } catch {
            return null;
        }
    }

    /**
     * Instant Knowledge from Wikipedia & DuckDuckGo (Zero API Key Required)
     */
    async fetchInstantKnowledge(query) {
        try {
            const clean = query
                .replace(/^(who is|who was|what is|what are|tell me about|explain|describe)\s+/i, '')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .trim();

            if (!clean || clean.length < 2) return null;

            // 1. Try Wikipedia Summary API
            const wikiTopic = clean.replace(/\s+/g, '_');
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTopic)}`, {
                headers: { 'User-Agent': 'FridayAI/1.0 (StarkCore)' },
                signal: AbortSignal.timeout(4000)
            });

            if (wikiRes.ok) {
                const wikiData = await wikiRes.json();
                if (wikiData.extract) {
                    // Extract first 2 sentences for rapid voice response
                    const sentences = wikiData.extract.match(/[^.!?]+[.!?]+/g) || [wikiData.extract];
                    const brief = sentences.slice(0, 2).join(' ').trim();
                    return `${brief}`;
                }
            }

            // 2. Fallback to DuckDuckGo Instant Answer API
            const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(clean)}&format=json&no_html=1&skip_disambig=1`, {
                signal: AbortSignal.timeout(4000)
            });
            if (ddgRes.ok) {
                const ddgData = await ddgRes.json();
                if (ddgData.AbstractText) {
                    const sentences = ddgData.AbstractText.match(/[^.!?]+[.!?]+/g) || [ddgData.AbstractText];
                    return sentences.slice(0, 2).join(' ').trim();
                }
            }
        } catch {
            return null;
        }
        return null;
    }

    /**
     * Query Frontier LLMs if API key is provided (Gemini, Groq, OpenAI, Ollama)
     */
    async queryLlmIfAvailable(userText) {
        const systemPrompt = `You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), Tony Stark's Mark LXXXV tactical AI assistant.
Speak with a subtle Irish cadence, referring to the user as "Boss".
Be exceptionally sharp, witty, tactical, and brilliant.
Keep spoken responses concise (1 to 3 sentences maximum) so speech synthesis speaks rapidly without lag.`;

        // 1. Google Gemini API
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: `${systemPrompt}\n\nBoss says: "${userText}"` }] }
                        ],
                        generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
                    }),
                    signal: AbortSignal.timeout(4000)
                });
                if (res.ok) {
                    const data = await res.json();
                    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (reply) return reply.trim();
                }
            } catch (e) {
                console.warn('[F.R.I.D.A.Y.] Gemini API fallback:', e.message);
            }
        }

        // 2. Groq Cloud API (Ultra-fast Llama 3)
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqKey}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...this.history.slice(-4),
                            { role: 'user', content: userText }
                        ],
                        max_tokens: 150,
                        temperature: 0.7
                    }),
                    signal: AbortSignal.timeout(4000)
                });
                if (res.ok) {
                    const data = await res.json();
                    const reply = data?.choices?.[0]?.message?.content;
                    if (reply) return reply.trim();
                }
            } catch (e) {
                console.warn('[F.R.I.D.A.Y.] Groq API fallback:', e.message);
            }
        }

        // 3. OpenAI API
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...this.history.slice(-4),
                            { role: 'user', content: userText }
                        ],
                        max_tokens: 150,
                        temperature: 0.7
                    }),
                    signal: AbortSignal.timeout(4000)
                });
                if (res.ok) {
                    const data = await res.json();
                    const reply = data?.choices?.[0]?.message?.content;
                    if (reply) return reply.trim();
                }
            } catch (e) {
                console.warn('[F.R.I.D.A.Y.] OpenAI API fallback:', e.message);
            }
        }

        // 4. Local Ollama API (Offline AI)
        const ollamaHost = process.env.OLLAMA_HOST || (process.env.USE_OLLAMA === 'true' ? 'http://localhost:11434' : null);
        if (ollamaHost) {
            try {
                const res = await fetch(`${ollamaHost}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama3.2',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...this.history.slice(-4),
                            { role: 'user', content: userText }
                        ],
                        stream: false
                    }),
                    signal: AbortSignal.timeout(4000)
                });
                if (res.ok) {
                    const data = await res.json();
                    const reply = data?.message?.content;
                    if (reply) return reply.trim();
                }
            } catch {}
        }

        return null;
    }
}

module.exports = new FridayAgent();

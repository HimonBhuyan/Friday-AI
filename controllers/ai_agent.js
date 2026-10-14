const vm = require('vm');
const fs = require('fs');
const path = require('path');
const os = require('os');
const windowsController = require('./windows');
const androidController = require('./android');

/**
 * F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth)
 * Mark LXXXV Next-Gen Cognitive Tactical Engine
 * Enhanced with Persistent Memory, Vision Analysis, Multi-Action Chaining,
 * Financial Intelligence, Live Atmospheric Telemetry, and Autonomous Tool Execution.
 */
class FridayAgent {
    constructor() {
        this.name = 'F.R.I.D.A.Y.';
        this.memoryPath = path.join(__dirname, '..', 'data', 'memory.json');
        this.memory = this.loadMemory();
        this.maxHistory = 10;
        this.activeTimers = [];
        this.onTimerAlert = null; // Bound by server.js to broadcast timer events
    }

    /**
     * Load persistent memory from disk
     */
    loadMemory() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                const raw = fs.readFileSync(this.memoryPath, 'utf8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[F.R.I.D.A.Y.] Memory load notice:', e.message);
        }
        return {
            userName: 'Boss',
            notes: [],
            preferences: { defaultCity: 'New York', voiceSpeed: 1.0 },
            history: []
        };
    }

    /**
     * Save memory to disk
     */
    saveMemory() {
        try {
            const dir = path.dirname(this.memoryPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.memoryPath, JSON.stringify(this.memory, null, 2), 'utf8');
        } catch (e) {
            console.error('[F.R.I.D.A.Y.] Memory save error:', e.message);
        }
    }

    getUserTitle() {
        return this.memory.userName || 'Boss';
    }

    recordHistory(userText, agentText) {
        if (!this.memory.history) this.memory.history = [];
        this.memory.history.push({ role: 'user', content: userText });
        this.memory.history.push({ role: 'assistant', content: agentText });
        if (this.memory.history.length > this.maxHistory * 2) {
            this.memory.history = this.memory.history.slice(-this.maxHistory * 2);
        }
        this.saveMemory();
    }

    /**
     * Top-Level Command Router with Multi-Action Chaining
     */
    async processCommand(rawInput, context = {}) {
        const text = rawInput.trim();
        const boss = this.getUserTitle();

        // 1. Clean wake word
        const lower = text.toLowerCase()
            .replace(/^(hey|hi|hello|ok|okay|yo)?\s*(friday|f\.r\.i\.d\.a\.y\.)[,!?]?\s*/i, '')
            .trim();

        // 2. Multi-Action Intent Decomposition (e.g., "mute the volume and open chrome")
        // Don't split if this is a web search, question, or calculation
        const isQuery = /^(who|what|where|when|why|how|calculate|search|google|youtube|explain|tell me)\b/i.test(lower);
        if (!isQuery && /\s+(?:and then|and|then)\s+/i.test(lower)) {
            const subCommands = lower.split(/\s+(?:and then|and|then)\s+/i).filter(Boolean);
            if (subCommands.length > 1) {
                const results = [];
                for (const sub of subCommands) {
                    const res = await this.executeSingleIntent(sub, rawInput, context);
                    if (res && res.action !== 'general_response' && res.action !== 'instant_knowledge') {
                        results.push(res);
                    }
                }
                if (results.length > 1) {
                    const speech = results.map(r => r.speechResponse.replace(/\bBoss\b|\bTony\b|[.!?]/gi, '').trim())
                        .filter(Boolean)
                        .join(', and ') + `, ${boss}.`;
                    
                    const combined = {
                        input: rawInput,
                        cleaned: lower,
                        timestamp: new Date().toISOString(),
                        action: 'multi_compound_action',
                        speechResponse: speech,
                        data: results.map(r => r.data),
                        keepListening: false
                    };
                    this.recordHistory(text, speech);
                    return combined;
                }
            }
        }

        return await this.executeSingleIntent(lower, rawInput, context);
    }

    /**
     * Single Intent Execution Matrix
     */
    async executeSingleIntent(lower, rawInput, context = {}) {
        const boss = this.getUserTitle();
        const text = rawInput.trim();

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
                `Yes, ${boss}?`,
                `Standing by, ${boss}.`,
                `Online and fully armed. Go ahead.`,
                `Tactical core ready, ${boss}. What do you need?`,
                `At your command, ${boss}.`
            ];
            logEntry.action = 'wake_greeting';
            logEntry.speechResponse = greetings[Math.floor(Math.random() * greetings.length)];
            logEntry.keepListening = true;
            return logEntry;
        }

        // ==================== 1. USER IDENTITY & PERSONALIZATION ====================
        const nameMatch = lower.match(/(?:call me|my name is|set my name to)\s+([a-z0-9_-]+)/i);
        if (nameMatch) {
            const newName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
            this.memory.userName = newName;
            this.saveMemory();
            logEntry.action = 'set_user_name';
            logEntry.speechResponse = `Acknowledged. I will address you as ${newName} from now on.`;
            return logEntry;
        }

        // ==================== 2. TACTICAL NOTES & MEMO PAD ====================
        const noteAddMatch = lower.match(/(?:take a note|add a note|save note|note that|new note)\s*[:\-]?\s*(.+)/i);
        if (noteAddMatch) {
            const noteContent = noteAddMatch[1].trim();
            if (!this.memory.notes) this.memory.notes = [];
            const newNote = { id: Date.now(), text: noteContent, date: new Date().toLocaleDateString() };
            this.memory.notes.push(newNote);
            this.saveMemory();
            logEntry.action = 'add_note';
            logEntry.speechResponse = `Note logged: "${noteContent}", ${boss}.`;
            logEntry.data = newNote;
            return logEntry;
        }

        if (/(what are my notes|read (my )?notes|show (my )?notes|list (my )?notes)/i.test(lower)) {
            const notes = this.memory.notes || [];
            logEntry.action = 'read_notes';
            if (notes.length === 0) {
                logEntry.speechResponse = `Your tactical memo pad is currently empty, ${boss}.`;
            } else {
                const recent = notes.slice(-3).map((n, i) => `${i + 1}: ${n.text}`).join('. ');
                logEntry.speechResponse = `You have ${notes.length} note${notes.length === 1 ? '' : 's'}. Most recent: ${recent}.`;
                logEntry.data = notes;
            }
            return logEntry;
        }

        if (/(clear (my )?notes|delete (my )?notes|erase notes)/i.test(lower)) {
            this.memory.notes = [];
            this.saveMemory();
            logEntry.action = 'clear_notes';
            logEntry.speechResponse = `All tactical notes cleared, ${boss}.`;
            return logEntry;
        }

        // ==================== 3. TIMERS & REMINDERS ====================
        const timerMatch = lower.match(/(?:set a timer for|timer for|remind me in)\s+(\d+)\s*(second|seconds|sec|minute|minutes|min|hour|hours|hr)?(?:\s+(?:to|for)\s+(.+))?/i);
        if (timerMatch) {
            const val = parseInt(timerMatch[1], 10);
            const unit = timerMatch[2] ? timerMatch[2].toLowerCase() : 'seconds';
            const reminderTask = timerMatch[3] ? timerMatch[3].trim() : 'timer';
            let ms = val * 1000;
            if (unit.startsWith('min')) ms = val * 60 * 1000;
            else if (unit.startsWith('hour') || unit.startsWith('hr')) ms = val * 3600 * 1000;

            const timerId = Date.now();
            const timerObj = { id: timerId, val, unit, task: reminderTask };
            this.activeTimers.push(timerObj);

            setTimeout(() => {
                const alertMsg = `${boss}, your ${val} ${unit} timer for "${reminderTask}" has completed.`;
                if (typeof this.onTimerAlert === 'function') {
                    this.onTimerAlert({ message: alertMsg, val, unit, task: reminderTask });
                }
                windowsController.speak(alertMsg);
            }, ms);

            logEntry.action = 'set_timer';
            logEntry.speechResponse = `Timer set for ${val} ${unit}. I will notify you when it expires, ${boss}.`;
            logEntry.data = timerObj;
            return logEntry;
        }

        // ==================== 4. VISION & DESKTOP SCREEN ANALYSIS ====================
        if (/(what am i looking at|what's on my screen|what is on my screen|analyze (my )?screen|look at (this|my screen))/i.test(lower)) {
            const snap = await windowsController.captureScreen();
            logEntry.action = 'vision_screen_analysis';

            // Check if Gemini Vision is available
            const visionAnalysis = await this.analyzeScreenWithVision(snap);
            if (visionAnalysis) {
                logEntry.speechResponse = visionAnalysis;
            } else {
                logEntry.speechResponse = `Desktop visual captured and projected onto tactical HUD. All telemetry recorded, ${boss}.`;
            }
            logEntry.data = snap;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // ==================== 5. REAL-TIME CRYPTO & FINANCIAL TELEMETRY ====================
        const cryptoMatch = lower.match(/(?:price of|value of)\s+(bitcoin|btc|ethereum|eth|solana|sol|dogecoin|doge)/i);
        if (cryptoMatch) {
            const coin = cryptoMatch[1].toLowerCase();
            const coinMap = { btc: 'bitcoin', eth: 'ethereum', sol: 'solana', doge: 'dogecoin' };
            const coinId = coinMap[coin] || coin;
            const price = await this.fetchCryptoPrice(coinId);
            logEntry.action = 'crypto_price';
            if (price) {
                logEntry.speechResponse = `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} is currently trading at $${price.toLocaleString()} USD, ${boss}.`;
                logEntry.data = { coin: coinId, priceUsd: price };
            } else {
                logEntry.speechResponse = `Could not retrieve crypto index for ${coinId}, ${boss}.`;
            }
            return logEntry;
        }

        // Currency Exchange: e.g. "convert 100 usd to eur" or "100 usd in inr"
        const fxMatch = lower.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-z]{3})\s*(?:to|in)\s*([a-z]{3})/i);
        if (fxMatch) {
            const amount = parseFloat(fxMatch[1]);
            const from = fxMatch[2].toUpperCase();
            const to = fxMatch[3].toUpperCase();
            const converted = await this.convertCurrency(amount, from, to);
            logEntry.action = 'currency_convert';
            if (converted) {
                logEntry.speechResponse = `${amount} ${from} is currently ${converted.value.toLocaleString()} ${to}, ${boss}.`;
                logEntry.data = converted;
            } else {
                logEntry.speechResponse = `Unable to pull foreign exchange rates for ${from} to ${to}.`;
            }
            return logEntry;
        }

        // ==================== 6. NETWORK & PING TELEMETRY ====================
        if (/(check internet|network status|check ping|ping test|is the internet working|connection speed)/i.test(lower)) {
            const net = await windowsController.checkNetwork();
            logEntry.action = 'network_status';
            if (net.online) {
                logEntry.speechResponse = `Primary uplink online. Latency to gateway is ${net.ping}, ${boss}.`;
            } else {
                logEntry.speechResponse = `Network alert: primary internet gateway appears offline.`;
            }
            logEntry.data = net;
            return logEntry;
        }

        // System Uptime
        if (/(how long have (we|you) been running|system uptime|uptime)/i.test(lower)) {
            const uptime = os.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            logEntry.action = 'system_uptime';
            logEntry.speechResponse = `System has been online for ${hours} hour${hours === 1 ? '' : 's'} and ${minutes} minute${minutes === 1 ? '' : 's'}. Core telemetry nominal.`;
            return logEntry;
        }

        // ==================== 7. STARK SIGNATURE PROTOCOLS ====================
        if (/(barn burner|house party protocol|developer protocol|dev mode|workstation protocol)/i.test(lower)) {
            windowsController.launchApp('code');
            windowsController.launchApp('chrome');
            windowsController.launchApp('spotify');
            windowsController.launchApp('wt');
            logEntry.action = 'stark_protocol_barn_burner';
            logEntry.speechResponse = "Barn Burner protocol engaged. All tactical workstations deployed.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(clean slate protocol|clean slate|purge cache|system clean)/i.test(lower)) {
            windowsController.emptyRecycleBin();
            windowsController.flushDns();
            windowsController.minimizeAllWindows();
            logEntry.action = 'stark_protocol_clean_slate';
            logEntry.speechResponse = "Clean Slate protocol authorized. Memory cache purged and workstation cleared.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(stealth mode|silent mode|run silent|be quiet|hush|silence mode)/i.test(lower)) {
            windowsController.volumeMute();
            windowsController.minimizeAllWindows();
            logEntry.action = 'stark_protocol_stealth';
            logEntry.speechResponse = "Stealth mode active. Running silent.";
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(combat mode|red alert|mark lxxxv armor up|shields up|defense mode)/i.test(lower)) {
            windowsController.volumeUp(6);
            logEntry.action = 'stark_protocol_combat';
            logEntry.speechResponse = `Red alert. Combat protocols online. Nanotech shields charged to maximum capacity, ${boss}.`;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(sentry mode|security watch|intruder alert|scan surroundings)/i.test(lower)) {
            const snap = await windowsController.captureScreen();
            logEntry.action = 'stark_protocol_sentry';
            logEntry.speechResponse = `Sentry mode initialized. Desktop visual captured and perimeter scanned. All clear, ${boss}.`;
            logEntry.data = snap;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(rock music|ac dc|back in black|iron man music|play rock|shoot to thrill)/i.test(lower)) {
            windowsController.openUrl('https://www.youtube.com/results?search_query=AC%2FDC+Back+In+Black');
            logEntry.action = 'stark_play_rock';
            logEntry.speechResponse = `Deploying classic rock, ${boss}.`;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(goodnight|stand down|sleep workstation|put pc to sleep|shut it down friday)/i.test(lower)) {
            windowsController.volumeMute();
            windowsController.minimizeAllWindows();
            setTimeout(() => windowsController.lockWorkstation(), 1200);
            logEntry.action = 'stark_protocol_goodnight';
            logEntry.speechResponse = `Standing down. Workstation secured. Goodnight, ${boss}.`;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // ==================== 8. WINDOWS HARDWARE & WORKSPACE ARSENAL ====================
        if (/(take a screenshot|capture screen|screenshot|screen capture|grab screen)/i.test(lower)) {
            const snap = await windowsController.captureScreen();
            logEntry.action = 'win_screenshot';
            logEntry.speechResponse = `Screen captured, ${boss}. Displaying visual on tactical HUD.`;
            logEntry.data = snap;
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        if (/(minimize all|show desktop|clear screen|hide windows)/i.test(lower)) {
            windowsController.minimizeAllWindows();
            logEntry.action = 'win_minimize_all';
            logEntry.speechResponse = "Minimizing all windows.";
            return logEntry;
        }

        if (/(restore windows|show windows|undo minimize)/i.test(lower)) {
            windowsController.undoMinimizeAllWindows();
            logEntry.action = 'win_restore_all';
            logEntry.speechResponse = "Restoring active windows.";
            return logEntry;
        }

        if (/(close this|close window|exit window|kill window)/i.test(lower)) {
            windowsController.closeActiveWindow();
            logEntry.action = 'win_close_window';
            logEntry.speechResponse = "Closing active window.";
            return logEntry;
        }

        const killMatch = lower.match(/(?:kill|terminate|force close|stop process)\s+([a-z0-9_\-\.]+)/i);
        if (killMatch) {
            const targetProcess = killMatch[1].trim();
            await windowsController.killProcess(targetProcess);
            logEntry.action = 'win_kill_process';
            logEntry.speechResponse = `Terminating process ${targetProcess}.`;
            return logEntry;
        }

        const folderMatch = lower.match(/open\s+(downloads|documents|desktop|pictures|videos|music|project)\s*(folder)?/i);
        if (folderMatch) {
            const folderName = folderMatch[1];
            windowsController.openFolder(folderName);
            logEntry.action = 'win_open_folder';
            logEntry.speechResponse = `Opening ${folderName} folder.`;
            return logEntry;
        }

        if (/(what('s| is) on my clipboard|read clipboard|check clipboard)/i.test(lower)) {
            const clip = await windowsController.getClipboard();
            logEntry.action = 'win_read_clipboard';
            if (clip && clip.trim()) {
                const preview = clip.trim().substring(0, 100);
                logEntry.speechResponse = `Clipboard reads: ${preview}`;
                logEntry.data = { clipboard: clip };
            } else {
                logEntry.speechResponse = `Clipboard is currently empty, ${boss}.`;
            }
            return logEntry;
        }

        const volPctMatch = lower.match(/(?:set volume to|volume to|volume)\s+(\d{1,3})\s*(%|percent)?/i);
        if (volPctMatch) {
            const pct = parseInt(volPctMatch[1], 10);
            windowsController.setVolumePercent(pct);
            logEntry.action = 'win_volume_percent';
            logEntry.speechResponse = `Volume adjusted to ${pct} percent.`;
            return logEntry;
        }

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

        if (/(lock (my )?(pc|screen|workstation|computer)|lockdown)/i.test(lower)) {
            logEntry.action = 'win_lock';
            logEntry.speechResponse = "Locking workstation.";
            setTimeout(() => windowsController.lockWorkstation(), 800);
            return logEntry;
        }

        // ==================== 9. ANDROID MOBILE ARSENAL ====================
        if (/(unlock (my )?phone|wake up (my )?phone|wake phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.unlockDevice(devices[0].serial);
                logEntry.action = 'android_unlock';
                logEntry.speechResponse = "Unlocking mobile unit.";
                return logEntry;
            } else {
                logEntry.action = 'android_no_device';
                logEntry.speechResponse = `No Android unit linked, ${boss}.`;
                return logEntry;
            }
        }

        if (/(lock (my )?phone|sleep phone|turn off phone screen)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.lockDevice(devices[0].serial);
                logEntry.action = 'android_lock';
                logEntry.speechResponse = "Mobile screen locked.";
                return logEntry;
            }
        }

        if (/(open camera on phone|phone camera|launch camera on phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.openCamera(devices[0].serial);
                logEntry.action = 'android_camera';
                logEntry.speechResponse = "Opening camera on mobile unit.";
                return logEntry;
            }
        }

        if (/(flashlight on phone|phone flashlight|turn on phone torch|toggle flashlight)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.toggleFlashlight(devices[0].serial);
                logEntry.action = 'android_flashlight';
                logEntry.speechResponse = "Toggling mobile flashlight.";
                return logEntry;
            }
        }

        if (/(phone home|go home on phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.sendKey(devices[0].serial, 'home');
                logEntry.action = 'android_key_home';
                logEntry.speechResponse = "Mobile home screen.";
                return logEntry;
            }
        }

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

        // ==================== 10. LIVE WEATHER (ZERO API KEY) ====================
        if (/(weather|forecast|temperature|how('s| is) the weather)/i.test(lower)) {
            const cityMatch = lower.match(/\b(?:in|for|at)\b\s+([a-z\s]+)/i);
            const cityName = cityMatch ? cityMatch[1].trim() : (this.memory.preferences?.defaultCity || 'New York');
            const weatherData = await this.fetchLiveWeather(cityName);
            logEntry.action = 'live_weather';
            if (weatherData) {
                logEntry.speechResponse = `Currently in ${weatherData.city}, it is ${weatherData.temp}°C, with wind speeds at ${weatherData.wind} kilometers per hour. ${weatherData.condition}.`;
                logEntry.data = weatherData;
            } else {
                logEntry.speechResponse = `Could not pull atmospheric telemetry for ${cityName}, ${boss}.`;
            }
            this.recordHistory(text, logEntry.speechResponse);
            return logEntry;
        }

        // ==================== 11. MATH & PRECISION COMPUTATION ====================
        if (/^(calculate|what is|compute|solve)?\s*([0-9\.\s+\-*/()x%]+(times|plus|minus|divided by|percent of|\*|\+|\/|-)[0-9\.\s+\-*/()x%]+)$/i.test(lower) ||
            /(what is|calculate|solve)\s+([0-9\s+\-*/x%]+)/i.test(lower)) {
            const mathResult = this.evaluateMath(lower);
            if (mathResult !== null) {
                logEntry.action = 'math_calculate';
                logEntry.speechResponse = `The result is ${mathResult}, ${boss}.`;
                logEntry.data = { expression: lower, result: mathResult };
                this.recordHistory(text, logEntry.speechResponse);
                return logEntry;
            }
        }

        // ==================== 12. APP LAUNCHERS & SEARCH ====================
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

        if (/^(google|search|search for)\s+/i.test(lower)) {
            const query = lower.replace(/^(google|search|search for)\s*/i, '').trim();
            windowsController.openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
            logEntry.action = 'win_web_search';
            logEntry.speechResponse = `Executing web search for ${query}.`;
            return logEntry;
        }

        const appMatch = lower.match(/^(?:open|launch|start)\s+([a-z0-9_\-\.\s]+)/i);
        if (appMatch) {
            const target = appMatch[1].trim();

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
                    logEntry.speechResponse = `No Android unit linked, ${boss}.`;
                    return logEntry;
                }
            }

            windowsController.launchApp(target);
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = `Opening ${target}.`;
            return logEntry;
        }

        // ==================== 13. HARDWARE TELEMETRY & BRIEFING ====================
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
            logEntry.speechResponse = `Tactical scan: CPU at ${metrics.cpuPercent} percent, RAM at ${metrics.memory.percent} percent. ${devices.length} Android unit${devices.length === 1 ? '' : 's'} linked. All systems combat-ready, ${boss}.`;
            logEntry.data = { metrics, devices };
            return logEntry;
        }

        if (/(what time is it|current time|tell me the time|time)/i.test(lower)) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            logEntry.action = 'get_time';
            logEntry.speechResponse = `It is ${timeStr}, ${boss}.`;
            return logEntry;
        }

        // ==================== 14. COGNITIVE LLM WITH TOOL REASONING ====================
        const llmResponse = await this.queryLlmIfAvailable(text);
        if (llmResponse) {
            logEntry.action = 'llm_generation';
            logEntry.speechResponse = llmResponse;
            this.recordHistory(text, llmResponse);
            return logEntry;
        }

        // ==================== 15. INSTANT KNOWLEDGE FALLBACK ====================
        const knowledgeResponse = await this.fetchInstantKnowledge(lower);
        if (knowledgeResponse) {
            logEntry.action = 'instant_knowledge';
            logEntry.speechResponse = knowledgeResponse;
            this.recordHistory(text, knowledgeResponse);
            return logEntry;
        }

        // ==================== 16. AUTHENTIC TACTICAL REPLIES ====================
        const fallbackReplies = [
            `Tactical core standing by. Ready for your next directive, ${boss}.`,
            `Telemetry recorded. Awaiting instructions.`,
            `Understood, ${boss}. What's our next move?`,
            `Systems primed and online. Go ahead, ${boss}.`
        ];
        logEntry.action = 'general_response';
        logEntry.speechResponse = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        this.recordHistory(text, logEntry.speechResponse);
        return logEntry;
    }

    /**
     * Desktop Vision Analysis via Gemini 1.5 Flash Vision
     */
    async analyzeScreenWithVision(snap) {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return null;

        try {
            const screenshotPath = path.join(__dirname, '..', 'public', 'screenshots', 'desktop_snap.png');
            if (!fs.existsSync(screenshotPath)) return null;

            const imageBase64 = fs.readFileSync(screenshotPath).toString('base64');
            const prompt = `You are F.R.I.D.A.Y., Tony Stark's tactical AI assistant.
Analyze this desktop screenshot and give Tony a concise (maximum 2 sentences) tactical overview of what active application or code is visible. Address him as ${this.getUserTitle()}.`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: prompt },
                                { inlineData: { mimeType: 'image/png', data: imageBase64 } }
                            ]
                        }
                    ],
                    generationConfig: { maxOutputTokens: 120, temperature: 0.3 }
                }),
                signal: AbortSignal.timeout(6000)
            });

            if (res.ok) {
                const data = await res.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply) return reply.trim();
            }
        } catch (e) {
            console.warn('[F.R.I.D.A.Y.] Vision analysis notice:', e.message);
        }
        return null;
    }

    /**
     * Crypto Prices from CoinGecko Public API (Free, zero API key)
     */
    async fetchCryptoPrice(coinId) {
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
                signal: AbortSignal.timeout(4000)
            });
            if (res.ok) {
                const data = await res.json();
                return data[coinId]?.usd || null;
            }
        } catch {}
        return null;
    }

    /**
     * Currency Conversion via Open Exchange Rates (Free, zero API key)
     */
    async convertCurrency(amount, from, to) {
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
                signal: AbortSignal.timeout(4000)
            });
            if (res.ok) {
                const data = await res.json();
                const rate = data.rates?.[to];
                if (rate) {
                    const value = Math.round(amount * rate * 100) / 100;
                    return { from, to, amount, rate, value };
                }
            }
        } catch {}
        return null;
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
     * Live Weather from Open-Meteo
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
     * Instant Knowledge from Wikipedia & DuckDuckGo
     */
    async fetchInstantKnowledge(query) {
        try {
            const clean = query
                .replace(/^(who is|who was|what is|what are|tell me about|explain|describe)\s+/i, '')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .trim();

            if (!clean || clean.length < 2) return null;

            const wikiTopic = clean.replace(/\s+/g, '_');
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTopic)}`, {
                headers: { 'User-Agent': 'FridayAI/1.0 (StarkCore)' },
                signal: AbortSignal.timeout(4000)
            });

            if (wikiRes.ok) {
                const wikiData = await wikiRes.json();
                if (wikiData.extract) {
                    const sentences = wikiData.extract.match(/[^.!?]+[.!?]+/g) || [wikiData.extract];
                    return sentences.slice(0, 2).join(' ').trim();
                }
            }

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
     * Query LLMs if API key is provided
     */
    async queryLlmIfAvailable(userText) {
        const boss = this.getUserTitle();
        const systemPrompt = `You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), Tony Stark's Mark LXXXV tactical AI assistant.
Speak with a subtle Irish cadence, referring to the user as "${boss}".
Be exceptionally sharp, witty, tactical, and brilliant.
Keep spoken responses concise (1 to 3 sentences maximum) so speech synthesis speaks rapidly without lag.`;

        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${boss} says: "${userText}"` }] }
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
                console.warn('[F.R.I.D.A.Y.] Gemini API notice:', e.message);
            }
        }

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
                            ...(this.memory.history || []).slice(-4),
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
                console.warn('[F.R.I.D.A.Y.] Groq API notice:', e.message);
            }
        }

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
                            ...(this.memory.history || []).slice(-4),
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
                console.warn('[F.R.I.D.A.Y.] OpenAI API notice:', e.message);
            }
        }

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
                            ...(this.memory.history || []).slice(-4),
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

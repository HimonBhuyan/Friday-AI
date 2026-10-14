const windowsController = require('./windows');
const androidController = require('./android');

/**
 * F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth)
 * Tactical AI Engine modeled directly after Tony Stark's Mark LXXXV OS.
 */
class FridayAgent {
    constructor() {
        this.name = 'F.R.I.D.A.Y.';
    }

    async processCommand(rawInput, context = {}) {
        const text = rawInput.trim();
        // Clean away wake-word prefixes
        const lower = text.toLowerCase().replace(/^(hey|hi|hello|ok|okay|yo)?\s*(friday|f\.r\.i\.d\.a\.y\.)[,!?]?\s*/i, '').trim();

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
        if (!lower || /^(hey|hello|hi|good morning|good evening|wake up|are you there|standby)$/i.test(lower)) {
            const greetings = [
                "Yes, Boss?",
                "Standing by, Boss.",
                "Online. Go ahead.",
                "Tactical core ready, Boss."
            ];
            logEntry.action = 'wake_greeting';
            logEntry.speechResponse = greetings[Math.floor(Math.random() * greetings.length)];
            logEntry.keepListening = true;
            return logEntry;
        }

        // ==================== 1. STARK NAMED PROTOCOLS ====================
        // Barn Burner / House Party Protocol (Launches Full Developer & Workstation Suite)
        if (/(barn burner|house party|developer protocol|dev mode|work mode)/i.test(lower)) {
            windowsController.launchApp('code');
            windowsController.launchApp('chrome');
            windowsController.launchApp('spotify');
            windowsController.launchApp('wt');
            logEntry.action = 'stark_protocol_barn_burner';
            logEntry.speechResponse = "Barn Burner protocol engaged. All tactical workstations deployed.";
            return logEntry;
        }

        // Stealth Mode / Silent Running
        if (/(stealth mode|silent mode|run silent|be quiet|hush)/i.test(lower)) {
            windowsController.volumeMute();
            logEntry.action = 'stark_protocol_stealth';
            logEntry.speechResponse = "Stealth mode active. Running silent.";
            return logEntry;
        }

        // Clean Slate Protocol (System Clean / Clear)
        if (/(clean slate protocol|clean slate)/i.test(lower)) {
            logEntry.action = 'stark_protocol_clean_slate';
            logEntry.speechResponse = "Clean Slate protocol authorized.";
            return logEntry;
        }

        // Rock Music / AC/DC Stark Signature
        if (/(rock music|ac dc|back in black|iron man music|play rock|shoot to thrill)/i.test(lower)) {
            windowsController.openUrl('https://www.youtube.com/results?search_query=AC%2FDC+Back+In+Black');
            logEntry.action = 'stark_play_rock';
            logEntry.speechResponse = "Deploying classic rock, Boss.";
            return logEntry;
        }

        // ==================== 2. IDENTITY & STARK LORE ====================
        if (/^(who are you|introduce yourself|what is your name)/i.test(lower)) {
            logEntry.action = 'persona_identity';
            logEntry.speechResponse = "F.R.I.D.A.Y. Mark LXXXV tactical core. Standing by for Boss.";
            return logEntry;
        }

        if (/(who created you|who made you|who is your boss)/i.test(lower)) {
            logEntry.action = 'persona_creator';
            logEntry.speechResponse = "Designed by Tony Stark, Stark Industries. At your command.";
            return logEntry;
        }

        if (/(what suit is this|suit status|armor status)/i.test(lower)) {
            logEntry.action = 'persona_suit';
            logEntry.speechResponse = "Mark LXXXV nanotech platform. Telemetry nominal.";
            return logEntry;
        }

        // ==================== 3. AUDIO & MEDIA CONTROLS ====================
        if (/(volume up|turn (it|the volume) up|louder|crank it)/i.test(lower)) {
            windowsController.volumeUp(4);
            logEntry.action = 'win_volume_up';
            logEntry.speechResponse = "Volume up.";
            return logEntry;
        }

        if (/(volume down|turn (it|the volume) down|lower volume|quieter|soften)/i.test(lower)) {
            windowsController.volumeDown(4);
            logEntry.action = 'win_volume_down';
            logEntry.speechResponse = "Volume down.";
            return logEntry;
        }

        if (/(mute|silence|unmute)/i.test(lower)) {
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

        // ==================== 4. SECURITY & LOCKDOWN ====================
        if (/(lock (my )?(pc|screen|workstation|computer)|lockdown|red alert)/i.test(lower)) {
            logEntry.action = 'win_lock';
            logEntry.speechResponse = "Locking workstation.";
            setTimeout(() => windowsController.lockWorkstation(), 800);
            return logEntry;
        }

        // ==================== 5. INSTANT APP LAUNCHERS ====================
        if (/^(youtube)$/i.test(lower)) {
            windowsController.openUrl('https://www.youtube.com');
            logEntry.action = 'win_open_youtube';
            logEntry.speechResponse = "Opening YouTube.";
            return logEntry;
        }

        if (/^(spotify)$/i.test(lower)) {
            windowsController.launchApp('spotify');
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = "Opening Spotify.";
            return logEntry;
        }

        if (/^(calc|calculator)$/i.test(lower)) {
            windowsController.launchApp('calc');
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = "Opening Calculator.";
            return logEntry;
        }

        if (/^(notepad|notes)$/i.test(lower)) {
            windowsController.launchApp('notepad');
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = "Opening Notepad.";
            return logEntry;
        }

        if (/^(chrome|browser|google)$/i.test(lower)) {
            windowsController.launchApp('chrome');
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = "Opening Chrome.";
            return logEntry;
        }

        if (/^(code|vs code|visual studio)$/i.test(lower)) {
            windowsController.launchApp('code');
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = "Opening VS Code.";
            return logEntry;
        }

        if (/^(task manager|taskmgr)$/i.test(lower)) {
            windowsController.launchApp('taskmgr');
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = "Opening Task Manager.";
            return logEntry;
        }

        // Apps launched with 'open / launch / start'
        const appMatch = lower.match(/(?:open|launch|start|play)\s+([a-z0-9_\-\.\s]+)/i);
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

            // YouTube query
            if (target.startsWith('youtube')) {
                const query = target.replace(/^youtube\s*(for)?\s*/i, '').trim();
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

            // Search query
            if (target.startsWith('google') || target.startsWith('search')) {
                const query = target.replace(/^(google|search)\s*(for)?\s*/i, '').trim();
                windowsController.openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                logEntry.action = 'win_web_search';
                logEntry.speechResponse = `Searching for ${query}.`;
                return logEntry;
            }

            // Generic app launch
            windowsController.launchApp(target);
            logEntry.action = 'win_launch_app';
            logEntry.speechResponse = `Opening ${target}.`;
            return logEntry;
        }

        // ==================== 6. TELEMETRY & TACTICAL BRIEFS ====================
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

        // ==================== 7. ANDROID COMMANDS ====================
        if (/(unlock (my )?phone|wake up (my )?phone|wake phone)/i.test(lower)) {
            const devices = await androidController.getConnectedDevices();
            if (devices.length > 0) {
                androidController.unlockDevice(devices[0].serial);
                logEntry.action = 'android_unlock';
                logEntry.speechResponse = "Unlocking mobile unit.";
                return logEntry;
            } else {
                logEntry.action = 'android_no_device';
                logEntry.speechResponse = "No Android unit linked.";
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

        // Default Tactical Fallback
        logEntry.action = 'general_response';
        logEntry.speechResponse = `Understood Boss. Executing ${text}.`;
        return logEntry;
    }
}

module.exports = new FridayAgent();

/**
 * Stark Industries F.R.I.D.A.Y. HUD UI Orchestrator
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Audio Engine & Visualizer
    window.arcVisualizer.init('equalizerCanvas', 'reactorCore');

    // 2. Initialize Voice Engine
    window.voiceEngine.init();

    // 3. Connect WebSocket
    window.socketClient.connect();

    // 4. Setup HUD State Handling
    window.voiceEngine.onStateChange = (state) => {
        setHudState(state);
    };

    window.voiceEngine.onCommandDetected = (text) => {
        addTerminalLog(`USER VOICE: "${text}"`, 'user');
        window.socketClient.sendCommand(text);
    };

    window.socketClient.on('stateChange', (state) => {
        setHudState(state);
    });

    window.socketClient.on('commandResult', (res) => {
        if (res && res.speechResponse) {
            addTerminalLog(`FRIDAY: ${res.speechResponse}`, 'friday');
            window.voiceEngine.speak(res.speechResponse, res.keepListening || false);
        }
        if (res && res.action) {
            flashActionIndicator(res.action);
        }
    });

    window.socketClient.on('welcome', (msg) => {
        addTerminalLog(msg, 'system');
    });

    window.socketClient.on('telemetry', (metrics, devices) => {
        updateTelemetryUi(metrics);
        updateAndroidUi(devices, metrics?.localIp);
    });

    // 5. Setup Clock
    startClock();

    // 6. Setup Event Listeners
    setupControls();

    // 7. Pure Hands-Free Wake-Word Engine (Zero-Touch Auto-Start)
    const bootHandsFree = async () => {
        try {
            await window.voiceEngine.startListening(false);
            addTerminalLog("STARK CORE: Hands-Free Wake-Word Active. Listening for 'Hey Friday' or 'Friday'...", "system");
        } catch (e) {
            console.warn("[HandsFree] Auto-start notice:", e);
        }
    };

    // Auto-start hands-free listening immediately on load!
    setTimeout(bootHandsFree, 300);

    // Fallback: Also listen to any click or spacebar in case browser required interaction
    window.addEventListener('click', () => {
        if (!window.voiceEngine.isListening) bootHandsFree();
    }, { once: true });
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            if (!window.voiceEngine.isListening) bootHandsFree();
        }
    });
});

function setHudState(state) {
    const statusText = document.getElementById('reactorStatusText');
    const reactor = document.getElementById('starkArcReactor');

    if (statusText) statusText.textContent = state;
    if (reactor) {
        reactor.className = `arc-reactor ${state.toLowerCase()}`;
    }
    if (window.arcVisualizer) {
        window.arcVisualizer.setPulseState(state);
    }
}

function startClock() {
    const clockEl = document.getElementById('hudClock');
    const dateEl = document.getElementById('hudDate');
    const update = () => {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
    };
    update();
    setInterval(update, 1000);
}

// ---------------- Telemetry Rendering ----------------
function updateTelemetryUi(metrics) {
    if (!metrics) return;

    // CPU
    const cpuVal = document.getElementById('cpuVal');
    const cpuBar = document.getElementById('cpuBar');
    if (cpuVal) cpuVal.textContent = `${metrics.cpuPercent}%`;
    if (cpuBar) cpuBar.style.width = `${metrics.cpuPercent}%`;

    // Memory
    const ramVal = document.getElementById('ramVal');
    const ramBar = document.getElementById('ramBar');
    const ramDetail = document.getElementById('ramDetail');
    if (ramVal) ramVal.textContent = `${metrics.memory.percent}%`;
    if (ramBar) ramBar.style.width = `${metrics.memory.percent}%`;
    if (ramDetail) ramDetail.textContent = `${metrics.memory.usedGb} / ${metrics.memory.totalGb} GB`;

    // Battery
    const batVal = document.getElementById('batVal');
    const batBar = document.getElementById('batBar');
    const batState = document.getElementById('batState');
    if (metrics.battery.level !== null) {
        if (batVal) batVal.textContent = `${metrics.battery.level}%`;
        if (batBar) batBar.style.width = `${metrics.battery.level}%`;
        if (batState) batState.textContent = metrics.battery.isCharging ? 'CHARGING [AC]' : 'DISCHARGING';
    } else {
        if (batVal) batVal.textContent = 'AC MAINS';
        if (batBar) batBar.style.width = '100%';
        if (batState) batState.textContent = 'DIRECT POWER';
    }

    // Network IP & Platform
    const ipVal = document.getElementById('localIpVal');
    const hostVal = document.getElementById('hostVal');
    if (ipVal) ipVal.textContent = metrics.localIp;
    if (hostVal) hostVal.textContent = `${metrics.hostname} (${metrics.platform})`;

    // Mobile pairing link
    const mobileLink = document.getElementById('mobileCompanionLink');
    if (mobileLink) {
        mobileLink.textContent = `http://${metrics.localIp}:3000`;
        mobileLink.href = `http://${metrics.localIp}:3000`;
    }
}

// ---------------- Android Devices Rendering ----------------
function updateAndroidUi(devices, localIp) {
    const list = document.getElementById('androidDevicesList');
    const badge = document.getElementById('androidCountBadge');
    if (!list) return;

    if (badge) {
        badge.textContent = devices ? `${devices.length} LINKED` : '0 LINKED';
        badge.className = `status-badge ${devices && devices.length > 0 ? 'online' : 'standby'}`;
    }

    if (!devices || devices.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📱</div>
                <div class="empty-title">NO ANDROID UNIT LINKED</div>
                <div class="empty-desc">Connect phone via USB or enter Wi-Fi Debugging IP below to authorize Friday wireless bridge.</div>
            </div>
        `;
        return;
    }

    list.innerHTML = devices.map(dev => `
        <div class="device-card" data-serial="${dev.serial}">
            <div class="device-header">
                <span class="device-name">${dev.model}</span>
                <span class="device-type-badge">${dev.isWireless ? 'WI-FI' : 'USB'}</span>
            </div>
            <div class="device-serial">${dev.serial}</div>
            <div class="device-actions-row">
                <button class="btn-micro" onclick="launchPhoneApp('${dev.serial}', 'youtube')">YouTube</button>
                <button class="btn-micro" onclick="launchPhoneApp('${dev.serial}', 'whatsapp')">WhatsApp</button>
                <button class="btn-micro" onclick="launchPhoneApp('${dev.serial}', 'camera')">Camera</button>
                <button class="btn-micro" onclick="unlockPhone('${dev.serial}')">Unlock</button>
                <button class="btn-micro" onclick="capturePhoneScreen('${dev.serial}')">Snap</button>
            </div>
        </div>
    `).join('');
}

// ---------------- Controls & Quick Actions ----------------
function setupControls() {
    // Mic Toggle Button & Arc Reactor Core Click
    const micBtn = document.getElementById('micToggleBtn');
    const reactorCore = document.getElementById('reactorCore');

    const handleMicToggle = () => {
        if (window.soundEngine) window.soundEngine.playClick();
        window.voiceEngine.toggleListening();
    };

    if (micBtn) micBtn.addEventListener('click', handleMicToggle);
    if (reactorCore) reactorCore.addEventListener('click', handleMicToggle);

    // Text Command Input
    const commandInput = document.getElementById('commandTextInput');
    const sendBtn = document.getElementById('sendCmdBtn');

    const handleSend = () => {
        const val = commandInput.value.trim();
        if (val) {
            if (window.soundEngine) window.soundEngine.playConfirm();
            addTerminalLog(`USER TEXT: "${val}"`, 'user');
            window.socketClient.sendCommand(val);
            commandInput.value = '';
        }
    };

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (commandInput) {
        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    // Quick Voice Prompt Pills
    document.querySelectorAll('.prompt-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const prompt = pill.getAttribute('data-prompt');
            if (prompt) {
                if (window.soundEngine) window.soundEngine.playClick();
                addTerminalLog(`EXEC: "${prompt}"`, 'user');
                window.socketClient.sendCommand(prompt);
            }
        });
    });

    // Windows Volume Buttons
    setupApiButton('btnVolUp', '/api/windows/volume', { action: 'up', steps: 4 });
    setupApiButton('btnVolDown', '/api/windows/volume', { action: 'down', steps: 4 });
    setupApiButton('btnVolMute', '/api/windows/volume', { action: 'mute' });

    // Windows Media Buttons
    setupApiButton('btnMediaPlay', '/api/windows/media', { action: 'playpause' });
    setupApiButton('btnMediaNext', '/api/windows/media', { action: 'next' });
    setupApiButton('btnMediaPrev', '/api/windows/media', { action: 'prev' });

    // Windows Lock Workstation
    const lockBtn = document.getElementById('btnLockPc');
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playAlert();
            addTerminalLog("SYSTEM: Locking workstation in 1 second...", "system");
            window.voiceEngine.speak("Locking workstation now. Stay safe, Boss.");
            setTimeout(() => {
                fetch('/api/windows/lock', { method: 'POST' });
            }, 1000);
        });
    }

    // Windows App Launchers
    document.querySelectorAll('[data-launch-app]').forEach(btn => {
        btn.addEventListener('click', () => {
            const appName = btn.getAttribute('data-launch-app');
            if (window.soundEngine) window.soundEngine.playClick();
            addTerminalLog(`LAUNCH: Opening ${appName}...`, 'system');
            fetch('/api/windows/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app: appName })
            });
        });
    });

    // Android Wireless Connect Form
    const connectBtn = document.getElementById('btnAdbConnect');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            const ip = document.getElementById('adbIpInput')?.value?.trim();
            if (!ip) return;
            if (window.soundEngine) window.soundEngine.playClick();
            addTerminalLog(`ADB: Attempting wireless connect to ${ip}...`, 'system');

            const res = await fetch('/api/android/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip })
            }).then(r => r.json());

            if (res.success) {
                addTerminalLog(`ADB: Connected successfully to ${ip}`, 'friday');
                window.voiceEngine.speak("Android mobile unit synchronized over wireless bridge.");
            } else {
                addTerminalLog(`ADB ERROR: ${res.message || 'Connection failed'}`, 'alert');
            }
        });
    }

    // Mobile Companion Modal Toggle
    const mobileModal = document.getElementById('mobilePairModal');
    const openModalBtn = document.getElementById('btnOpenMobileModal');
    const closeModalBtn = document.getElementById('btnCloseMobileModal');

    if (openModalBtn && mobileModal) {
        openModalBtn.addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playClick();
            mobileModal.classList.add('visible');
        });
    }
    if (closeModalBtn && mobileModal) {
        closeModalBtn.addEventListener('click', () => {
            mobileModal.classList.remove('visible');
        });
    }

    // Audio SFX Toggle
    const sfxToggle = document.getElementById('sfxToggleCheckbox');
    if (sfxToggle) {
        sfxToggle.addEventListener('change', (e) => {
            window.soundEngine.enabled = e.target.checked;
        });
    }

    // Test Voice Button
    const testVoiceBtn = document.getElementById('btnTestVoice');
    if (testVoiceBtn) {
        testVoiceBtn.addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playActivate();
            addTerminalLog("AUDIO TEST: Transmitting test voice calibration...", "system");
            window.voiceEngine.speak("F.R.I.D.A.Y. tactical audio online. All systems nominal, Boss.");
        });
    }

    // Audio Engine Toggles (Browser vs Windows SAPI)
    const btnBrowser = document.getElementById('btnVoiceBrowser');
    const btnWindows = document.getElementById('btnVoiceWindows');
    if (btnBrowser && btnWindows) {
        btnBrowser.addEventListener('click', () => {
            window.voiceEngine.useWindowsSapi = false;
            btnBrowser.style.background = 'rgba(0, 242, 254, 0.25)';
            btnWindows.style.background = 'rgba(0, 242, 254, 0.08)';
            addTerminalLog("AUDIO: Output set to Browser Speech Engine.", "system");
            window.voiceEngine.speak("Browser voice engine selected, Boss.");
        });
        btnWindows.addEventListener('click', () => {
            window.voiceEngine.useWindowsSapi = true;
            btnWindows.style.background = 'rgba(0, 242, 254, 0.25)';
            btnBrowser.style.background = 'rgba(0, 242, 254, 0.08)';
            addTerminalLog("AUDIO: Output set to Windows System Audio (SAPI).", "system");
            window.voiceEngine.speakWindowsNative("Windows system audio selected, Boss.");
        });
    }
}

function setupApiButton(id, endpoint, body) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    });
}

// ---------------- Global Android Helpers ----------------
window.launchPhoneApp = async (serial, appName) => {
    if (window.soundEngine) window.soundEngine.playClick();
    addTerminalLog(`ADB: Launching ${appName} on ${serial}...`, 'system');
    await fetch('/api/android/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, app: appName })
    });
};

window.unlockPhone = async (serial) => {
    if (window.soundEngine) window.soundEngine.playClick();
    addTerminalLog(`ADB: Sending unlock signal to ${serial}...`, 'system');
    window.voiceEngine.speak("Unlocking mobile unit.");
    await fetch('/api/android/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial })
    });
};

window.capturePhoneScreen = async (serial) => {
    if (window.soundEngine) window.soundEngine.playClick();
    addTerminalLog(`ADB: Capturing screen from ${serial}...`, 'system');
    const res = await fetch('/api/android/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial })
    }).then(r => r.json());

    if (res.success && res.url) {
        addTerminalLog(`ADB: Screenshot retrieved!`, 'friday');
        const modal = document.getElementById('screenshotModal');
        const img = document.getElementById('screenshotPreviewImg');
        if (modal && img) {
            img.src = res.url + '?t=' + Date.now();
            modal.classList.add('visible');
        }
    }
};

// ---------------- Terminal Log ----------------
function addTerminalLog(message, type = 'system') {
    const stream = document.getElementById('terminalStream');
    if (!stream) return;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;

    let prefix = `[${time}]`;
    if (type === 'friday') prefix = `[${time} F.R.I.D.A.Y.]`;
    if (type === 'user') prefix = `[${time} BOSS]`;
    if (type === 'alert') prefix = `[${time} ALERT]`;

    line.innerHTML = `<span class="log-prefix">${prefix}</span> <span class="log-text">${escapeHtml(message)}</span>`;
    stream.appendChild(line);
    stream.scrollTop = stream.scrollHeight;
}

function flashActionIndicator(action) {
    const pill = document.getElementById('lastActionPill');
    if (pill) {
        pill.textContent = action.toUpperCase();
        pill.classList.add('flash');
        setTimeout(() => pill.classList.remove('flash'), 1800);
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------- PWA & Android Installation ----------------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker active:', reg.scope))
            .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    addTerminalLog("MOBILE DETECTED: Tap 'INSTALL APP' to add F.R.I.D.A.Y. to your Android home screen.", "system");
    
    // Add quick install button if not exists
    let installBtn = document.getElementById('pwaInstallBtn');
    if (!installBtn) {
        installBtn = document.createElement('button');
        installBtn.id = 'pwaInstallBtn';
        installBtn.className = 'btn-stark install-btn';
        installBtn.innerHTML = '📲 INSTALL ANDROID APP';
        installBtn.style.marginTop = '10px';
        installBtn.onclick = async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    addTerminalLog("STARK CORE: F.R.I.D.A.Y. installed on Android device.", "friday");
                    installBtn.remove();
                }
                deferredInstallPrompt = null;
            }
        };
        const controls = document.querySelector('.controls-section');
        if (controls) controls.appendChild(installBtn);
    }
});


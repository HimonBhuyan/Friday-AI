/**
 * Stark Industries F.R.I.D.A.Y. Voice Engine
 * 100% True Hands-Free Wake-Word Detection ("Hey Friday" / "Friday"), Ambient Filtering, and Accelerated TTS.
 */
class FridayVoiceEngine {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.alwaysListening = true; // Always-on ambient listener
        this.isSpeaking = false;
        this.wakeWord = 'friday';
        this.selectedVoice = null;
        this.availableVoices = [];
        this.pitch = 1.05;
        this.rate = 1.18; // Crisp, military-efficient speech rate
        
        this.onCommandDetected = null;
        this.onStateChange = null;
        
        this.manualStop = false;
        this.restartTimer = null;
        this.fastDebounceTimer = null;
        this.followupTimeout = null;
        
        this.lastExecuted = '';
        this.lastWakeTriggerTime = 0;
        this.lastCommandTriggerTime = 0;
        
        this.micStream = null;
        this.audioCtx = null;
        this.analyser = null;
        this.meterAnimId = null;
        this.awaitingFollowup = false;
    }

    async init() {
        this.initSpeechSynthesis();
        this.initSpeechRecognition();
    }

    // ----------------- Speech Synthesis (TTS) -----------------
    initSpeechSynthesis() {
        if (!('speechSynthesis' in window)) {
            console.warn('[VoiceEngine] Web Speech Synthesis not supported in this browser. Using Windows Native.');
            return;
        }

        const loadVoices = () => {
            this.availableVoices = window.speechSynthesis.getVoices();
            if (this.availableVoices.length > 0) {
                this.findBestFridayVoice();
                this.populateVoiceSelect();
            }
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        // Extra poll for Chrome which loads voices asynchronously
        setTimeout(loadVoices, 300);
        setTimeout(loadVoices, 1000);
    }

    findBestFridayVoice() {
        if (!this.availableVoices || this.availableVoices.length === 0) return;

        // Priority 1: Irish English (en-IE)
        let match = this.availableVoices.find(v => v.lang === 'en-IE' || v.lang.startsWith('en-IE'));
        // Priority 2: Local Windows / British English Female (en-GB)
        if (!match) {
            match = this.availableVoices.find(v => (v.lang === 'en-GB' || v.lang.startsWith('en-GB')) && /female|sonia|hazel|libby|george|serena/i.test(v.name));
        }
        // Priority 3: Local Windows Zira / Natural English
        if (!match) {
            match = this.availableVoices.find(v => /zira|samantha|karen|female|ava/i.test(v.name));
        }
        // Priority 4: Any English Female or English voice
        if (!match) {
            match = this.availableVoices.find(v => v.lang.startsWith('en'));
        }

        this.selectedVoice = match || this.availableVoices[0];
    }

    populateVoiceSelect() {
        const select = document.getElementById('voiceSelect');
        if (!select || !this.availableVoices || this.availableVoices.length === 0) return;

        select.innerHTML = '';
        this.availableVoices.forEach((voice, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            const isIrish = voice.lang.includes('IE') ? ' ★ [Irish Friday]' : '';
            const isLocal = voice.localService ? ' [Local]' : '';
            opt.textContent = `${voice.name} (${voice.lang})${isIrish}${isLocal}`;
            if (this.selectedVoice && voice.name === this.selectedVoice.name) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
            this.selectedVoice = this.availableVoices[e.target.value];
            this.speak("Acoustic calibration complete. F.R.I.D.A.Y. standing by.");
        });
    }

    speak(text, keepListening = false) {
        if (!text) return;

        // If Windows SAPI is preferred or Web Speech is missing, use Windows native SAPI directly
        if (this.useWindowsSapi || !('speechSynthesis' in window)) {
            this.speakWindowsNative(text);
            return;
        }

        // Chromium resume fix: if paused or stuck, resume!
        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        } catch (e) {
            console.warn('[TTS Resume]', e);
        }

        // 35ms timeout prevents Chromium from canceling the new utterance in the same event tick!
        setTimeout(() => {
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                this.currentUtterance = utterance; // Prevent V8 garbage collection!

                if (this.selectedVoice) {
                    utterance.voice = this.selectedVoice;
                    utterance.lang = this.selectedVoice.lang;
                } else {
                    utterance.lang = 'en-US';
                }
                utterance.pitch = this.pitch;
                utterance.rate = this.rate;

                let hasStarted = false;

                utterance.onstart = () => {
                    hasStarted = true;
                    this.isSpeaking = true;
                    this.setState('SPEAKING');
                    if (window.arcVisualizer) window.arcVisualizer.setPulseState('SPEAKING');
                };

                const handleSpeechEnd = () => {
                    this.isSpeaking = false;
                    this.currentUtterance = null;

                    if (keepListening || this.alwaysListening || this.awaitingFollowup) {
                        this.setState('LISTENING');
                        if (window.arcVisualizer) window.arcVisualizer.setPulseState('LISTENING');
                        this.updateLiveTranscript(this.awaitingFollowup ? 'Yes Boss? Listening for your command...' : 'Hands-Free Active: Say "Hey Friday" or "Friday"...');
                        setTimeout(() => this.ensureRecognitionRunning(), 80);
                    } else {
                        this.setState('STANDBY');
                        if (window.arcVisualizer) window.arcVisualizer.setPulseState('STANDBY');
                    }
                };

                utterance.onend = handleSpeechEnd;

                utterance.onerror = (e) => {
                    console.warn('[TTS Error Event]', e.error);
                    // If browser speech fails to play, fallback to Windows native SAPI
                    if (!hasStarted && e.error !== 'interrupted') {
                        console.log('[TTS] Web speech failed. Fallback to Windows SAPI...');
                        this.speakWindowsNative(text);
                    }
                    handleSpeechEnd();
                };

                window.speechSynthesis.speak(utterance);

                // Unwedge Chrome if paused
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }

                // Safety timeout: if onstart doesn't fire within 800ms, trigger SAPI fallback!
                setTimeout(() => {
                    if (!hasStarted && window.speechSynthesis.speaking) {
                        console.log('[TTS] Speech stalled in Chromium. Triggering Windows SAPI fallback...');
                        this.speakWindowsNative(text);
                    }
                }, 800);

            } catch (err) {
                console.error('[TTS Exception]', err);
                this.speakWindowsNative(text);
            }
        }, 35);
    }

    speakWindowsNative(text) {
        fetch('/api/windows/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).catch(err => console.warn('[SAPI Error]', err));
    }

    // ----------------- High-Speed Speech Recognition (STT) -----------------
    initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRec) {
            this.showMicDiagnostic("BROWSER_UNSUPPORTED", "Speech Recognition requires Chrome or Edge.");
            return;
        }

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            this.showMicDiagnostic("INSECURE_ORIGIN", "Microphone access blocked: Open http://localhost:3000 on PC.");
            return;
        }

        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicUi(true);
            this.setState('LISTENING');
            this.clearMicDiagnostic();
            if (!this.awaitingFollowup) {
                this.updateLiveTranscript('Hands-Free Active: Say "Hey Friday" or "Friday"...');
            }
        };

        this.recognition.onspeechstart = () => {
            if (this.isListening && !this.isSpeaking) {
                this.updateLiveTranscript('Voice detected...');
            }
        };

        this.recognition.onresult = (event) => {
            // Ignore mic feedback while Friday herself is talking
            if (this.isSpeaking) return;

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res[0].transcript;
                if (res.isFinal) {
                    finalTranscript += text;
                } else {
                    interimTranscript += text;
                }
            }

            const current = (finalTranscript || interimTranscript).trim();
            if (!current) return;

            this.updateLiveTranscript(`"${current}"`);
            const lower = current.toLowerCase();
            const now = Date.now();

            // Wake word presence check
            const hasWakeWord = /\b(friday|f\.r\.i\.d\.a\.y\.)\b/i.test(lower);

            // ================= 1. PURE WAKE-WORD CALL ("Friday" / "Hey Friday") =================
            const isWakeWordOnly = /^(hey|hi|hello|ok|okay|yo)?\s*(friday|f\.r\.i\.d\.a\.y\.)[,!?]?\s*$/i.test(current);
            if (isWakeWordOnly) {
                if (now - this.lastWakeTriggerTime > 1200) {
                    this.lastWakeTriggerTime = now;
                    this.lastExecuted = current;
                    clearTimeout(this.fastDebounceTimer);

                    if (window.soundEngine) window.soundEngine.playActivate();
                    this.setFollowupActive(true);
                    this.setState('LISTENING');
                    this.updateLiveTranscript('Yes Boss? Listening...');

                    if (this.onCommandDetected) {
                        this.onCommandDetected(current);
                    }
                }
                return;
            }

            // ================= 2. BACKGROUND CHATTER FILTER =================
            // If neither in active follow-up mode nor containing the wake-word, ignore background noise!
            if (!this.awaitingFollowup && !hasWakeWord) {
                return;
            }

            // ================= 3. INSTANT DISTINCT COMMAND MATCHING =================
            const isInstantCommand = /(?:^|\s)(volume up|volume down|mute|open youtube|open spotify|open chrome|calculator|calc|notepad|system report|scan systems|lock workstation|who are you|what time is it|barn burner protocol|play rock music|stealth mode)$/i.test(lower);

            if (isInstantCommand && (now - this.lastCommandTriggerTime > 1000) && this.lastExecuted !== current) {
                this.lastCommandTriggerTime = now;
                this.lastExecuted = current;
                clearTimeout(this.fastDebounceTimer);
                this.dispatchCommand(current);
                return;
            }

            // ================= 4. FAST SILENCE DEBOUNCE (220ms) =================
            if (current.length > 2 && this.lastExecuted !== current) {
                clearTimeout(this.fastDebounceTimer);
                this.fastDebounceTimer = setTimeout(() => {
                    if (this.lastExecuted !== current && !this.isSpeaking) {
                        this.lastExecuted = current;
                        this.dispatchCommand(current);
                    }
                }, 220);
            }

            // ================= 5. FINAL TRANSCRIPT FALLBACK =================
            if (finalTranscript) {
                clearTimeout(this.fastDebounceTimer);
                const cleaned = finalTranscript.trim();
                if (cleaned.length > 1 && this.lastExecuted !== cleaned && !this.isSpeaking) {
                    this.lastExecuted = cleaned;
                    this.dispatchCommand(cleaned);
                }
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return;

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.isListening = false;
                this.manualStop = true;
                this.alwaysListening = false;
                this.updateMicUi(false);
                this.setState('STANDBY');
                this.showMicDiagnostic("PERMISSION_DENIED", "Microphone access blocked. Click lock icon in address bar to Allow.");
                return;
            }

            if (event.error === 'network') {
                this.showMicDiagnostic("NETWORK_ERROR", "Speech service network error. Check internet connection.");
                return;
            }

            if (event.error === 'audio-capture') {
                this.showMicDiagnostic("AUDIO_CAPTURE", "No microphone detected or in use by another app.");
                return;
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            
            // Auto restart immediately in hands-free mode
            if (!this.manualStop && this.alwaysListening) {
                clearTimeout(this.restartTimer);
                this.restartTimer = setTimeout(() => {
                    this.ensureRecognitionRunning();
                }, 120);
            } else {
                this.updateMicUi(false);
                this.setState('STANDBY');
                this.updateLiveTranscript('Microphone offline. Click mic icon to activate.');
            }
        };
    }

    setFollowupActive(active) {
        this.awaitingFollowup = active;
        clearTimeout(this.followupTimeout);
        if (active) {
            // Give user 8 seconds to speak their command after saying "Hey Friday"
            this.followupTimeout = setTimeout(() => {
                this.awaitingFollowup = false;
                this.setState('LISTENING');
                this.updateLiveTranscript('Hands-Free Active: Say "Hey Friday" or "Friday"...');
            }, 8000);
        }
    }

    dispatchCommand(text) {
        if (window.soundEngine) window.soundEngine.playConfirm();
        this.setState('PROCESSING');
        this.setFollowupActive(false);
        this.updateLiveTranscript(`Transmitting: "${text}"`);

        if (this.onCommandDetected) {
            this.onCommandDetected(text);
        }
    }

    ensureRecognitionRunning() {
        if (!this.manualStop && this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (e) {
                // Already running
            }
        }
    }

    // ----------------- Hardware Audio Meter -----------------
    async startAudioMeter() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

            if (!this.micStream) {
                this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioCtx();
            }

            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }

            const source = this.audioCtx.createMediaStreamSource(this.micStream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 128;
            this.analyser.smoothingTimeConstant = 0.5;
            source.connect(this.analyser);

            const buffer = new Uint8Array(this.analyser.frequencyBinCount);

            const updateMeter = () => {
                if (!this.analyser) return;
                this.analyser.getByteFrequencyData(buffer);
                
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) {
                    sum += buffer[i];
                }
                const avg = sum / buffer.length;
                const levelPercent = Math.min(100, Math.round((avg / 128) * 100));

                this.updateMeterUi(levelPercent);

                if (window.arcVisualizer && levelPercent > 8) {
                    window.arcVisualizer.syntheticEnergy = Math.max(0.3, avg / 128);
                }

                this.meterAnimId = requestAnimationFrame(updateMeter);
            };

            cancelAnimationFrame(this.meterAnimId);
            updateMeter();
            return true;
        } catch (err) {
            console.warn('[VoiceEngine] Audio meter notice:', err);
            return false;
        }
    }

    stopAudioMeter() {
        cancelAnimationFrame(this.meterAnimId);
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        this.updateMeterUi(0);
    }

    async startListening(playChirp = false) {
        this.manualStop = false;
        this.alwaysListening = true;

        if (playChirp && window.soundEngine) {
            window.soundEngine.playActivate();
        }

        await this.startAudioMeter();

        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (e) {
                this.isListening = true;
                this.updateMicUi(true);
            }
        }
    }

    stopListening() {
        this.manualStop = true;
        this.alwaysListening = false;
        this.setFollowupActive(false);
        clearTimeout(this.restartTimer);
        clearTimeout(this.fastDebounceTimer);

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch {
                // Ignored
            }
        }
        this.stopAudioMeter();
        this.updateMicUi(false);
        this.setState('STANDBY');
        this.updateLiveTranscript('Microphone offline. Click mic icon to activate.');
    }

    toggleListening() {
        if (this.isListening && !this.manualStop) {
            this.stopListening();
        } else {
            this.startListening(true);
            this.setFollowupActive(true); // User clicked: immediately await command
        }
    }

    setState(state) {
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }

    updateMicUi(active) {
        const btn = document.getElementById('micToggleBtn');
        const badge = document.getElementById('micStatusBadge');
        if (btn) {
            btn.classList.toggle('active', active);
            btn.title = active ? 'Hands-Free Active: Listening for "Hey Friday"' : 'Click to Activate Microphone';
        }
        if (badge) {
            badge.textContent = active ? 'HANDS-FREE ON' : 'STANDBY';
            badge.className = `status-badge ${active ? 'online' : 'standby'}`;
        }
    }

    updateMeterUi(percent) {
        const fill = document.getElementById('micMeterFill');
        const text = document.getElementById('micMeterText');
        if (fill) {
            fill.style.width = `${percent}%`;
            if (percent > 12) {
                fill.classList.add('active-signal');
            } else {
                fill.classList.remove('active-signal');
            }
        }
        if (text) {
            text.textContent = percent > 5 ? `${percent}% [AUDIO DETECTED]` : '0% [SILENT]';
        }
    }

    updateLiveTranscript(text) {
        const el = document.getElementById('liveSpeechTranscript');
        if (el) {
            el.textContent = text;
        }
    }

    showMicDiagnostic(code, message) {
        const diagBox = document.getElementById('micDiagnosticBox');
        const diagMsg = document.getElementById('micDiagnosticMsg');
        if (diagBox && diagMsg) {
            diagBox.style.display = 'flex';
            diagMsg.textContent = `[${code}] ${message}`;
        }
        this.updateLiveTranscript(`ALERT: ${message}`);
    }

    clearMicDiagnostic() {
        const diagBox = document.getElementById('micDiagnosticBox');
        if (diagBox) {
            diagBox.style.display = 'none';
        }
    }
}

window.voiceEngine = new FridayVoiceEngine();

/**
 * Stark Industries F.R.I.D.A.Y. Audio Visualizer
 * Drives the Arc Reactor reactive glow, ring pulse, and holographic frequency bars.
 */
class ArcVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.analyser = null;
        this.source = null;
        this.audioCtx = null;
        this.dataArray = null;
        this.isRunning = false;
        this.reactorCore = null;
        this.syntheticEnergy = 0;
    }

    init(canvasId, coreId) {
        this.canvas = document.getElementById(canvasId);
        this.reactorCore = document.getElementById(coreId);

        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }

        this.startIdleAnimation();
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
    }

    async connectMicrophone() {
        try {
            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioCtx();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.source = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;
            this.analyser.smoothingTimeConstant = 0.8;

            this.source.connect(this.analyser);
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.isRunning = true;
            this.draw();
            return true;
        } catch (err) {
            console.warn('[Visualizer] Microphone access unavailable or denied:', err);
            this.startSyntheticPulse();
            return false;
        }
    }

    startSyntheticPulse() {
        this.syntheticActive = true;
    }

    stopSyntheticPulse() {
        this.syntheticActive = false;
    }

    setPulseState(state) {
        // Boost reaction during LISTENING, SPEAKING, PROCESSING
        if (state === 'SPEAKING') {
            this.syntheticEnergy = 0.9;
        } else if (state === 'LISTENING') {
            this.syntheticEnergy = 0.6;
        } else if (state === 'PROCESSING') {
            this.syntheticEnergy = 0.75;
        } else {
            this.syntheticEnergy = 0.15;
        }
    }

    startIdleAnimation() {
        const loop = () => {
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    draw() {
        if (!this.canvas || !this.ctx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);

        let values = [];
        let avgVolume = 0;

        if (this.isRunning && this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            values = Array.from(this.dataArray);
            const sum = values.reduce((a, b) => a + b, 0);
            avgVolume = sum / values.length / 255;
        } else {
            // Synthetic idle / speaking wave simulation
            const bars = 24;
            const time = Date.now() * 0.005;
            const boost = this.syntheticEnergy || 0.15;

            for (let i = 0; i < bars; i++) {
                const wave = Math.sin(time + i * 0.35) * Math.cos(time * 0.5 + i * 0.2);
                const val = Math.max(0.08, Math.abs(wave) * boost);
                values.push(Math.round(val * 255));
            }
            avgVolume = boost;
        }

        // Apply scale/glow to Arc Reactor Core
        if (this.reactorCore) {
            const scale = 1 + avgVolume * 0.18;
            const glow = 15 + avgVolume * 45;
            this.reactorCore.style.transform = `scale(${scale})`;
            this.reactorCore.style.filter = `drop-shadow(0 0 ${glow}px rgba(0, 242, 254, 0.85))`;
        }

        // Render Holographic Equalizer Bars on canvas
        const barCount = values.length;
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;

        for (let i = 0; i < barCount; i++) {
            const barHeight = Math.max(4, (values[i] / 255) * (height * 0.85));
            const x = i * (barWidth + gap) + gap / 2;
            const y = (height - barHeight) / 2; // Centered vertical wave

            const gradient = this.ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, 'rgba(0, 242, 254, 0.2)');
            gradient.addColorStop(0.5, 'rgba(0, 242, 254, 0.95)');
            gradient.addColorStop(1, 'rgba(0, 242, 254, 0.2)');

            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = '#00f2fe';
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(x, y, barWidth, barHeight);

            // Glowing cap dots
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x, y - 2, barWidth, 2);
            this.ctx.fillRect(x, y + barHeight, barWidth, 2);
        }
    }
}

window.arcVisualizer = new ArcVisualizer();

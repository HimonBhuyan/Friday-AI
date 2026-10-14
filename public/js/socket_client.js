/**
 * Stark Industries F.R.I.D.A.Y. WebSocket Client
 * Connects HUD UI with Node.js automation and telemetry core.
 */
class StarkSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 5000;
        this.handlers = {
            telemetry: [],
            commandResult: [],
            stateChange: [],
            welcome: []
        };
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;

        this.updateConnectionBadge('CONNECTING', 'amber');

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[F.R.I.D.A.Y.] Connected to Neural Core.');
                this.reconnectAttempts = 0;
                this.updateConnectionBadge('ONLINE', 'cyan');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (err) {
                    console.error('[WS Parse Error]', err);
                }
            };

            this.ws.onclose = () => {
                this.updateConnectionBadge('OFFLINE', 'red');
                this.scheduleReconnect();
            };

            this.ws.onerror = (err) => {
                console.warn('[WS Socket Error]', err);
                this.ws.close();
            };
        } catch (e) {
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
        setTimeout(() => this.connect(), delay);
    }

    handleMessage(data) {
        switch (data.type) {
            case 'telemetry_update':
                this.handlers.telemetry.forEach(fn => fn(data.metrics, data.devices));
                break;
            case 'command_result':
                this.handlers.commandResult.forEach(fn => fn(data.response));
                break;
            case 'hud_state':
                this.handlers.stateChange.forEach(fn => fn(data.state));
                break;
            case 'system_welcome':
                this.handlers.welcome.forEach(fn => fn(data.message));
                break;
        }
    }

    sendCommand(text) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'command', text }));
        } else {
            // Fallback to REST API
            fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            }).then(r => r.json()).then(res => {
                if (res.success && res.response) {
                    this.handlers.commandResult.forEach(fn => fn(res.response));
                }
            }).catch(console.error);
        }
    }

    on(event, callback) {
        if (this.handlers[event]) {
            this.handlers[event].push(callback);
        }
    }

    updateConnectionBadge(text, color) {
        const badge = document.getElementById('coreStatusBadge');
        if (badge) {
            badge.textContent = text;
            badge.className = `status-pill ${color}`;
        }
    }
}

window.socketClient = new StarkSocketClient();

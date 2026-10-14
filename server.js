require('dotenv').config();
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');

const windowsController = require('./controllers/windows');
const androidController = require('./controllers/android');
const fridayAgent = require('./controllers/ai_agent');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Ensure public directories exist
const publicDir = path.join(__dirname, 'public');
const screenshotsDir = path.join(publicDir, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

app.use(express.json());
app.use(express.static(publicDir));

// ===================== REST APIs =====================

// System Metrics
app.get('/api/system/metrics', async (req, res) => {
    try {
        const metrics = await windowsController.getSystemMetrics();
        res.json({ success: true, metrics });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Windows Controls
app.post('/api/windows/volume', async (req, res) => {
    const { action, steps } = req.body;
    let result;
    if (action === 'up') result = await windowsController.volumeUp(steps || 2);
    else if (action === 'down') result = await windowsController.volumeDown(steps || 2);
    else if (action === 'mute') result = await windowsController.volumeMute();
    else return res.status(400).json({ success: false, error: 'Invalid volume action' });
    res.json({ success: true, result });
});

app.post('/api/windows/media', async (req, res) => {
    const { action } = req.body;
    let result;
    if (action === 'playpause') result = await windowsController.mediaPlayPause();
    else if (action === 'next') result = await windowsController.mediaNext();
    else if (action === 'prev') result = await windowsController.mediaPrev();
    else return res.status(400).json({ success: false, error: 'Invalid media action' });
    res.json({ success: true, result });
});

app.post('/api/windows/lock', async (req, res) => {
    const result = await windowsController.lockWorkstation();
    res.json({ success: true, result });
});

app.post('/api/windows/launch', async (req, res) => {
    const { app: appName, url } = req.body;
    let result;
    if (appName) result = await windowsController.launchApp(appName);
    else if (url) result = await windowsController.openUrl(url);
    else return res.status(400).json({ success: false, error: 'App name or URL required' });
    res.json({ success: true, result });
});

app.post('/api/windows/speak', (req, res) => {
    const { text } = req.body;
    if (text) windowsController.speak(text);
    res.json({ success: true });
});

// Android Controls
app.get('/api/android/devices', async (req, res) => {
    try {
        const devices = await androidController.getConnectedDevices();
        res.json({ success: true, devices });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/android/connect', async (req, res) => {
    const { ip, port } = req.body;
    const result = await androidController.connectWireless(ip, port || 5555);
    res.json(result);
});

app.post('/api/android/disconnect', async (req, res) => {
    const { target } = req.body;
    const result = await androidController.disconnectWireless(target);
    res.json(result);
});

app.get('/api/android/battery', async (req, res) => {
    const serial = req.query.serial;
    const battery = await androidController.getDeviceBattery(serial);
    res.json({ success: true, battery });
});

app.post('/api/android/launch', async (req, res) => {
    const { serial, app: appName } = req.body;
    const result = await androidController.launchApp(serial, appName);
    res.json(result);
});

app.post('/api/android/key', async (req, res) => {
    const { serial, key } = req.body;
    const result = await androidController.sendKey(serial, key);
    res.json(result);
});

app.post('/api/android/unlock', async (req, res) => {
    const { serial } = req.body;
    const result = await androidController.unlockDevice(serial);
    res.json(result);
});

app.post('/api/android/screenshot', async (req, res) => {
    const { serial } = req.body;
    const result = await androidController.captureScreenshot(serial, screenshotsDir);
    res.json(result);
});

// Natural Language Command
app.post('/api/command', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Command text required' });

    broadcast({ type: 'hud_state', state: 'PROCESSING' });
    const response = await fridayAgent.processCommand(text);
    broadcast({ type: 'command_result', response });
    res.json({ success: true, response });
});

// ===================== WebSocket Stream =====================

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(message);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('[F.R.I.D.A.Y.] HUD Client Connected.');
    
    // Initial welcome payload
    ws.send(JSON.stringify({
        type: 'system_welcome',
        message: 'F.R.I.D.A.Y. Neural Interface Connected. All systems operational.'
    }));

    ws.on('message', async (raw) => {
        try {
            const data = JSON.parse(raw);
            if (data.type === 'command') {
                broadcast({ type: 'hud_state', state: 'PROCESSING' });
                const agentResponse = await fridayAgent.processCommand(data.text);
                broadcast({ type: 'command_result', response: agentResponse });
            } else if (data.type === 'hud_state_change') {
                broadcast({ type: 'hud_state', state: data.state });
            }
        } catch (err) {
            console.error('[WS Error]', err);
        }
    });
});

// Background Telemetry Broadcast Loop (every 2.5 seconds)
setInterval(async () => {
    if (wss.clients.size > 0) {
        try {
            const metrics = await windowsController.getSystemMetrics();
            const devices = await androidController.getConnectedDevices();
            broadcast({
                type: 'telemetry_update',
                metrics,
                devices
            });
        } catch {
            // Telemetry tick error ignored
        }
    }
}, 2500);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  STARK INDUSTRIES - F.R.I.D.A.Y. ONLINE`);
    console.log(`  Local Core:   http://localhost:${PORT}`);
    windowsController.getSystemMetrics().then(m => {
        console.log(`  Mobile Sync:  http://${m.localIp}:${PORT}`);
        console.log(`======================================================\n`);
    });
});

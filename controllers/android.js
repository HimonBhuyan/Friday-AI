const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function runAdb(cmd) {
    return new Promise((resolve) => {
        exec(`adb ${cmd}`, { windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: error.message, stderr: stderr ? stderr.trim() : '' });
            } else {
                resolve({ success: true, stdout: stdout.trim() });
            }
        });
    });
}

/**
 * Common Android Package Identifiers
 */
const ANDROID_PACKAGES = {
    youtube: 'com.google.android.youtube',
    whatsapp: 'com.whatsapp',
    chrome: 'com.android.chrome',
    browser: 'com.android.chrome',
    camera: 'com.android.camera',
    settings: 'com.android.settings',
    spotify: 'com.spotify.music',
    maps: 'com.google.android.apps.maps',
    store: 'com.android.vending',
    playstore: 'com.android.vending',
    phone: 'com.google.android.dialer',
    messages: 'com.google.android.apps.messaging',
    photos: 'com.google.android.apps.photos',
    gmail: 'com.google.android.gm',
    calculator: 'com.google.android.calculator'
};

/**
 * List all connected Android devices (USB & Wi-Fi)
 */
async function getConnectedDevices() {
    const res = await runAdb('devices -l');
    if (!res.success) return [];

    const lines = res.stdout.split('\n');
    const devices = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/\s+/);
        const serial = parts[0];
        const status = parts[1] || 'unknown';

        let model = 'Android Device';
        const modelMatch = line.match(/model:([^\s]+)/);
        if (modelMatch) model = modelMatch[1].replace(/_/g, ' ');

        const isWireless = serial.includes(':');

        devices.push({
            serial,
            status,
            model,
            isWireless
        });
    }

    return devices;
}

/**
 * Connect to an Android device over Wi-Fi
 */
async function connectWireless(ipAddress, port = 5555) {
    if (!ipAddress) return { success: false, error: 'IP address required' };
    const target = ipAddress.includes(':') ? ipAddress : `${ipAddress}:${port}`;
    const res = await runAdb(`connect ${target}`);
    return {
        success: res.success && res.stdout.includes('connected to'),
        message: res.stdout || res.stderr
    };
}

/**
 * Disconnect Android wireless device
 */
async function disconnectWireless(target) {
    const res = await runAdb(target ? `disconnect ${target}` : 'disconnect');
    return { success: res.success, message: res.stdout };
}

/**
 * Get device battery level and charging state
 */
async function getDeviceBattery(serial) {
    const target = serial ? `-s ${serial}` : '';
    const res = await runAdb(`${target} shell dumpsys battery`);
    if (!res.success) return null;

    const levelMatch = res.stdout.match(/level:\s*(\d+)/i);
    const statusMatch = res.stdout.match(/status:\s*(\d+)/i);
    const usbMatch = res.stdout.match(/USB powered:\s*(true|false)/i);
    const acMatch = res.stdout.match(/AC powered:\s*(true|false)/i);
    const wirelessMatch = res.stdout.match(/Wireless powered:\s*(true|false)/i);

    const level = levelMatch ? parseInt(levelMatch[1], 10) : null;
    const isCharging = (statusMatch && statusMatch[1] === '2') ||
                       (usbMatch && usbMatch[1] === 'true') ||
                       (acMatch && acMatch[1] === 'true') ||
                       (wirelessMatch && wirelessMatch[1] === 'true');

    return {
        level,
        isCharging,
        raw: res.stdout
    };
}

/**
 * Launch an app on the phone by package or common name
 */
async function launchApp(serial, appName) {
    const target = serial ? `-s ${serial}` : '';
    const clean = appName.toLowerCase().trim();
    const pkg = ANDROID_PACKAGES[clean] || appName;

    const res = await runAdb(`${target} shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
    return {
        success: res.success && !res.stdout.includes('No activities found'),
        package: pkg,
        output: res.stdout
    };
}

/**
 * Trigger physical key event (Home, Back, Power, Volume, etc.)
 */
async function sendKey(serial, keycode) {
    const target = serial ? `-s ${serial}` : '';
    const KEY_MAP = {
        home: 3,
        back: 4,
        power: 26,
        volumeup: 24,
        volumedown: 25,
        mute: 164,
        playpause: 85,
        wake: 224
    };

    const code = KEY_MAP[keycode.toString().toLowerCase()] || keycode;
    const res = await runAdb(`${target} shell input keyevent ${code}`);
    return { success: res.success, key: code };
}

/**
 * Type text into the focused Android input field
 */
async function typeText(serial, text) {
    const target = serial ? `-s ${serial}` : '';
    // Escaping spaces for ADB input
    const formatted = text.replace(/ /g, '%s').replace(/[&|<>]/g, '');
    const res = await runAdb(`${target} shell input text "${formatted}"`);
    return { success: res.success };
}

/**
 * Tap screen coordinates
 */
async function tap(serial, x, y) {
    const target = serial ? `-s ${serial}` : '';
    const res = await runAdb(`${target} shell input tap ${x} ${y}`);
    return { success: res.success };
}

/**
 * Unlock Android device (Wake + Swipe up)
 */
async function unlockDevice(serial) {
    const target = serial ? `-s ${serial}` : '';
    // Wake screen
    await runAdb(`${target} shell input keyevent 224`);
    // Small delay then swipe up to unlock
    await new Promise(r => setTimeout(r, 400));
    const res = await runAdb(`${target} shell input swipe 500 1600 500 400 300`);
    return { success: res.success, message: 'Unlock signal sent to device.' };
}

/**
 * Lock Android device screen
 */
async function lockDevice(serial) {
    const target = serial ? `-s ${serial}` : '';
    const res = await runAdb(`${target} shell input keyevent 26`);
    return { success: res.success, message: 'Device locked.' };
}

/**
 * Open camera on Android device
 */
async function openCamera(serial) {
    const target = serial ? `-s ${serial}` : '';
    const res = await runAdb(`${target} shell am start -a android.media.action.STILL_IMAGE_CAMERA`);
    return { success: res.success };
}

/**
 * Initiate phone call
 */
async function makeCall(serial, phoneNumber) {
    const target = serial ? `-s ${serial}` : '';
    const cleanNum = phoneNumber.replace(/[^0-9+*#]/g, '');
    const res = await runAdb(`${target} shell am start -a android.intent.action.CALL -d "tel:${cleanNum}"`);
    return { success: res.success, number: cleanNum };
}

/**
 * Toggle Flashlight via Quick Settings or service
 */
async function toggleFlashlight(serial, enable = true) {
    const target = serial ? `-s ${serial}` : '';
    // Android flashlight tile toggle
    const res = await runAdb(`${target} shell cmd statusbar click-tile com.android.systemui/.qs.tiles.FlashlightTile`);
    return { success: res.success };
}

/**
 * Take screenshot and save to public screenshots folder for live HUD preview
 */
async function captureScreenshot(serial, outputDir) {
    const target = serial ? `-s ${serial}` : '';
    const filename = `screen_${Date.now()}.png`;
    const fullPath = path.join(outputDir, filename);

    // Capture to device temp, then pull
    await runAdb(`${target} shell screencap -p /sdcard/friday_snap.png`);
    const pullRes = await runAdb(`${target} pull /sdcard/friday_snap.png "${fullPath}"`);
    
    if (pullRes.success && fs.existsSync(fullPath)) {
        return { success: true, filename, url: `/screenshots/${filename}` };
    }
    return { success: false, error: pullRes.stderr || 'Screenshot capture failed' };
}

module.exports = {
    getConnectedDevices,
    connectWireless,
    disconnectWireless,
    getDeviceBattery,
    launchApp,
    sendKey,
    typeText,
    tap,
    unlockDevice,
    lockDevice,
    openCamera,
    makeCall,
    toggleFlashlight,
    captureScreenshot,
    ANDROID_PACKAGES
};

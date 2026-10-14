const { exec } = require('child_process');
const os = require('os');

/**
 * Execute a command safely via PowerShell or CMD
 */
function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: error.message, stderr });
            } else {
                resolve({ success: true, stdout: stdout.trim() });
            }
        });
    });
}

/**
 * Volume Controls using PowerShell WScript.Shell SendKeys (Non-blocking & Zero-Sleep)
 */
async function volumeUp(steps = 2) {
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; 1..${steps} | ForEach-Object { $w.SendKeys([char]175) }"`;
    runCommand(script);
    return { success: true };
}

async function volumeDown(steps = 2) {
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; 1..${steps} | ForEach-Object { $w.SendKeys([char]174) }"`;
    runCommand(script);
    return { success: true };
}

async function volumeMute() {
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)"`;
    runCommand(script);
    return { success: true };
}

/**
 * Media Play/Pause, Next, Previous
 */
async function mediaPlayPause() {
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]179)"`;
    return await runCommand(script);
}

async function mediaNext() {
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]176)"`;
    return await runCommand(script);
}

async function mediaPrev() {
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]177)"`;
    return await runCommand(script);
}

/**
 * Lock Workstation
 */
async function lockWorkstation() {
    return await runCommand('rundll32.exe user32.dll,LockWorkStation');
}

/**
 * Application Launchers
 */
const APP_SHORTCUTS = {
    chrome: 'start chrome',
    browser: 'start chrome',
    edge: 'start msedge',
    notepad: 'notepad.exe',
    calculator: 'calc.exe',
    calc: 'calc.exe',
    taskmgr: 'taskmgr.exe',
    explorer: 'explorer.exe',
    vscode: 'code',
    code: 'code',
    spotify: 'start spotify:',
    cmd: 'start cmd.exe',
    terminal: 'start wt.exe'
};

async function launchApp(appName) {
    const cleanName = appName.toLowerCase().trim();
    if (APP_SHORTCUTS[cleanName]) {
        return await runCommand(APP_SHORTCUTS[cleanName]);
    }
    // Generic attempt:
    return await runCommand(`start "" "${appName}"`);
}

async function openUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    return await runCommand(`start "" "${url}"`);
}

/**
 * System Telemetry
 */
let lastCpuMeasure = null;

function getCpuUsage() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
    }
    return { idle, total };
}

async function getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);

    // CPU calculation
    let cpuPercent = 0;
    const currentCpu = getCpuUsage();
    if (lastCpuMeasure) {
        const idleDiff = currentCpu.idle - lastCpuMeasure.idle;
        const totalDiff = currentCpu.total - lastCpuMeasure.total;
        cpuPercent = totalDiff > 0 ? Math.round(100 - (100 * idleDiff / totalDiff)) : 0;
    }
    lastCpuMeasure = currentCpu;

    // Battery Query
    let batteryLevel = null;
    let isCharging = false;
    try {
        const batResult = await runCommand('powershell -NoProfile -Command "Get-CimInstance Win32_Battery | Select-Object -Property EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json"');
        if (batResult.success && batResult.stdout) {
            const data = JSON.parse(batResult.stdout);
            batteryLevel = data.EstimatedChargeRemaining || 100;
            // BatteryStatus 2 = Connected to AC/Charging
            isCharging = data.BatteryStatus === 2 || data.BatteryStatus === 6;
        }
    } catch {
        // Battery might not exist on desktop
    }

    // Network IPs
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';
    for (const iface in interfaces) {
        for (const alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                localIp = alias.address;
                break;
            }
        }
    }

    return {
        platform: 'Windows ' + os.release(),
        hostname: os.hostname(),
        uptimeSeconds: Math.round(os.uptime()),
        cpuPercent: Math.max(0, Math.min(100, cpuPercent)),
        cpuCores: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Processor',
        memory: {
            totalGb: (totalMem / (1024 ** 3)).toFixed(1),
            usedGb: (usedMem / (1024 ** 3)).toFixed(1),
            percent: memUsagePercent
        },
        battery: {
            level: batteryLevel,
            isCharging: isCharging
        },
        localIp: localIp
    };
}

/**
 * Advanced Windows Automation & Workflow Arsenal
 */
async function minimizeAllWindows() {
    return await runCommand('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"');
}

async function undoMinimizeAllWindows() {
    return await runCommand('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).UndoMinimizeAll()"');
}

async function closeActiveWindow() {
    return await runCommand('powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $w.SendKeys(\'%{F4}\')"');
}

async function showDesktop() {
    return await runCommand('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).ToggleDesktop()"');
}

async function killProcess(processName) {
    let clean = processName.replace(/[\s"']/g, '').toLowerCase();
    if (!clean.endsWith('.exe')) clean += '.exe';
    return await runCommand(`taskkill /F /IM ${clean}`);
}

async function openFolder(folderName) {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\User';
    const folderMap = {
        downloads: `${userProfile}\\Downloads`,
        documents: `${userProfile}\\Documents`,
        desktop: `${userProfile}\\Desktop`,
        pictures: `${userProfile}\\Pictures`,
        videos: `${userProfile}\\Videos`,
        music: `${userProfile}\\Music`,
        project: process.cwd(),
        root: 'C:\\'
    };
    const target = folderMap[folderName.toLowerCase().trim()] || folderName;
    return await runCommand(`start "" "${target}"`);
}

async function getClipboard() {
    const res = await runCommand('powershell -NoProfile -Command "Get-Clipboard"');
    return res.success ? res.stdout : '';
}

async function setClipboard(text) {
    const clean = text.replace(/["'`$]/g, '');
    return await runCommand(`powershell -NoProfile -Command "Set-Clipboard -Value '${clean}'"`);
}

async function emptyRecycleBin() {
    return await runCommand('powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"');
}

async function flushDns() {
    return await runCommand('ipconfig /flushdns');
}

async function setVolumePercent(percent) {
    // Volume percent normalized
    const pct = Math.max(0, Math.min(100, parseInt(percent, 10) || 50));
    // SAPI / Audio adjustment via nircmd or sendkeys loop
    const script = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; 1..50 | ForEach-Object { $w.SendKeys([char]174) }; 1..${Math.round(pct / 2)} | ForEach-Object { $w.SendKeys([char]175) }"`;
    runCommand(script);
    return { success: true, percent: pct };
}

async function captureScreen() {
    const scriptPath = require('path').join(__dirname, '..', 'scripts', 'capture_screen.ps1');
    const res = await runCommand(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`);
    return {
        success: res.success,
        url: '/screenshots/desktop_snap.png?t=' + Date.now()
    };
}

function speak(text) {
    if (!text) return;
    const cleanText = text.replace(/["'`$\\]/g, '');
    const script = `powershell -NoProfile -Command "(New-Object -ComObject SAPI.SpVoice).Speak('${cleanText}')"`;
    runCommand(script);
}

module.exports = {
    volumeUp,
    volumeDown,
    volumeMute,
    setVolumePercent,
    mediaPlayPause,
    mediaNext,
    mediaPrev,
    lockWorkstation,
    minimizeAllWindows,
    undoMinimizeAllWindows,
    closeActiveWindow,
    showDesktop,
    killProcess,
    openFolder,
    getClipboard,
    setClipboard,
    emptyRecycleBin,
    flushDns,
    captureScreen,
    launchApp,
    openUrl,
    getSystemMetrics,
    speak,
    runCommand
};

# F.R.I.D.A.Y. // Stark Industries Mark LXXXV AI Assistant
> *"If you're nothing without the suit, then you shouldn't have it."*

**Fully Automated Voice & System Intelligence Core for Windows & Android**

---

## 🌟 Overview
**F.R.I.D.A.Y.** *(Female Replacement Intelligent Digital Assistant Youth)* is a real-time, holographic AI assistant modeled after Tony Stark's iconic system. It combines natural voice recognition, Kerry Condon-inspired speech synthesis, Windows OS system automation, and an Android wireless ADB bridge.

---

## 🚀 Quick Start

### 1. Launch the Server
```bash
npm start
```
* F.R.I.D.A.Y. will initialize on:
  * **Windows Desktop HUD**: [http://localhost:3000](http://localhost:3000)
  * **Android Mobile Sync**: `http://<your-ip>:3000` (displayed in your console and HUD header)

### 2. Connect Your Android Phone
1. **Mobile HUD**: Connect your phone to the same Wi-Fi and open `http://<your-ip>:3000`, or click **"MOBILE SYNC"** in the desktop HUD to scan the instant QR code!
2. **Wireless ADB Control (Optional Zero-Touch OS Automation)**:
   - On Android, enable **Developer Options** > **Wireless Debugging** (or USB Debugging).
   - Enter your phone's IP and port in the **ANDROID BRIDGE** deck on the HUD and click **PAIR**.

---

## 🎙 Voice Commands Reference & Stark Protocols

| Cinematic Stark Protocol | Voice Trigger | Action Taken |
|---|---|---|
| **🚀 Barn Burner Protocol** | *"Friday, Barn Burner protocol"* / *"House Party protocol"* | Deploys full developer workspace (VS Code, Chrome, Spotify, Terminal) simultaneously |
| **🎸 Classic Rock Protocol** | *"Friday, play rock music"* / *"AC/DC"* / *"Back in Black"* | Deploys classic rock on YouTube/Spotify |
| **🛡 Stealth Mode** | *"Friday, stealth mode"* / *"Run silent"* | Mutes all audio instantly and switches to silent running |
| **⚡ Tactical Diagnostic Scan** | *"Friday, scan systems"* / *"System report"* | Tactical telemetry briefing (CPU, RAM, power cell, linked devices) |
| **🔒 Lockdown / Red Alert** | *"Friday, lockdown"* / *"Red alert"* / *"Lock workstation"* | Locks Windows workstation instantly |
| **🌐 Web & App Dispatch** | *"Friday, open YouTube / Chrome / Spotify / VS Code"* | Launches desktop applications in sub-150ms |
| **🔊 Master Audio** | *"Friday, volume up / down / mute"* | Controls Windows master volume |
| **📱 Mobile Telemetry & Unlock** | *"Friday, check phone battery"* / *"Unlock phone"* | Controls paired Android device via ADB bridge |

---

## 🛠 Technology Stack
- **Backend Core**: Node.js v24, Express, WebSockets (`ws`).
- **HUD Interface**: Vanilla HTML5, CSS3 Glassmorphism, Google Fonts (`Orbitron`, `Rajdhani`, `Share Tech Mono`).
- **Holographic Visuals**: Concentric rotating Arc Reactor rings, dynamic frequency waveform canvas.
- **Audio & Sound**: Pure Web Audio API synthesized sci-fi sound effects (chirps, confirm tones, bootup harmonic chord).
- **Voice Pipeline**: Web Speech Recognition (Wake-word detection) + Web Speech Synthesis (Irish / British female voice priority).
- **Windows Automation**: PowerShell execution for volume, battery, system telemetry, and application dispatch.
- **Android Bridge**: ADB over Wi-Fi / USB for remote app launches, key events, and screen captures.

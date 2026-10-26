# Sim POC Analyzer

A point-of-care lab simulator for clinical simulation education.
**SIMULATION ONLY — NOT FOR CLINICAL USE.** Reference ranges are generic teaching values, not any institution's.

## How it works
1. **Operator** (`operator.html`) picks a cartridge, enters values, and generates a QR code.
2. **Learner** (`learner.html`) taps **Insert Cartridge**, scans the code, waits through the countdown, and sees results.
3. Only the results are stored in the QR code, after the `#` in the link. Nothing is sent to a server.

## One-time setup: add the QR scanner library
The learner scanner uses the browser's built-in QR detector where it exists (Chrome on Android/macOS).
Everything else (iPhone/iPad, Windows, Firefox) needs **jsQR** (Apache-2.0). From the project folder:
```
curl -L https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js -o lib/jsQR.js
```
Without it, the learner can still scan with the phone's own camera app (the QR code opens the learner page directly).

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000/operator.html and http://localhost:8000/learner.html.
The camera and offline mode need **https or localhost**. For phones, host on GitHub Pages:
repo **Settings → Pages → Deploy from branch → main / root**.

## Learner controls
- **Insert Cartridge**: open the scanner (or run a cartridge that arrived via a link).
- **Skip countdown (facilitator)**: triple-tap the progress bar, or press **S** on a keyboard.
- Results show ↑/↓ for out-of-range, **CRITICAL VALUE** for criticals, `***` for suppressed, `<`/`>` beyond reportable range, `*` for calculated.

## Install on a device
Open `learner.html` on the hosted site → Share → **Add to Home Screen** (iOS) or menu → **Install app** (Android).
After the first visit it works offline.

## Files
| File | Purpose |
|---|---|
| `js/cartridges.js` | Analytes, cartridges, error scenarios |
| `js/ranges.js` | Teaching reference ranges and critical values (replace with your own) |
| `js/calc.js` | Calculated values, flags, QR payload format |
| `js/scenarios.js` | Example cases |
| `js/operator.js` | Operator page |
| `js/learner.js` | Learner screens: home, scan, countdown, results, errors |
| `js/scanner.js` | Camera + QR decoding (BarcodeDetector or jsQR) |
| `sw.js`, `js/sw-register.js`, `manifest.json`, `icons/` | Offline support and install |
| `lib/qrcode.js` | QR encoder (Kazuhiko Arase, MIT License) |
| `lib/jsQR.js` | QR decoder — **you add this** (see setup) |

When you change files, bump `CACHE` in `sw.js` so installed devices pick up the update.

## QR payload (v1)
`v=1&c=CG8&a=CHD&s=F&st=ART&dl=120&err=QCF&x=K&pH=7.21&pCO2=58...`
`c` cartridge · `a` age group (NB/INF/CHD/ADL) · `s` sex · `st` ART/VEN · `dl` seconds · `err` error code · `x` suppressed analytes

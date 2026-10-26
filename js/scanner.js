/* =====================================================================
   Sim POC Analyzer — scanner.js
   Camera QR scanning. Uses the browser's built-in BarcodeDetector when
   available (Chrome on Android/macOS), otherwise jsQR (lib/jsQR.js).
   ===================================================================== */
window.SPA = window.SPA || {};

SPA.Scanner = (function () {
  var stream = null, running = false, detector = null, canvas = null, ctx2d = null, rafId = 0;

  function engine() {
    if (detector) return "native";
    if (typeof window.jsQR === "function") return "jsqr";
    return null;
  }

  async function init() {
    if ("BarcodeDetector" in window) {
      try {
        var formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.indexOf("qr_code") > -1) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) { detector = null; }
    }
    return engine();
  }

  /* video: <video> element. onFound(text) called once. onError(message). */
  async function start(video, onFound, onError) {
    if (!(await init())) {
      onError("No QR scanner available in this browser. Add lib/jsQR.js (see README), or scan with the phone camera app.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError(window.isSecureContext ? "This browser cannot use the camera."
        : "Camera requires https (or localhost). Open the hosted version of this page.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (e) {
      onError(e && e.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again."
        : "Could not start the camera (" + (e && e.name || "error") + ").");
      return;
    }
    video.srcObject = stream;
    try { await video.play(); } catch (e) {}
    running = true;
    canvas = canvas || document.createElement("canvas");
    ctx2d = ctx2d || canvas.getContext("2d", { willReadFrequently: true });

    var busy = false, last = 0;
    var tick = async function (t) {
      if (!running) return;
      rafId = requestAnimationFrame(tick);
      if (busy || t - last < 120 || video.readyState < 2) return;   // ~8 scans/sec
      busy = true; last = t;
      try {
        var text = null;
        if (detector) {
          var codes = await detector.detect(video);
          if (codes && codes.length) text = codes[0].rawValue;
        } else {
          var w = video.videoWidth, h = video.videoHeight;
          var scale = Math.min(1, 640 / Math.max(w, h));            // keep it fast on phones
          canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
          ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
          var img = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
          var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code) text = code.data;
        }
        if (text && running) { stop(); onFound(text); }
      } catch (e) { /* ignore a bad frame */ }
      busy = false;
    };
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    if (stream) { stream.getTracks().forEach(function (tr) { tr.stop(); }); stream = null; }
  }

  return { start: start, stop: stop, init: init };
})();

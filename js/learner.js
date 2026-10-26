/* =====================================================================
   Sim POC Analyzer — learner.js
   Flow: Home → Insert Cartridge (scan) → Analyzing (countdown) → Results / Error
   Also accepts a cartridge from the link (#v=1&c=...) when a phone camera
   app opens the QR code directly.
   ===================================================================== */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var views = ["home", "scan", "run", "res", "err"];
  var pending = null;     // cartridge read from the link, waiting for "Insert"
  var timer = 0, wakeLock = null;

  function show(name) {
    views.forEach(function (v) { $("v-" + v).classList.toggle("hidden", v !== name); });
  }

  /* ---------- clock ---------- */
  function clock() {
    var d = new Date();
    $("clock").textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  clock(); setInterval(clock, 15000);

  /* ---------- keep screen awake during a test (where supported) ---------- */
  async function wake(on) {
    try {
      if (on && "wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", function () { wakeLock = null; });
      } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }

  /* ---------- home ---------- */
  function goHome() {
    clearInterval(timer); SPA.Scanner.stop(); wake(false);
    $("homeMsg").textContent = pending
      ? "Cartridge detected (" + SPA.CARTRIDGES[pending.c].name + "). Press Insert Cartridge to run."
      : "Insert a cartridge to begin a test.";
    show("home");
    $("btnInsert").focus();
  }

  $("btnInsert").addEventListener("click", function () {
    if (pending) { var s = pending; pending = null; runTest(s); return; }
    startScan();
  });

  /* ---------- scan ---------- */
  function startScan() {
    show("scan");
    $("scanMsg").textContent = "Starting camera…";
    SPA.Scanner.start($("video"), onScanned, function (msg) {
      $("scanMsg").textContent = msg;
    }).then(function () {
      if ($("scanMsg").textContent === "Starting camera…")
        $("scanMsg").textContent = "Hold the cartridge code inside the box.";
    });
  }
  $("btnCancelScan").addEventListener("click", goHome);

  function onScanned(text) {
    if (navigator.vibrate) navigator.vibrate(60);
    var s = SPA.decode(text);
    if (!s) {
      showError({ title: "Cartridge Error", l1: "Cartridge not recognized.", l2: "Use another cartridge.", code: "Code: UNREC" });
      return;
    }
    runTest(s);
  }

  /* ---------- analyzing countdown ---------- */
  function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }

  function runTest(s) {
    wake(true);
    show("run");
    $("runCart").textContent = SPA.CARTRIDGES[s.c].name;
    var total = s.dl, start = Date.now();
    var done = function () { clearInterval(timer); finish(s); };
    var step = function () {
      var el = (Date.now() - start) / 1000, pct = total ? Math.min(100, el / total * 100) : 100;
      $("barFill").style.width = pct + "%";
      $("bar").setAttribute("aria-valuenow", Math.round(pct));
      $("runTime").textContent = fmt(total - el);
      if (el >= total) done();
    };
    clearInterval(timer); step();
    if (total > 0) timer = setInterval(step, 250);
    runTest.skip = done;
  }

  /* Facilitator skip: triple-tap the progress bar, or press S on a keyboard */
  var taps = [];
  $("bar").addEventListener("click", function () {
    var now = Date.now(); taps = taps.filter(function (t) { return now - t < 700; }); taps.push(now);
    if (taps.length >= 3 && !$("v-run").classList.contains("hidden") && runTest.skip) { taps = []; runTest.skip(); }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "s" || e.key === "S") && !$("v-run").classList.contains("hidden") && runTest.skip) runTest.skip();
  });

  /* ---------- results / errors ---------- */
  function finish(s) {
    wake(false);
    if (s.err) {
      var e = SPA.ERRORS[s.err];
      showError({ title: e.screen[0], l1: e.screen[1], l2: e.screen[2], code: "Code: " + s.err });
      return;
    }
    showResults(s);
  }

  function showError(e) {
    wake(false);
    $("h-err").textContent = e.title; $("errL1").textContent = e.l1;
    $("errL2").textContent = e.l2; $("errCode").textContent = e.code || "";
    show("err"); $("h-err").focus();
  }
  $("btnErrOk").addEventListener("click", goHome);

  var ARROW = { L: "↓", LL: "↓", H: "↑", HH: "↑", "<": "", ">": "", "": "", "***": "" };

  function showResults(s) {
    var ctx = { a: s.a, s: s.s, st: s.st };
    var rows = SPA.buildResults(s.c, s.m, ctx, s.x);
    var cart = SPA.CARTRIDGES[s.c];
    $("h-res").textContent = cart.name;
    var meta = [];
    if (cart.gas) meta.push(s.st === "VEN" ? "Venous" : "Arterial");
    meta.push(SPA.AGE_GROUPS[s.a].split(" (")[0]);
    var d = new Date();
    meta.push(d.toLocaleDateString([], { month: "2-digit", day: "2-digit" }) + " " +
              String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
    $("resMeta").textContent = meta.join(" · ");

    var list = $("resList"); list.innerHTML = "";
    var anyCalc = false, anyCrit = false;
    rows.forEach(function (r) {
      var div = document.createElement("div");
      div.className = "row " + (r.calc ? "calc " : "") + (/^(L|LL|H|HH)$/.test(r.flag) ? r.flag : "");
      if (r.calc) anyCalc = true;
      var arrow = ARROW[r.flag] || "";
      var srFlag = { L: "low", H: "high", LL: "critical low", HH: "critical high" }[r.flag] || "";
      div.innerHTML =
        '<span class="an"></span><span class="val"></span><span class="unit"></span>' +
        '<span class="fl" aria-hidden="true">' + arrow + "</span>";
      div.querySelector(".an").textContent = r.label;
      div.querySelector(".val").textContent = r.text;
      div.querySelector(".unit").textContent = r.unit || "";
      div.setAttribute("aria-label", r.label + " " + r.text + " " + (r.unit || "") + (srFlag ? ", " + srFlag : ""));
      if (r.flag === "LL" || r.flag === "HH") {
        anyCrit = true;
        var c = document.createElement("span"); c.className = "crit"; c.textContent = "CRITICAL VALUE";
        div.appendChild(c);
      }
      list.appendChild(div);
    });
    var foot = [];
    if (anyCalc) foot.push("* Calculated");
    if (anyCrit) foot.push("Notify provider of critical values");
    foot.push("↑↓ outside reference range · *** result unavailable");
    $("resFoot").textContent = foot.join(" · ");
    show("res"); $("h-res").focus();
  }
  $("btnNew").addEventListener("click", goHome);

  /* ---------- cartridge from the link (phone camera opened the QR) ---------- */
  function readHash() {
    if (!location.hash || location.hash.length < 3) return;
    var s = SPA.decode(location.hash);
    // Remove values from the address bar so the learner can't read them early
    history.replaceState(null, "", location.pathname + location.search);
    if (s) pending = s;
    else { showError({ title: "Cartridge Error", l1: "Cartridge not recognized.", l2: "Use another cartridge.", code: "Code: UNREC" }); return true; }
  }
  window.addEventListener("hashchange", function () { if (!readHash()) goHome(); });

  if (!readHash()) goHome();
})();

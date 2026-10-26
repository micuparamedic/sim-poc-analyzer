/* =====================================================================
   Sim POC Analyzer — operator.js
   Operator panel: enter values → preview flags/calculations → QR code.
   ===================================================================== */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var values = {};        // remembered across cartridge switches
  var suppressed = {};    // key -> true
  var lastPayload = null;

  /* ---------- populate dropdowns ---------- */
  function fill(sel, obj, labelFn) {
    Object.keys(obj).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = labelFn(obj[k], k); sel.appendChild(o);
    });
  }
  fill($("cart"), SPA.CARTRIDGES, function (c) { return c.name; });
  fill($("age"), SPA.AGE_GROUPS, function (l) { return l; });
  fill($("err"), SPA.ERRORS, function (e) { return e.label; });
  SPA.SCENARIOS.forEach(function (s, i) {
    var o = document.createElement("option"); o.value = i; o.textContent = s.name;
    $("scenario").appendChild(o);
  });
  $("age").value = "CHD";
  $("dl").value = SPA.CARTRIDGES[$("cart").value].time;

  /* ---------- read current state ---------- */
  function ctx() { return { a: $("age").value, s: $("sex").value, st: $("st").value }; }
  function state() {
    var c = $("cart").value, cart = SPA.CARTRIDGES[c], m = {}, x = [];
    cart.measured.forEach(function (k) {
      if (SPA.isNum(values[k])) m[k] = values[k];
      if (suppressed[k]) x.push(k);
    });
    var dl = parseInt($("dl").value, 10);
    if (!SPA.isNum(dl)) dl = cart.time;
    dl = Math.max(0, Math.min(900, dl));
    return { c: c, a: $("age").value, s: $("sex").value, st: $("st").value,
             dl: dl, err: $("err").value, x: x, m: m };
  }

  function rangeText(r, dp) {
    if (!r) return "—";
    return r[0].toFixed(dp) + "–" + r[1].toFixed(dp);
  }
  function flagHtml(f) {
    if (f === "***") return '<span class="flag">***</span>';
    if (f === "<" || f === ">") return '<span class="flag out" title="Outside reportable range">' + f + "</span>";
    if (f === "LL" || f === "HH") return '<span class="flag ' + f + '" title="Critical">' + (f === "LL" ? "↓ CRIT" : "↑ CRIT") + "</span>";
    if (f === "L") return '<span class="flag L">↓ L</span>';
    if (f === "H") return '<span class="flag H">↑ H</span>';
    return '<span class="flag">—</span>';
  }

  /* ---------- build measured table (on cartridge change) ---------- */
  function buildMeasured() {
    var cart = SPA.CARTRIDGES[$("cart").value];
    $("stWrap").classList.toggle("hidden", !cart.gas);
    var body = $("measuredBody"); body.innerHTML = "";
    cart.measured.forEach(function (k) {
      var a = SPA.ANALYTES[k];
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="an"><label for="v_' + k + '">' + a.label + "</label></td>" +
        '<td><input type="number" inputmode="decimal" step="any" id="v_' + k + '"></td>' +
        '<td class="unit">' + (a.unit || "") + "</td>" +
        '<td class="rng" id="r_' + k + '"></td>' +
        '<td id="f_' + k + '"></td>' +
        '<td><input type="checkbox" id="x_' + k + '" aria-label="Suppress ' + a.label + '"></td>';
      body.appendChild(tr);
      var inp = tr.querySelector("#v_" + k);
      if (SPA.isNum(values[k])) inp.value = values[k];
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (SPA.isNum(v)) values[k] = v; else delete values[k];
        refresh();
      });
      var cb = tr.querySelector("#x_" + k);
      cb.checked = !!suppressed[k];
      cb.addEventListener("change", function () { suppressed[k] = cb.checked; refresh(); });
    });
    $("calcCard").classList.toggle("hidden", cart.calculated.length === 0);
  }

  /* ---------- refresh flags, calculations, warnings ---------- */
  function refresh() {
    var s = state(), c = ctx();
    var rows = SPA.buildResults(s.c, s.m, c, s.x);
    var cart = SPA.CARTRIDGES[s.c];
    var calcBody = $("calcBody"); calcBody.innerHTML = "";
    rows.forEach(function (row) {
      var a = SPA.ANALYTES[row.key];
      if (!row.calc) {
        $("r_" + row.key).textContent = rangeText(row.range, a.dp);
        $("f_" + row.key).innerHTML = flagHtml(row.flag);
      } else {
        var tr = document.createElement("tr"); tr.className = "calc";
        tr.innerHTML = '<td class="an">' + row.label + "</td><td>" + row.text + "</td>" +
          '<td class="unit">' + (row.unit || "") + '</td><td class="rng">' + rangeText(row.range, a.dp) +
          "</td><td>" + flagHtml(row.flag) + "</td>";
        calcBody.appendChild(tr);
      }
    });
    showWarnings(s, rows, cart);
    if (lastPayload !== null) $("stale").classList.toggle("hidden", SPA.encode(s) === lastPayload);
  }

  function showWarnings(s, rows, cart) {
    var w = [];
    var missing = cart.measured.filter(function (k) { return !SPA.isNum(s.m[k]) && s.x.indexOf(k) < 0; });
    if (missing.length) w.push("No value for " + missing.map(function (k) { return SPA.ANALYTES[k].label; }).join(", ") + " — learner will see ***.");
    rows.forEach(function (r) {
      if (!r.calc && (r.flag === "<" || r.flag === ">"))
        w.push(r.label + " is outside the reportable range — learner will see " + r.text + ".");
    });
    var byKey = {}; rows.forEach(function (r) { byKey[r.key] = r; });
    if (byKey.HCO3 && SPA.isNum(byKey.HCO3.value) && (byKey.HCO3.value < 4 || byKey.HCO3.value > 50))
      w.push("Calculated HCO3 is " + byKey.HCO3.value.toFixed(1) + " — check that pH and PCO2 make sense together.");
    if (byKey.AnGap && SPA.isNum(byKey.AnGap.value) && (byKey.AnGap.value < 0 || byKey.AnGap.value > 40))
      w.push("Anion gap is " + byKey.AnGap.value.toFixed(0) + " — check Na, K, Cl, and TCO2.");
    if (s.st === "VEN" && SPA.isNum(s.m.pO2) && s.m.pO2 > 60 && cart.gas)
      w.push("PO2 above 60 is unusual for a venous sample.");
    if (s.err) w.push("Error scenario is on — learner will see the error, not results.");
    var box = $("warnings");
    if (!w.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
    box.classList.remove("hidden");
    box.innerHTML = "<strong>Check before generating:</strong><ul>" +
      w.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  }

  /* ---------- QR ---------- */
  function learnerUrl(payload) {
    return new URL("learner.html", location.href).href.split("#")[0] + "#" + payload;
  }
  function qrText(payload) { return $("incUrl").checked ? learnerUrl(payload) : payload; }

  function drawQR(text) {
    var qr = new QRCode(-1, QRCode.ErrorCorrectLevel.M);
    qr.addData(text); qr.make();
    var n = qr.getModuleCount(), quiet = 4, scale = 8, size = (n + quiet * 2) * scale;
    var cv = $("qr"); cv.width = size; cv.height = size;
    var g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.fillStyle = "#000";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
      if (qr.isDark(r, c)) g.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    return n;
  }

  function generate() {
    var s = state();
    var payload = SPA.encode(s), text = qrText(payload);
    var n;
    try { n = drawQR(text); }
    catch (e) { $("status").textContent = "Could not create QR code: " + e.message; return; }
    lastPayload = payload;
    $("qrEmpty").classList.add("hidden");
    $("qr").classList.remove("hidden");
    $("stale").classList.add("hidden");
    $("qrMeta").textContent = SPA.CARTRIDGES[s.c].name + " · " + text.length + " characters · " + n + "×" + n + " modules";
    ["print", "copy", "open"].forEach(function (id) { $(id).disabled = false; });
    $("status").textContent = location.protocol === "file:" && $("incUrl").checked
      ? "Note: the link points to a file on this computer. Phones can open it only after the site is hosted (https)."
      : "Cartridge ready.";
  }

  /* ---------- buttons ---------- */
  $("gen").addEventListener("click", generate);
  $("incUrl").addEventListener("change", function () { if (lastPayload !== null) generate(); });

  $("print").addEventListener("click", function () {
    $("plName").textContent = SPA.CARTRIDGES[$("cart").value].name;
    $("plImg").src = $("qr").toDataURL("image/png");
    setTimeout(function () { window.print(); }, 50);
  });

  $("copy").addEventListener("click", function () {
    var link = learnerUrl(lastPayload);
    var done = function () { $("status").textContent = "Learner link copied."; };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(done, function () { fallbackCopy(link); done(); });
    } else { fallbackCopy(link); done(); }
  });
  function fallbackCopy(t) {
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta);
    ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove();
  }

  $("open").addEventListener("click", function () { window.open(learnerUrl(lastPayload), "_blank"); });

  /* ---------- setup changes ---------- */
  $("cart").addEventListener("change", function () {
    $("dl").value = SPA.CARTRIDGES[$("cart").value].time;
    buildMeasured(); refresh();
  });
  ["age", "sex", "st", "dl", "err"].forEach(function (id) {
    $(id).addEventListener(id === "dl" ? "input" : "change", refresh);
  });

  $("scenario").addEventListener("change", function () {
    var sc = SPA.SCENARIOS[$("scenario").value];
    if (!sc) { values = {}; suppressed = {}; buildMeasured(); refresh(); return; }
    values = Object.assign({}, sc.m); suppressed = {};
    $("cart").value = sc.c; $("age").value = sc.a; $("sex").value = sc.s;
    if (sc.st) $("st").value = sc.st;
    $("dl").value = SPA.CARTRIDGES[sc.c].time; $("err").value = "";
    buildMeasured(); refresh();
  });

  buildMeasured(); refresh();
})();

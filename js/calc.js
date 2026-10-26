/* =====================================================================
   Sim POC Analyzer — calc.js
   Calculated values, flags, and the QR payload format.
   Shared by the operator and learner pages.
   SIMULATION ONLY — NOT FOR CLINICAL USE.
   ===================================================================== */
window.SPA = window.SPA || {};

/* ---------- Calculated values ----------
   Standard blood gas / chemistry formulas used by point-of-care analyzers.
   m = measured values object, e.g. { pH: 7.21, pCO2: 58, ... }            */
SPA.calc = {
  HCO3: function (m) {
    if (!isNum(m.pH) || !isNum(m.pCO2)) return null;
    return Math.pow(10, m.pH + Math.log10(m.pCO2) - 7.608);
  },
  TCO2: function (m) {
    if (isNum(m.TCO2)) return m.TCO2;               // measured on CHEM8+
    var h = SPA.calc.HCO3(m);
    return h === null ? null : h + 0.03 * m.pCO2;
  },
  BE: function (m) {
    var h = SPA.calc.HCO3(m);
    return h === null ? null : h - 24.8 + 16.2 * (m.pH - 7.4);
  },
  sO2: function (m) {
    if (!isNum(m.pO2) || !isNum(m.pH)) return null;
    var be = SPA.calc.BE(m) || 0;
    var x = m.pO2 * Math.pow(10, 0.48 * (m.pH - 7.4) - 0.0013 * be);
    var x3 = x * x * x;
    return 100 * (x3 + 150 * x) / (x3 + 150 * x + 23400);
  },
  Hb: function (m) {
    return isNum(m.Hct) ? m.Hct * 0.34 : null;
  },
  AnGap: function (m) {
    var t = SPA.calc.TCO2(m);
    if (![m.Na, m.K, m.Cl, t].every(isNum)) return null;
    return m.Na + m.K - (m.Cl + t);
  },
  PT: function (m) {
    // Teaching model: INR = (PT / 12.0)^ISI with ISI = 1.0
    return isNum(m.INR) ? 12.0 * m.INR : null;
  }
};

function isNum(v) { return typeof v === "number" && isFinite(v); }
SPA.isNum = isNum;

/* Builds the full result list for a cartridge.
   suppressed = array of analyte keys to show as *** */
SPA.buildResults = function (cartKey, measured, ctx, suppressed) {
  var cart = SPA.CARTRIDGES[cartKey];
  suppressed = suppressed || [];
  var out = [];
  cart.measured.forEach(function (k) {
    out.push(SPA.resultRow(k, suppressed.indexOf(k) > -1 ? null : measured[k], ctx, false));
  });
  cart.calculated.forEach(function (k) {
    // A calculated value is suppressed if any of its inputs is suppressed
    var deps = { HCO3:["pH","pCO2"], TCO2:["pH","pCO2","TCO2"], BE:["pH","pCO2"],
                 sO2:["pH","pCO2","pO2"], Hb:["Hct"], AnGap:["Na","K","Cl","pH","pCO2","TCO2"], PT:["INR"] }[k] || [];
    var blocked = deps.some(function (d) { return suppressed.indexOf(d) > -1; });
    var m = Object.assign({}, measured);
    if (cartKey === "EC8" || cartKey === "CG8" || cartKey === "CG4") delete m.TCO2;
    var v = blocked ? null : SPA.calc[k](m);
    out.push(SPA.resultRow(k, v, ctx, true));
  });
  return out;
};

/* One display row: value, formatted text, and flag.
   flag: "" normal | "L" low | "H" high | "LL" critical low | "HH" critical high
         "***" suppressed/unavailable | "<" ">" outside reportable range           */
SPA.resultRow = function (key, v, ctx, isCalc) {
  var a = SPA.ANALYTES[key];
  var row = { key: key, label: a.label, unit: a.unit, calc: isCalc, value: v,
              text: "***", flag: "***", range: SPA.lookupRange(SPA.RANGES, key, ctx) };
  if (!isNum(v)) return row;
  if (v < a.report[0]) { row.text = "<" + a.report[0].toFixed(a.dp); row.flag = "<"; return row; }
  if (v > a.report[1]) { row.text = ">" + a.report[1].toFixed(a.dp); row.flag = ">"; return row; }
  row.text = v.toFixed(a.dp);
  if (row.text === "-0") row.text = "0";
  row.flag = "";
  var r = row.range, c = SPA.lookupRange(SPA.CRITICALS, key, ctx);
  var shown = parseFloat(row.text);                // flag what the learner sees
  if (r && shown < r[0]) row.flag = "L";
  if (r && shown > r[1]) row.flag = "H";
  if (c && c[0] !== null && shown < c[0]) row.flag = "LL";
  if (c && c[1] !== null && shown > c[1]) row.flag = "HH";
  return row;
};

/* ---------- QR payload ----------
   Format (URL hash, so values never reach a server):
   v=1&c=CG8&a=CHD&s=F&st=ART&dl=120&err=&x=K,Glu&pH=7.21&pCO2=58...
     v   format version          c   cartridge key
     a   age group               s   sex (M/F)
     st  sample type (ART/VEN)   dl  analysis time in seconds
     err error code (optional)   x   suppressed analytes (optional)           */
SPA.PAYLOAD_VERSION = "1";

SPA.encode = function (state) {
  var cart = SPA.CARTRIDGES[state.c];
  var p = ["v=" + SPA.PAYLOAD_VERSION, "c=" + state.c, "a=" + state.a, "s=" + state.s];
  if (cart.gas) p.push("st=" + state.st);
  p.push("dl=" + state.dl);
  if (state.err) p.push("err=" + state.err);
  if (state.x && state.x.length) p.push("x=" + state.x.join(","));
  cart.measured.forEach(function (k) {
    if (isNum(state.m[k])) p.push(k + "=" + state.m[k]);
  });
  return p.join("&");
};

SPA.decode = function (str) {
  str = String(str || "");
  var i = str.indexOf("#"); if (i > -1) str = str.slice(i + 1);
  var q = {};
  str.split("&").forEach(function (pair) {
    var j = pair.indexOf("="); if (j < 1) return;
    q[decodeURIComponent(pair.slice(0, j))] = decodeURIComponent(pair.slice(j + 1));
  });
  if (q.v !== SPA.PAYLOAD_VERSION || !SPA.CARTRIDGES[q.c]) return null;   // not our cartridge
  var cart = SPA.CARTRIDGES[q.c];
  var state = {
    c: q.c,
    a: SPA.AGE_GROUPS[q.a] ? q.a : "CHD",
    s: q.s === "M" ? "M" : "F",
    st: q.st === "VEN" ? "VEN" : "ART",
    dl: Math.max(0, Math.min(900, isNaN(parseInt(q.dl, 10)) ? cart.time : parseInt(q.dl, 10))),
    err: SPA.ERRORS[q.err] ? q.err : "",
    x: q.x ? q.x.split(",").filter(function (k) { return SPA.ANALYTES[k]; }) : [],
    m: {}
  };
  cart.measured.forEach(function (k) {
    var v = parseFloat(q[k]); if (isNum(v)) state.m[k] = v;
  });
  return state;
};

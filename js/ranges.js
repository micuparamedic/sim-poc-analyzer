/* =====================================================================
   Sim POC Analyzer — ranges.js
   TEACHING REFERENCE RANGES — SIMULATION ONLY — NOT FOR CLINICAL USE.
   These are simplified, generic approximations for training. They are
   NOT any institution's ranges. Replace this file with your own
   institution's values before using it for local training.

   Age groups:  NB = newborn (0–28 days)   INF = infant (1–12 months)
                CHD = child (1–12 years)   ADL = adolescent/adult (13+ years)

   Format per analyte (any level can be split):
     [low, high]                         same for everyone
     { NB:[..], INF:[..], CHD:[..], ADL:[..] }       by age group
     { ART:{...}, VEN:{...} }            by sample type (blood gas values)
     { M:[..], F:[..] }                  by sex (inside an age group)
   ===================================================================== */
window.SPA = window.SPA || {};

SPA.AGE_GROUPS = {
  NB:  "Newborn (0–28 days)",
  INF: "Infant (1–12 months)",
  CHD: "Child (1–12 years)",
  ADL: "Adolescent/Adult (13+ years)"
};

SPA.RANGES = {
  pH: {
    ART: { NB: [7.30, 7.45], INF: [7.34, 7.45], CHD: [7.35, 7.45], ADL: [7.35, 7.45] },
    VEN: [7.31, 7.41]
  },
  pCO2: {
    ART: { NB: [30, 45], INF: [30, 45], CHD: [32, 45], ADL: [35, 45] },
    VEN: [40, 52]
  },
  pO2: {
    ART: { NB: [60, 90], INF: [80, 100], CHD: [80, 100], ADL: [80, 100] },
    VEN: [30, 50]
  },
  HCO3: {
    ART: { NB: [17, 24], INF: [19, 25], CHD: [20, 26], ADL: [22, 26] },
    VEN: [22, 28]
  },
  TCO2: { NB: [17, 24], INF: [19, 26], CHD: [20, 28], ADL: [23, 29] },
  BE:   { NB: [-6, 0],  INF: [-5, 1],   CHD: [-4, 2],  ADL: [-2, 3] },
  sO2: {
    ART: { NB: [92, 99], INF: [95, 99], CHD: [95, 99], ADL: [95, 99] },
    VEN: [60, 85]
  },
  Na:   { NB: [133, 146], INF: [134, 144], CHD: [135, 145], ADL: [135, 145] },
  K:    { NB: [3.7, 5.9], INF: [4.1, 5.3], CHD: [3.5, 5.0], ADL: [3.5, 5.0] },
  Cl:   { NB: [97, 108],  INF: [98, 107],  CHD: [98, 107],  ADL: [98, 107] },
  iCa:  { NB: [1.05, 1.37], INF: [1.10, 1.35], CHD: [1.12, 1.32], ADL: [1.12, 1.32] },
  Glu:  { NB: [50, 110],  INF: [60, 110],  CHD: [70, 110],  ADL: [70, 110] },
  BUN:  { NB: [3, 12],    INF: [5, 18],    CHD: [5, 18],    ADL: [7, 20] },
  Crea: { NB: [0.3, 1.0], INF: [0.2, 0.4], CHD: [0.3, 0.7], ADL: [0.5, 1.1] },
  Hct:  { NB: [42, 65], INF: [30, 42], CHD: [33, 43], ADL: { M: [40, 52], F: [36, 46] } },
  Hb:   { NB: [14.0, 22.0], INF: [10.0, 14.0], CHD: [11.0, 14.5],
          ADL: { M: [13.5, 17.5], F: [12.0, 15.5] } },
  AnGap:[10, 20],
  Lac:  { NB: [0.5, 2.5], INF: [0.5, 2.0], CHD: [0.5, 2.0], ADL: [0.5, 2.0] },
  INR:  { NB: [0.9, 1.6], INF: [0.9, 1.2], CHD: [0.9, 1.2], ADL: [0.9, 1.2] },
  PT:   { NB: [10.8, 19.2], INF: [10.8, 14.4], CHD: [10.8, 14.4], ADL: [10.8, 14.4] },
  cTnI: [0.00, 0.08]
};

/* TEACHING CRITICAL VALUES — values at or beyond these get a critical flag.
   Same structure as ranges. Use null for "no critical limit on this side." */
SPA.CRITICALS = {
  pH:   [7.20, 7.60],
  pCO2: { ART: [20, 70], VEN: [null, null] },
  pO2:  { ART: { NB: [40, null], INF: [45, null], CHD: [45, null], ADL: [45, null] },
          VEN: [null, null] },
  Na:   [120, 160],
  K:    { NB: [2.8, 7.0], INF: [2.8, 6.5], CHD: [2.8, 6.2], ADL: [2.8, 6.2] },
  iCa:  [0.80, 1.60],
  Glu:  { NB: [40, 300], INF: [50, 400], CHD: [50, 400], ADL: [50, 400] },
  Hct:  { NB: [30, 70], INF: [20, 60], CHD: [20, 60], ADL: [20, 60] },
  Hb:   { NB: [10.0, 23.0], INF: [7.0, 20.0], CHD: [7.0, 20.0], ADL: [7.0, 20.0] },
  Lac:  [null, 4.0],
  INR:  [null, 4.0],
  cTnI: [null, 0.08]
};

/* Walks the structure above and returns [low, high] (or null). */
SPA.lookupRange = function (table, key, ctx) {
  var node = table[key];
  var order = [ctx.st || "ART", ctx.a || "CHD", ctx.s || "F"];
  var guard = 0;
  while (node && !Array.isArray(node) && guard++ < 5) {
    var next = null;
    for (var i = 0; i < order.length; i++) {
      if (node[order[i]] !== undefined) { next = node[order[i]]; break; }
    }
    if (!next) { // e.g., sex split but no sex supplied
      var k = Object.keys(node)[0]; next = node[k];
    }
    node = next;
  }
  return Array.isArray(node) ? node : null;
};

/* =====================================================================
   Sim POC Analyzer — scenarios.js
   Example cases to load on the operator page. Fictional teaching values.
   ===================================================================== */
window.SPA = window.SPA || {};

SPA.SCENARIOS = [
  { name: "Normal child (CG8+, arterial)",
    c: "CG8", a: "CHD", s: "F", st: "ART",
    m: { pH: 7.40, pCO2: 40, pO2: 92, Na: 139, K: 4.1, iCa: 1.22, Glu: 92, Hct: 38 } },

  { name: "DKA (EC8+, venous)",
    c: "EC8", a: "CHD", s: "M", st: "VEN",
    m: { pH: 7.08, pCO2: 24, Na: 131, K: 5.8, Cl: 100, Glu: 485, BUN: 24, Hct: 46 } },

  { name: "Septic shock with lactate (CG4+, arterial)",
    c: "CG4", a: "INF", s: "F", st: "ART",
    m: { pH: 7.21, pCO2: 31, pO2: 68, Lac: 6.4 } },

  { name: "Acute respiratory failure (CG8+, arterial)",
    c: "CG8", a: "CHD", s: "M", st: "ART",
    m: { pH: 7.16, pCO2: 82, pO2: 54, Na: 138, K: 4.6, iCa: 1.18, Glu: 148, Hct: 36 } },

  { name: "Hyperkalemia / AKI (CHEM8+)",
    c: "CHEM8", a: "ADL", s: "F", st: "ART",
    m: { Na: 132, K: 7.1, Cl: 104, iCa: 1.02, TCO2: 15, Glu: 118, BUN: 68, Crea: 3.4, Hct: 29 } },

  { name: "Neonatal hypoglycemia (CHEM8+)",
    c: "CHEM8", a: "NB", s: "M", st: "ART",
    m: { Na: 138, K: 5.2, Cl: 104, iCa: 1.15, TCO2: 20, Glu: 32, BUN: 8, Crea: 0.6, Hct: 52 } },

  { name: "Supratherapeutic INR (PT/INR)",
    c: "PTINR", a: "ADL", s: "M",
    m: { INR: 4.8 } },

  { name: "Myocarditis — elevated troponin (cTnI)",
    c: "CTNI", a: "CHD", s: "F",
    m: { cTnI: 2.35 } }
];

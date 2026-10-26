/* =====================================================================
   Sim POC Analyzer — cartridges.js
   Defines every analyte and every cartridge.
   To add a cartridge: add an entry to CARTRIDGES. To add an analyte:
   add it to ANALYTES and give it ranges in ranges.js.
   SIMULATION ONLY — NOT FOR CLINICAL USE.
   ===================================================================== */
window.SPA = window.SPA || {};

/* key       : short code used in the QR payload
   label     : what the screen shows
   unit      : display unit
   dp        : decimal places shown
   report    : [low, high] reportable range. Values outside it display as <low or >high
   gas       : true if the reference range depends on arterial vs venous sample       */
SPA.ANALYTES = {
  pH:   { label: "pH",    unit: "",       dp: 3, report: [6.5, 8.2],  gas: true },
  pCO2: { label: "PCO2",  unit: "mmHg",   dp: 1, report: [5, 130],    gas: true },
  pO2:  { label: "PO2",   unit: "mmHg",   dp: 0, report: [5, 800],    gas: true },
  HCO3: { label: "HCO3",  unit: "mmol/L", dp: 1, report: [1, 85],     gas: true },
  TCO2: { label: "TCO2",  unit: "mmol/L", dp: 0, report: [5, 50] },
  BE:   { label: "BEecf", unit: "mmol/L", dp: 0, report: [-30, 30] },
  sO2:  { label: "sO2",   unit: "%",      dp: 0, report: [0, 100],    gas: true },
  Na:   { label: "Na",    unit: "mmol/L", dp: 0, report: [100, 180] },
  K:    { label: "K",     unit: "mmol/L", dp: 1, report: [2.0, 9.0] },
  Cl:   { label: "Cl",    unit: "mmol/L", dp: 0, report: [65, 140] },
  iCa:  { label: "iCa",   unit: "mmol/L", dp: 2, report: [0.25, 2.5] },
  Glu:  { label: "Glu",   unit: "mg/dL",  dp: 0, report: [20, 700] },
  BUN:  { label: "BUN",   unit: "mg/dL",  dp: 0, report: [3, 140] },
  Crea: { label: "Crea",  unit: "mg/dL",  dp: 1, report: [0.2, 20] },
  Hct:  { label: "Hct",   unit: "%PCV",   dp: 0, report: [15, 75] },
  Hb:   { label: "Hb",    unit: "g/dL",   dp: 1, report: [5.1, 25.5] },
  AnGap:{ label: "AnGap", unit: "mmol/L", dp: 0, report: [-10, 99] },
  Lac:  { label: "Lac",   unit: "mmol/L", dp: 2, report: [0.3, 20] },
  INR:  { label: "INR",   unit: "",       dp: 1, report: [0.9, 8.0] },
  PT:   { label: "PT",    unit: "sec",    dp: 1, report: [10.8, 96] },
  cTnI: { label: "cTnI",  unit: "ng/mL",  dp: 2, report: [0.00, 50] }
};

/* measured   : operator enters these (and they travel in the QR code)
   calculated : the app computes these from measured values (see calc.js)
   gas        : cartridge needs an arterial/venous choice
   time       : simulated analysis time in seconds (operator can override)          */
SPA.CARTRIDGES = {
  CG8:   { name: "CG8+",   measured: ["pH","pCO2","pO2","Na","K","iCa","Glu","Hct"],
           calculated: ["HCO3","TCO2","BE","sO2","Hb"], gas: true, time: 120 },
  CHEM8: { name: "CHEM8+", measured: ["Na","K","Cl","iCa","TCO2","Glu","BUN","Crea","Hct"],
           calculated: ["Hb","AnGap"], gas: false, time: 120 },
  CG4:   { name: "CG4+",   measured: ["pH","pCO2","pO2","Lac"],
           calculated: ["HCO3","TCO2","BE","sO2"], gas: true, time: 120 },
  EC8:   { name: "EC8+",   measured: ["pH","pCO2","Na","K","Cl","Glu","BUN","Hct"],
           calculated: ["HCO3","TCO2","BE","AnGap","Hb"], gas: true, time: 120 },
  PTINR: { name: "PT/INR", measured: ["INR"],
           calculated: ["PT"], gas: false, time: 180 },
  CTNI:  { name: "cTnI",   measured: ["cTnI"],
           calculated: [], gas: false, time: 600 }
};

/* Error scenarios the operator can inject instead of (or before) results. */
SPA.ERRORS = {
  "":    { label: "None — show results" },
  QCF:   { label: "Cartridge quality check failed",
           screen: ["Cartridge Error", "Quality check failed.", "Use another cartridge."] },
  SAMP:  { label: "Sample did not reach fill line",
           screen: ["Sample Error", "Sample short of fill line.", "Use another cartridge."] },
  BUBL:  { label: "Air bubble / insufficient sample",
           screen: ["Sample Error", "Air detected in sample.", "Use another cartridge."] },
  TEMP:  { label: "Analyzer temperature out of range",
           screen: ["Analyzer Error", "Temperature out of range.", "Allow to reach room temp and retest."] },
  BATT:  { label: "Low battery",
           screen: ["Analyzer Error", "Battery too low to test.", "Replace batteries and retest."] }
};

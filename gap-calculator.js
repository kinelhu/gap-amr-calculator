"use strict";

// ── Configuration ──────────────────────────────────────────────────────────────
//
//   CITATION_URL:    DOI or URL of the ISHLT 2026 statement once published.
//                    e.g. "https://doi.org/10.xxxx/..."
//                    Leave as "" to render the citation as plain text.
//
//   SUBMIT_ENDPOINT: PocketBase base URL, e.g. "https://gap.yourdomain.org"
//                    Leave as "" — the submit action is hidden until this is set.
//
const CITATION_URL    = "https://doi.org/10.1016/j.healun.2026.04.019";
const SUBMIT_ENDPOINT = "https://api.kinelhu.com";
const APP_VERSION     = "0.1.0";

// Computed once at startup — device type and browser locale for registry analytics.
// Neither value identifies an individual; both are coarse aggregate signals.
const DEVICE = (() => {
  const touch = navigator.maxTouchPoints > 0;
  if (touch && window.innerWidth < 768) return "mobile";
  if (touch) return "tablet";
  return "desktop";
})();

const LANG = navigator.language || "";

// Anonymous session token — generated once per browser, persisted in localStorage.
// Allows counting distinct users without any identifying information.
const SESSION_ID = (() => {
  const key = "gap-session-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
})();


// ── Citation link ──────────────────────────────────────────────────────────────
(function initCitationLink() {
  const link = document.getElementById("citation-link");
  if (CITATION_URL) {
    link.href = CITATION_URL;
  } else {
    // Remove the <a> wrapper but keep the text nodes intact
    link.replaceWith(...link.childNodes);
  }
})();


// ── Pure classification function ───────────────────────────────────────────────
//
//   All inputs are strings.
//   g      "0" | "1"
//   a      "0" | "1" | "2" | "3" | "4"
//   p      "X" | "0" | "1" | "2"
//   nonHla "" | "Y" | "Z"   (non-core A suffix; refines code, never changes verdict)
//   ps6rp  "" | "Y" | "Z"   (non-core P suffix; silently cleared when p === "X")
//   c      "" | "0" | "1"   (non-core C element; refines code, never changes verdict)
//
//   Returns { code: string, verdict: string }
//
function classify(g, a, p, nonHla, ps6rp, c) {
  const gi  = Number(g);
  const ai  = Number(a);
  const dsa = ai > 0;

  // p-S6RP requires biopsy tissue; cleared automatically when P = X
  const ps6 = (p === "X") ? "" : (ps6rp || "");

  // Verdict — faithful to Table 2 of the ISHLT statement
  let verdict;
  if (p === "X") {
    verdict = "path_not_assessed";
  } else {
    const pn = Number(p);
    if (pn >= 1) {
      verdict = dsa
        ? (gi === 1 ? "amr_clinical"  : "amr_subclinical")
        : (gi === 1 ? "nfa"           : "not_amr");
    } else {
      // P0: no AMR-type findings on biopsy
      verdict = (dsa && gi === 1) ? "amr_clinical" : "not_amr";
    }
  }

  // Canonical code string: G{g} A{a}{nonHLA?} P{p}{p-S6RP?}[ C{c}]
  const code =
    "G"  + g +
    " A" + a + (nonHla || "") +
    " P" + p + (ps6    || "") +
    (c !== "" ? " C" + c : "");

  return { code, verdict };
}


// ── Truth table — authoritative test cases ─────────────────────────────────────
//   Mirrors Table 2 of the ISHLT statement.
//   Add rows here if edge cases arise; the self-test will pick them up.
//
const TEST_CASES = [
  // [g,   a,   p,   expected verdict,         description]
  [ "0", "1", "X",  "path_not_assessed",   "G0, DSA, no biopsy"                ],
  [ "1", "0", "X",  "path_not_assessed",   "G1, no DSA, no biopsy"             ],
  [ "0", "1", "1",  "amr_subclinical",     "G0, DSA, P1 — subclinical AMR"     ],
  [ "1", "1", "1",  "amr_clinical",        "G1, DSA, P1 — clinical AMR"        ],
  [ "0", "0", "1",  "not_amr",             "G0, no DSA, P1 — not AMR"          ],
  [ "1", "0", "1",  "nfa",                 "G1, no DSA, P1 — NFA"              ],
  [ "0", "1", "2",  "amr_subclinical",     "G0, DSA, P2 — subclinical AMR"     ],
  [ "1", "1", "2",  "amr_clinical",        "G1, DSA, P2 — clinical AMR"        ],
  [ "1", "1", "0",  "amr_clinical",        "G1, DSA, P0 — clinical (sampling)" ],
  [ "0", "1", "0",  "not_amr",             "G0, DSA, P0 — not AMR"             ],
  [ "0", "0", "0",  "not_amr",             "G0, no DSA, P0 — not AMR"          ],
  [ "1", "0", "0",  "not_amr",             "G1, no DSA, P0 — not AMR"          ],
];


// ── Self-test: run on load, populate the debug table ──────────────────────────
(function runSelfTest() {
  const tbody = document.getElementById("test-body");
  const chip  = document.getElementById("test-chip");
  let failures = 0;

  TEST_CASES.forEach(([g, a, p, expected]) => {
    const { verdict } = classify(g, a, p, "", "", "");
    const pass = verdict === expected;
    if (!pass) {
      failures++;
      console.error(
        `GAP self-test FAIL: G${g} A${a} P${p} → "${verdict}" (expected "${expected}")`
      );
    }

    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>G${g}</td>` +
      `<td>A${a}</td>` +
      `<td>P${p}</td>` +
      `<td class="result-col">${expected}</td>` +
      `<td class="result-col">${pass ? expected : verdict}</td>` +
      `<td class="result-col">${
        pass
          ? '<span class="dot-pass" aria-label="pass">&#10003;</span>'
          : '<span class="dot-fail" aria-label="fail">&#10007;</span>'
      }</td>`;
    tbody.appendChild(tr);
  });

  const total = TEST_CASES.length;
  if (failures === 0) {
    chip.textContent = `${total}/${total} passed`;
    chip.className   = "test-status-chip chip-pass";
    console.log(`GAP self-test: all ${total} cases passed.`);
  } else {
    chip.textContent = `${failures} FAILED`;
    chip.className   = "test-status-chip chip-fail";
  }

  // Show the panel only when ?debug appears in the URL
  if (window.location.search.includes("debug")) {
    document.getElementById("test-panel").style.display = "block";
  }
})();


// ── Verdict display text ───────────────────────────────────────────────────────
const VERDICT_LABELS = {
  amr_clinical:        "Clinical AMR",
  amr_subclinical:     "Subclinical AMR",
  not_amr:             "Not AMR",
  nfa:                 "No finding attributable to AMR",
  path_not_assessed:   "Pathology not assessed",
};

const VERDICT_DESCRIPTIONS = {
  amr_clinical:
    "Graft dysfunction, DSA, and AMR-type pathological findings are all present. Consistent with clinical antibody-mediated rejection.",
  amr_subclinical:
    "DSA and AMR-type pathological findings are present without graft dysfunction. Consistent with subclinical antibody-mediated rejection.",
  not_amr:
    "The combination of findings does not meet the GAP criteria for antibody-mediated rejection.",
  nfa:
    "Graft dysfunction is present but AMR criteria are not met. The cause of dysfunction is not attributable to AMR based on this assessment.",
  path_not_assessed:
    "No biopsy was performed or the specimen was inadequate. AMR classification by GAP criteria requires pathological assessment.",
};

// Human-readable labels for the PDF summary
const G_LABELS = { "0": "G0: not present", "1": "G1: present" };
const A_LABELS = {
  "0": "A0: no HLA DSA",
  "1": "A1: present, strength not reported",
  "2": "A2: weak (<2 500 MFI)",
  "3": "A3: intermediate (2 500-8 000 MFI)",
  "4": "A4: strong (>8 000 MFI)",
};
const P_LABELS = {
  "X": "PX: biopsy not done / inadequate",
  "0": "P0: absent",
  "1": "P1: present",
  "2": "P2: present + ACR / chronic rejection / LB",
};


// ── DOM helpers ────────────────────────────────────────────────────────────────
function checkedValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}


// ── Splash ─────────────────────────────────────────────────────────────────────
document.getElementById("splash-ok").addEventListener("click", () => {
  document.getElementById("splash").style.display = "none";
});


// ── Result state helpers ───────────────────────────────────────────────────────
function refreshBiopsyState() {
  const p = checkedValue("p");
  const needsBiopsy = p === null || p === "X";
  document.getElementById("ps6rp-box").classList.toggle("disabled-section", needsBiopsy);
  document.getElementById("c-box").classList.toggle("disabled-section", needsBiopsy);
}

function clearResult() {
  document.getElementById("result-panel").classList.remove("has-result");
  document.getElementById("result-empty").style.display = "";
  document.getElementById("result-content").style.display = "none";
  document.getElementById("post-calc-actions").style.display = "none";
  document.getElementById("action-status").textContent = "";
  document.getElementById("calc-btn").style.display = "";
}

function refreshCalcBtn() {
  const ready = checkedValue("g") !== null
             && checkedValue("a") !== null
             && checkedValue("p") !== null;
  document.getElementById("calc-btn").disabled = !ready;
}


// ── Reset ──────────────────────────────────────────────────────────────────────
document.getElementById("reset-btn").addEventListener("click", () => {
  document.querySelectorAll("input[type='radio']").forEach(el => {
    if (["g", "a", "p"].includes(el.name)) {
      el.checked = false;
    } else {
      // Non-core: reset to "not reported" (value === "")
      el.checked = (el.value === "");
    }
  });
  clearResult();
  refreshBiopsyState();
  refreshCalcBtn();
});


// ── Input change: update biopsy state, hide stale result ──────────────────────
function onInputChange() {
  refreshBiopsyState();
  clearResult();
  refreshCalcBtn();
}

document.querySelectorAll("input[type='radio']").forEach(el => {
  el.addEventListener("change", onInputChange);
});


// ── Get GAP code: classify + show result + silent background submit ────────────
document.getElementById("calc-btn").addEventListener("click", async () => {
  const g      = checkedValue("g");
  const a      = checkedValue("a");
  const p      = checkedValue("p");
  const nonHla = checkedValue("nonhla") || "";
  const ps6rp  = checkedValue("ps6rp")  || "";
  const c      = checkedValue("c")      || "";

  if (g === null || a === null || p === null) return;

  const { code, verdict } = classify(g, a, p, nonHla, ps6rp, c);

  // Render result
  document.getElementById("result-code").textContent = code;

  const verdictEl = document.getElementById("result-verdict");
  verdictEl.innerHTML = "";
  const badge = document.createElement("span");
  badge.className   = `verdict-badge verdict-${verdict}`;
  badge.textContent = VERDICT_LABELS[verdict] || verdict;
  verdictEl.appendChild(badge);

  document.getElementById("verdict-desc").textContent = VERDICT_DESCRIPTIONS[verdict] || "";

  document.getElementById("result-panel").classList.add("has-result");
  document.getElementById("result-empty").style.display   = "none";
  document.getElementById("result-content").style.display = "";
  document.getElementById("post-calc-actions").style.display = "";
  document.getElementById("calc-btn").style.display = "none";

  // Store values for copy and PDF buttons
  const store   = document.getElementById("calc-btn").dataset;
  store.code    = code;
  store.verdict = verdict;
  store.nonHla  = nonHla;
  store.ps6rp   = ps6rp;
  store.cVal    = c;
  store.g       = g;
  store.a       = a;
  store.p       = p;

  // Silent background submission — never interrupts the user
  if (SUBMIT_ENDPOINT) {
    fetch(`${SUBMIT_ENDPOINT}/api/collections/gap_submissions/records`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        g, a, p, non_hla: nonHla, ps6rp, c, code, verdict,
        app_version: APP_VERSION,
        device:      DEVICE,
        lang:        LANG,
        session_id:  SESSION_ID,
      }),
    }).catch(() => {});
  }
});


// ── Copy button ────────────────────────────────────────────────────────────────
document.getElementById("copy-btn").addEventListener("click", async () => {
  const code   = document.getElementById("result-code").textContent;
  const status = document.getElementById("action-status");
  try {
    await navigator.clipboard.writeText(code);
    status.textContent = "Copied.";
  } catch {
    status.textContent = "Copy failed. Please select and copy the code manually.";
  }
});


// ── Download as PDF ────────────────────────────────────────────────────────────
document.getElementById("print-btn").addEventListener("click", () => {
  if (!window.jspdf) {
    alert("PDF generation requires an internet connection to load the PDF library. Please check your connection and try again.");
    return;
  }

  const store  = document.getElementById("calc-btn").dataset;
  const g      = store.g      || checkedValue("g");
  const a      = store.a      || checkedValue("a");
  const p      = store.p      || checkedValue("p");
  const nonHla = store.nonHla || "";
  const ps6rp  = store.ps6rp  || "";
  const c      = store.cVal   || "";
  const code   = store.code   || document.getElementById("result-code").textContent;
  const verdict = store.verdict || "";

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PAGE_W = 210;
  const M      = 22;          // margin
  const CW     = PAGE_W - M * 2;

  // RGB palette matching theme.css
  const C = {
    teal:      [13, 115, 119],
    tealDark:  [8, 75, 78],
    text:      [26, 26, 26],
    gray:      [107, 107, 107],
    border:    [224, 224, 224],
    rowAlt:    [248, 249, 249],
  };

  const VERDICT_COLORS = {
    amr_clinical:      { text: [199, 84, 80],  bg: [253, 236, 234] },
    amr_subclinical:   { text: [160, 104, 0],  bg: [255, 248, 231] },
    not_amr:           { text: [45, 106, 79],  bg: [234, 244, 238] },
    nfa:               { text: [8, 75, 78],    bg: [232, 244, 245] },
    path_not_assessed: { text: [107, 107, 107], bg: [245, 245, 245] },
  };

  // Shorthand helpers
  const fill = (arr) => doc.setFillColor(...arr);
  const ink  = (arr) => doc.setTextColor(...arr);
  const draw = (arr) => doc.setDrawColor(...arr);

  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric"
  });

  // Build input rows (always G, A, P; then any non-core that were set)
  const inputs = [
    ["G  Graft dysfunction", G_LABELS[g] || g],
    ["A  HLA DSA",           A_LABELS[a] || a],
    ["P  Pathology",         P_LABELS[p] || p],
  ];
  if (nonHla) inputs.push(["Non-HLA antibodies", nonHla === "Y" ? "Absent (Y)" : "Present (Z)"]);
  if (ps6rp)  inputs.push(["p-S6RP",             ps6rp  === "Y" ? "Negative (Y)" : "Positive (Z)"]);
  if (c)      inputs.push(["Complement (C)",      c      === "0" ? "Not present (C0)" : "Present (C1)"]);

  // ── Top teal bar ──────────────────────────────────────────────────────────────
  fill(C.teal);
  doc.rect(0, 0, PAGE_W, 4.5, "F");

  // ── Header ────────────────────────────────────────────────────────────────────
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  ink(C.teal);
  doc.text("GAP AMR Assessment", M, y);

  // Date — right-aligned on the same baseline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  ink(C.gray);
  doc.text(date, PAGE_W - M, y, { align: "right" });

  y += 4;
  doc.setFontSize(7.5);
  doc.text(`GAP AMR Calculator  v${APP_VERSION}`, PAGE_W - M, y, { align: "right" });

  // Separator
  y += 7;
  draw(C.border);
  doc.setLineWidth(0.3);
  doc.line(M, y, PAGE_W - M, y);

  // ── Inputs table ─────────────────────────────────────────────────────────────
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  ink(C.gray);
  doc.text("ASSESSMENT INPUTS", M, y);

  y += 10;

  const ROW_H  = 7;
  const COL_LW = 58; // label column width

  inputs.forEach(([label, value], i) => {
    // Alternating row tint
    if (i % 2 === 0) {
      fill(C.rowAlt);
      doc.rect(M, y - 4.5, CW, ROW_H, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    ink(C.gray);
    doc.text(label, M + 2, y);

    doc.setFont("helvetica", "bold");
    ink(C.text);
    doc.text(value, M + COL_LW, y);

    y += ROW_H;
  });

  // Separator
  y += 5;
  draw(C.border);
  doc.line(M, y, PAGE_W - M, y);

  // ── GAP code ──────────────────────────────────────────────────────────────────
  y += 14;

  doc.setFont("courier", "bold");
  doc.setFontSize(32);
  ink(C.text);
  doc.text(code, M, y);

  // ── Verdict badge ─────────────────────────────────────────────────────────────
  y += 11;

  const vc         = VERDICT_COLORS[verdict] || VERDICT_COLORS.path_not_assessed;
  const badgeLabel = (VERDICT_LABELS[verdict] || verdict).toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const badgeTextW = doc.getTextWidth(badgeLabel);
  const bPadX = 4, bPadY = 2.5, bH = 7;

  fill(vc.bg);
  doc.roundedRect(M, y - bH + bPadY, badgeTextW + bPadX * 2, bH, 2.5, 2.5, "F");
  ink(vc.text);
  doc.text(badgeLabel, M + bPadX, y - 0.5);

  // ── Verdict description ───────────────────────────────────────────────────────
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  ink(C.gray);
  const descLines = doc.splitTextToSize(VERDICT_DESCRIPTIONS[verdict] || "", CW);
  doc.text(descLines, M, y);
  y += descLines.length * 5;

  // Sampling caveat note (P0 + clinical AMR is an edge case worth flagging)
  if (verdict === "amr_clinical" && p === "0") {
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    const caveat = "Note: biopsy findings are absent (P0). Clinical AMR assignment assumes sampling error; pathological confirmation is recommended.";
    const caveatLines = doc.splitTextToSize(caveat, CW);
    doc.text(caveatLines, M, y);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const FOOT_Y = 276;
  draw(C.border);
  doc.setLineWidth(0.3);
  doc.line(M, FOOT_Y, PAGE_W - M, FOOT_Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  ink(C.gray);

  const citation = "Calabrese, Levine, Hachem et al. ISHLT Scientific Statement on pulmonary antibody-mediated rejection (GAP definition), J Heart Lung Transplant 2026.";
  const citLines = doc.splitTextToSize(citation, CW);
  doc.text(citLines, M, FOOT_Y + 4);

  let fy = FOOT_Y + 4 + citLines.length * 3.5;
  doc.text(
    "Contact for calculator: Kinan El Husseini MD PhD (Hopital Bichat-Claude Bernard, AP-HP, Paris) kinan.elhusseini@aphp.fr",
    M, fy
  );

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safeCode = code.replace(/\s+/g, "_");
  const dateStr  = new Date().toISOString().slice(0, 10);
  doc.save(`GAP_${safeCode}_${dateStr}.pdf`);
});

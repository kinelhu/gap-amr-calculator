# GAP AMR Calculator

A coding tool for the ISHLT GAP system for pulmonary antibody-mediated rejection (AMR), based on the 2026 ISHLT Scientific Statement (Calabrese, Levine, Hachem et al., *J Heart Lung Transplant* 2026).

**This is a coding aid only.** It does not substitute for multidisciplinary clinical judgement.

## What it does

- Computes the GAP code (e.g. `G1 A3Z P1Y C0`) from the atomic findings of a single assessment
- Classifies the assessment against the Table 2 truth table (Clinical AMR, Subclinical AMR, Not AMR, NFA, Pathology not assessed)
- Optionally submits anonymous, aggregate assessment records to a self-hosted research registry

## How to use

Open `index.html` in any modern browser — no installation, no build step.

The live version is available at: https://kinelhu.github.io/gap-amr-calculator/

## Configuring the registry backend

Open `gap-calculator.js` and set the two constants near the top:

```js
const CITATION_URL    = "";   // DOI or URL of the ISHLT 2026 statement
const SUBMIT_ENDPOINT = "";   // PocketBase base URL, e.g. "https://gap.yourdomain.org"
```

When `SUBMIT_ENDPOINT` is empty the Submit action is hidden. When set, the Copy/Submit button sends the assessment (G, A, P values and resulting code) to the registry. No patient identifiers are transmitted.

See the backend architecture notes for details on the PocketBase + Caddy + Litestream setup.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure and CSS |
| `gap-calculator.js` | Classification logic, self-test, UI wiring, PDF generation |
| `theme.css` | Colour palette — edit here to retheme the tool |

## Logic verification

The calculator runs a 12-case self-test on every page load (console output). Append `?debug` to the URL to display the full test table in the page.

## Contact

Kinan El Husseini MD PhD  
Lung Transplant Unit, Hôpital Bichat-Claude Bernard, AP-HP, Paris, France  
kinan.elhusseini@aphp.fr

# GAP AMR Calculator

A coding tool for the ISHLT GAP system for pulmonary antibody-mediated rejection (AMR), based on the 2026 ISHLT Scientific Statement (Calabrese, Levine, Hachem et al., *J Heart Lung Transplant* 2026).

**This is a coding aid only.** It does not substitute for multidisciplinary clinical judgement.

## What it does

- Computes the GAP code (e.g. `G1 A3Z P1Y C0`) from the atomic findings of a single assessment
- Classifies the assessment against the Table 2 truth table (Clinical AMR, Subclinical AMR, Not AMR, NFA, Pathology not assessed)
- Downloads the result as a formatted PDF
- Submits anonymous, aggregate assessment records to a self-hosted research registry on every classification (country derived server-side via Cloudflare GeoIP — no IP stored)

## Live version

https://gap.kinelhu.com

## How to use locally

Open `index.html` in any modern browser. No installation, no build step, no internet required for the calculator itself.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure and CSS |
| `gap-calculator.js` | Classification logic, self-test, UI wiring, PDF generation |
| `theme.css` | Colour palette (edit here to retheme the whole tool) |

## Configuration

Two constants at the top of `gap-calculator.js`:

```js
const CITATION_URL    = "";   // DOI or URL of the ISHLT 2026 statement once published
const SUBMIT_ENDPOINT = "";   // PocketBase base URL, e.g. "https://api.yourdomain.org"
```

- `CITATION_URL` empty: citation renders as plain text in the footer. Fill in once the DOI is available.
- `SUBMIT_ENDPOINT` empty: the Submit action is hidden. When set, each classification silently sends the assessment (G, A, P and non-core values, resulting code, device type, browser locale, anonymous session ID) to the registry. No patient identifiers are transmitted.

## Logic verification

The calculator runs a 12-case self-test on every page load (result in the browser console). Append `?debug` to the URL to display the full test table in the page.

## Contact

Kinan El Husseini MD PhD
Lung Transplant Unit, Hopital Bichat-Claude Bernard, AP-HP, Paris, France
kinan.elhusseini@aphp.fr

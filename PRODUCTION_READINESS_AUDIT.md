# 👑 Production Readiness Audit — King Industrial Studio
**Date:** 2026-09-18  
**Status:** In Progress  
**Last Reviewed:** Latest code on `main` branch (commit 092ed4d)

---

## Overview
This document tracks production-readiness issues identified during a comprehensive code review. Items are ranked by severity and estimated effort. Use this as a backlog for future improvements before major deployments.

---

## 🔴 CRITICAL (Fix Before Production Release)

### 1. Missing Input Type Validation on Calculations
**Severity:** Critical  
**Files:** `index.html` (lines 948-954), `studio.html` (similar patterns)  
**Issue:** Slider inputs have no `type="number"` constraint. If user pastes non-numeric text, `parseFloat()` returns `NaN`, cascading through all financial calculations as `NaN` or `Infinity`.

**Fix:**
```javascript
// Add type="number" to all slider inputs:
<input id="in-sf" type="number" min="1000" max="5000000" step="1000" value="100000" ...>

// OR add runtime validation:
const sf = parseFloat(document.getElementById('in-sf').value);
if (!isFinite(sf) || sf <= 0) { 
  showToast('SF must be a positive number'); 
  return; 
}
```

**Effort:** 10 min  
**Impact:** Prevents incorrect financial projections  

---

### 2. localStorage Quota Exceeded — Silent Failure
**Severity:** Critical  
**Files:** `studio.html` (lines 734, 736, 1211-1213), `index.html` (line 1212)  
**Issue:** Large hero image uploads fail silently. `catch(e){}` swallows quota-exceeded errors. User doesn't know their image wasn't saved, so downloaded standalone presentations lack their uploaded photo.

**Fix:**
```javascript
try { 
  localStorage.setItem('king_img_' + currentDeal.id, compressedBase64); 
} catch(e) { 
  if (e.name === 'QuotaExceededError') {
    showToast('⚠️ Browser storage full. Clear old deals or browser cache to upload images.');
  } else {
    showToast('⚠️ Could not cache image.');
  }
}
```

**Effort:** 5 min  
**Impact:** Critical user feedback loop — prevents confusion & lost work  

---

### 3. QR Code Generation via External API
**Severity:** Critical  
**Files:** `studio.html` (line 1304), `index.html` (line 1357)  
**Issue:** QR code generation depends on external `qrserver.com` API. If API is down, user is offline, or rate-limited, QR generation fails silently with no feedback.  
**Note:** `qrcode.js` is already loaded on `index.html` line 10 but not utilized.

**Fix:**
```javascript
// Use client-side qrcode.js library already in the page:
function generateQRCode(container, text) {
  try {
    container.innerHTML = ''; // Clear
    new QRCode(container, {
      text: text,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (e) {
    container.innerHTML = '<p class="text-slate-400 text-sm">QR generation failed. Copy link instead.</p>';
    showToast('⚠️ Could not generate QR code.');
  }
}
```

**Effort:** 15 min  
**Impact:** Works offline, no external dependency, graceful fallback  

---

### 4. Hardcoded Array Index Without Bounds Check
**Severity:** Critical  
**Files:** `index.html` (line 1050, and similar in calculations)  
**Issue:** `noiArray[4]` (year 5 NOI) accessed without verifying array length. If the hardcoded `years = 10` loop ever changes, or if calculation logic is refactored, undefined array access breaks downstream calculations silently.

**Fix:**
```javascript
const yr5NOI = noiArray && noiArray.length > 4 ? noiArray[4] : 0;
const remainingBalance = loanBal && isFinite(loanBal) ? loanBal : debtAmount;
```

**Effort:** 10 min  
**Impact:** Prevents cryptic NaN propagation bugs  

---

### 5. No Validation on Imported Deal JSON Structure
**Severity:** Critical  
**Files:** `studio.html` (lines 1005-1008)  
**Issue:** Import accepts any JSON file without schema validation. If file is missing required fields (`name`, `sf`, `rentPsf`, etc.), it silently fails or crashes downstream when calculations try to access undefined properties.

**Fix:**
```javascript
const imported = JSON.parse(e.target.result);

// Validate required fields
const requiredFields = ['name', 'sf', 'rentPsf', 'costPsf', 'exitCap', 'ltc', 'interestRate'];
const missing = requiredFields.filter(f => !(f in imported) || imported[f] === null);
if (missing.length > 0) {
  alert(`Invalid deal file. Missing fields: ${missing.join(', ')}`);
  return;
}

// Validate numeric ranges
if (imported.sf <= 0 || imported.costPsf <= 0) {
  alert('Invalid deal: SF and Cost/PSF must be positive');
  return;
}

deals.unshift(imported);
```

**Effort:** 10 min  
**Impact:** Rejects malformed data at entry point, prevents downstream crashes  

---

## 🟠 HIGH (Should Fix Before Major Deployment)

### 6. IRR Calculation Can Loop Without Convergence
**Severity:** High  
**Files:** `index.html` (lines 975-999 in `calcIRR()`)  
**Issue:** Newton-Raphson iteration has a convergence check but no hard iteration limit. In pathological edge cases (e.g., all negative cash flows, contradictory assumptions), it could spin for many iterations, stalling the UI thread briefly.

**Fix:**
```javascript
function calcIRR(cfs) {
  if (!cfs || cfs.length === 0) return 0;
  
  let rate = 0.1;
  const MAX_ITERATIONS = 100; // Add hard limit
  
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cfs.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cfs[t] / denom;
      if (rate > -1) dnpv -= (t * cfs[t]) / Math.pow(1 + rate, t + 1);
    }
    
    if (Math.abs(npv) < 1e-4) return rate;
    const newRate = rate - npv / dnpv;
    if (isNaN(newRate) || !isFinite(newRate)) return rate;
    if (Math.abs(newRate - rate) < 1e-6) return newRate;
    
    rate = newRate;
    
    if (iter === MAX_ITERATIONS - 1) {
      console.warn('IRR did not converge after 100 iterations; using approximation');
    }
  }
  return rate;
}
```

**Effort:** 5 min  
**Impact:** Prevents UI thread stalls in edge cases  

---

### 7. Network Timeout on Fetch Calls
**Severity:** High  
**Files:** `studio.html` (line 1254 — fetch `index.html` for standalone export)  
**Issue:** `fetch()` with no timeout can hang indefinitely on slow networks or if server is unresponsive.

**Fix:**
```javascript
async function downloadStandaloneHtml() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const resp = await fetch('index.html', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!resp.ok) throw new Error('Could not read index.html template');
    let htmlText = await resp.text();
    // ... rest of logic
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('⚠️ Download timeout. Please try again.');
    } else {
      showToast(`⚠️ Download failed: ${err.message}`);
    }
  }
}
```

**Effort:** 5 min  
**Impact:** Prevents hung UI on slow networks  

---

### 8. No Bounds Check on Photo Array Access
**Severity:** High  
**Files:** `studio.html` (line 788-789, `d.documents[0].url`)  
**Issue:** Accesses `d.documents[0]` after checking length, but doesn't validate that the URL exists or is a string.

**Fix:**
```javascript
if (d && d.documents && d.documents.length > 0 && d.documents[0].url) {
  const docUrl = sanitizeUrl(d.documents[0].url);
  if (docUrl) {
    flyerLink.href = docUrl;
    flyerLink.textContent = `📄 ${escapeHtml(d.documents[0].title || 'View Flyer PDF')}`;
  }
}
```

**Effort:** 5 min  
**Impact:** Prevents broken links from appearing  

---

## 🟡 MEDIUM (Nice to Have Before 1.0)

### 9. Missing ARIA Labels on Interactive Sliders
**Severity:** Medium  
**Files:** `index.html` (5 slider inputs: `in-sf`, `in-cost-psf`, `in-rent`, `in-escalation`, `in-exit-cap`, etc.)  
**Issue:** Sliders have no `aria-label` or associated `<label>` elements. Screen reader users cannot identify what each slider controls.

**Fix:**
```html
<label for="in-sf" class="text-[11px] text-slate-400 block mb-1">Property Size (SF)</label>
<input 
  id="in-sf" 
  type="range" 
  aria-label="Property size in square feet"
  min="1000" 
  max="5000000" 
  step="1000" 
  value="100000" 
  class="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
  oninput="updateModelFromSliders()">
```

**Effort:** 5 min  
**Impact:** WCAG 2.1 compliance, inclusive UX  

---

### 10. Rate Limiting on Extraction Functions
**Severity:** Medium  
**Files:** `studio.html` (flyer upload, manual extraction handlers)  
**Issue:** Users can spam "Import Flyer" or "Extract Specs" buttons, spawning multiple concurrent extraction processes that compete for resources.

**Fix:**
```javascript
let extractionInProgress = false;

function handleFlyerUpload(e) {
  if (extractionInProgress) {
    showToast('⏳ Extraction already running...');
    return;
  }
  
  extractionInProgress = true;
  const file = e.target.files[0];
  
  processUploadedFile(file).finally(() => {
    extractionInProgress = false;
  });
}
```

**Effort:** 10 min  
**Impact:** Prevents resource exhaustion from rapid clicks  

---

### 11. Possible Double-Encoding in mailto Links
**Severity:** Medium  
**Files:** `index.html` (line 1225)  
**Issue:** Email link builds `'mailto:' + encodeURIComponent(b.email.trim())` then wraps in `sanitizeUrl()`, which may double-encode special characters.

**Fix:**
```javascript
// One encoding is enough:
const emailLink = `mailto:${b.email.trim()}`;
${b.email ? `<a href="${sanitizeUrl(emailLink)}" class="...">` : ''}
```

**Effort:** 5 min  
**Impact:** Cleaner URLs, no encoding artifacts  

---

### 12. Phone Number Validation Too Permissive
**Severity:** Medium  
**Files:** `index.html` (line 1224, phone number sanitization regex)  
**Issue:** Regex `/[^\d+\-\(\)\s.]/g` allows invalid sequences like `+++555-1234` (multiple consecutive `+`).

**Fix:**
```javascript
function sanitizePhoneNumber(phone) {
  if (!phone) return '';
  // Remove all non-digits except leading +
  const cleaned = phone.replace(/^\+?1?[\s\-\(\)]*/, '').replace(/[^\d]/g, '');
  return cleaned.length === 10 ? `+1${cleaned}` : cleaned;
}

const phoneLink = `tel:${sanitizePhoneNumber(b.phone)}`;
```

**Effort:** 5 min  
**Impact:** Valid tel: links only  

---

### 13. No Browser Storage Backup / Export Warning
**Severity:** Medium  
**Files:** `studio.html` and `index.html` (both use localStorage)  
**Issue:** User data lives entirely in browser localStorage. If cache is cleared or browser is uninstalled, all deals are lost. No backup reminder.

**Fix:**
```javascript
window.addEventListener('beforeunload', (e) => {
  const userDeals = deals.filter(d => !DEFAULT_DEALS.find(def => def.id === d.id));
  if (userDeals.length > 0) {
    e.preventDefault();
    e.returnValue = 'You have unsaved deals. Download a backup?';
  }
});

// Add a "Download Backup" button to the UI that exports all deals as JSON
function exportAllDeals() {
  const backup = JSON.stringify(deals, null, 2);
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `king-deals-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  showToast('✓ Deals backed up to downloads.');
}
```

**Effort:** 15 min  
**Impact:** Prevents data loss, improves user confidence  

---

## 🟢 LOW (Polish / Documentation)

### 14. Generic Error Messages in Catch Blocks
**Severity:** Low  
**Files:** Multiple (e.g., `studio.html` line 851: `console.error('Extraction error:', err)`)  
**Issue:** Most error catches log to console or show generic toast. Users won't know what went wrong or how to fix it.

**Fix:** Replace all `console.error()` with user-facing `showToast()`:
```javascript
} catch (err) {
  showToast(`⚠️ Failed to load listing: ${err.message || err}`);
}
```

**Effort:** 10 min  
**Impact:** Better user experience during failures  

---

### 15. No Print Stylesheet Optimization
**Severity:** Low  
**Files:** `index.html` (lines 60-65)  
**Issue:** Print media rules exist but could be enhanced (hide interactive controls, optimize page breaks, hide buttons).

**Fix:** Enhance print rules:
```css
@media print {
  @page { margin: 0.5in; size: letter portrait; }
  
  button, input, .no-print { display: none !important; }
  
  .hero-section { page-break-after: avoid; }
  .card { page-break-inside: avoid; }
  
  body { font-size: 10pt; line-height: 1.4; }
}
```

**Effort:** 10 min  
**Impact:** Better PDF export appearance  

---

### 16. Image Compression Level Not Configurable
**Severity:** Low  
**Files:** `studio.html` (image upload handler)  
**Issue:** Hero image compression uses hardcoded parameters. No user control over quality vs. size tradeoff.

**Fix:** Add a compression slider or preset options (low/med/high quality).

**Effort:** 20 min  
**Impact:** Lets users optimize for their network/storage constraints  

---

### 17. Missing README Updates
**Severity:** Low  
**Files:** `README.md` (if it exists)  
**Issue:** No documented list of known limitations or browser requirements.

**Fix:** Document in README:
- Minimum browser versions (Chrome 90+, Safari 14+, Firefox 88+)
- localStorage quota (~5-10MB max per domain)
- Requires JavaScript enabled
- Offline functionality (after first load)

**Effort:** 10 min  
**Impact:** Sets user expectations, reduces support load  

---

---

## Priority Implementation Roadmap

### Phase 1: Critical (Fixes Production Readiness) — **30 min total**
1. ✅ Input validation on sliders (10 min)
2. ✅ localStorage quota error messaging (5 min)
3. ✅ QR code fallback / client-side generation (15 min)

### Phase 2: High Priority (Risk Mitigation) — **40 min total**
4. ✅ Array bounds guards (10 min)
5. ✅ Network timeout on fetch (5 min)
6. ✅ Deal JSON schema validation (10 min)
7. ✅ IRR convergence limit (5 min)
8. ✅ Extraction rate limiting (10 min)

### Phase 3: Medium Priority (UX & Accessibility) — **30 min total**
9. ✅ ARIA labels on sliders (5 min)
10. ✅ Email / phone sanitization (10 min)
11. ✅ Browser storage backup warning (15 min)

### Phase 4: Polish (Nice to Have) — **30 min total**
12. ✅ User-facing error messages (10 min)
13. ✅ Print stylesheet optimization (10 min)
14. ✅ README updates (10 min)

---

## Status Tracking

| Phase | Priority | Est. Time | Status | Notes |
|-------|----------|-----------|--------|-------|
| 1 | Critical | 30 min | 📝 Pending | Enables production use |
| 2 | High | 40 min | 📝 Pending | Risk mitigation & edge cases |
| 3 | Medium | 30 min | 📝 Pending | Accessibility & UX improvements |
| 4 | Low | 30 min | 📝 Pending | Polish & documentation |

---

## Last Updated
- **Date:** 2026-09-18
- **Reviewed by:** Claude Code (Haiku 4.5)
- **Branch:** main (commit 092ed4d)
- **Total Actionable Items:** 17
- **Estimated Total Time to Production Ready:** ~100 min (Phase 1 + 2 + 3)

---

## How to Use This Document

1. **When starting a new session:** Review "Phase 1: Critical" and implement those first.
2. **Track progress:** Update the "Status" column as you complete items.
3. **Reference code locations:** Each issue lists exact file + line numbers.
4. **Use the fixes:** Copy the code examples directly into the files.
5. **After implementing:** Mark the item as ✅ Complete and update `Last Updated` date.

---

**Next Steps:** Start with Phase 1 (Critical) when you're ready to bring this to production. These fixes are all small, high-impact wins that take ~30 minutes total.

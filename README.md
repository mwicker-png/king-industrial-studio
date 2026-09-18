# 👑 King Industrial Realty // Deal Studio & Logistics Underwriting Engine

An institutional industrial real estate underwriting, site engineering CAD, and feasibility platform.

![Hero Rendering](apex_logistics_hub.jpg)

## 🌟 Key Capabilities

- **📁 PDF & Word (.docx) Flyer Uploader:** Drag and drop marketing flyers, PDF brochures, or CoStar sheets to automatically extract square footage, clear heights, dock doors, asking rents, and trailer stalls.
- **📱 Instant Client QR Codes:** 1-click generation of high-resolution QR codes to slap directly onto printed flyers, PDF decks, and offering memorandums.
- **🔗 1-Click Live Shareable URLs:** Generate instant self-contained web links encoded with your specific deal data to send directly to clients, partners, or investors.
- **🏢 Multi-Property Deal Switcher:** Save, manage, and toggle between multiple listings and pipeline deals with browser auto-save.
- **10-Year DCF Underwriting Engine:** Compounding rent escalations, debt amortization schedule (PMT), Newton-Raphson Levered IRR solver, and Equity Multiple.
- **Dynamic 5x5 IRR Sensitivity Matrix:** Real-time stress-testing of exit cap rates vs. market rent shifts.
- **Interactive 2D Site CAD Simulator:** Live cross-dock vs. rear-load configurations, concrete apron sizing, and animated 53' semi-truck 60° swing-radius docking simulation.
- **Automated Executive Deal Memo:** Formatted institutional memorandum that adapts dynamically to whatever property is active.

## 🌐 Platform Architecture

The platform is split into two specialized interfaces:

1. **Client Presentation Portal (`index.html`)**:
   - **URL:** [https://mwicker-png.github.io/king-industrial-studio/](https://mwicker-png.github.io/king-industrial-studio/)
   - **Audience:** Clients, institutional investors, lenders, and tenants.
   - **Experience:** Pristine, executive-grade presentation. Zero upload or admin clutter. Displays hero facility specs, interactive sensitivity sliders, 10-year cash flow pro-forma, 2D Site CAD simulator with 53' semi-truck turn-radius animation, Atlanta corridor benchmarks, and AI deal memo.
   - **Client Actions:** 1-click shareable links, instant QR codes, print-to-PDF.

2. **Broker Deal Studio & Flyer Extractor (`studio.html`)**:
   - **URL:** [https://mwicker-png.github.io/king-industrial-studio/studio.html](https://mwicker-png.github.io/king-industrial-studio/studio.html)
   - **Audience:** King Industrial brokers, analysts, and underwriting teams.
   - **Experience:** Drag-and-drop PDF flyer and Word (.docx) document extractor (`pdf.js` & `mammoth.js`), manual spec editor, real-time KPI feedback, portfolio manager, and 1-click "Launch Client Presentation" / "Copy Client Link".

## 🌐 Custom Domains & Memorable Links
Read the full setup guide in [CUSTOM_DOMAINS_AND_SHARING_GUIDE.md](CUSTOM_DOMAINS_AND_SHARING_GUIDE.md):
1. **In-App QR Codes:** Instant scanning on phones & flyers
2. **Branded Short Links (Dub.co / Bitly):** e.g. `dub.sh/king-braselton`
3. **Company Subdomain:** e.g. `deals.kingindustrial.com` via GitHub Pages CNAME
4. **Dedicated Domain:** e.g. `kingdeals.com` (~$10/yr)
5. **Vercel / Netlify:** 1-click micro-deployments per broker

---
*King Industrial Realty, Inc.*

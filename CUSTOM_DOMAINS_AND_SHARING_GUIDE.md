# 🌐 Custom Domains, Memorable Links & Client Sharing Guide
### King Industrial Realty // Logistics Intelligence Studio

This guide outlines how any broker, analyst, or team member at King Industrial can deploy and share this application using clean, memorable, professional links.

## 🔑 The Two-Tier Architecture (Setup vs. Client View)

To ensure clients never see internal draft setups, flyer upload tools, or other deals in your portfolio, the platform is cleanly separated into two distinct systems:

1. **Broker Deal Studio (`studio.html`) — For You & Your Team**:
   - **Link:** `https://mwicker-png.github.io/king-industrial-studio/studio.html`
   - **What it does:** Drag and drop PDF/Word flyers, extract specs, customize underwriting, manage multiple listings separately, duplicate deals to test variations (e.g. Option B), and export/import deal templates.
   - **Sharing with colleagues:** Send fellow brokers this studio link or export a Deal JSON file so they can build listings using the same template.

2. **Client Presentation Portal (`index.html`) — For Clients & Investors**:
   - **Link:** Generated via 1-click in the Studio (`.../index.html?data=...`)
   - **What the client sees:** ONLY that specific property's executive presentation. Zero upload tools, zero editor forms, zero links to the studio, and zero dropdowns to other deals.
   - **What the client can do:** Explore interactive sliders (rent/SF/exit cap), view the 10-year DCF pro-forma, test the 5x5 sensitivity matrix, simulate truck docking in the 2D CAD viewer, and export the AI deal memo.

---

## 🚀 Overview of Options for Sharing & Deployment

| Method | Setup Time | Cost | Best For | Example URL |
| :--- | :--- | :--- | :--- | :--- |
| **1. In-App QR Codes** | Instant (0s) | Free | Printed flyers, PDF brochures, pitch decks | *(Scan with phone camera)* |
| **2. Branded Short Links** | 10 Seconds | Free | Texting clients, quick email memos | `dub.sh/king-braselton` |
| **3. Company Subdomain** | 2 Minutes | Free | Institutional branding on King's domain | `deals.kingindustrial.com` |
| **4. Dedicated Domain** | 5 Minutes | ~$10/yr | Standalone brand for all listing tools | `kingdeals.com` |
| **5. Vercel / Netlify** | 1 Minute | Free | Individual micro-sites per broker | `king-braselton.vercel.app` |

---

## Method 1: Instant Client QR Codes (Zero Setup)
* **How it works:** In the top header bar, click the purple **"QR Code"** button.
* An instant high-resolution QR code will appear for the active property on your screen.
* Click **"Download Image"** and paste the QR code directly onto your marketing brochures, property PDF flyers, or pitch presentations.
* When prospective tenants, owners, or investors scan the QR code with their phone camera, the interactive underwriting model opens live on their device.

---

## Method 2: Free Branded Short Links (10-Second Setup)
When texting a client or adding a link to an email pitch, you can turn the long shareable URL into a memorable slug using **[Dub.co](https://dub.co)** or **[Bitly](https://bitly.com)**:
1. In the studio top bar, click the green **"Share Link"** button to copy the deal's live URL.
2. Go to [Dub.co](https://dub.co) or [Bitly.com](https://bitly.com) (both are free).
3. Paste the URL and type your custom name:
   - `dub.sh/king-braselton`
   - `dub.sh/550-fulton`
   - `bit.ly/aerotropolis-cargo`
4. Send the short link to your client!

---

## Method 3: Company Subdomain (e.g. `deals.kingindustrial.com`)
If King Industrial wants an official institutional portal:
1. Ask your IT or domain administrator (GoDaddy, Cloudflare, Network Solutions, etc.) to add a **CNAME record**:
   - **Type:** `CNAME`
   - **Host / Name:** `deals` (or `studio` or `underwriting`)
   - **Points to / Value:** `mwicker-png.github.io`
2. Go to your GitHub repository settings:
   - **Settings** &rarr; **Pages** &rarr; **Custom domain**
   - Enter: `deals.kingindustrial.com`
   - Click **Save**
3. GitHub automatically creates a free SSL certificate (HTTPS).
4. Now your entire team can access the studio at `https://deals.kingindustrial.com`!

---

## Method 4: Dedicated $10/year Deal Domain (e.g. `kingdeals.com`)
If you want an independent memorable domain:
1. Buy a domain on **[Namecheap](https://namecheap.com)**, **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)**, or **[Squarespace](https://domains.squarespace.com)** (usually $9.99/year).
   - Examples: `kingdeals.com`, `kinghubs.com`, `atlindustrial.com`
2. In the domain's DNS settings, point an `A` record to GitHub's IPs:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
3. In your GitHub repository settings under **Pages > Custom Domain**, enter your new domain name and hit Save.

---

## Method 5: 1-Click Platform Hosting (Vercel / Netlify)
If individual brokers want their own standalone sites:
1. Sign up at **[Vercel.com](https://vercel.com)** using your GitHub login.
2. Click **Add New Project** &rarr; select `king-industrial-studio`.
3. Under Project Name, type whatever name you want (e.g., `king-braselton`).
4. Click **Deploy**. In 20 seconds, your site is live at:
   - `https://king-braselton.vercel.app`

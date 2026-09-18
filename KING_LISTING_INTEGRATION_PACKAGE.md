# 👑 King Industrial Realty // Online Listing Extractor & Autofill Engine
## Complete Drag-and-Drop Developer & Agent Handoff Package

This document contains everything another agent or engineer needs to implement instant, 1-click deal autofill from any live King Industrial listing (e.g. `http://properties.kingindustrial.com/[property-slug]`) into any codebase or frontend framework.

---

## 📌 Executive Summary

Brokers and analysts currently copy-paste specs by hand from listing sheets. With this engine, they can simply paste any King Industrial listing link (e.g. `http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale`). The engine instantly:

1. **Extracts Property Identity & Address:** Street, City, State, ZIP, County, Title, and Subtitle.
2. **Auto-Classifies Atlanta Corridor:** Resolves Jackson/Hoschton -> `I-85 North Corridor`, Fulton Industrial -> `I-20 West`, Airport -> `Aerotropolis South`, etc.
3. **Parses Physical & Logistics Architecture:** Building SF, lot acreage, clear heights, dock doors, drive-in doors, trailer stalls, layout (`crossdock` vs `singleload`), and sprinkler specifications.
4. **Extracts High-Resolution Photo Gallery:** CloudFront / S3 photo array with original images, hero banner, and thumbnails.
5. **Extracts Marketing Flyer Attachments:** Direct PDF brochure download links.
6. **Extracts Listing Brokers:** Names, titles, office phones, emails, and headshots.
7. **Extracts Geolocation:** Latitude and longitude coordinates for mapping.
8. **Normalizes Directly to Deal Studio Schema:** Maps straight into the underwriting pro-forma and CAD engine.

---

## 🏗️ Architecture & How It Works Under the Hood

King Industrial's listing pages run on **BuildOut** using company token `483b18cef95cf9ec171e0ace6ca651058051abb0`.

```
User pastes URL:
http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale
                               │
                               ▼
               Extract property slug:
     "51-57-pearl-industrial-avenue-hoschton-sale"
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
   [Browser Client-Side]                [Node / Next.js Backend]
   Fetch via JSONP script tag           Direct HTTP fetch
   (Zero CORS issues, no server)        (Full 230KB standalone HTML)
              │                                 │
              └────────────────┬────────────────┘
                               ▼
               [KingListingExtractor.parseListingPayload]
                 ├─ Extract JSON-LD & OpenGraph metadata
                 ├─ Extract summary attributes table
                 ├─ Extract bulleted highlights
                 ├─ Extract photos array (embedded JSON)
                 ├─ Extract flyer download URLs
                 └─ Extract broker contact cards
                               │
                               ▼
                 [KingListingExtractor.toStudioDeal]
                 Maps directly into King Deal Studio schema
                               │
                               ▼
            Autofills Deal Studio Form & Live Return Models
```

---

## 📁 Ready-to-Use Artifacts in this Repository

| File | Purpose |
|---|---|
| [`king-listing-extractor.js`](file:///c:/Users/mwicker/OneDrive%20-%20King%20Industrial%20Realty,%20Inc/Documents/TESTING-ANTIGRAVITY-worktree/king-listing-extractor.js) | Universal, dependency-free UMD library (works in Browser, Node.js, Next.js). |
| [`studio.html`](file:///c:/Users/mwicker/OneDrive%20-%20King%20Industrial%20Realty,%20Inc/Documents/TESTING-ANTIGRAVITY-worktree/studio.html) | Working implementation in Deal Studio (Card B URL importer & photo strip). |
| [`index.html`](file:///c:/Users/mwicker/OneDrive%20-%20King%20Industrial%20Realty,%20Inc/Documents/TESTING-ANTIGRAVITY-worktree/index.html) | Client Presentation portal with dynamic hero photo and flyer PDF download. |
| [`deals/pearl-industrial.json`](file:///c:/Users/mwicker/OneDrive%20-%20King%20Industrial%20Realty,%20Inc/Documents/TESTING-ANTIGRAVITY-worktree/deals/pearl-industrial.json) | Complete verified deal JSON extracted from live Pearl Industrial listing. |
| [`test-extractor.js`](file:///c:/Users/mwicker/OneDrive%20-%20King%20Industrial%20Realty,%20Inc/Documents/TESTING-ANTIGRAVITY-worktree/test-extractor.js) | Automated test suite verifying slug extraction, corridor mapping, and parsing. |

---

## 🚀 Drop-In Implementation Guides

### Option 1: Browser Client-Side (Vanilla JS / HTML)

Include the script in your page `<head>` or `<body>`:

```html
<!-- Include the extractor -->
<script src="king-listing-extractor.js"></script>

<!-- UI Input & Button -->
<div class="deal-importer">
  <input id="listingUrl" type="url" placeholder="http://properties.kingindustrial.com/[slug]" />
  <button onclick="handleImport()">⚡ Autofill Deal</button>
</div>

<script>
async function handleImport() {
  const url = document.getElementById('listingUrl').value;
  try {
    // 1. Extract raw listing
    const listing = await KingListingExtractor.extractListing(url);
    
    // 2. Convert to Deal Studio format
    const deal = KingListingExtractor.toStudioDeal(listing);
    
    // 3. Populate your form inputs
    document.getElementById('nameInput').value = deal.name;
    document.getElementById('addressInput').value = deal.address;
    document.getElementById('sfInput').value = deal.sf;
    document.getElementById('corridorInput').value = deal.corridor;
    document.getElementById('clearHeightInput').value = deal.clearHeight;
    document.getElementById('dockDoorsInput').value = deal.dockDoors;
    document.getElementById('notesInput').value = deal.notes;
    
    // 4. Handle photos and flyer PDF
    if (deal.photos && deal.photos.length > 0) {
      console.log('Photos extracted:', deal.photos);
      document.getElementById('heroImage').src = deal.heroImage;
    }
    if (deal.documents && deal.documents.length > 0) {
      console.log('Flyer PDF link:', deal.documents[0].url);
    }
    
    alert('✓ Successfully autofilled deal from listing!');
  } catch (err) {
    console.error('Import failed:', err);
    alert('Error extracting listing: ' + err.message);
  }
}
</script>
```

---

### Option 2: React / Next.js Component

```tsx
import React, { useState } from 'react';
// If using commonjs / ES import:
import { extractListing, toStudioDeal } from './king-listing-extractor';

export function KingListingImporter({ onDealLoaded }: { onDealLoaded: (deal: any) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus('Extracting listing data & photos...');

    try {
      const raw = await extractListing(url);
      const deal = toStudioDeal(raw);
      onDealLoaded(deal);
      setStatus(`✓ Imported ${deal.name} (${deal.sf?.toLocaleString()} SF)`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
      <label className="text-xs font-bold text-white uppercase tracking-wider">
        🔗 Import from King Industrial Link
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale"
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
        />
        <button
          onClick={handleImport}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition"
        >
          {loading ? 'Extracting...' : '⚡ Autofill Deal'}
        </button>
      </div>
      {status && <p className="text-xs text-slate-400 font-mono">{status}</p>}
    </div>
  );
}
```

---

### Option 3: Next.js API Route / Node.js Server (`/api/extract-deal`)

```typescript
// pages/api/extract-deal.ts or app/api/extract-deal/route.ts
import type { NextApiRequest, NextApiResponse } from 'next';
const Extractor = require('../../king-listing-extractor.js');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing listing URL parameter.' });
  }

  try {
    const listing = await Extractor.extractListing(url);
    const deal = Extractor.toStudioDeal(listing);
    return res.status(200).json({ success: true, deal, listing });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
```

---

## 📐 TypeScript Interfaces

```typescript
export interface PropertyPhoto {
  id: number;
  url: string;
  thumbUrl: string;
  description?: string;
}

export interface PropertyDocument {
  title: string;
  url: string;
}

export interface BrokerContact {
  name: string;
  title: string;
  phone: string;
  email: string;
  photo?: string;
}

export interface KingDeal {
  id: string;
  name: string;
  address: string;
  corridor: string;
  typeBadge: string;
  sf: number;
  costPsf: number;
  rentPsf: number;
  escalation: number;
  exitCap: number;
  ltc: number;
  interestRate: number;
  amortYears: number;
  layout: 'crossdock' | 'singleload';
  courtDepth: number;
  clearHeight: number;
  dockDoors: number;
  driveinDoors: number;
  trailerStalls: number;
  columnGrid: string;
  sprinkler: string;
  notes: string;
  heroImage?: string;
  photos?: PropertyPhoto[];
  documents?: PropertyDocument[];
  brokers?: BrokerContact[];
  lotSize?: string;
  coordinates?: { lat: number; lng: number } | null;
  sourceUrl?: string;
}
```

---

## 🧪 Verified Sample Output for `51-57-pearl-industrial-avenue-hoschton-sale`

```json
{
  "id": "deal-51-57-pearl-industrial-avenue-hoschton-sale",
  "name": "Pearl Industrial Park (4-Building Complex)",
  "address": "51-57 Pearl Industrial Avenue, Hoschton, GA 30548",
  "corridor": "I-85 North Corridor (Jackson / Gwinnett)",
  "typeBadge": "Stabilized Industrial Investment",
  "sf": 50000,
  "costPsf": 115,
  "rentPsf": 7.50,
  "escalation": 3.50,
  "exitCap": 5.25,
  "ltc": 0.65,
  "interestRate": 0.065,
  "amortYears": 25,
  "layout": "singleload",
  "courtDepth": 140,
  "clearHeight": 24,
  "dockDoors": 4,
  "driveinDoors": 2,
  "trailerStalls": 11,
  "columnGrid": "50' x 50' Speed Bays",
  "sprinkler": "ESFR Sprinkler System",
  "notes": "Fully Stabilized, 100% Leased. Newer Construction (Built 2000-2004). Front-Load Configuration Ideal for Small Contractors, Trade, and Light Distribution / Service Tenants. Mix of Dock-High and Drive-In / Van-High Loading. Located in the I-85 North Corridor. Submarket Vacancy Below 8.25%. King Industrial Listing Team: Andrew Johnson (404.942.2029), Brian Bratton, SIOR (404.942.2028).",
  "heroImage": "https://s3.amazonaws.com/buildout-production/datas/35999025/2bef679c3b8274eb684eb08018269f61482d3752/full.jpg?1786632959",
  "photos": [
    {
      "id": 67006602,
      "url": "https://s3.amazonaws.com/buildout-production/datas/35999025/2bef679c3b8274eb684eb08018269f61482d3752/full.jpg?1786632959",
      "thumbUrl": "https://s3.amazonaws.com/buildout-production/datas/35999025/2bef679c3b8274eb684eb08018269f61482d3752/small.jpg?1786632959"
    }
  ],
  "documents": [
    {
      "title": "927-D179_Pearl Industrial Park -Investment.pdf",
      "url": "https://buildout.com/sharing/51-57-pearl-industrial-avenue-hoschton-sale?file=4312499"
    }
  ],
  "brokers": [
    {
      "name": "Andrew Johnson",
      "title": "Vice President",
      "phone": "404.942.2029",
      "email": "ajohnson@kingindustrial.com"
    },
    {
      "name": "Brian Bratton, SIOR",
      "title": "Senior Vice President",
      "phone": "404.942.2028",
      "email": "bbratton@kingindustrial.com"
    }
  ],
  "coordinates": {
    "lat": 34.0847709,
    "lng": -83.7422446
  }
}
```

---

## 🛠️ Testing & Verification Instructions

To run the automated test suite on any machine with Node.js installed:

```bash
node test-extractor.js
```

All tests will validate:
- URL slug parsing
- Atlanta corridor classification
- Standalone HTML spec extraction
- JSONP embed parsing
- Photo gallery and PDF brochure links
- Deal Studio schema conversion
- Live network extraction

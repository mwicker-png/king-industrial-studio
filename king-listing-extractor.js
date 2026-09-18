/**
 * 👑 KING INDUSTRIAL REALTY // ONLINE LISTING EXTRACTOR & DEAL AUTOFILL ENGINE
 * 
 * Extracts property metadata, physical specs, financial terms, high-res photos,
 * PDF marketing flyers, and broker contact cards from any King Industrial listing:
 * e.g. http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale
 * 
 * Works in:
 * - Client-side Browsers (zero backend required via JSONP & CORS proxy fallback)
 * - Node.js / Next.js / Express / Cloudflare Workers
 * 
 * Author: King Industrial Realty Underwriting & Technology
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KingListingExtractor = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const KING_BUILDOUT_TOKEN = '483b18cef95cf9ec171e0ace6ca651058051abb0';
  const KING_BUILDOUT_DOMAIN = 'https://buildout.com/';
  const KING_HOST = 'properties.kingindustrial.com';

  /**
   * Extracts clean property slug from any King Industrial or Buildout URL
   * e.g. "http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale?utm=..."
   * -> "51-57-pearl-industrial-avenue-hoschton-sale"
   */
  function extractPropertySlug(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // If already just a slug
    if (!trimmed.includes('/') && !trimmed.includes('.')) {
      return trimmed.toLowerCase();
    }

    try {
      // Clean query and hash
      const cleanUrl = trimmed.split('?')[0].split('#')[0];
      const parts = cleanUrl.split('/').filter(p => p.length > 0);
      const lastPart = parts[parts.length - 1];
      return lastPart.toLowerCase();
    } catch (e) {
      return null;
    }
  }

  /**
   * Intelligently classifies Atlanta Industrial Corridor based on city, county, or description text
   */
  function classifyAtlantaCorridor(text) {
    if (!text) return 'I-85 North Corridor (Jackson / Gwinnett)';
    const t = text.toLowerCase();

    // Check Airport / Aerotropolis first so Hartsfield-Jackson doesn't falsely match Jackson County
    if (t.includes('airport') || t.includes('aerotropolis') || t.includes('hartsfield') || 
        t.includes('college park') || t.includes('hapeville') || t.includes('riverdale') || 
        t.includes('camp creek')) {
      return 'Airport / Aerotropolis South';
    }

    if (t.includes('jackson county') || (t.includes('jackson') && !t.includes('hartsfield-jackson')) || 
        t.includes('hoschton') || t.includes('braselton') || 
        t.includes('buford') || t.includes('jefferson') || t.includes('commerce') || 
        t.includes('gwinnett') || t.includes('suwanee') || t.includes('duluth') || 
        t.includes('lawrenceville') || t.includes('i-85 north')) {
      return 'I-85 North Corridor (Jackson / Gwinnett)';
    }

    if (t.includes('fulton industrial') || t.includes('i-20 west') || t.includes('lithia springs') || 
        t.includes('douglasville') || t.includes('austell') || t.includes('cobblinc') || 
        t.includes('south fulton') || t.includes('fairburn rd')) {
      return 'I-20 West / Fulton Industrial';
    }

    if (t.includes('henry') || t.includes('clayton') || t.includes('mcdonough') || 
        t.includes('locust grove') || t.includes('forest park') || t.includes('ellenwood') || 
        t.includes('i-75 south')) {
      return 'I-75 South / Henry & Clayton';
    }

    if (t.includes('newnan') || t.includes('fairburn') || t.includes('coweta') || 
        t.includes('meriwether') || t.includes('palmetto') || t.includes('i-85 south') || 
        t.includes('peachtree city')) {
      return 'I-85 South / Coweta & Meriwether';
    }

    if (t.includes('kennesaw') || t.includes('marietta') || t.includes('acworth') || 
        t.includes('cartersville') || t.includes('cherokee') || t.includes('i-75 north') || 
        t.includes('canton') || t.includes('woodstock')) {
      return 'I-75 North / Northwest Atlanta';
    }

    return 'I-85 North Corridor (Jackson / Gwinnett)';
  }

  /**
   * Helper: Parses numeric values from string with commas and units (e.g. "50,000 SF" -> 50000)
   */
  function parseNumber(str) {
    if (!str) return null;
    if (typeof str === 'number') return str;
    const match = str.replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * Parses the HTML or JSONP payload returned by Buildout
   */
  function parseListingPayload(rawContent, slug) {
    let html = rawContent;
    let seoAttrs = null;

    // Check if rawContent is a JSONP buildoutEmbed call
    if (typeof rawContent === 'string' && rawContent.includes('buildoutEmbed(')) {
      try {
        const jsonMatch = rawContent.match(/buildoutEmbed\(\s*(\{[\s\S]*\})\s*\)/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed && parsed.content) {
            html = parsed.content;
          }
        }
      } catch (e) {
        console.warn('[KingListingExtractor] Could not parse JSONP payload directly:', e);
      }

      // Check if seoAttrs is present in the script
      try {
        const seoMatch = rawContent.match(/var\s+seoAttrs\s*=\s*(\{[\s\S]*?\});/);
        if (seoMatch) {
          seoAttrs = JSON.parse(seoMatch[1]);
        }
      } catch (e) {}
    }

    // Initialize result container
    const result = {
      id: `deal-${slug || 'imported'}`,
      slug: slug || '',
      name: '',
      headline: '',
      address: '',
      streetAddress: '',
      city: '',
      state: 'GA',
      zip: '',
      county: '',
      corridor: '',
      typeBadge: 'Class-A Industrial Facility',
      sf: 0,
      lotSize: '',
      lotAcres: null,
      priceRaw: '',
      costPsf: null,
      rentPsf: null,
      clearHeight: 32,
      dockDoors: 4,
      driveinDoors: 2,
      trailerStalls: 10,
      courtDepth: 140,
      layout: 'singleload',
      columnGrid: "50' x 50' Speed Bays",
      sprinkler: 'ESFR Sprinkler System',
      power: '',
      yearBuilt: '',
      highlights: [],
      notes: '',
      heroImage: '',
      photos: [],
      documents: [],
      brokers: [],
      coordinates: null
    };

    // 1. Check SEO Attrs / Schema.org if present
    if (seoAttrs) {
      if (seoAttrs.pageTitle) {
        result.name = seoAttrs.pageTitle.replace(/,\s*Hoschton,\s*GA\s*For\s*Sale/i, '').replace(/\s*for\s*sale$/i, '').trim();
      }
      if (seoAttrs.schema && seoAttrs.schema.contentLocation && seoAttrs.schema.contentLocation.address) {
        const addr = seoAttrs.schema.contentLocation.address;
        result.streetAddress = addr.streetAddress || '';
        result.city = addr.addressLocality || '';
        result.state = addr.addressRegion || 'GA';
        result.zip = addr.postalCode || '';
        result.address = `${result.streetAddress}, ${result.city}, ${result.state} ${result.zip}`.trim();
      }
    }

    // 2. Parse HTML structure
    // Use DOMParser if in browser, or regex patterns if in Node without DOM
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Title & Address from Header
      const h1 = doc.querySelector('.pdt-header1 h1') || doc.querySelector('h1');
      if (h1 && h1.textContent.trim()) {
        const h1Text = h1.textContent.trim();
        if (!result.name || result.name.length < h1Text.length) {
          result.name = h1Text;
        }
      }

      const h2Sub = doc.querySelector('.pdt-header2 h2') || doc.querySelector('header p');
      if (h2Sub && h2Sub.textContent.trim()) {
        const subText = h2Sub.textContent.trim();
        if (!result.address) {
          result.address = subText;
        } else if (!result.address.includes(subText) && result.streetAddress) {
          result.address = `${result.streetAddress}, ${subText}`;
        }
      }

      // Price header
      const priceH1 = doc.querySelector('[slug="price-header"] h1');
      if (priceH1 && priceH1.textContent.trim()) {
        result.priceRaw = priceH1.textContent.trim();
      }

      // Summary attributes table
      const attrs = {};
      let rawPriceNum = null;
      let rawLeaseRateNum = null;

      const rows = doc.querySelectorAll('#summary-attributes tr, .COMPONENT__table tr');
      rows.forEach(row => {
        const th = row.querySelector('th, td:first-child');
        const td = row.querySelector('td:last-child');
        if (!th || !td) return;
        const key = th.textContent.trim().toLowerCase();
        const val = td.textContent.trim();
        attrs[key] = val;

        // Building Size / SF
        if (key.includes('building size') || key.includes('square') || key.includes('rentable') || key.includes('rsf') || key.includes('total sf')) {
          const sfVal = parseNumber(val);
          if (sfVal && sfVal >= 1000) result.sf = Math.round(sfVal);
        }
        // Price / Sale Price
        else if (key.includes('price') || key.includes('asking price')) {
          result.priceRaw = val;
          const num = parseNumber(val);
          if (num) rawPriceNum = num;
        }
        // Lease Rate / Asking Rent
        else if (key.includes('lease rate') || key.includes('rental rate') || key.includes('rent') || key.includes('lease price')) {
          const num = parseNumber(val);
          if (num) rawLeaseRateNum = num;
        }
        // Lot Size
        else if (key.includes('lot size') || key.includes('acres')) {
          result.lotSize = val;
          result.lotAcres = parseNumber(val);
        }
        // Property Type
        else if (key.includes('property type')) {
          result.propertyType = val;
        }
      });

      // Compute costPsf after both price and sf are parsed
      if (rawPriceNum) {
        if (rawPriceNum > 1000 && result.sf > 0) {
          result.costPsf = Math.round(rawPriceNum / result.sf);
        } else if (rawPriceNum <= 1000 && rawPriceNum > 10) {
          result.costPsf = Math.round(rawPriceNum);
        }
      }

      // Compute rentPsf if lease rate is stated
      if (rawLeaseRateNum && rawLeaseRateNum >= 1.5 && rawLeaseRateNum <= 65) {
        result.rentPsf = parseFloat(rawLeaseRateNum.toFixed(2));
      }

      // Highlights
      const highlightLis = doc.querySelectorAll('[slug="highlights_custom_text"] li, #overview ul li');
      highlightLis.forEach(li => {
        const text = li.textContent.trim();
        if (text && !result.highlights.includes(text)) {
          result.highlights.push(text);
        }
      });

      // Photo Gallery from embedded JSON attribute
      const galleryDiv = doc.querySelector('[component="image-gallery"]');
      if (galleryDiv && galleryDiv.getAttribute('images')) {
        try {
          const rawImagesAttr = galleryDiv.getAttribute('images');
          const imgs = JSON.parse(rawImagesAttr);
          if (Array.isArray(imgs)) {
            result.photos = imgs.map(img => ({
              id: img.id,
              url: img.url,
              thumbUrl: img.url.replace(/\/(?:full|large|original)\.(jpe?g|png)/i, '/small.$1'),
              description: img.description || ''
            }));
          }
        } catch (e) {
          console.warn('[KingListingExtractor] Error parsing gallery images attribute:', e);
        }
      }

      // Fallback images from DOM img tags
      if (result.photos.length === 0) {
        const galleryImgs = doc.querySelectorAll('.gallery-asset img, .carousel-item img, img.d-block, section img');
        galleryImgs.forEach((img, idx) => {
          const src = img.getAttribute('src');
          if (src && !src.includes('logo') && !src.includes('profile') && !src.includes('icon')) {
            if (!result.photos.some(p => p.url === src)) {
              result.photos.push({
                id: idx + 1,
                url: src,
                thumbUrl: src,
                description: img.getAttribute('alt') || ''
              });
            }
          }
        });
      }

      // Hero Image
      if (result.photos.length > 0) {
        result.heroImage = result.photos[0].url;
      } else {
        const heroImg = doc.querySelector('img');
        if (heroImg && heroImg.src) result.heroImage = heroImg.src;
      }

      // Document Downloads / Flyers
      const docLinks = doc.querySelectorAll('a.js-doc-link, #js-public-docs a, a[href*="/sharing/"]');
      docLinks.forEach(a => {
        const href = a.getAttribute('href');
        const text = a.textContent.trim();
        if (href) {
          result.documents.push({
            title: text || 'Property Marketing Flyer (PDF)',
            url: href.startsWith('http') ? href : `${KING_BUILDOUT_DOMAIN.replace(/\/$/, '')}${href}`
          });
        }
      });

      // Brokers
      const brokerCards = doc.querySelectorAll('.pdt-broker, #broker');
      brokerCards.forEach(b => {
        const nameEl = b.querySelector('.pdt-broker-name strong, .pdt-broker-name, p strong');
        const titleEl = b.querySelector('.pdt-broker-title');
        const phoneEl = b.querySelector('a[href^="tel:"]');
        const emailEl = b.querySelector('a[href^="mailto:"]');
        const photoEl = b.querySelector('img.pdt-broker-photo, img.broker-photo');

        let name = nameEl ? nameEl.textContent.trim() : '';
        let title = titleEl ? titleEl.textContent.trim() : 'Broker';
        let phone = phoneEl ? phoneEl.textContent.trim() : '';
        let email = emailEl ? emailEl.textContent.trim() : '';
        let photo = photoEl ? photoEl.getAttribute('src') : '';

        // If simple #broker paragraph layout
        if (!name && b.querySelector('p')) {
          const pText = b.querySelector('p').innerHTML.split('<br>');
          if (pText[0]) name = pText[0].replace(/<[^>]+>/g, '').trim();
          if (pText[1]) title = pText[1].replace(/<[^>]+>/g, '').trim();
        }

        if (name && !result.brokers.some(existing => existing.name === name)) {
          result.brokers.push({ name, title, phone, email, photo });
        }
      });

      // Map Coordinates
      const mapEl = doc.querySelector('.map-container[lat], [component="map"][lat]');
      if (mapEl && mapEl.getAttribute('lat') && mapEl.getAttribute('lng')) {
        result.coordinates = {
          lat: parseFloat(mapEl.getAttribute('lat')),
          lng: parseFloat(mapEl.getAttribute('lng'))
        };
      }

    } else {
      // Regex parsing for Node.js / non-browser environments without jsdom
      // Title
      const h1Match = html.match(/<div component="text" slug="property-header">[\s\S]*?<h1>([\s\S]*?)<\/h1>/i) ||
                      html.match(/<h1>([\s\S]*?)<\/h1>/i);
      if (h1Match) result.name = h1Match[1].replace(/<[^>]+>/g, '').trim();

      // Address (guarded against duplicate concatenation)
      const h2Match = html.match(/<div component="text" slug="property-subheader">[\s\S]*?<h2>([\s\S]*?)<\/h2>/i) ||
                      html.match(/<p>([0-9].*?,.*?GA.*?)<\/p>/i);
      if (h2Match && !result.address) {
        const sub = h2Match[1].replace(/<[^>]+>/g, '').trim();
        if (result.name && (sub.toLowerCase().includes(result.name.toLowerCase()) || result.name.toLowerCase().includes(sub.toLowerCase()))) {
          result.address = sub.length >= result.name.length ? sub : result.name;
        } else if (result.name && /^[0-9]/.test(result.name) && /(?:GA|Georgia|\d{5})/i.test(sub)) {
          result.address = `${result.name}, ${sub}`;
        } else {
          result.address = sub || result.name;
        }
      }

      // Building Size
      const sfMatch = html.match(/Building Size:?[\s\S]*?<td>([0-9,]+)\s*SF/i) ||
                      html.match(/([0-9,]{4,})\s*(?:SF|RSF|sq\.?\s*ft)/i);
      if (sfMatch && (!result.sf || result.sf === 0)) {
        result.sf = parseNumber(sfMatch[1]);
      }

      // Price
      const priceMatch = html.match(/(?:Sale\s+)?Price:?[\s\S]*?<td>(.*?)<\/td>/i) ||
                         html.match(/slug="price-header"[\s\S]*?<h1>(.*?)<\/h1>/i);
      if (priceMatch && (!result.priceRaw || result.priceRaw === 'See Agent')) {
        result.priceRaw = priceMatch[1].replace(/<[^>]+>/g, '').trim();
        const num = parseNumber(result.priceRaw);
        if (num && num > 1000 && result.sf > 0) {
          result.costPsf = Math.round(num / result.sf);
        } else if (num && num <= 1000 && num > 10) {
          result.costPsf = Math.round(num);
        }
      }

      // If price was parsed before sf or sf was parsed after price
      if (result.priceRaw && !result.costPsf && result.sf > 0) {
        const num = parseNumber(result.priceRaw);
        if (num && num > 1000) {
          result.costPsf = Math.round(num / result.sf);
        }
      }

      // Lease Rate / Asking Rent (regex fallback)
      const rentMatch = html.match(/(?:Lease\s+Rate|Rental\s+Rate|Rent):?[\s\S]*?<td>(.*?)<\/td>/i) ||
                        html.match(/\$\s*(\d{1,2}(?:\.\d{2})?)\s*(?:\/|\s+per\s+)?(?:sf|sq\.?\s*ft|rsf)/i);
      if (rentMatch && !result.rentPsf) {
        const rNum = parseNumber(rentMatch[1]);
        if (rNum && rNum >= 1.5 && rNum <= 65) {
          result.rentPsf = parseFloat(rNum.toFixed(2));
        }
      }

      // Lot Size
      const lotMatch = html.match(/Lot Size:?[\s\S]*?<td>(.*?)<\/td>/i);
      if (lotMatch) {
        result.lotSize = lotMatch[1].replace(/<[^>]+>/g, '').trim();
        result.lotAcres = parseNumber(result.lotSize);
      }

      // Highlights
      const hlMatches = html.matchAll(/<li>(.*?)<\/li>/gi);
      for (const m of hlMatches) {
        const text = m[1].replace(/<[^>]+>/g, '').trim();
        if (text && !result.highlights.includes(text) && !text.includes('tab=')) {
          result.highlights.push(text);
        }
      }

      // Images JSON attribute (supports double quotes, single quotes, and escaped JSON)
      const imagesMatch = html.match(/images=(["'])(\[[\s\S]*?\])\1/i) ||
                          html.match(/images=\\?(["'])(\[[\s\S]*?\])\\?\1/i);
      if (imagesMatch) {
        try {
          const unescaped = imagesMatch[2].replace(/&quot;/g, '"').replace(/\\"/g, '"');
          const imgs = JSON.parse(unescaped);
          result.photos = imgs.map(img => ({
            id: img.id,
            url: img.url,
            thumbUrl: img.url.replace('/full.jpg', '/small.jpg'),
            description: img.description || ''
          }));
          if (result.photos.length > 0) result.heroImage = result.photos[0].url;
        } catch (e) {}
      }

      // Fallback single image from img src
      if (result.photos.length === 0) {
        const singleImgMatch = html.match(/<img[^>]+src="([^">]+(?:cloudfront\.net|amazonaws\.com)[^">]+)"/i);
        if (singleImgMatch) {
          result.heroImage = singleImgMatch[1];
          result.photos.push({
            id: 1,
            url: singleImgMatch[1],
            thumbUrl: singleImgMatch[1],
            description: 'Property Photo'
          });
        }
      }

      // Brokers regex
      const brokerPdtMatches = html.matchAll(/<strong class="pdt-broker-name[^>]*>([\s\S]*?)<\/strong>[\s\S]*?<div class="pdt-broker-title[^>]*>([\s\S]*?)<\/div>(?:[\s\S]*?href="tel:([^"]+)")?(?:[\s\S]*?href="mailto:([^"]+)")?/gi);
      for (const b of brokerPdtMatches) {
        const name = b[1].replace(/<[^>]+>/g, '').trim();
        const title = b[2].replace(/<[^>]+>/g, '').trim();
        const phone = b[3] ? b[3].trim() : '';
        const email = b[4] ? b[4].trim() : '';
        if (name && !result.brokers.some(existing => existing.name === name)) {
          result.brokers.push({ name, title, phone, email, photo: '' });
        }
      }

      if (result.brokers.length === 0) {
        const simpleBrokerMatches = html.matchAll(/<div id="broker">[\s\S]*?<p>([^<]+)<br\s*\/?>([^<]+)(?:<br\s*\/?>([^<]+))?<\/p>(?:[\s\S]*?<td>([0-9.\-\s]+)<\/td>)?/gi);
        for (const b of simpleBrokerMatches) {
          const name = b[1].trim();
          const title = b[2].trim();
          const phone = b[4] ? b[4].trim() : '';
          if (name && !result.brokers.some(existing => existing.name === name)) {
            result.brokers.push({ name, title, phone, email: '', photo: '' });
          }
        }
      }

      // Document link
      const docMatch = html.match(/href="(https:\/\/buildout\.com\/sharing\/[^"]+)"[\s\S]*?>([^<]+\.pdf)/i);
      if (docMatch) {
        result.documents.push({
          url: docMatch[1],
          title: docMatch[2].trim()
        });
      }

      // Map coords
      const mapMatch = html.match(/lat="([-0-9.]+)"\s+lng="([-0-9.]+)"/i);
      if (mapMatch) {
        result.coordinates = {
          lat: parseFloat(mapMatch[1]),
          lng: parseFloat(mapMatch[2])
        };
      }
    }

    // 3. Post-Process & Infer Logistics Specs
    const allText = `${result.name} ${result.address} ${result.highlights.join(' ')} ${html}`.toLowerCase();

    // Corridor classification
    result.corridor = classifyAtlantaCorridor(`${result.address} ${result.highlights.join(' ')}`);

    // Type Badge
    if (result.highlights.some(h => h.toLowerCase().includes('stabilized') || h.toLowerCase().includes('investment'))) {
      result.typeBadge = 'Stabilized Industrial Investment';
    } else if (allText.includes('cross-dock') || allText.includes('crossdock')) {
      result.typeBadge = 'Class-A Cross-Dock Facility';
    } else if (allText.includes('front-load') || allText.includes('rear-load')) {
      result.typeBadge = 'Multi-Tenant Light Industrial';
    }

    // Layout
    if (allText.includes('cross-dock') || allText.includes('cross dock')) {
      result.layout = 'crossdock';
      result.courtDepth = 185;
    } else {
      result.layout = 'singleload';
      result.courtDepth = 140;
    }

    // Clear Height inference
    const clearMatch = allText.match(/([0-9]{2})['’\s]*(?:clear|ceiling)/i);
    if (clearMatch) {
      result.clearHeight = parseInt(clearMatch[1], 10);
    } else if (result.sf >= 300000) {
      result.clearHeight = 36;
    } else if (result.sf >= 100000) {
      result.clearHeight = 32;
    } else {
      result.clearHeight = 24;
    }

    // Loading Doors inference
    const dockMatch = allText.match(/([0-9]+)\s*(?:dock|dock-high)/i);
    if (dockMatch) {
      result.dockDoors = parseInt(dockMatch[1], 10);
    } else if (allText.includes('mix of dock-high')) {
      result.dockDoors = Math.max(4, Math.round(result.sf / 12500));
    }

    const driveInMatch = allText.match(/([0-9]+)\s*(?:drive-in|drive in|van-high|ramp)/i);
    if (driveInMatch) {
      result.driveinDoors = parseInt(driveInMatch[1], 10);
    }

    // Trailer Stalls
    const trailerMatch = allText.match(/([0-9]+)\s*(?:trailer|stalls|parking)/i);
    if (trailerMatch) {
      result.trailerStalls = parseInt(trailerMatch[1], 10);
    } else {
      result.trailerStalls = Math.max(10, Math.round(result.sf / 4500));
    }

    // Sprinkler
    if (allText.includes('esfr')) {
      result.sprinkler = 'ESFR K-25.2 Heads';
    }

    // Construct Notes / Executive Memo
    const noteParts = [];
    if (result.highlights.length > 0) {
      noteParts.push(result.highlights.join('. '));
    }
    if (result.brokers.length > 0) {
      const bList = result.brokers.map(b => `${b.name} (${b.phone || b.email})`).join(', ');
      noteParts.push(`King Industrial Listing Team: ${bList}.`);
    }
    result.notes = noteParts.join(' ');

    return result;
  }

  /**
   * Fetches listing data in a client-side browser using JSONP or CORS Proxy
   */
  function fetchBrowserListing(slug, options = {}) {
    return new Promise((resolve, reject) => {
      const token = options.token || KING_BUILDOUT_TOKEN;
      const host = options.host || KING_HOST;
      const domain = options.domain || KING_BUILDOUT_DOMAIN;

      // Method 1: BuildOut direct script / JSONP endpoint (iframe=false returns full payload with all photos)
      // https://buildout.com/plugins/[token]/[host]/inventory/[slug]?iframe=false&embedded=true
      const jsonpUrl = `${domain}plugins/${token}/${host}/inventory/${slug}?iframe=false&embedded=true&t=${Date.now()}`;

      // Set up global buildoutEmbed handler
      const prevCallback = window.buildoutEmbed;
      let resolved = false;

      window.buildoutEmbed = function (payload) {
        resolved = true;
        if (typeof prevCallback === 'function') prevCallback(payload);
        try {
          const parsed = parseListingPayload(payload.content || payload, slug);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };

      // Inject script tag
      const script = document.createElement('script');
      script.src = jsonpUrl;
      script.async = true;

      script.onerror = function () {
        if (resolved) return;
        // Fallback to CORS proxy if script tag fails
        fetchViaCorsProxy(slug, options)
          .then(resolve)
          .catch(reject);
      };

      // 6 second timeout fallback to proxy
      setTimeout(() => {
        if (!resolved) {
          fetchViaCorsProxy(slug, options)
            .then(resolve)
            .catch(reject);
        }
      }, 6000);

      document.head.appendChild(script);
    });
  }

  /**
   * Fetches standalone HTML via public CORS proxy for complete image arrays and specs
   */
  async function fetchViaCorsProxy(slug, options = {}) {
    const token = options.token || KING_BUILDOUT_TOKEN;
    const host = options.host || KING_HOST;
    const domain = options.domain || KING_BUILDOUT_DOMAIN;

    const targetUrl = `${domain}plugins/${token}/${host}/inventory/${slug}?pluginId=0&iframe=true&constrainHeight=true&propertyBranding=true`;

    const proxies = [
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    for (const proxyGen of proxies) {
      try {
        const proxyUrl = proxyGen(targetUrl);
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 500) {
            return parseListingPayload(text, slug);
          }
        }
      } catch (e) {
        // try next proxy
      }
    }

    throw new Error(`Could not fetch listing '${slug}' via browser script or CORS proxies.`);
  }

  /**
   * Fetches listing data in Node.js / serverless / Next.js API route
   */
  async function fetchNodeListing(slug, options = {}) {
    const token = options.token || KING_BUILDOUT_TOKEN;
    const host = options.host || KING_HOST;
    const domain = options.domain || KING_BUILDOUT_DOMAIN;

    const url = `${domain}plugins/${token}/${host}/inventory/${slug}?pluginId=0&iframe=true&constrainHeight=true&propertyBranding=true`;
    
    // Use native fetch (Node 18+) or dynamic require
    let fetchFn = (typeof fetch !== 'undefined') ? fetch : null;
    if (!fetchFn && typeof require !== 'undefined') {
      try {
        fetchFn = require('node-fetch');
      } catch (e) {}
    }

    if (!fetchFn) {
      throw new Error('No fetch implementation found. Please use Node.js 18+ or install node-fetch.');
    }

    const res = await fetchFn(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} fetching King Industrial listing: ${url}`);
    }

    const text = await res.text();
    return parseListingPayload(text, slug);
  }

  /**
   * Main Public API: Universal Listing Extractor
   * Accepts any URL or slug, fetches the listing data, and returns a structured deal object.
   */
  async function extractListing(urlOrSlug, options = {}) {
    const slug = extractPropertySlug(urlOrSlug);
    if (!slug) {
      throw new Error(`Invalid property link or slug: '${urlOrSlug}'`);
    }

    // Detect environment
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (isBrowser) {
      return await fetchBrowserListing(slug, options);
    } else {
      return await fetchNodeListing(slug, options);
    }
  }

  /**
   * Converts extracted listing data into the standard King Industrial Studio Deal schema
   * Ready to be saved into deals array or rendered in index.html / studio.html
   */
  function toStudioDeal(listing) {
    if (!listing) return null;

    return {
      id: listing.id || `deal-${listing.slug || Date.now()}`,
      name: listing.name || 'King Industrial Facility',
      address: listing.address || 'Metro Atlanta Logistics Corridor',
      corridor: listing.corridor || 'I-85 North Corridor (Jackson / Gwinnett)',
      typeBadge: listing.typeBadge || 'Class-A Industrial Facility',
      sf: listing.sf || 100000,
      costPsf: listing.costPsf || 115,
      rentPsf: listing.rentPsf || 7.50,
      escalation: 3.50,
      exitCap: 5.25,
      ltc: 0.65,
      interestRate: 0.065,
      amortYears: 25,
      layout: listing.layout || 'singleload',
      courtDepth: listing.courtDepth || 140,
      clearHeight: listing.clearHeight || 32,
      dockDoors: listing.dockDoors || 4,
      driveinDoors: listing.driveinDoors || 2,
      trailerStalls: listing.trailerStalls || 10,
      columnGrid: listing.columnGrid || "50' x 50' Speed Bays",
      sprinkler: listing.sprinkler || 'ESFR Sprinkler System',
      notes: listing.notes || (listing.highlights ? listing.highlights.join('. ') : ''),
      heroImage: listing.heroImage || '',
      photos: listing.photos || [],
      documents: listing.documents || [],
      brokers: listing.brokers || [],
      lotSize: listing.lotSize || '',
      coordinates: listing.coordinates || null,
      sourceUrl: listing.slug ? `http://properties.kingindustrial.com/${listing.slug}` : ''
    };
  }

  return {
    extractPropertySlug,
    classifyAtlantaCorridor,
    parseListingPayload,
    extractListing,
    toStudioDeal,
    KING_BUILDOUT_TOKEN,
    KING_HOST
  };
}));

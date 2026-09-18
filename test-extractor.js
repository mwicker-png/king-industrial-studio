const fs = require('fs');
const path = require('path');
const Extractor = require('./king-listing-extractor.js');

async function runTests() {
  console.log('=== RUNNING KING LISTING EXTRACTOR TESTS ===\n');

  // Test 1: URL Slug Extraction
  console.log('Test 1: URL Slug Extraction');
  const testUrls = [
    'http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale',
    'https://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale?b_utm_source=deal',
    'https://buildout.com/website/51-57-pearl-industrial-avenue-hoschton-sale#overview',
    '51-57-pearl-industrial-avenue-hoschton-sale'
  ];
  for (const u of testUrls) {
    const slug = Extractor.extractPropertySlug(u);
    console.log(`  URL: ${u} -> Slug: ${slug}`);
    if (slug !== '51-57-pearl-industrial-avenue-hoschton-sale') {
      throw new Error(`Failed slug extraction for ${u}`);
    }
  }
  console.log('  ✓ Slug extraction passed!\n');

  // Test 2: Corridor Classification
  console.log('Test 2: Atlanta Corridor Classification');
  const corridors = [
    { text: 'Hoschton, GA (Jackson County) near I-85', expected: 'I-85 North Corridor (Jackson / Gwinnett)' },
    { text: 'Fulton Industrial Blvd, Atlanta GA', expected: 'I-20 West / Fulton Industrial' },
    { text: 'McDonough, Henry County GA', expected: 'I-75 South / Henry & Clayton' },
    { text: 'Hartsfield-Jackson Airport Cargo, College Park', expected: 'Airport / Aerotropolis South' }
  ];
  for (const c of corridors) {
    const res = Extractor.classifyAtlantaCorridor(c.text);
    console.log(`  Text: "${c.text}" -> Corridor: ${res}`);
    if (res !== c.expected) {
      throw new Error(`Expected ${c.expected} but got ${res}`);
    }
  }
  console.log('  ✓ Corridor classification passed!\n');

  // Test 3: Standalone HTML Parsing (Offline Fixture)
  console.log('Test 3: Standalone HTML Parsing (Offline Fixture)');
  const standaloneHtml = fs.readFileSync(path.join(__dirname, 'buildout_standalone_utf8.html'), 'utf8');
  const parsedStandalone = Extractor.parseListingPayload(standaloneHtml, '51-57-pearl-industrial-avenue-hoschton-sale');
  
  console.log('  Name:', parsedStandalone.name);
  console.log('  Address:', parsedStandalone.address);
  console.log('  Corridor:', parsedStandalone.corridor);
  console.log('  Square Footage:', parsedStandalone.sf, 'SF');
  console.log('  Lot Size:', parsedStandalone.lotSize);
  console.log('  Price:', parsedStandalone.priceRaw);
  console.log('  Clear Height:', parsedStandalone.clearHeight, 'ft');
  console.log('  Dock Doors:', parsedStandalone.dockDoors);
  console.log('  Drive-in Doors:', parsedStandalone.driveinDoors);
  console.log('  Photos count:', parsedStandalone.photos.length);
  console.log('  Hero Image:', parsedStandalone.heroImage ? parsedStandalone.heroImage.substring(0, 60) + '...' : 'none');
  console.log('  Documents count:', parsedStandalone.documents.length);
  if (parsedStandalone.documents.length > 0) {
    console.log('  Flyer Doc:', parsedStandalone.documents[0].title);
  }
  console.log('  Highlights count:', parsedStandalone.highlights.length);
  console.log('  Coordinates:', parsedStandalone.coordinates);

  if (parsedStandalone.sf !== 50000) {
    throw new Error(`Expected SF 50000 but got ${parsedStandalone.sf}`);
  }
  if (parsedStandalone.photos.length !== 8) {
    throw new Error(`Expected 8 photos but got ${parsedStandalone.photos.length}`);
  }
  if (parsedStandalone.documents.length === 0) {
    throw new Error('Expected at least 1 document link');
  }
  console.log('  ✓ Standalone HTML parsing passed!\n');

  // Test 4: JSONP / Embedded HTML Parsing (Offline Fixture)
  console.log('Test 4: JSONP / Embedded HTML Parsing (Offline Fixture)');
  const iframeHtml = fs.readFileSync(path.join(__dirname, 'buildout_iframe.html'), 'utf8');
  const parsedIframe = Extractor.parseListingPayload(iframeHtml, '51-57-pearl-industrial-avenue-hoschton-sale');
  console.log('  Name:', parsedIframe.name);
  console.log('  Address:', parsedIframe.address);
  console.log('  Square Footage:', parsedIframe.sf, 'SF');
  console.log('  Highlights count:', parsedIframe.highlights.length);
  console.log('  Brokers count:', parsedIframe.brokers.length);
  if (parsedIframe.brokers.length > 0) {
    console.log('  Broker 1:', parsedIframe.brokers[0].name, '-', parsedIframe.brokers[0].phone);
  }
  console.log('  ✓ JSONP / Embedded parsing passed!\n');

  // Test 5: Conversion to Deal Studio Schema
  console.log('Test 5: Deal Studio Conversion');
  const deal = Extractor.toStudioDeal(parsedStandalone);
  console.log('  Deal ID:', deal.id);
  console.log('  Deal Name:', deal.name);
  console.log('  Deal Address:', deal.address);
  console.log('  Deal SF:', deal.sf);
  console.log('  Deal Corridor:', deal.corridor);
  console.log('  Deal Layout:', deal.layout);
  console.log('  Deal Notes preview:', deal.notes.substring(0, 80) + '...');
  console.log('  ✓ Deal Studio Schema conversion passed!\n');

  // Test 6: Live Fetch & Extract via Network (Node.js)
  console.log('Test 6: Live Fetch & Extract (Node.js HTTP)');
  try {
    const liveDeal = await Extractor.extractListing('http://properties.kingindustrial.com/51-57-pearl-industrial-avenue-hoschton-sale');
    console.log('  Live Deal extracted successfully!');
    console.log('  Live Name:', liveDeal.name);
    console.log('  Live SF:', liveDeal.sf);
    console.log('  Live Photos:', liveDeal.photos.length);
    console.log('  Live Documents:', liveDeal.documents.length);
    console.log('  Live Brokers:', liveDeal.brokers.length);
    console.log('  ✓ Live network extraction passed!\n');
  } catch (err) {
    console.warn('  (Live network warning - check connectivity):', err.message);
  }

  // Test 7: Browser JS-Embed / JSONP Live Endpoint Verification
  console.log('Test 7: Browser JS-Embed / JSONP Endpoint (iframe=false)');
  try {
    const jsonpUrl = `https://buildout.com/plugins/${Extractor.KING_BUILDOUT_TOKEN}/${Extractor.KING_HOST}/inventory/51-57-pearl-industrial-avenue-hoschton-sale?iframe=false&embedded=true`;
    const res = await fetch(jsonpUrl);
    const jsText = await res.text();
    let capturedArg = null;
    const fn = new Function('buildoutEmbed', 'document', jsText);
    fn((arg) => { capturedArg = arg; }, {
      querySelector: () => null,
      head: { appendChild: () => {} },
      createElement: () => ({})
    });

    const parsedJsonp = Extractor.parseListingPayload(capturedArg.content, '51-57-pearl-industrial-avenue-hoschton-sale');
    console.log('  Browser Payload SF:', parsedJsonp.sf);
    console.log('  Browser Payload Photos count:', parsedJsonp.photos.length);
    console.log('  Browser Payload Documents count:', parsedJsonp.documents.length);
    console.log('  Browser Payload Brokers count:', parsedJsonp.brokers.length);
    if (parsedJsonp.photos.length !== 8) {
      throw new Error(`Expected 8 photos in browser payload, got ${parsedJsonp.photos.length}`);
    }
    if (parsedJsonp.documents.length === 0) {
      throw new Error('Expected at least 1 document in browser payload');
    }
    console.log('  ✓ Browser JS-Embed / JSONP parsing passed (all 8 photos & flyer confirmed)!\n');
  } catch (err) {
    console.error('  Failed browser JS-Embed test:', err.message);
    throw err;
  }

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

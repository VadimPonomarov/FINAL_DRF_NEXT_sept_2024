// Simple Node script to request generation of 10 test ads with images
(async () => {
  try {
    const payload = { count: 10, includeImages: true, imageTypes: ['front','side','rear'] };
    const res = await fetch('http://localhost:3000/api/autoria/test-ads/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Error calling test-ads generate endpoint:', e);
    process.exit(1);
  }
})();


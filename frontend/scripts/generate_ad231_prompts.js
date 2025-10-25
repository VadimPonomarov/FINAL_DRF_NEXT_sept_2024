(async () => {
  const base = 'http://localhost:3000';
  const fetchJson = async (url, init) => {
    const res = await fetch(url, init);
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { throw new Error(`Failed to parse JSON from ${url}: ${txt}`); }
  };

  console.log('Fetching ad 231...');
  const ad = await fetchJson(`${base}/api/autoria/cars/231`);

  const payload = {
    formData: ad,
    angles: ['front', 'side', 'rear'],
    style: 'realistic',
    quality: 'standard',
    useDescription: true,
  };

  console.log('Requesting prompts (promptOnly=1)...');
  const data = await fetchJson(`${base}/api/llm/generate-car-images?debug=1&promptOnly=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log('--- CANONICAL ---');
  console.log(JSON.stringify(data?.debug?.canonical ?? null, null, 2));
  console.log('--- PROMPTS ---');
  console.log(JSON.stringify(data?.debug?.prompts ?? [], null, 2));
})();


/*
 * Preview script: generates images for a few representative ads and saves them to /public/generated-previews
 * Usage: npm run preview:image-generation
 */

import fs from 'node:fs';
import path from 'node:path';
import CarImageGeneratorService, { CarImageParams, GeneratedCarImage } from '@/services/carImageGenerator.service';

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function downloadToFile(url: string, filePath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(filePath, buf);
}

async function runCase(name: string, params: CarImageParams, outRoot: string) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9_-]+/gi, '-');
  const caseDir = path.join(outRoot, safeName);
  await ensureDir(caseDir);

  const { images, mainImage } = await CarImageGeneratorService.generateImagesForAd(params);

  const saved: string[] = [];
  for (const img of images) {
    const ext = '.jpg';
    const file = path.join(caseDir, `${img.angle}${img.isMain ? '-main' : ''}${ext}`);
    await downloadToFile(img.url, file);
    saved.push(file);
  }

  return { name, saved, main: mainImage?.url };
}

async function run() {
  const outRoot = path.join(process.cwd(), 'public', 'generated-previews', new Date().toISOString().replace(/[:.]/g, '-'));
  await ensureDir(outRoot);

  const cases: Array<{ name: string; params: CarImageParams }> = [
    { name: 'car-BMW-3Series', params: { brand: 'BMW', model: '3 Series', year: 2020, color: 'black', bodyType: 'sedan', vehicleType: 'car', condition: 'good' } },
    { name: 'truck-Volvo-FH', params: { brand: 'Volvo', model: 'FH', year: 2018, color: 'white', bodyType: 'semi-truck', vehicleType: 'truck', condition: 'used' } },
    { name: 'motorcycle-Yamaha-R1', params: { brand: 'Yamaha', model: 'YZF-R1', year: 2019, color: 'blue', bodyType: 'sport', vehicleType: 'motorcycle', condition: 'used' } },
    { name: 'bus-Setra-S516', params: { brand: 'Setra', model: 'S 516', year: 2017, color: 'yellow', bodyType: 'coach', vehicleType: 'bus', condition: 'used' } },
    { name: 'van-Sprinter', params: { brand: 'Mercedes-Benz', model: 'Sprinter', year: 2022, color: 'silver', bodyType: 'van', vehicleType: 'van', condition: 'used' } },
    { name: 'trailer-Schmitz-Curtainsider', params: { brand: 'Schmitz Cargobull', model: 'Curtainsider', year: 2016, color: 'white', bodyType: 'curtainsider', vehicleType: 'trailer', condition: 'used' } },
  ];

  const results = [] as Array<{ name: string; saved: string[]; main?: string }>;
  for (const c of cases) {
    try {
      const r = await runCase(c.name, c.params, outRoot);
      results.push(r);
    } catch (e: any) {
      console.error(`Failed case ${c.name}:`, e?.message || e);
    }
  }

  console.log('\nSaved previews to: ', outRoot);
  for (const r of results) {
    console.log(`\n=== ${r.name} ===`);
    r.saved.forEach(p => console.log(' -', path.relative(process.cwd(), p)));
  }

  if (results.length === 0) process.exitCode = 1;
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


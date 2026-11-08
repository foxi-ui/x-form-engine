import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const forbidden = ['ant-formily-item', 'ant-picker', 'ant-select', 'ant-form', '@formily/antd', 'rc-picker'];
const required = ['adm-'];

let failed = false;
for (const file of jsFiles) {
  const text = readFileSync(join(assetsDir, file), 'utf8');
  for (const marker of forbidden) {
    if (text.includes(marker)) {
      console.error(`[bundle-check] ${file} contains desktop marker: ${marker}`);
      failed = true;
    }
  }
}
const allJs = jsFiles.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
for (const marker of required) {
  if (!allJs.includes(marker)) {
    console.error(`[bundle-check] mobile marker missing: ${marker}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`[bundle-check] ok (${jsFiles.length} js files)`);

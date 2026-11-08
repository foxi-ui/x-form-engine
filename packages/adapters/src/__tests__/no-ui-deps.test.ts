import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FORBIDDEN = /\bfrom\s+['"](react|react-dom|@formily|@designable|antd)['"]/;

function collectSources(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...collectSources(full));
    } else if (entry.endsWith('.ts')) {
      result.push(full);
    }
  }
  return result;
}

test('adapters 保持 UI 无关（不 import react/formily/designable/antd）', () => {
  const srcDir = resolve(__dirname, '../..');
  for (const file of collectSources(srcDir)) {
    expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN);
  }
});

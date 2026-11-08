import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

test('types 包 package.json 不依赖 react/formily/designable', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
  for (const k of Object.keys(deps)) {
    expect(k).not.toMatch(/react|formily|designable|antd/);
  }
});

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

test('types 源码不 import react/formily/designable', () => {
  const srcDir = resolve(__dirname, '../..');
  for (const file of collectSources(srcDir)) {
    expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN);
  }
});

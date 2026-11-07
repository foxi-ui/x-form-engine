import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('types 包 package.json 不依赖 react/formily/designable', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
  for (const k of Object.keys(deps)) {
    expect(k).not.toMatch(/react|formily|designable|antd/);
  }
});

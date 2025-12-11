const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const typesPath = path.join(distDir, 'types.d.ts');

if (!fs.existsSync(distDir)) {
  throw new Error('dist directory not found. Run the build before packing types.');
}

if (!fs.existsSync(typesPath)) {
  throw new Error('types.d.ts not found. Ensure tsc emitted declaration files.');
}

const normalize = (content) => content.replace(/\r\n/g, '\n');
const dropSourceMap = (content) => content.replace(/\n?\/\/# sourceMappingURL=.*$/, '').trim();

const rawTypes = normalize(fs.readFileSync(typesPath, 'utf8'));
const body = dropSourceMap(rawTypes.replace(/^import[^\n]*\n/, ''));
const hasParticle = /export interface\s+Particle/.test(body);
const typeExports = hasParticle ? 'SnowfallProps, Particle' : 'SnowfallProps';

const declaration = `import type { CSSProperties, FC } from 'react';

${body}

declare const Snowfall: FC<SnowfallProps>;

export { Snowfall };
export type { ${typeExports} };
export default Snowfall;
`;

fs.writeFileSync(path.join(distDir, 'index.d.ts'), declaration);

const removeTargets = [
  path.join(distDir, 'components'),
  path.join(distDir, 'library.d.ts'),
  path.join(distDir, 'library.d.ts.map'),
  path.join(distDir, 'types.d.ts'),
  path.join(distDir, 'types.d.ts.map'),
];

removeTargets.forEach((target) => {
  if (fs.existsSync(target)) {
    const stats = fs.statSync(target);
    if (stats.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      fs.rmSync(target);
    }
  }
});

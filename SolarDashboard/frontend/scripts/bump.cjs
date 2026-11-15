const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const parts = pkg.version.split('.');
parts[2] = parseInt(parts[2], 10) + 1;
pkg.version = parts.join('.');

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
const srcDir = path.join(__dirname, '../src');
if (fs.existsSync(srcDir)) {
    fs.writeFileSync(path.join(srcDir, 'version.ts'), `export const APP_VERSION = '${pkg.version}';\n`);
}
console.log(`Version bumped to ${pkg.version}`);

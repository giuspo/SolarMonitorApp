const fs = require('fs');
const pkg = require('../package.json');
const parts = pkg.version.split('.');
parts[2] = parseInt(parts[2], 10) + 1;
pkg.version = parts.join('.');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4));
if (fs.existsSync('src')) {
    fs.writeFileSync('src/version.ts', `export const APP_VERSION = '${pkg.version}';\n`);
}
console.log(`Version bumped to ${pkg.version}`);

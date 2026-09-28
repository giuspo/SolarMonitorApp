const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const versionParts = pkg.version.split('.');
let major = parseInt(versionParts[0]);
let minor = parseInt(versionParts[1]);
let build = parseInt(versionParts[2]);

build += 1;
pkg.version = `${major}.${minor}.${build}`;

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Frontend version bumped to ${pkg.version}`);

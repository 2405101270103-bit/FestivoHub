const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'frontend_parts');
const files = fs.readdirSync(dir).filter(f => f.match(/\.js$/)).sort();
let html = '';
for (const f of files) {
  html += fs.readFileSync(path.join(dir, f), 'utf8');
}
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html, 'utf8');
console.log('Written index.html:', html.length, 'bytes,', html.split('\n').length, 'lines');

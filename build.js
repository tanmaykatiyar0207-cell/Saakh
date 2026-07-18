const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const files = fs.readdirSync(__dirname);
files.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  if (['.html', '.js', '.css', '.png', '.jpg', '.jpeg'].includes(ext)) {
    // Skip build.js itself
    if (file === 'build.js') return;
    fs.copyFileSync(path.join(__dirname, file), path.join(distDir, file));
  }
});
console.log('Build completed successfully! Static files copied to dist/');

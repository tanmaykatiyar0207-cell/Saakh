const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeDirs = ['.git', 'node_modules', 'temp-test2', 'temp-test3'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        results = results.concat(walk(fullPath));
      }
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

function touchAll() {
  const files = walk(rootDir);
  console.log(`Found ${files.length} files to touch...`);

  files.forEach(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath);

    // Skip gitignore lock or package.json
    if (base === 'package-lock.json') return;
    if (base === 'touch_every_file.js') return;

    try {
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        // Binary file: append a tiny null byte at the end
        const data = fs.readFileSync(filePath);
        const newData = Buffer.concat([data, Buffer.from([0])]);
        fs.writeFileSync(filePath, newData);
        console.log(`Touched binary: ${base}`);
      } else {
        // Text file: append a space at the end
        let text = fs.readFileSync(filePath, 'utf8');
        text += ' ';
        fs.writeFileSync(filePath, text, 'utf8');
        console.log(`Touched text: ${base}`);
      }
    } catch (e) {
      console.error(`Failed to touch ${base}:`, e.message);
    }
  });

  console.log("All files touched successfully!");
}

touchAll();

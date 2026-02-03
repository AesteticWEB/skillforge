const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', 'src');
const EXTENSIONS = new Set(['.ts', '.html', '.css']);

const SUSPICIOUS_CODEPOINTS = new Set([
  0x0402, 0x0403, 0x0405, 0x0406, 0x0408, 0x0409, 0x040a, 0x040b, 0x040c, 0x040e, 0x040f,
  0x0453, 0x0454, 0x0455, 0x0456, 0x0457, 0x0458, 0x045b, 0x045c, 0x0491,
  0xfffd,
]);

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
};

const issues = [];
for (const file of walk(ROOT_DIR)) {
  const text = fs.readFileSync(file, 'utf8');
  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i);
    if (code > 0xffff) {
      i += 1;
    }
    if (SUSPICIOUS_CODEPOINTS.has(code)) {
      issues.push({ file, code });
      break;
    }
  }
}

if (issues.length > 0) {
  console.error('Encoding check failed. Suspicious characters found:');
  for (const issue of issues) {
    console.error(`- ${issue.file} (U+${issue.code.toString(16).toUpperCase().padStart(4, '0')})`);
  }
  process.exit(1);
}

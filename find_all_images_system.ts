import fs from 'fs';
import path from 'path';

function scanDir(dir: string, depth: number = 0) {
  if (depth > 6) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['proc', 'sys', 'dev', 'lib', 'lib64', 'bin', 'sbin', 'boot', 'etc', 'usr', 'var', 'node_modules', '.git', 'dist', '.next'].includes(file)) continue;
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else {
          // If it is an image or contains "input_file"
          if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(file) || file.includes('input_') || file.includes('attachment')) {
            console.log(`FOUND FILE: ${fullPath} (${stat.size} bytes)`);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("SCANNING SYSTEM FILESYSTEM...");
scanDir('/');
console.log("SCANNING COMPLETED.");

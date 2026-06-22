import fs from 'fs';
import path from 'path';

function search(dir: string) {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (
          item === 'node_modules' ||
          item === '.git' ||
          item === 'proc' ||
          item === 'sys' ||
          item === 'dev' ||
          item === 'usr' ||
          item === 'lib' ||
          item === 'var/lib' ||
          item === '.npm' ||
          item === 'cache'
        ) {
          continue;
        }
        search(full);
      } else {
        if (item.toLowerCase().includes('input_file_0') || (item.endsWith('.png') && stat.size > 1000)) {
          console.log(`FOUND: ${full} (${stat.size} bytes)`);
        }
      }
    }
  } catch {}
}

search('/');

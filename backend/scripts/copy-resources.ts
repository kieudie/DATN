import * as fs from 'fs';
import * as path from 'path';
import * as shell from 'shelljs';
shell.config.silent = true;

const out = path.join(__dirname, '..', 'dist');

createFolderIfNotExist(out);
createFolderIfNotExist(path.join(out, 'src'));
createFolderIfNotExist(path.join(out, 'src', 'config'));

copyIfExist('src/config/*.yml', 'dist/src/config');
copyIfExist('src/main/mail/templates', 'dist/src/main/mail/');
copyIfExist(
  'src/main/mail-recruitment/templates',
  'dist/src/main/mail-recruitment/',
);

function copyIfExist(source: string, target: string): void {
  const files = shell.ls(source);

  if (!files || files.length === 0) {
    console.log(`[copy-resources] Skip: ${source}`);
    return;
  }

  createFolderIfNotExist(target);
  shell.cp('-R', source, target);

  console.log(`[copy-resources] Copied ${source} -> ${target}`);
}

function createFolderIfNotExist(outDir: string): void {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
}
import * as shell from 'shelljs';

function copyGlob(pattern: string, targetDir: string) {
  const files = shell.ls(pattern);

  if (!files || files.length === 0) {
    console.log(`[copy-resources] Skip: ${pattern}`);
    return;
  }

  shell.mkdir('-p', targetDir);
  shell.cp('-R', files, targetDir);

  console.log(`[copy-resources] Copied: ${pattern} -> ${targetDir}`);
}

copyGlob('src/config/*.yml', 'dist/src/config');
copyGlob('src/main/mail/templates', 'dist/src/main/mail');
copyGlob(
  'src/main/mail-recruitment/templates',
  'dist/src/main/mail-recruitment',
);
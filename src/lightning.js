import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, arch as osArch, platform } from 'node:os';

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function listVersioned(dir, prefix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((e) => e.startsWith(prefix + '-') && statSync(join(dir, e)).isDirectory())
    .sort(naturalSort);
}

export function archDir(phpDir) {
  switch (platform()) {
    case 'linux':
      return 'linux';
    case 'darwin':
      if (osArch() === 'arm64' && existsSync(join(phpDir, 'bin', 'darwin-arm64'))) {
        return 'darwin-arm64';
      }
      return 'darwin';
    case 'win32':
      return existsSync(join(phpDir, 'bin', 'win64')) ? 'win64' : 'win32';
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

// Pick highest PHP 8.0+ dir (Local may retain 7.x dirs for legacy sites).
export function resolvePhpDir(configDir, preferredVersion) {
  const lightning = join(configDir, 'lightning-services');
  const all = listVersioned(lightning, 'php');
  const eligible = all.filter((name) => {
    const ver = name.slice(4).split('+')[0];
    const major = parseInt(ver.split('.')[0], 10);
    return major >= 8;
  });
  if (preferredVersion) {
    const exact = eligible.filter((n) => n.startsWith(`php-${preferredVersion}`));
    if (exact.length) return join(lightning, exact[exact.length - 1]);
  }
  if (!eligible.length) {
    throw new Error(`No PHP 8.0+ found in ${lightning}`);
  }
  return join(lightning, eligible[eligible.length - 1]);
}

export function resolveMysqlDir(configDir, preferredVersion) {
  const lightning = join(configDir, 'lightning-services');
  const all = listVersioned(lightning, 'mysql');
  if (preferredVersion) {
    const exact = all.filter((n) => n.startsWith(`mysql-${preferredVersion}`));
    if (exact.length) return join(lightning, exact[exact.length - 1]);
  }
  if (!all.length) {
    throw new Error(`No mysql found in ${lightning}`);
  }
  return join(lightning, all[all.length - 1]);
}

export function findInstallDir() {
  const home = homedir();
  let candidates = [];
  switch (platform()) {
    case 'darwin':
      candidates = [
        '/Applications/Local.app/Contents/Resources/extraResources/bin',
        join(home, 'Applications/Local.app/Contents/Resources/extraResources/bin'),
        '/Applications/Local by Flywheel.app/Contents/Resources/extraResources/bin',
      ];
      break;
    case 'win32': {
      const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
      const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      const lad = process.env['LOCALAPPDATA'] || '';
      candidates = [
        `${pf}\\Local\\resources\\extraResources\\bin`,
        `${pf86}\\Local\\resources\\extraResources\\bin`,
        lad && `${lad}\\Programs\\Local\\resources\\extraResources\\bin`,
      ].filter(Boolean);
      break;
    }
    default:
      candidates = [
        '/opt/Local/resources/extraResources/bin',
        '/usr/lib/local-by-flywheel/resources/extraResources/bin',
        '/usr/share/local/resources/extraResources/bin',
        join(home, '.local/share/Local/resources/extraResources/bin'),
        '/snap/local/current/resources/extraResources/bin',
      ];
  }
  for (const c of candidates) {
    if (existsSync(join(c, 'wp-cli', 'config.yaml'))) return c;
  }
  return null;
}

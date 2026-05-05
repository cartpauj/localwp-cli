import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { archDir, findInstallDir, resolveMysqlDir, resolvePhpDir } from './lightning.js';

function expandTilde(p) {
  if (!p) return p;
  if (p === '~') return homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2));
  return p;
}

// Build the env vars + cwd needed to run wp-cli (or an interactive shell)
// against a specific site. Mirrors LocalWP's own SiteShellEntryService recipe.
export function buildSiteEnv(site, configDir) {
  const svc = (role) => (site.services || []).find((s) => s.role === role);
  const phpDir = resolvePhpDir(configDir, svc('php')?.version);
  const mysqlDir = resolveMysqlDir(configDir, svc('db')?.version);
  const arch = archDir(phpDir);
  const installDir = findInstallDir();
  const isWin = platform() === 'win32';
  const sep = isWin ? ';' : ':';

  const phpBinDir = join(phpDir, 'bin', arch, 'bin');
  const mysqlBinDir = join(mysqlDir, 'bin', arch, 'bin');
  const sharedLibs = join(phpDir, 'bin', arch, 'shared-libs');

  const pathParts = [mysqlBinDir, phpBinDir];
  if (installDir) {
    const wpcliArch = isWin
      ? arch === 'win64' || arch === 'win32'
        ? arch
        : 'win64'
      : 'posix';
    pathParts.push(join(installDir, 'wp-cli', wpcliArch));
    pathParts.push(join(installDir, 'composer', wpcliArch));
  }

  const env = {
    ...process.env,
    MYSQL_HOME: join(configDir, 'run', site.id, 'conf', 'mysql'),
    PHPRC: join(configDir, 'run', site.id, 'conf', 'php'),
    WP_CLI_DISABLE_AUTO_CHECK_UPDATE: '1',
    PATH: pathParts.join(sep) + sep + (process.env.PATH || ''),
  };

  if (!isWin) {
    env.MYSQL_UNIX_PORT = join(configDir, 'run', site.id, 'mysql', 'mysqld.sock');
    env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH
      ? `${sharedLibs}:${process.env.LD_LIBRARY_PATH}`
      : sharedLibs;
    env.MAGICK_CODER_MODULE_PATH = join(
      phpDir,
      'bin',
      arch,
      'ImageMagick',
      'modules-Q16',
      'coders',
    );
    if (arch === 'darwin' || arch === 'darwin-arm64') {
      env.DYLD_LIBRARY_PATH = process.env.DYLD_LIBRARY_PATH
        ? `${sharedLibs}:${process.env.DYLD_LIBRARY_PATH}`
        : sharedLibs;
    }
  }

  if (installDir) {
    const cfg = join(installDir, 'wp-cli', 'config.yaml');
    env.WP_CLI_CONFIG_PATH = cfg;
  }

  const cwd = site.paths?.webRoot
    ? expandTilde(site.paths.webRoot)
    : join(expandTilde(site.path), 'app', 'public');

  return {
    env,
    cwd,
    phpBin: join(phpBinDir, isWin ? 'php.exe' : 'php'),
    wpCliPhar: installDir ? join(installDir, 'wp-cli', 'wp-cli.phar') : null,
  };
}

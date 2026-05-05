import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { localConfigDir } from '../config.js';
import { resolveSite } from '../sites.js';
import { buildSiteEnv } from '../env.js';

export async function cmdWp({ site: needle, args }) {
  const site = await resolveSite(needle);
  const cfg = localConfigDir();
  const { env, cwd, phpBin, wpCliPhar } = buildSiteEnv(site, cfg);
  if (!wpCliPhar || !existsSync(wpCliPhar)) {
    throw new Error(
      `wp-cli.phar not found. LocalWP install dir could not be located. Searched standard paths.`,
    );
  }
  if (!existsSync(phpBin)) {
    throw new Error(`PHP binary not found at ${phpBin}`);
  }
  const wpArgs = [wpCliPhar, `--path=${cwd}`, ...args];
  const child = spawn(phpBin, wpArgs, { stdio: 'inherit', env, cwd });
  child.on('exit', (code) => process.exit(code ?? 0));
}

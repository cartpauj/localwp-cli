import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { localConfigDir } from '../config.js';
import { resolveSite } from '../sites.js';
import { buildSiteEnv } from '../env.js';

export async function cmdShell({ site: needle }) {
  const site = await resolveSite(needle);
  if (site.status !== 'running') {
    console.error(
      `Note: ${site.name} is ${site.status}. WP-CLI commands needing the DB will fail until it's running.`,
    );
  }
  const cfg = localConfigDir();
  const { env, cwd } = buildSiteEnv(site, cfg);
  const shell =
    platform() === 'win32'
      ? process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash';
  const child = spawn(shell, [], { stdio: 'inherit', env, cwd });
  child.on('exit', (code) => process.exit(code ?? 0));
}

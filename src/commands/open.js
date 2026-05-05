import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { resolveSite } from '../sites.js';

export async function cmdOpen({ site: needle }) {
  const site = await resolveSite(needle);
  const url = site.url;
  let cmd, args;
  switch (platform()) {
    case 'darwin':
      cmd = 'open';
      args = [url];
      break;
    case 'win32':
      cmd = 'cmd';
      args = ['/c', 'start', '', url];
      break;
    default:
      cmd = 'xdg-open';
      args = [url];
  }
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.unref();
  console.log(`Opening ${url}`);
}

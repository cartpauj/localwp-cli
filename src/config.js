import { homedir, platform } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function localConfigDir() {
  const home = homedir();
  const env = process.env;
  const candidates = [];
  switch (platform()) {
    case 'linux':
      if (env.XDG_CONFIG_HOME) candidates.push(join(env.XDG_CONFIG_HOME, 'Local'));
      candidates.push(
        join(home, '.config', 'Local'),
        join(home, '.var', 'app', 'com.getflywheel.local.Local', 'config', 'Local'),
        join(home, 'snap', 'local', 'current', '.config', 'Local'),
      );
      break;
    case 'darwin':
      candidates.push(
        join(home, 'Library', 'Application Support', 'Local'),
        join(home, 'Library', 'Application Support', 'Local by Flywheel'),
      );
      break;
    case 'win32':
      if (env.APPDATA) candidates.push(join(env.APPDATA, 'Local'));
      candidates.push(join(home, 'AppData', 'Roaming', 'Local'));
      break;
  }
  for (const c of candidates) {
    if (existsSync(join(c, 'sites.json'))) return c;
  }
  throw new Error(
    `LocalWP config dir not found. Looked in:\n  ${candidates.join('\n  ')}\nIs LocalWP installed and has it been run at least once?`,
  );
}

export function readConnection() {
  const dir = localConfigDir();
  const file = join(dir, 'graphql-connection-info.json');
  if (!existsSync(file)) {
    throw new Error(
      `${file} not found. LocalWP must be running for the GraphQL endpoint to exist.`,
    );
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return {
    configDir: dir,
    token: data.authToken,
    httpUrl: data.url || 'http://127.0.0.1:4000/graphql',
    wsUrl: data.subscriptionUrl || data.wsUrl || 'ws://127.0.0.1:4000/graphql',
  };
}

export function readSitesJson(configDir) {
  const file = join(configDir, 'sites.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

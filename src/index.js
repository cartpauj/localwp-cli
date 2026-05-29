#!/usr/bin/env node
import pkg from '../package.json' with { type: 'json' };

const HELP = `lwp ${pkg.version} — control LocalWP from the terminal

Usage:
  lwp <command> [args] [--json]

Commands:
  list                       List all sites with status
  start    <site>            Start a site
  stop     <site>            Stop a site
  restart  <site>            Restart a site
  status   [<site>]          Show status (one or all)
  info     <site>            Full site details
  shell    <site>            Open a shell with site env loaded
  wp       <site> -- <args>  Run WP-CLI against the site
  open     <site>            Open the site URL in browser
  logs     <site> [src] [-f] Show site logs. src=all|nginx|php|mysql|mail (default all)
  rename   <site> <name>     Rename a site
  create   [flags]           Create a new site (interactive if no flags)
  doctor                     Verify connection and bundled tools
  help, --help, -h           This message
  version, --version         Print version

Site arg:
  Accepts a site ID, exact name (case-insensitive), or unique substring.

create flags (any can be omitted to be prompted):
  --name <n>          --path <p>            --domain <d>
  --admin-user <u>    --admin-pass <p>      --admin-email <e>

Global:
  --json              Print machine-readable JSON output where applicable
`;

function parseArgs(argv) {
  const args = [];
  const flags = { json: false, follow: false };
  const opts = {};
  let passthrough = null; // for `wp <site> -- ...`
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (passthrough !== null) {
      passthrough.push(a);
      continue;
    }
    if (a === '--') {
      passthrough = [];
      continue;
    }
    if (a === '--json') flags.json = true;
    else if (a === '-f' || a === '--follow') flags.follow = true;
    else if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > -1) opts[a.slice(2, eq)] = a.slice(eq + 1);
      else opts[a.slice(2)] = argv[++i];
    } else {
      args.push(a);
    }
  }
  return { args, flags, opts, passthrough };
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || ['help', '--help', '-h'].includes(argv[0])) {
    console.log(HELP);
    return;
  }
  if (['version', '--version', '-v'].includes(argv[0])) {
    console.log(pkg.version);
    return;
  }
  const [cmd, ...rest] = argv;
  const { args, flags, opts, passthrough } = parseArgs(rest);

  switch (cmd) {
    case 'list':
    case 'ls': {
      const { cmdList } = await import('./commands/list.js');
      return cmdList({ json: flags.json });
    }
    case 'start':
    case 'stop':
    case 'restart': {
      const { cmdLifecycle } = await import('./commands/lifecycle.js');
      return cmdLifecycle(cmd, { site: args[0], json: flags.json });
    }
    case 'status': {
      const { cmdStatus } = await import('./commands/status.js');
      return cmdStatus({ site: args[0], json: flags.json });
    }
    case 'info': {
      const { cmdInfo } = await import('./commands/info.js');
      return cmdInfo({ site: args[0], json: flags.json });
    }
    case 'shell': {
      const { cmdShell } = await import('./commands/shell.js');
      return cmdShell({ site: args[0] });
    }
    case 'wp': {
      const { cmdWp } = await import('./commands/wp.js');
      return cmdWp({ site: args[0], args: passthrough || args.slice(1) });
    }
    case 'open': {
      const { cmdOpen } = await import('./commands/open.js');
      return cmdOpen({ site: args[0] });
    }
    case 'logs': {
      const { cmdLogs } = await import('./commands/logs.js');
      return cmdLogs({ site: args[0], source: args[1] || opts.source, follow: flags.follow });
    }
    case 'rename': {
      const { cmdRename } = await import('./commands/rename.js');
      return cmdRename({ site: args[0], name: args[1], json: flags.json });
    }
    case 'create': {
      const { cmdCreate } = await import('./commands/create.js');
      return cmdCreate({
        name: opts.name,
        path: opts.path,
        domain: opts.domain,
        adminUser: opts['admin-user'],
        adminPass: opts['admin-pass'],
        adminEmail: opts['admin-email'],
        environment: opts.environment,
        json: flags.json,
      });
    }
    case 'doctor': {
      const { cmdDoctor } = await import('./commands/doctor.js');
      return cmdDoctor();
    }
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.error(HELP);
      process.exit(2);
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

import { existsSync, readdirSync, statSync, watch } from 'node:fs';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveSite } from '../sites.js';

const TAIL_BYTES = 16 * 1024;

const SOURCES = {
  nginx: ['nginx'],
  php: ['php'],
  mysql: ['mysql'],
  mail: ['mailpit'],
  all: ['nginx', 'php', 'mysql', 'mailpit'],
};

async function tailFile(path, fromOffset = null) {
  const fh = await open(path, 'r');
  try {
    const { size } = await fh.stat();
    const start = fromOffset != null ? fromOffset : Math.max(0, size - TAIL_BYTES);
    if (start >= size) return { size };
    const buf = Buffer.alloc(size - start);
    await fh.read(buf, 0, buf.length, start);
    process.stdout.write(buf);
    return { size };
  } finally {
    await fh.close();
  }
}

function discoverLogs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (s.isFile() && /\.log$|error|access/i.test(e)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

export async function cmdLogs({ site: needle, source, follow }) {
  const site = await resolveSite(needle);
  const baseDir = site.paths?.logs;
  if (!baseDir || !existsSync(baseDir)) {
    throw new Error(`No logs directory for ${site.name} (looked at ${baseDir || '?'})`);
  }

  const src = (source || 'all').toLowerCase();
  if (!SOURCES[src]) {
    throw new Error(
      `Unknown log source '${source}'. Valid: ${Object.keys(SOURCES).join(', ')}`,
    );
  }

  const subdirs = SOURCES[src].map((s) => join(baseDir, s)).filter(existsSync);
  if (!subdirs.length) {
    console.error(`No log subdirs for source '${src}' under ${baseDir}`);
    return;
  }

  const files = subdirs.flatMap(discoverLogs);
  if (!files.length) {
    console.error(
      `No .log files found for source '${src}' under ${baseDir}` +
        (src === 'all' ? '' : ` (try --source all)`),
    );
    return;
  }

  const offsets = new Map();
  for (const f of files) {
    process.stdout.write(`\n==> ${f} <==\n`);
    const { size } = await tailFile(f);
    offsets.set(f, size);
  }
  if (!follow) return;
  for (const f of files) {
    watch(f, async () => {
      try {
        const fh = await open(f, 'r');
        const { size } = await fh.stat();
        await fh.close();
        const last = offsets.get(f) ?? size;
        if (size > last) {
          await tailFile(f, last);
          offsets.set(f, size);
        } else if (size < last) {
          offsets.set(f, 0);
        }
      } catch {}
    });
  }
  await new Promise(() => {});
}

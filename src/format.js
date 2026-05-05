export function table(rows, columns) {
  if (!rows.length) return '';
  const widths = columns.map((c) =>
    Math.max(c.header.length, ...rows.map((r) => String(c.get(r) ?? '').length)),
  );
  const fmt = (cells) =>
    cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ').trimEnd();
  const out = [fmt(columns.map((c) => c.header))];
  out.push(fmt(widths.map((w) => '-'.repeat(w))));
  for (const r of rows) out.push(fmt(columns.map((c) => c.get(r))));
  return out.join('\n');
}

export function statusColor(status) {
  if (!process.stdout.isTTY) return status;
  const map = {
    running: '\x1b[32m', // green
    halted: '\x1b[90m', // grey
    starting: '\x1b[33m',
    stopping: '\x1b[33m',
    restarting: '\x1b[33m',
    failed: '\x1b[31m',
    provisioning_error: '\x1b[31m',
    wordpress_install_error: '\x1b[31m',
  };
  const c = map[status] || '';
  return c ? `${c}${status}\x1b[0m` : status;
}

export function emit(data, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

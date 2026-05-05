import { listSites } from '../sites.js';
import { emit, statusColor, table } from '../format.js';

export async function cmdList({ json }) {
  const sites = await listSites();
  sites.sort((a, b) => a.name.localeCompare(b.name));
  if (json) return emit(sites, true);
  if (!sites.length) {
    console.log('No sites yet. Create one in LocalWP or with `lwp create`.');
    return;
  }
  console.log(
    table(sites, [
      { header: 'NAME', get: (s) => s.name },
      { header: 'STATUS', get: (s) => statusColor(s.status) },
      { header: 'DOMAIN', get: (s) => s.domain },
      { header: 'ID', get: (s) => s.id },
    ]),
  );
}

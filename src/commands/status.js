import { listSites } from '../sites.js';
import { resolveSite } from '../sites.js';
import { emit, statusColor, table } from '../format.js';

export async function cmdStatus({ site, json }) {
  if (site) {
    const s = await resolveSite(site);
    if (json) return emit(s, true);
    console.log(`${s.name}: ${statusColor(s.status)}  (${s.url})`);
    return;
  }
  const sites = await listSites();
  sites.sort((a, b) => a.name.localeCompare(b.name));
  if (json) return emit(sites, true);
  console.log(
    table(sites, [
      { header: 'NAME', get: (s) => s.name },
      { header: 'STATUS', get: (s) => statusColor(s.status) },
    ]),
  );
}

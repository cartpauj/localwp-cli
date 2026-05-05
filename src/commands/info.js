import { resolveSite } from '../sites.js';
import { emit } from '../format.js';

export async function cmdInfo({ site: needle, json }) {
  const s = await resolveSite(needle);
  if (json) return emit(s, true);
  const services = (s.services || [])
    .map((svc) => `${svc.role}=${svc.type}/${svc.version || '?'}`)
    .join('  ');
  const lines = [
    `Name:       ${s.name}`,
    `Status:     ${s.status}`,
    `URL:        ${s.url}`,
    `Domain:     ${s.domain}`,
    `Path:       ${s.path}`,
    `Web root:   ${s.paths?.webRoot || s.path + '/app/public'}`,
    `Logs:       ${s.paths?.logs || ''}`,
    `Multisite:  ${s.multiSite || 'No'}`,
    `Xdebug:     ${s.xdebugEnabled ? 'on' : 'off'}`,
    `Services:   ${services}`,
    `DB:         ${s.mysql?.database || ''} (user=${s.mysql?.user || ''})`,
    `ID:         ${s.id}`,
  ];
  console.log(lines.join('\n'));
}

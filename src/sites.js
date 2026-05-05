import { gql } from './graphql.js';

export const SITE_FIELDS = `
  id
  name
  path
  longPath
  domain
  url
  host
  httpPort
  status
  multiSite
  multiSiteDomains
  xdebugEnabled
  siteLastStartedTimestamp
  services {
    role
    type
    version
  }
  mysql {
    user
    password
    database
  }
  paths {
    app
    sql
    webRoot
    conf
    logs
    runData
  }
`;

export async function listSites() {
  const data = await gql(`{ sites { ${SITE_FIELDS} } }`);
  return data.sites;
}

export async function getSite(id) {
  const data = await gql(`query($id: ID!) { site(id: $id) { ${SITE_FIELDS} } }`, { id });
  return data.site;
}

// Resolve a "site" arg to a Site object. Accepts ID, exact name (case-insensitive),
// or unique substring. Throws on no match or ambiguous match.
export async function resolveSite(needle) {
  if (!needle) throw new Error('No site specified');
  const sites = await listSites();
  // ID exact match
  const byId = sites.find((s) => s.id === needle);
  if (byId) return byId;
  const lc = needle.toLowerCase();
  // Name exact (case-insensitive)
  const exact = sites.find((s) => s.name.toLowerCase() === lc);
  if (exact) return exact;
  // Substring
  const subs = sites.filter((s) => s.name.toLowerCase().includes(lc));
  if (subs.length === 1) return subs[0];
  if (subs.length === 0) {
    throw new Error(`No site matches '${needle}'. Run 'lwp list' to see sites.`);
  }
  throw new Error(
    `Ambiguous site '${needle}'. Matches:\n  ${subs.map((s) => s.name).join('\n  ')}`,
  );
}

import { gql } from '../graphql.js';
import { resolveSite } from '../sites.js';
import { emit } from '../format.js';

const MUTATIONS = {
  start: 'mutation($id: ID!) { startSite(id: $id) { id name status } }',
  stop: 'mutation($id: ID!) { stopSite(id: $id) { id name status } }',
  restart: 'mutation($id: ID!) { restartSite(id: $id) { id name status } }',
};

export async function cmdLifecycle(action, { site: needle, json }) {
  const site = await resolveSite(needle);
  const data = await gql(MUTATIONS[action], { id: site.id });
  const updated = data[`${action}Site`];
  if (json) return emit(updated, true);
  console.log(`${action}: ${updated.name} → ${updated.status}`);
}

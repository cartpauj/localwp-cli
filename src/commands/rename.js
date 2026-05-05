import { gql } from '../graphql.js';
import { resolveSite } from '../sites.js';
import { emit } from '../format.js';

export async function cmdRename({ site: needle, name, json }) {
  if (!name) throw new Error('Usage: lwp rename <site> <new-name>');
  const site = await resolveSite(needle);
  const data = await gql(
    'mutation($id: ID!, $name: String!) { renameSite(id: $id, name: $name) { id name status } }',
    { id: site.id, name },
  );
  if (json) return emit(data.renameSite, true);
  console.log(`Renamed ${site.name} → ${data.renameSite.name}`);
}

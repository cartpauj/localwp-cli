import { readConnection } from './config.js';

let cached = null;

function conn() {
  if (!cached) cached = readConnection();
  return cached;
}

export function refreshConnection() {
  cached = readConnection();
  return cached;
}

export async function gql(query, variables = {}) {
  const c = conn();
  let res;
  try {
    res = await fetch(c.httpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new Error(
      `Could not reach LocalWP at ${c.httpUrl}: ${e.message}\nIs LocalWP running?`,
    );
  }
  if (res.status === 401) {
    // token rotates on every Local restart — retry once with a fresh read
    const fresh = refreshConnection();
    res = await fetch(fresh.httpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fresh.token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  }
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message).join('; ');
    throw new Error(`GraphQL error: ${msg}`);
  }
  return body.data;
}

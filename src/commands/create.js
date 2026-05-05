import { createInterface } from 'node:readline/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { gql } from '../graphql.js';
import { emit } from '../format.js';

async function prompt(rl, q, def) {
  const ans = (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim();
  return ans || def || '';
}

async function gatherInteractive(initial) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const name = initial.name || (await prompt(rl, 'Site name'));
    if (!name) throw new Error('Name is required');
    const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const defaultPath = join(homedir(), 'Local Sites', name);
    const path = initial.path || (await prompt(rl, 'Path', defaultPath));
    const domain = initial.domain || (await prompt(rl, 'Domain', `${slug}.local`));
    const wpAdminUsername =
      initial.adminUser || (await prompt(rl, 'WP admin username', 'admin'));
    const wpAdminPassword =
      initial.adminPass || (await prompt(rl, 'WP admin password', 'password'));
    const wpAdminEmail =
      initial.adminEmail || (await prompt(rl, 'WP admin email', 'admin@example.test'));
    return {
      name,
      path,
      domain,
      wpAdminUsername,
      wpAdminPassword,
      wpAdminEmail,
      environment: initial.environment || 'preferred',
    };
  } finally {
    rl.close();
  }
}

async function pollJob(jobId, json) {
  let lastLogLen = 0;
  for (;;) {
    const data = await gql(
      'query($id: ID!) { job(id: $id) { id status logs error } }',
      { id: jobId },
    );
    const job = data.job;
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (!json && job.logs && job.logs.length > lastLogLen) {
      process.stdout.write(job.logs.slice(lastLogLen));
      lastLogLen = job.logs.length;
    }
    if (job.status === 'successful') {
      if (json) emit(job, true);
      else console.log('\nDone.');
      return job;
    }
    if (job.status === 'failed') {
      if (json) emit(job, true);
      else console.error(`\nFailed: ${JSON.stringify(job.error)}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function cmdCreate(opts) {
  const input = await gatherInteractive(opts);
  const data = await gql(
    'mutation($input: AddSiteInput!) { addSite(input: $input) { id status } }',
    { input },
  );
  const job = data.addSite;
  if (!opts.json) {
    console.log(`Job ${job.id} started (${job.status}). Streaming progress...`);
  }
  await pollJob(job.id, opts.json);
}

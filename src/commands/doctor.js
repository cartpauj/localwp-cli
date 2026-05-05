import { existsSync } from 'node:fs';
import { localConfigDir, readConnection } from '../config.js';
import { findInstallDir, resolvePhpDir, archDir } from '../lightning.js';
import { gql } from '../graphql.js';

function ok(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function bad(msg) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
}

export async function cmdDoctor() {
  let failures = 0;
  console.log('LocalWP CLI doctor:');

  let configDir;
  try {
    configDir = localConfigDir();
    ok(`Config dir: ${configDir}`);
  } catch (e) {
    bad(e.message);
    process.exit(1);
  }

  let conn;
  try {
    conn = readConnection();
    ok(`Token loaded from ${configDir}/graphql-connection-info.json`);
  } catch (e) {
    bad(e.message);
    failures++;
  }

  if (conn) {
    try {
      const data = await gql('{ sites { id name status } }');
      ok(`GraphQL reachable — ${data.sites.length} site(s)`);
    } catch (e) {
      bad(`GraphQL unreachable: ${e.message}`);
      failures++;
    }
  }

  try {
    const phpDir = resolvePhpDir(configDir);
    const arch = archDir(phpDir);
    ok(`PHP: ${phpDir} (arch=${arch})`);
  } catch (e) {
    bad(e.message);
    failures++;
  }

  const installDir = findInstallDir();
  if (installDir) {
    const phar = `${installDir}/wp-cli/wp-cli.phar`;
    if (existsSync(phar)) ok(`WP-CLI: ${phar}`);
    else {
      bad(`WP-CLI phar missing at ${phar}`);
      failures++;
    }
  } else {
    bad('LocalWP install dir not found (wp/shell commands will fail)');
    failures++;
  }

  if (failures) {
    console.log(`\n${failures} issue(s).`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

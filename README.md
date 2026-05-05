# lwp — LocalWP from the terminal

A command-line interface for [LocalWP](https://localwp.com) (Local by Flywheel). Lets you list, start, stop, restart, create, rename, inspect, shell into, and run WP-CLI against your Local sites without touching the GUI.

Replacement for the archived [`getflywheel/local-cli`](https://github.com/getflywheel/local-cli) — plus site creation, which the original never supported.

## How it works

LocalWP exposes an authenticated GraphQL API on `127.0.0.1:4000` while the app is running. `lwp` reads the auth token from your local config dir and talks to that API for control-plane operations (list/start/stop/create/rename). For per-site interaction (`shell`, `wp`) it spawns LocalWP's own bundled PHP and WP-CLI with the same environment LocalWP itself uses.

LocalWP must be running for any command to work.

## Requirements

- LocalWP 9 or newer, installed and run at least once
- macOS, Linux, or Windows (Git Bash/MSYS recommended on Windows)
- Nothing else — `lwp` is a self-contained binary

## Install

### One-liner (macOS / Linux / Git Bash on Windows)

```bash
curl -fsSL https://raw.githubusercontent.com/cartpauj/localwp-cli/main/scripts/install.sh | bash
```

This downloads the right binary for your OS/arch from the latest GitHub Release, drops it at `~/.local/bin/lwp`, and makes it executable. If `~/.local/bin` isn't on your PATH, the installer prints the line you need to add to your shell rc.

### Manual download

Grab the binary for your platform from the [Releases page](https://github.com/cartpauj/localwp-cli/releases/latest):

| Platform | Asset |
|---|---|
| macOS Apple Silicon (M1/M2/M3/M4) | `lwp-darwin-arm64` |
| macOS Intel | `lwp-darwin-x64` |
| Linux x86_64 | `lwp-linux-x64` |
| Linux ARM64 | `lwp-linux-arm64` |
| Windows x64 | `lwp-windows-x64.exe` |

Make it executable (`chmod +x lwp-...`) and move it to somewhere on your PATH (e.g. `~/bin/lwp`).

### Run from source (no install)

If you have Node 20+ already, you can run directly:

```bash
git clone https://github.com/cartpauj/localwp-cli.git
cd localwp-cli
node src/index.js list
```

## Build your own binaries

Requires [Bun](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash    # if you don't have it
git clone https://github.com/cartpauj/localwp-cli.git
cd localwp-cli
bash scripts/build.sh
```

Outputs five self-contained binaries under `dist/` — `lwp-linux-x64`, `lwp-linux-arm64`, `lwp-darwin-x64`, `lwp-darwin-arm64`, `lwp-windows-x64.exe`.

## Quick start

```bash
lwp doctor                    # verify Local is running and lwp can reach it
lwp list                      # see all your sites
lwp start my-site             # start a halted site
lwp wp my-site -- core version
lwp shell my-site             # drop into a shell with WP-CLI on PATH
```

## Site argument

Anywhere a command takes `<site>`, you can pass:

- The site's **ID** (e.g. `luKnvcS4a`) — exact match
- Its **name** (case-insensitive) — exact match
- A **unique substring** of the name — e.g. `member` matches `members`

If a substring matches more than one site, `lwp` errors with the list of matches and exits 1.

## Commands

All commands accept `--json` to emit machine-readable JSON instead of human-readable text where applicable.

### `lwp list`

Lists all sites in a table: name, status, domain, ID. Sorted by name.

```bash
lwp list
lwp list --json
```

### `lwp start <site>` / `lwp stop <site>` / `lwp restart <site>`

Lifecycle controls. Returns once Local has accepted the mutation; the site may take a few seconds to fully come up. Use `lwp status <site>` to confirm.

```bash
lwp start my-site
lwp stop my-site
lwp restart my-site
```

### `lwp status [<site>]`

With no argument, lists status for all sites (just name + status). With a site arg, prints one line: `<name>: <status>  (<url>)`.

```bash
lwp status                    # everything
lwp status my-site            # one
```

### `lwp info <site>`

Full site details: status, URL, domain, file path, web root, log dir, multisite mode, Xdebug state, services (PHP/MySQL/web server with versions), DB credentials, ID.

```bash
lwp info my-site
lwp info my-site --json
```

### `lwp shell <site>`

Opens an interactive shell with the site's environment loaded:

- `cwd` is the WordPress root (`<site>/app/public`)
- `PATH` includes Local's bundled PHP and MySQL binaries plus the bundled WP-CLI
- Library paths (`LD_LIBRARY_PATH` on Linux, `DYLD_LIBRARY_PATH` on macOS) point at LocalWP's PHP shared libs
- DB connection env (`MYSQL_HOME`, `MYSQL_UNIX_PORT`, `PHPRC`) is set so `wp db query`, `mysql`, etc. just work

Exit the shell normally to return to your original session.

```bash
lwp shell my-site
# now inside the site's env
wp plugin list
mysql -e "SHOW DATABASES;"
exit
```

### `lwp wp <site> -- <args>`

Runs LocalWP's bundled WP-CLI against the site without entering an interactive shell. Everything after `--` is forwarded to `wp` verbatim.

```bash
lwp wp my-site -- core version
lwp wp my-site -- plugin list --status=active
lwp wp my-site -- option get blogname
lwp wp my-site -- user create alice alice@example.test --role=editor
```

### `lwp open <site>`

Opens the site's URL in your default browser (`open` on macOS, `xdg-open` on Linux, `start` on Windows).

```bash
lwp open my-site
```

### `lwp logs <site> [source] [-f]`

Tails site logs from the filesystem. Default shows the last ~16 KB of every log; `-f` / `--follow` keeps streaming new output until you Ctrl-C.

`source` filters to one log type:

| `source` | What it shows |
|---|---|
| `all` (default) | nginx, php, mysql, mail |
| `nginx` | `<site>/logs/nginx/*` (error/access logs) |
| `php` | `<site>/logs/php/*` (`error.log`, `php-fpm.log`) |
| `mysql` | `<site>/logs/mysql/*` |
| `mail` | `<site>/logs/mailpit/*` |

```bash
lwp logs my-site                  # all sources, last 16 KB each
lwp logs my-site nginx            # just nginx
lwp logs my-site php -f           # follow PHP errors live
lwp logs my-site --source=mysql   # equivalent flag form
```

### `lwp rename <site> <new-name>`

Changes the **display name** shown in LocalWP. Does **not** rename the site folder, the domain, or the URL — that matches LocalWP's GUI behavior.

```bash
lwp rename old-name new-name
```

### `lwp create [flags]`

Creates a new site. Without flags, runs interactively and prompts for each field. With flags, runs unattended — useful in scripts. Uses LocalWP's `addSite` mutation, then polls the resulting `Job` and streams its log output until success or failure.

Flags (any can be omitted to be prompted):

| Flag | Description | Default |
|---|---|---|
| `--name <n>` | Display name | _required_ |
| `--path <p>` | Site directory | `~/Local Sites/<name>` |
| `--domain <d>` | Hostname | `<slug>.local` |
| `--admin-user <u>` | WP admin username | `admin` |
| `--admin-pass <p>` | WP admin password | `password` |
| `--admin-email <e>` | WP admin email | `admin@example.test` |
| `--environment <e>` | `preferred` or `custom` | `preferred` |

```bash
# interactive
lwp create

# scripted
lwp create --name test-site \
  --domain test-site.local \
  --admin-user admin --admin-pass secret \
  --admin-email me@example.com
```

### `lwp doctor`

Sanity check — verifies LocalWP's config dir, that the auth token is readable, that the GraphQL endpoint responds, that a PHP 8.0+ install was found in `lightning-services`, and that LocalWP's bundled `wp-cli.phar` exists. Prints each check with ✓ or ✗.

```bash
lwp doctor
```

### `lwp version` / `lwp --version`

Prints the CLI version.

### `lwp help` / `lwp --help`

Prints usage.

## What's not included

`lwp` does **not** implement `delete` or `clone`. LocalWP exposes these only through internal Electron IPC — they have no GraphQL mutations — so an external CLI can't trigger them safely while Local is running. Use the GUI for deletion and cloning.

## Troubleshooting

**`Could not reach LocalWP at http://127.0.0.1:4000/graphql`** — LocalWP isn't running. Start the app.

**`GraphQL HTTP 401`** — `lwp` auto-retries with a fresh token after Local restarts. If you still see this, run `lwp doctor` to confirm the token file is readable.

**`No PHP 8.0+ found in lightning-services`** — your LocalWP install is older than version 9, or its services haven't been updated. Open Local once, let it update, then retry.

**`wp-cli.phar not found`** — LocalWP's install dir isn't in any of the standard locations `lwp` checks. Open an issue with the path of your LocalWP install.

**`shell` / `wp` errors about missing PHP extensions** — usually means `lwp` picked the wrong PHP version. The site's specific PHP version is read from the GraphQL `services` field; if that's empty for some reason, the highest installed PHP is used. Run `lwp info <site>` to see what's reported.

## How LocalWP integration is discovered

`lwp` finds LocalWP on each platform via these paths:

| OS | Config dir | App install |
|---|---|---|
| Linux | `~/.config/Local`, plus flatpak/snap variants | `/opt/Local`, `/usr/lib/local-by-flywheel`, `/snap/local/current`, `~/.local/share/Local` |
| macOS | `~/Library/Application Support/Local` | `/Applications/Local.app` |
| Windows | `%APPDATA%\Local` | `%ProgramFiles%\Local`, `%LOCALAPPDATA%\Programs\Local` |

The auth token lives at `<config>/graphql-connection-info.json`. It rotates on every Local restart; `lwp` re-reads it automatically on a 401.

## License

GPL v2 or any later version — see [LICENSE](LICENSE).

## Related

- [localwp-connect](https://github.com/cartpauj/localwp-claude-code-skills) — Claude Code skill that connects a project directory to a LocalWP site (per-project `bin/wp` wrapper, CLAUDE.md context block, plugin symlink). Complementary to `lwp` — `lwp` is the app-level control plane; the skill is per-project context.

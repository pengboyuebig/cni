# CNI - Cached npm Install

A symlink-based npm package cache manager that enables cross-project dependency reuse, saving download time and disk space.

## Features

- **Cache Reuse** — Download each package version once, share across projects
- **Version Coexistence** — `lodash@4.17.21` and `lodash@4.17.20` coexist in the cache
- **Symbolic Links** — Uses junctions on Windows (no admin required), symlinks on POSIX
- **npm Hook** — Optionally intercepts `npm install` with no workflow changes
- **Layered Config** — Global config + project config + environment variables + CLI flags

## Installation

```bash
cd /path/to/cni
npm install
npm run build
npm link
```

Once linked, the `cni` command is available anywhere.

## Quick Start

```bash
# Go to any project directory
cd your-project

# Use cni instead of npm install
cni install

# Add new dependencies
cni add dayjs
cni add jest -D
```

The first run downloads packages to the cache directory. Subsequent runs link directly from cache, skipping the download.

## Command Reference

### install - Install dependencies

```bash
cni install                  # Install all dependencies from package.json
cni install lodash axios     # Install specific packages
cni i                        # Shorthand
cni install --production     # Install only dependencies
cni install --ignore-scripts # Skip lifecycle scripts
cni install --no-links       # Download only, don't create links
cni install --force          # Force re-download
cni install --verbose        # Verbose output
```

### add - Add dependencies

```bash
cni add dayjs                # Add to dependencies
cni add jest -D              # Add to devDependencies
cni add lodash@4.17.21       # Specify version
```

### cache - Cache management

```bash
cni cache stat               # Show cache statistics
cni cache ls                 # List all cached packages
cni cache ls lodash          # Search by pattern
cni cache clean              # Remove unreferenced packages
cni cache clean --all        # Clear entire cache
cni cache clean lodash       # Remove by pattern
cni cache verify             # Verify integrity of all cached packages
```

### config - Configuration management

```bash
cni config list              # Show all configuration
cni config get store         # Get a specific config value
cni config set store "D:\.cni-store"   # Set cache path
cni config set registry "https://registry.npmmirror.com"  # Set registry mirror
```

### hook - npm interception

```bash
cni hook install             # Install preinstall hook
cni hook uninstall           # Uninstall hook
```

With the hook installed, every `npm install` will first install packages from cache via cni. npm then detects they already exist and skips downloading.

## Configuration

### Priority

```
CLI flags  >  Environment variables  >  Project config  >  Global config  >  Defaults
```

### Global config

Path: `~/.cni/config.json` (Windows: `C:\Users\<username>\.cni\config.json`)

```bash
cni config set store "D:\work\.cni-store"
cni config set registry "https://registry.npmmirror.com"
```

### Project config

Create `.cnirc.json` in the project root:

```json
{
  "store": "../.cni-store",
  "registry": "https://registry.npmmirror.com"
}
```

Also supported inside `package.json`:

```json
{
  "cni": {
    "store": "../.cni-store"
  }
}
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `CNI_STORE` | Cache storage path |
| `CNI_REGISTRY` | npm registry URL |
| `CNI_PROXY` | HTTP proxy |
| `CNI_HTTPS_PROXY` | HTTPS proxy |

### Config options

| Field | Default | Description |
|-------|---------|-------------|
| `store` | `~/.cni/store` | Cache storage root path |
| `registry` | `https://registry.npmjs.org` | npm registry URL |
| `linkType` | Windows: `junction` / POSIX: `symlink` | Link type |
| `verifyIntegrity` | `true` | Verify cache integrity |
| `concurrency` | `4` | Concurrent downloads |
| `runScripts` | `true` | Run lifecycle scripts |
| `maxStoreSize` | `0` | Max cache size, 0 = unlimited |

## Cache Storage Structure

```
<store>/
├── _metadata.json                # Global statistics
├── lodash/
│   ├── 4.17.21/
│   │   ├── node_modules/
│   │   │   └── lodash/           # Package contents
│   │   └── .metadata.json        # Version metadata
│   └── 4.17.20/                  # Different versions coexist
│       └── ...
├── @babel/
│   └── core/
│       └── 7.24.0/               # Scoped packages
│           └── ...
```

## How It Works

```
cni install
    │
    ▼
1. Load config ← Global + Project + Environment + CLI
    │
    ▼
2. Resolve dependencies ← Read package-lock.json for exact versions
    │
    ▼
3. Check cache ← Hit: skip download; Miss: mark for download
    │
    ▼
4. Download missing ← pacote downloads to cache, auto-verify integrity
    │
    ▼
5. Create links ← junction/symlink into node_modules
    │
    ▼
6. Complete ← Update references, print summary
```

## Typical Use Cases

### Multi-project cache sharing

```
workspace/
├── .cni-store/          ← Shared cache directory
├── project-a/           ← cni install → link from cache
├── project-b/           ← cni install → reuse existing cache
└── project-c/           ← cni install → reuse existing cache
```

Create `.cnirc.json` in each project:
```json
{ "store": "../.cni-store" }
```

### npm Hook mode

```bash
# One-time setup
cni hook install

# Then use npm install as usual — cni accelerates in the background
npm install
```

### Custom registry mirror

```bash
# For networks with limited access to the default registry
cni config set registry "https://registry.npmmirror.com"

# Or configure per project
echo '{"registry":"https://registry.npmmirror.com"}' > .cnirc.json
```

## Windows Notes

- Uses `junction` (directory junctions) instead of symlinks — **no admin privileges required**
- Junctions must use absolute paths
- Automatically falls back to hard copy if junction creation fails

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode compilation
node dist/bin/cni.js --help   # Run directly
```

## License

MIT

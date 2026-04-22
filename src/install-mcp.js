#!/usr/bin/env node
/**
 * One-command MCP installer.
 *
 * Auto-detects the user's MCP client config (Claude Desktop, Claude Code,
 * Cursor, Windsurf, Cline) and merges in the context-inspector server entry.
 *
 * Usage:
 *   npx contrarianai-context-inspector --install-mcp
 *   npx contrarianai-context-inspector --install-mcp --client=claude-desktop
 *   npx contrarianai-context-inspector --install-mcp --dry-run
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MCP_ENTRY = {
  command: 'npx',
  args: ['-y', 'contrarianai-context-inspector', '--mcp'],
};

// Standard paths for each MCP client
function clientPaths() {
  const home = os.homedir();
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  const macAppSupport = path.join(home, 'Library', 'Application Support');

  return {
    'claude-desktop': {
      name: 'Claude Desktop',
      paths: {
        darwin: path.join(macAppSupport, 'Claude', 'claude_desktop_config.json'),
        win32: path.join(appData, 'Claude', 'claude_desktop_config.json'),
        linux: path.join(xdgConfig, 'Claude', 'claude_desktop_config.json'),
      },
    },
    'claude-code': {
      name: 'Claude Code',
      paths: {
        darwin: path.join(process.cwd(), '.mcp.json'),
        win32: path.join(process.cwd(), '.mcp.json'),
        linux: path.join(process.cwd(), '.mcp.json'),
      },
      note: 'Claude Code uses a project-local .mcp.json (in current directory)',
    },
    'cursor': {
      name: 'Cursor',
      paths: {
        darwin: path.join(home, '.cursor', 'mcp.json'),
        win32: path.join(home, '.cursor', 'mcp.json'),
        linux: path.join(home, '.cursor', 'mcp.json'),
      },
    },
    'windsurf': {
      name: 'Windsurf',
      paths: {
        darwin: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
        win32: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
        linux: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      },
    },
    'cline': {
      name: 'Cline (VS Code)',
      paths: {
        darwin: path.join(macAppSupport, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
        win32: path.join(appData, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
        linux: path.join(xdgConfig, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
      },
    },
  };
}

function detectInstalled() {
  const clients = clientPaths();
  const installed = [];
  for (const [key, info] of Object.entries(clients)) {
    const configPath = info.paths[process.platform];
    if (configPath && fs.existsSync(configPath)) {
      installed.push({ key, name: info.name, configPath });
    } else if (configPath && fs.existsSync(path.dirname(configPath))) {
      // Config dir exists but no file yet (client is installed, just no config)
      installed.push({ key, name: info.name, configPath, empty: true });
    }
  }
  return installed;
}

function addToConfig(configPath, dryRun = false) {
  let config = { mcpServers: {} };
  let existed = false;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw);
    existed = true;
  } catch { /* new file */ }

  config.mcpServers = config.mcpServers || {};
  const already = config.mcpServers['context-inspector'];

  config.mcpServers['context-inspector'] = MCP_ENTRY;

  if (dryRun) return { existed, already, wouldWrite: config };

  // Ensure dir exists
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return { existed, already, wrote: configPath };
}

function runInstaller(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--client=')) args.client = arg.slice(9);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help') args.help = true;
  }

  console.log('\n  Context Inspector — MCP Installer\n');

  if (args.help) {
    console.log('  Usage:');
    console.log('    npx contrarianai-context-inspector --install-mcp');
    console.log('    npx contrarianai-context-inspector --install-mcp --client=claude-desktop');
    console.log('    npx contrarianai-context-inspector --install-mcp --dry-run');
    console.log('');
    console.log('  Clients: claude-desktop, claude-code, cursor, windsurf, cline\n');
    return;
  }

  const clients = clientPaths();
  let targets;

  if (args.client) {
    const info = clients[args.client];
    if (!info) {
      console.error(`  Unknown client: ${args.client}`);
      console.error(`  Available: ${Object.keys(clients).join(', ')}`);
      process.exit(1);
    }
    const configPath = info.paths[process.platform];
    if (!configPath) {
      console.error(`  ${info.name} is not supported on ${process.platform}`);
      process.exit(1);
    }
    targets = [{ key: args.client, name: info.name, configPath }];
  } else {
    targets = detectInstalled();
    if (targets.length === 0) {
      console.log('  No supported MCP clients detected.');
      console.log('  Install Claude Desktop, Cursor, Windsurf, Cline, or create');
      console.log('  a .mcp.json in your project for Claude Code, then re-run.\n');
      console.log('  Or specify manually: --client=claude-desktop\n');
      return;
    }
  }

  for (const target of targets) {
    console.log(`  Installing to: ${target.name}`);
    console.log(`    ${target.configPath}`);

    try {
      const result = addToConfig(target.configPath, args.dryRun);

      if (result.already) {
        console.log('    ✓ Already configured (updating to latest)');
      } else if (result.existed) {
        console.log('    ✓ Added to existing config');
      } else {
        console.log('    ✓ Created new config');
      }

      if (args.dryRun) {
        console.log('    (dry run — no changes written)');
        console.log('    Config would be:');
        console.log('    ' + JSON.stringify(result.wouldWrite.mcpServers, null, 2).replace(/\n/g, '\n    '));
      }
    } catch (err) {
      console.error(`    ✗ Failed: ${err.message}`);
    }
    console.log('');
  }

  if (!args.dryRun) {
    console.log('  Next steps:');
    console.log('    1. Restart your MCP client (Claude Desktop, Cursor, etc.)');
    console.log('    2. Look for 4 new tools: analyze_context, get_bell_curve,');
    console.log('       get_chunks, compare_alignment');
    console.log('    3. Or use the setup wizard: npx contrarianai-context-inspector --setup\n');
    console.log('  ─────────────────────────────────────────────────────────');
    console.log('  📄 Whitepaper (the math + the experiment):');
    console.log('     https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md');
    console.log('');
    console.log('  🔬 Full Bell Tuning suite (4 companion sensors):');
    console.log('     npm i contrarianai-retrieval-auditor contrarianai-tool-call-grader');
    console.log('     npm i contrarianai-predictor-corrector contrarianai-audit-report-generator');
    console.log('');
    console.log('  🎯 Free 1-hour audit for first 10 production users:');
    console.log('     https://contrarianai-landing.onrender.com/bell-tuning');
    console.log('     email kevin.luddy39@gmail.com (subj: Bell Tuning audit)');
    console.log('  ─────────────────────────────────────────────────────────\n');
  }
}

module.exports = { runInstaller, detectInstalled, clientPaths, MCP_ENTRY };

// Run directly when executed
if (require.main === module) runInstaller(process.argv);

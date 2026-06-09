#!/usr/bin/env node
// Postinstall greeting + CTA. Never errors. Never blocks install.
try {
  // Skip in CI / Docker / non-interactive environments
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION || process.env.NPM_CONFIG_SILENT) {
    process.exit(0);
  }

  const c = {
    orange: '\x1b[38;5;208m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
  };

  const line = (s) => process.stdout.write(s + '\n');
  line('');
  line(c.orange + c.bold + 'contrarianai-context-inspector' + c.reset + ' installed.');
  line('');
  line(c.bold + 'Quick start:' + c.reset);
  line('  ' + c.orange + 'npx contrarianai-context-inspector --install-mcp' + c.reset);
  line('  ' + c.dim + 'Auto-installs into Claude Desktop, Cursor, Cline, Windsurf, Claude Code.' + c.reset);
  line('');
  line(c.bold + 'Bell looking weird?' + c.reset);
  line('  ' + c.dim + 'Free 30-min walk-through of your bell curves:' + c.reset);
  line('    https://contrarianai-landing.onrender.com/#talk');
  line('  ' + c.dim + 'Full $2,500 Rapid Audit (48hr turnaround):' + c.reset);
  line('    https://contrarianai-landing.onrender.com/bell-tuning-rapid-audit.html');
  line('');
  line(c.dim + 'MIT. Repo: https://github.com/kevin-luddy39/context-inspector' + c.reset);
  line('');
} catch (_) {
  // Never break install on postinstall errors
  process.exit(0);
}

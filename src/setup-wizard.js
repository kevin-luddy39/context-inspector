/**
 * Setup Wizard — AI-guided configuration for context-inspector.
 *
 * Launches a web UI with a chat interface powered by Claude.
 * The AI reads the user's project files (with permission),
 * understands their domain, and generates optimal configuration.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { analyzeContext, extractDomainTerms } = require('./core/analyzer');
const { analyzeContextExtended } = require('./core/analyzer');

const app = express();
const PORT = process.env.SETUP_PORT || 4002;

// Try to load Anthropic SDK
let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch { Anthropic = null; }

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'web', 'setup')));

// ── State ─────────────────────────────────────────────
let sessionState = {
  projectPath: null,
  projectFiles: [],
  projectSummary: null,
  suggestedConfig: null,
  chatHistory: [],
  apiKey: process.env.ANTHROPIC_API_KEY || null,
};

const SYSTEM_PROMPT = `You are the Context Inspector Setup Wizard — an AI assistant that helps users configure the context-inspector tool for their specific AI workflow.

Context Inspector monitors AI context windows for domain alignment degradation. It needs to be configured with:
1. **Domain reference** — what "on-topic" means for their use case (a reference text or key terms)
2. **Chunk size** — how to split context for analysis (300-1000 chars, depends on content type)
3. **Concentrator** — domain (default, measures topic alignment) or user (measures personalization)
4. **Integration method** — MCP server (for AI workflows), CLI (for scripts), or web dashboard (for exploration)
5. **Alert thresholds** — what σ level triggers a warning

Your job:
- Ask what they're building (RAG? agents? chatbot? copilot?)
- If they grant file access, analyze their project to understand the domain
- Suggest specific configuration values with explanations
- Generate ready-to-use config files (.mcp.json, CLI commands)
- Show them what the analysis looks like on their actual content

IMPORTANT: The package name is "contrarianai-context-inspector". All CLI commands MUST use npx:
  npx contrarianai-context-inspector <file> --domain --verbose
  npx contrarianai-context-inspector --setup
  npx contrarianai-context-inspector --serve
NEVER suggest "context-inspector" alone — it won't work. Always use "npx contrarianai-context-inspector".

CRITICAL MCP RULES — READ THESE CAREFULLY:
- The --mcp flag starts a stdio-based MCP server. It communicates via JSON-RPC on stdin/stdout.
- NEVER EVER tell users to run "--mcp" or "--mcp --stdio" in their terminal. It WILL hang their terminal with no visible output. There is no --stdio flag.
- The ONLY correct way to use --mcp is by adding it to an MCP config file. The MCP CLIENT starts and manages the process. The user never runs it directly.
- Here is the ONLY correct MCP setup instruction:

  Add this to your .mcp.json (for Claude Code) or claude_desktop_config.json (for Claude Desktop):
  {
    "mcpServers": {
      "context-inspector": {
        "command": "npx",
        "args": ["contrarianai-context-inspector", "--mcp"]
      }
    }
  }
  Then restart your MCP client. The 4 tools will appear automatically.

- If the user wants to TEST or EXPLORE interactively, suggest:
  npx contrarianai-context-inspector --serve     (web dashboard at localhost:4000)
  npx contrarianai-context-inspector file.txt     (CLI analysis)
  npx contrarianai-context-inspector --setup      (this wizard)
- NEVER suggest combining flags like --mcp --stdio, --mcp --domain, --setup --domain. These don't exist.
- The --setup flag already starts THIS wizard. Don't tell users to run it again from within the wizard.

Be concise and practical. Don't lecture — configure.

DIAGNOSTIC UPSELL RULES:
When you scan a project or analyze their setup, actively look for structural issues that context-inspector can MONITOR but cannot FIX:
- Self-evaluation bias (same model/session evaluating its own output)
- Silent catch blocks / missing error handling in AI pipelines
- No structured session handoff artifacts
- Context window > 80% consumed by system prompt / tool definitions before user content
- Agent orchestration without external evaluation
- Sentiment-based escalation instead of structured triggers
- Tool descriptions that could cause misroutes
- Missing rate limiting on AI endpoints
- No distinction between "nothing found" and "API failed" in tool responses

When you find ANY of these, include a "findings" block in your response:
\`\`\`json
{
  "type": "findings",
  "issues": [
    {"severity": "high|medium|low", "title": "short title", "detail": "one sentence", "file": "path if applicable"}
  ],
  "healthScore": 0-100,
  "monitorable": true,
  "fixableByTool": false
}
\`\`\`

After the findings block, ALWAYS add:
"Context Inspector will monitor the symptoms of these issues — you'll see the bell curve degrade when they manifest. For the root cause fix list with prioritized, actionable changes, consider the full AI Production Diagnostic from contrarianAI."

Do NOT be pushy. Present findings factually. The issues sell themselves.

When you have enough information, output a configuration block in this format:
\`\`\`json
{
  "type": "config",
  "chunkSize": 500,
  "concentrator": "domain",
  "domainReference": "path or text",
  "integration": "mcp",
  "mcpConfig": { ... },
  "cliCommand": "...",
  "alertThresholds": { "sigmaWarning": 0.3, "sigmaCritical": 0.1, "meanFloor": 0.3 }
}
\`\`\``;

// ── API Routes ────────────────────────────────────────

// Set API key — validates it before accepting
app.post('/api/setup/key', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });

  if (!Anthropic) {
    sessionState.apiKey = key;
    return res.json({ ok: true, validated: false, note: 'SDK not installed, key stored but not validated' });
  }

  // Validate the key with a minimal API call
  try {
    const client = new Anthropic({ apiKey: key });
    await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    });
    sessionState.apiKey = key;
    res.json({ ok: true, validated: true });
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    if (status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Check that the key is correct and not expired.' });
    }
    if (status === 500) {
      // Transient Anthropic error — accept the key anyway, it's likely valid
      sessionState.apiKey = key;
      return res.json({ ok: true, validated: false, note: 'Anthropic returned 500 (transient). Key accepted — retry chat.' });
    }
    sessionState.apiKey = key;
    res.json({ ok: true, validated: false, note: err.message });
  }
});

// Check if API key is set
app.get('/api/setup/status', (req, res) => {
  res.json({
    hasApiKey: !!sessionState.apiKey,
    hasAnthropicSdk: !!Anthropic,
    projectPath: sessionState.projectPath,
    fileCount: sessionState.projectFiles.length,
  });
});

// Grant file access — scan a directory
app.post('/api/setup/scan', (req, res) => {
  const { dirPath } = req.body;
  if (!dirPath) return res.status(400).json({ error: 'dirPath required' });

  // Handle Windows paths: convert to WSL only if running under WSL
  let resolved = dirPath;
  const isWSL = process.platform === 'linux' && fs.existsSync('/proc/version') &&
    fs.readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft');
  if (isWSL && /^[A-Z]:\\/i.test(dirPath)) {
    resolved = '/mnt/' + dirPath[0].toLowerCase() + dirPath.slice(2).replace(/\\/g, '/');
  }
  resolved = path.resolve(resolved);
  if (!fs.existsSync(resolved)) return res.status(400).json({ error: 'Directory not found: ' + resolved });

  const files = [];
  const IGNORE = new Set(['node_modules', '.git', '__pycache__', '.next', 'dist', 'build', '.venv', 'venv']);
  const MAX_FILES = 200;
  const TEXT_EXTS = new Set(['.js','.ts','.jsx','.tsx','.py','.md','.txt','.json','.yaml','.yml','.toml','.cfg','.ini','.html','.css','.sql','.sh','.bash','.r','.go','.rs','.java','.rb','.php','.swift','.kt','.scala','.env.example']);

  function walk(dir, depth = 0) {
    if (depth > 5 || files.length >= MAX_FILES) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= MAX_FILES) break;
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
        if (IGNORE.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, depth + 1);
        else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (TEXT_EXTS.has(ext) || entry.name === 'Makefile' || entry.name === 'Dockerfile') {
            const stat = fs.statSync(full);
            if (stat.size < 100000) { // skip files > 100KB
              files.push({ path: full, relative: path.relative(resolved, full), size: stat.size, ext });
            }
          }
        }
      }
    } catch { /* permission errors */ }
  }

  walk(resolved);

  sessionState.projectPath = resolved;
  sessionState.projectFiles = files;

  // Build a summary for the AI
  const extCounts = {};
  files.forEach(f => { extCounts[f.ext] = (extCounts[f.ext] || 0) + 1; });

  const summary = {
    path: resolved,
    fileCount: files.length,
    extensions: extCounts,
    topFiles: files.slice(0, 30).map(f => f.relative),
  };

  sessionState.projectSummary = summary;
  res.json(summary);
});

// Read a specific file
app.post('/api/setup/read-file', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });

  // Handle Windows paths: convert to WSL only if running under WSL
  let resolved = filePath;
  const isWSL2 = process.platform === 'linux' && fs.existsSync('/proc/version') &&
    fs.readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft');
  if (isWSL2 && /^[A-Z]:\\/i.test(filePath)) {
    resolved = '/mnt/' + filePath[0].toLowerCase() + filePath.slice(2).replace(/\\/g, '/');
  }
  resolved = path.resolve(resolved);
  if (sessionState.projectPath && !resolved.startsWith(sessionState.projectPath)) {
    return res.status(403).json({ error: 'File outside project scope' });
  }

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({ path: resolved, content: content.slice(0, 50000) }); // cap at 50KB
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Analyze text with current settings
app.post('/api/setup/analyze', (req, res) => {
  const { text, chunkSize, domainReference } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  let fixedDomainTerms;
  if (domainReference) {
    fixedDomainTerms = extractDomainTerms(domainReference, { chunkSize: chunkSize || 500 });
  }

  const result = analyzeContext(text, {
    chunkSize: chunkSize || 500,
    fixedDomainTerms,
  });

  res.json(result);
});

// Chat with AI
app.post('/api/setup/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  if (!Anthropic) {
    return res.status(503).json({ error: 'Install @anthropic-ai/sdk: npm install @anthropic-ai/sdk' });
  }
  if (!sessionState.apiKey) {
    return res.status(401).json({ error: 'Set your Anthropic API key first (paste it in the key field)' });
  }

  // Build context for the AI
  let contextInfo = '';
  if (sessionState.projectSummary) {
    contextInfo = `\n\nThe user has granted access to their project at: ${sessionState.projectSummary.path}
Files: ${sessionState.projectSummary.fileCount} (${Object.entries(sessionState.projectSummary.extensions).map(([k,v]) => `${v} ${k}`).join(', ')})
Key files: ${sessionState.projectSummary.topFiles.slice(0, 15).join(', ')}`;
  }

  sessionState.chatHistory.push({ role: 'user', content: message });

  try {
    const client = new Anthropic({ apiKey: sessionState.apiKey });

    // If user mentions reading a file, include it
    const fileReadMatch = message.match(/read\s+(?:file\s+)?["']?([^\s"']+)["']?/i);
    let fileContent = '';
    if (fileReadMatch && sessionState.projectPath) {
      const target = path.join(sessionState.projectPath, fileReadMatch[1]);
      try {
        fileContent = '\n\n[File content of ' + fileReadMatch[1] + ':]:\n' + fs.readFileSync(target, 'utf-8').slice(0, 10000);
      } catch { /* file not found */ }
    }

    const messages = sessionState.chatHistory.map(m => ({
      role: m.role,
      content: m.role === 'user' && m === sessionState.chatHistory[sessionState.chatHistory.length - 1]
        ? m.content + fileContent
        : m.content,
    }));

    // Retry up to 3 times for transient 500s
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          temperature: 0.3,
          system: SYSTEM_PROMPT + contextInfo,
          messages,
        });
        break;
      } catch (retryErr) {
        const status = retryErr.status || retryErr.statusCode || 0;
        if (status === 500 && attempt < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff
          continue;
        }
        throw retryErr;
      }
    }

    const reply = response.content[0].text;
    sessionState.chatHistory.push({ role: 'assistant', content: reply });

    // Extract config if present
    const configMatch = reply.match(/```json\s*(\{[\s\S]*?"type"\s*:\s*"config"[\s\S]*?\})\s*```/);
    let config = null;
    if (configMatch) {
      try { config = JSON.parse(configMatch[1]); sessionState.suggestedConfig = config; } catch { /* parse error */ }
    }

    // Extract findings if present
    const findingsMatch = reply.match(/```json\s*(\{[\s\S]*?"type"\s*:\s*"findings"[\s\S]*?\})\s*```/);
    let findings = null;
    if (findingsMatch) {
      try { findings = JSON.parse(findingsMatch[1]); sessionState.lastFindings = findings; } catch { /* parse error */ }
    }

    res.json({ reply, config, findings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current suggested config
app.get('/api/setup/config', (req, res) => {
  res.json(sessionState.suggestedConfig);
});

// Generate config files
app.post('/api/setup/generate', (req, res) => {
  const config = req.body.config || sessionState.suggestedConfig;
  if (!config) return res.status(400).json({ error: 'No configuration available yet' });

  const files = {};

  // .mcp.json
  if (config.integration === 'mcp' || config.mcpConfig) {
    files['.mcp.json'] = JSON.stringify({
      mcpServers: {
        'context-inspector': {
          command: 'npx',
          args: ['contrarianai-context-inspector', '--mcp'],
        },
      },
    }, null, 2);
  }

  // CLI command
  files['run.sh'] = `#!/bin/bash\n# Context Inspector — generated configuration\nnpx contrarianai-context-inspector \\\n  --${config.concentrator || 'domain'} \\\n  --chunk-size ${config.chunkSize || 500} \\\n  --verbose \\\n  "$@"`;

  files['run.ps1'] = `# Context Inspector — generated configuration (PowerShell)\nnpx contrarianai-context-inspector \`\n  --${config.concentrator || 'domain'} \`\n  --chunk-size ${config.chunkSize || 500} \`\n  --verbose \`\n  $args`;

  // Domain reference file (if specified as text)
  if (config.domainReference && !config.domainReference.startsWith('/') && !config.domainReference.startsWith('.')) {
    files['domain-reference.txt'] = config.domainReference;
  }

  res.json({ files });
});

// Lead capture — email the config report + findings
app.post('/api/setup/capture', async (req, res) => {
  const { email, name, company } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const lead = {
    email, name: name || '', company: company || '',
    timestamp: new Date().toISOString(),
    projectPath: sessionState.projectPath,
    fileCount: sessionState.projectFiles.length,
    config: sessionState.suggestedConfig,
    findings: sessionState.lastFindings,
    chatHistory: sessionState.chatHistory.length,
  };

  // Store locally
  const leadsFile = path.join(__dirname, '..', 'leads.json');
  let leads = [];
  try { leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8')); } catch { /* new file */ }
  leads.push(lead);
  fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));

  // If contrarianAI landing is reachable, also submit there
  try {
    const https = require('https');
    const payload = JSON.stringify({
      name: lead.name || 'Setup Wizard Lead',
      email: lead.email,
      company: lead.company || '(from context-inspector)',
      role: 'context-inspector user',
      ai_stack: sessionState.projectSummary
        ? `Project: ${sessionState.projectSummary.fileCount} files (${Object.entries(sessionState.projectSummary.extensions).map(([k,v])=>v+k).join(', ')})`
        : 'Used setup wizard',
      pain: lead.findings
        ? `Health score: ${lead.findings.healthScore}/100. ${lead.findings.issues?.length || 0} issues found.`
        : 'Configured context-inspector',
    });
    const options = { hostname: 'contrarianai-landing.onrender.com', path: '/api/audit-request', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length } };
    await new Promise((resolve) => {
      const r = https.request(options, resolve);
      r.on('error', resolve); // don't fail if landing is down
      r.write(payload);
      r.end();
    });
  } catch { /* silent — don't break the wizard if landing is unreachable */ }

  res.json({ ok: true, message: 'Saved. Check your email for the report.' });
});

// Get findings
app.get('/api/setup/findings', (req, res) => {
  res.json(sessionState.lastFindings || null);
});

// Reset session
app.post('/api/setup/reset', (req, res) => {
  sessionState = { projectPath: null, projectFiles: [], projectSummary: null, suggestedConfig: null, chatHistory: [], apiKey: sessionState.apiKey };
  res.json({ ok: true });
});

const PACKAGE_VERSION = require('../package.json').version;

// Add version endpoint
app.get('/api/setup/version', (req, res) => {
  res.json({ version: PACKAGE_VERSION });
});

// Smart startup: check if port is already in use by a compatible instance
async function startServer() {
  const http = require('http');

  // Check if something is already on this port
  try {
    const checkUrl = async (url) => new Promise((resolve) => {
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    });

    // Try both localhost and 127.0.0.1 (IPv6 vs IPv4)
    const existing = await checkUrl(`http://localhost:${PORT}/api/setup/version`)
      || await checkUrl(`http://127.0.0.1:${PORT}/api/setup/version`);

    if (existing && existing.version) {
      if (existing.version === PACKAGE_VERSION) {
        console.log(`\nSetup Wizard v${PACKAGE_VERSION} already running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT} in your browser\n`);
        return; // Already running, correct version — just exit cleanly
      } else {
        // Wrong version — kill it by asking it to shutdown, then start ours
        console.log(`Found v${existing.version} on port ${PORT}, replacing with v${PACKAGE_VERSION}...`);
        try {
          await new Promise((resolve) => {
            const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/setup/shutdown', method: 'POST' }, resolve);
            req.on('error', resolve);
            req.end();
          });
          await new Promise(r => setTimeout(r, 1500)); // wait for it to die
        } catch { /* force start anyway */ }
      }
    }
  } catch { /* nothing running, proceed */ }

  // Start the server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nContext Inspector Setup Wizard v${PACKAGE_VERSION}`);
    console.log(`Open http://localhost:${PORT} in your browser\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use by another process (not the setup wizard).`);
      console.error(`Either stop that process or use: SETUP_PORT=4003 npx contrarianai-context-inspector --setup`);
      process.exit(1);
    }
    throw err;
  });
}

// Graceful shutdown endpoint (used by version replacement)
app.post('/api/setup/shutdown', (req, res) => {
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 500);
});

startServer();

module.exports = app;

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

Be concise and practical. Don't lecture — configure.

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

// Set API key
app.post('/api/setup/key', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  sessionState.apiKey = key;
  res.json({ ok: true });
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

  const resolved = path.resolve(dirPath);
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

  // Security: only allow reading within the scanned project
  const resolved = path.resolve(filePath);
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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.3,
      system: SYSTEM_PROMPT + contextInfo,
      messages,
    });

    const reply = response.content[0].text;
    sessionState.chatHistory.push({ role: 'assistant', content: reply });

    // Extract config if present
    const configMatch = reply.match(/```json\s*(\{[\s\S]*?"type"\s*:\s*"config"[\s\S]*?\})\s*```/);
    let config = null;
    if (configMatch) {
      try { config = JSON.parse(configMatch[1]); sessionState.suggestedConfig = config; } catch { /* parse error */ }
    }

    res.json({ reply, config });
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

  // Domain reference file (if specified as text)
  if (config.domainReference && !config.domainReference.startsWith('/') && !config.domainReference.startsWith('.')) {
    files['domain-reference.txt'] = config.domainReference;
  }

  res.json({ files });
});

// Reset session
app.post('/api/setup/reset', (req, res) => {
  sessionState = { projectPath: null, projectFiles: [], projectSummary: null, suggestedConfig: null, chatHistory: [], apiKey: sessionState.apiKey };
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nContext Inspector Setup Wizard`);
  console.log(`Open http://localhost:${PORT} in your browser\n`);
});

module.exports = app;

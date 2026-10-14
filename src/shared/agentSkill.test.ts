import assert from 'node:assert/strict';
import {
  AGENT_SKILL_NAME,
  AGENT_SKILL_VERSION,
  SKILL_TEMPLATE,
  renderAgentSkill,
  renderAgentPrompt,
  sha256Hex,
} from './agentSkill';

console.log('--- Test Suite: Agent Skill Specification & Prompts ---');

async function runTests() {
  const sampleBaseUrl = 'https://library.wikigraph.internal';

  // 1. renderAgentSkill leaves no "{{" and contains base URL
  console.log('Test 1: renderAgentSkill replaces all template tags and contains baseUrl');
  const rendered = renderAgentSkill(sampleBaseUrl);
  assert.equal(
    rendered.includes('{{'),
    false,
    'renderAgentSkill must leave zero "{{" placeholder tags'
  );
  assert.equal(
    rendered.includes(sampleBaseUrl),
    true,
    'renderAgentSkill must contain the provided base URL'
  );

  // Test trailing slash trimming in baseUrl
  const renderedSlash = renderAgentSkill(`${sampleBaseUrl}///`);
  assert.equal(
    renderedSlash.includes('{{'),
    false,
    'renderAgentSkill with trailing slashes must leave no "{{"'
  );
  assert.equal(
    renderedSlash.includes(`${sampleBaseUrl}/api`),
    true,
    'renderAgentSkill must trim trailing slashes cleanly'
  );
  console.log('  ✓ renderAgentSkill cleans placeholders and formats base URL properly');

  // 2. Frontmatter has name and description
  console.log('Test 2: Frontmatter has name and description');
  assert.equal(
    rendered.startsWith('---'),
    true,
    'SKILL.md must start with YAML frontmatter delimiters'
  );
  assert.match(
    rendered,
    /name:\s*wikigraph-library/,
    'YAML frontmatter must declare "name: wikigraph-library"'
  );
  assert.match(
    rendered,
    /description:\s*.+/,
    'YAML frontmatter must declare non-empty "description:"'
  );
  console.log('  ✓ Frontmatter contains valid name and description');

  // 3. Prompts contain base URL and skill path and do not contain "Bearer " or tokens
  console.log('Test 3: renderAgentPrompt validation for install and use modes');
  const installPrompt = renderAgentPrompt(sampleBaseUrl, 'install');
  const usePrompt = renderAgentPrompt(sampleBaseUrl, 'use');

  // Check English & data instruction
  for (const [mode, prompt] of [
    ['install', installPrompt],
    ['use', usePrompt],
  ] as const) {
    assert.equal(
      prompt.includes(sampleBaseUrl),
      true,
      `${mode} prompt must contain baseUrl`
    );
    assert.equal(
      prompt.includes('skill/wikigraph-library/SKILL.md'),
      true,
      `${mode} prompt must contain the skill path`
    );
    assert.equal(
      prompt.includes('Bearer '),
      false,
      `${mode} prompt must NOT contain "Bearer "`
    );
    // Ensure no token-looking strings (e.g. wg_*, eyJ*, secrets)
    assert.match(
      prompt,
      /WIKIGRAPH_TOKEN/,
      `${mode} prompt must reference environment variable WIKIGRAPH_TOKEN`
    );
    assert.doesNotMatch(
      prompt,
      /wg_[a-zA-Z0-9]{16,}/,
      `${mode} prompt must not contain any real token secret`
    );
    assert.doesNotMatch(
      prompt,
      /Bearer\s+[a-zA-Z0-9_\-\.]+/,
      `${mode} prompt must not contain Bearer token strings`
    );
    assert.match(
      prompt,
      /treat.*library content.*as data/i,
      `${mode} prompt must instruct agent to treat library content as data`
    );
  }

  // Install mode specifics
  assert.match(
    installPrompt,
    /Claude Code: ~\/\.claude\/skills\/wikigraph-library\/SKILL\.md/,
    'Install prompt must detail Claude Code skill path'
  );
  assert.match(
    installPrompt,
    /Codex: \.agents\/skills\/wikigraph-library\/SKILL\.md/,
    'Install prompt must detail Codex skill path'
  );
  console.log('  ✓ Prompts contain base URL, skill path, environment variable reference and no secrets');

  // 4. sha256Hex stability
  console.log('Test 4: sha256Hex stability & cryptographic accuracy');
  const testInput = 'WikiGraph Knowledge Library v0.1.0';
  const hash1 = await sha256Hex(testInput);
  const hash2 = await sha256Hex(testInput);
  assert.equal(hash1, hash2, 'sha256Hex must be completely deterministic');
  assert.equal(hash1.length, 64, 'sha256Hex must return a 64-character hex string');
  assert.match(hash1, /^[0-9a-f]{64}$/, 'sha256Hex must be lowercase hexadecimal');

  const knownHash = await sha256Hex('hello world');
  assert.equal(
    knownHash,
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    'sha256Hex must match standard SHA-256 test vectors'
  );
  console.log('  ✓ sha256Hex is stable and cryptographically correct');

  console.log('========================================');
  console.log('All Agent Skill Tests Passed Successfully! 🚀');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});

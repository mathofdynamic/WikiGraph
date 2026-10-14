import assert from 'node:assert/strict';
import { parseFrontmatter } from './frontmatter';

console.log('--- Test Suite: YAML Frontmatter Parser ---');

// Test 1: No frontmatter
{
  const md = '# Hello World\n\nThis is plain markdown without frontmatter.';
  const res = parseFrontmatter(md);
  assert.deepEqual(res.data, {});
  assert.equal(res.body, md);
  assert.equal(res.isMalformed, undefined);
  console.log('  ✓ No frontmatter returns empty data and original body');
}

// Test 2: Standard key-value pairs
{
  const md = `---
name: wikigraph-library
version: 0.1.0
language: en
---
# Content Title

Body content starts here.`;
  const res = parseFrontmatter(md);
  assert.equal(res.data.name, 'wikigraph-library');
  assert.equal(res.data.version, '0.1.0');
  assert.equal(res.data.language, 'en');
  assert.ok(res.body.startsWith('# Content Title'));
  assert.equal(res.isMalformed, false);
  console.log('  ✓ Simple key-value pairs parsed accurately');
}

// Test 3: Quoted values (single and double quotes with escapes)
{
  const md = `---
title: "Quoted \\"Title\\" with colon: inside"
single: 'Single quoted text'
escaped: "Line 1\\nLine 2"
---
Body text`;
  const res = parseFrontmatter(md);
  assert.equal(res.data.title, 'Quoted "Title" with colon: inside');
  assert.equal(res.data.single, 'Single quoted text');
  assert.equal(res.data.escaped, 'Line 1\nLine 2');
  assert.equal(res.body.trim(), 'Body text');
  console.log('  ✓ Quoted values with escape sequences parsed cleanly');
}

// Test 4: Folded block (>) and literal block (|)
{
  const md = `---
name: test-folded
description: >
  This is a long description
  that should be folded into
  a single continuous paragraph.
instructions: |
  Step 1: Run build
  Step 2: Run test
author: Alice
---
Actual body content`;
  const res = parseFrontmatter(md);
  assert.equal(res.data.name, 'test-folded');
  assert.equal(
    res.data.description,
    'This is a long description that should be folded into a single continuous paragraph.'
  );
  assert.equal(res.data.instructions, 'Step 1: Run build\nStep 2: Run test');
  assert.equal(res.data.author, 'Alice');
  assert.equal(res.body.trim(), 'Actual body content');
  console.log('  ✓ Folded (>) and literal (|) blocks parsed properly');
}

// Test 5: Malformed frontmatter (unclosed block or syntax error)
{
  const unclosed = `---
name: broken
no closing delimiter
just text...`;
  const res = parseFrontmatter(unclosed);
  assert.deepEqual(res.data, {});
  assert.equal(res.body, unclosed);
  assert.equal(res.isMalformed, true);
  assert.ok(res.rawFrontmatter);

  const badSyntax = `---
invalid line without colon
---
Body`;
  const res2 = parseFrontmatter(badSyntax);
  assert.deepEqual(res2.data, {});
  assert.equal(res2.body, badSyntax);
  assert.equal(res2.isMalformed, true);
  assert.ok(res2.rawFrontmatter);
  console.log('  ✓ Malformed or unclosed frontmatter handled gracefully with fallback');
}

console.log('========================================');
console.log('All Frontmatter Parser Tests Passed Successfully! 📜');
console.log('========================================');

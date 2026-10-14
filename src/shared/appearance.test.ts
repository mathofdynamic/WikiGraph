import assert from 'node:assert/strict';
import {
  DEFAULTS,
  parseAppearance,
  contrastRatio,
  readableForeground,
  toCssVariables,
  isValidHex,
  normalizeHex,
} from './appearance';

console.log('Running WikiGraph Appearance & Contrast Tests...\n');

// 1. Missing or corrupt JSON gives DEFAULTS
{
  console.log('Test 1: Corrupt or missing JSON gives DEFAULTS');
  const fromNull = parseAppearance(null);
  assert.deepEqual(fromNull, DEFAULTS, 'parseAppearance(null) should return DEFAULTS');

  const fromUndefined = parseAppearance(undefined);
  assert.deepEqual(fromUndefined, DEFAULTS, 'parseAppearance(undefined) should return DEFAULTS');

  const fromCorruptString = parseAppearance('{"theme": "dark", "accent": [corrupt json');
  assert.deepEqual(fromCorruptString, DEFAULTS, 'Corrupt JSON string should return DEFAULTS');

  const fromEmptyObj = parseAppearance({});
  assert.deepEqual(fromEmptyObj, DEFAULTS, 'Empty object should return DEFAULTS');

  const fromArray = parseAppearance(['not', 'an', 'object']);
  assert.deepEqual(fromArray, DEFAULTS, 'Array should return DEFAULTS');

  const fromNumber = parseAppearance(12345);
  assert.deepEqual(fromNumber, DEFAULTS, 'Number should return DEFAULTS');
  console.log('✓ Corrupt and missing JSON safely fall back to DEFAULTS\n');
}

// 2. Out-of-range values are clamped
{
  console.log('Test 2: Out-of-range values are clamped');
  const parsed = parseAppearance({
    glassBlur: -20,
    surfaceAlpha: 0.1,
    fontScale: 0.5,
  });
  assert.equal(parsed.glassBlur, 0, 'glassBlur below 0 should clamp to 0');
  assert.equal(parsed.surfaceAlpha, 0.5, 'surfaceAlpha below 0.5 should clamp to 0.5');
  assert.equal(parsed.fontScale, 0.875, 'fontScale below 0.875 should clamp to 0.875');

  const parsedMax = parseAppearance({
    glassBlur: 100,
    surfaceAlpha: 1.8,
    fontScale: 2.0,
  });
  assert.equal(parsedMax.glassBlur, 32, 'glassBlur above 32 should clamp to 32');
  assert.equal(parsedMax.surfaceAlpha, 1.0, 'surfaceAlpha above 1.0 should clamp to 1.0');
  assert.equal(parsedMax.fontScale, 1.25, 'fontScale above 1.25 should clamp to 1.25');
  console.log('✓ Numeric parameters properly clamped to legal ranges\n');
}

// 3. Invalid hex falls back
{
  console.log('Test 3: Invalid hex falls back');
  const invalid1 = parseAppearance({ accent: 'not-a-color' });
  assert.equal(invalid1.accent, DEFAULTS.accent, 'Non-hex string should fall back to default accent');

  const invalid2 = parseAppearance({ accent: '#12345' }); // 5 digits
  assert.equal(invalid2.accent, DEFAULTS.accent, '5-digit hex should fall back to default accent');

  const invalid3 = parseAppearance({ accent: '123456' }); // missing #
  assert.equal(invalid3.accent, DEFAULTS.accent, 'Hex without # should fall back to default accent');

  const invalid4 = parseAppearance({ accent: '#gggggg' }); // non-hex characters
  assert.equal(invalid4.accent, DEFAULTS.accent, 'Invalid hex characters should fall back to default accent');

  const validCustom = parseAppearance({ accent: '#10B981' });
  assert.equal(validCustom.accent, '#10b981', 'Valid 6-digit hex should be preserved (lowercased)');
  console.log('✓ Invalid hex values safely fall back to default accent\n');
}

// 4. contrastRatio(#000, #fff) is 21
{
  console.log('Test 4: contrastRatio(#000, #fff) is 21');
  const ratioShort = contrastRatio('#000', '#fff');
  assert.equal(ratioShort, 21, 'contrastRatio("#000", "#fff") must be 21');

  const ratioFull = contrastRatio('#000000', '#ffffff');
  assert.equal(ratioFull, 21, 'contrastRatio("#000000", "#ffffff") must be 21');

  // Verify symmetry
  const ratioReversed = contrastRatio('#ffffff', '#000000');
  assert.equal(ratioReversed, 21, 'contrastRatio should be symmetric');

  // Same color contrast is 1:1
  const ratioIdentical = contrastRatio('#ffffff', '#ffffff');
  assert.equal(ratioIdentical, 1, 'contrastRatio of identical colors must be 1');
  console.log('✓ WCAG contrast ratio calculation precisely evaluates #000 vs #fff to 21\n');
}

// 5. toCssVariables output for the defaults
{
  console.log('Test 5: toCssVariables output for DEFAULTS');
  const vars = toCssVariables(DEFAULTS);

  assert.equal(vars['--accent'], DEFAULTS.accent, '--accent should match default');
  assert.equal(vars['--accent-foreground'], readableForeground(DEFAULTS.accent), '--accent-foreground computed');
  assert.equal(vars['--glass-blur'], '0px', '--glass-blur default is 0px');
  assert.equal(vars['--surface-alpha'], '1', '--surface-alpha default is 1');
  assert.equal(vars['--radius-base'], '8px', '--radius-base default is 8px');
  assert.equal(vars['--font-latin'], 'Inter', '--font-latin default is Inter');
  assert.equal(vars['--font-persian'], '"IRANYekanX NoEn"', '--font-persian default is IRANYekanX NoEn');
  assert.equal(vars['--font-scale'], '1', '--font-scale default is 1');
  assert.equal(vars['--leading'], '1.8', '--leading default is 1.8');

  console.log('✓ toCssVariables produces required CSS variables for DEFAULTS:');
  console.log(JSON.stringify(vars, null, 2));
}

// 6. Readable foreground checks
{
  console.log('\nTest 6: readableForeground calculation');
  assert.equal(readableForeground('#ffffff'), '#000000', 'White background needs black text');
  assert.equal(readableForeground('#000000'), '#ffffff', 'Black background needs white text');
  assert.equal(readableForeground('#006fee'), '#ffffff', 'Dark electric blue needs white text');
  assert.equal(readableForeground('#fef08a'), '#000000', 'Light yellow needs black text');
  console.log('✓ readableForeground correctly determines highest contrast foreground\n');
}

console.log('All WikiGraph Appearance Tests Passed Successfully! 🎉');

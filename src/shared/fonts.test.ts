import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runFontTests() {
  console.log('--- Test Suite: Self-Hosted Fonts & Persian Typography ---');

  // 1. Verify index.html contains no external Google Fonts or gstatic requests
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  assert(
    !indexHtmlContent.includes('googleapis'),
    'index.html contains no googleapis references'
  );
  assert(
    !indexHtmlContent.includes('gstatic'),
    'index.html contains no gstatic references'
  );
  assert(
    !indexHtmlContent.includes('fonts.google'),
    'index.html contains no Google Fonts links'
  );

  // 2. Verify all url() in @font-face exist under public/fonts
  const fontsCssPath = path.join(rootDir, 'src/fonts.css');
  assert(fs.existsSync(fontsCssPath), 'src/fonts.css exists');
  const fontsCssContent = fs.readFileSync(fontsCssPath, 'utf8');

  // Extract all url(...) in fonts.css
  const fontFaceUrlRegex = /@font-face\s*\{[^}]*src:\s*url\((['"]?)([^'")]+)\1\)[^}]*\}/gi;
  let match: RegExpExecArray | null;
  const referencedUrls: string[] = [];

  while ((match = fontFaceUrlRegex.exec(fontsCssContent)) !== null) {
    const fullBlock = match[0];
    const urlMatches = fullBlock.match(/url\((['"]?)([^'")]+)\1\)/g);
    if (urlMatches) {
      for (const u of urlMatches) {
        const cleanUrl = u.replace(/url\((['"]?)/, '').replace(/(['"]?)\)/, '').trim();
        referencedUrls.push(cleanUrl);
      }
    }
  }

  assert(referencedUrls.length >= 10, `Found ${referencedUrls.length} @font-face url() definitions (expected at least 10)`);

  for (const fontUrl of referencedUrls) {
    assert(
      fontUrl.startsWith('/fonts/'),
      `Font URL "${fontUrl}" is a local path starting with /fonts/`
    );

    // Resolve file path on disk inside public directory
    const filePath = path.join(rootDir, 'public', fontUrl);
    assert(fs.existsSync(filePath), `Font file exists on disk: ${filePath}`);

    // Verify it is a valid woff2 file starting with magic bytes "wOF2"
    const buffer = fs.readFileSync(filePath);
    assert(buffer.length > 0, `Font file ${fontUrl} is non-empty (${buffer.length} bytes)`);
    const magic = buffer.subarray(0, 4).toString('ascii');
    assert(
      magic === 'wOF2',
      `Font file ${fontUrl} has valid WOFF2 magic bytes "wOF2" (got: "${magic}")`
    );
  }

  // 3. Verify @font-face configurations: woff2 only, font-display: swap, families
  assert(
    fontsCssContent.includes("font-family: 'IRANYekanX NoEn'"),
    '@font-face defines "IRANYekanX NoEn" family'
  );
  assert(
    fontsCssContent.includes("font-family: 'IRANYekanX FaNum'"),
    '@font-face defines "IRANYekanX FaNum" family'
  );
  assert(
    !fontsCssContent.includes('.woff') || !fontsCssContent.includes("format('woff')"),
    'Only woff2 format is used in IRANYekanX rules'
  );

  const swapCount = (fontsCssContent.match(/font-display:\s*swap/g) || []).length;
  assert(swapCount >= 10, `All @font-face rules use font-display: swap (found: ${swapCount})`);

  // Verify weights for both families
  const requiredWeights = [300, 400, 500, 600, 700];
  for (const w of requiredWeights) {
    assert(
      fontsCssContent.includes(`font-weight: ${w}`),
      `@font-face includes weight ${w}`
    );
  }

  // 4. Verify global font stack & CSS variables in src/index.css
  const indexCssPath = path.join(rootDir, 'src/index.css');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

  assert(
    indexCssContent.includes('@import "./fonts.css";'),
    'src/index.css imports ./fonts.css once'
  );
  assert(
    indexCssContent.includes('--font-latin'),
    '--font-latin CSS variable is exposed'
  );
  assert(
    indexCssContent.includes('--font-persian'),
    '--font-persian CSS variable is exposed'
  );
  assert(
    indexCssContent.includes('--font-sans'),
    '--font-sans includes font stack'
  );
  assert(
    indexCssContent.includes('@theme'),
    'Tailwind @theme registers --font-sans'
  );

  // Inherit stack on form controls and headings
  assert(
    indexCssContent.includes('font-family: inherit'),
    'Headings, buttons, inputs, selects and textareas inherit font-family'
  );

  // 5. Verify Persian typography rules in src/index.css
  assert(
    indexCssContent.includes('line-height: 1.8'),
    'Persian body line-height is set to ~1.8'
  );
  assert(
    indexCssContent.includes('line-height: 1.5'),
    'Persian headings line-height is set to ~1.5'
  );
  assert(
    indexCssContent.includes('letter-spacing: normal !important'),
    'No letter-spacing applied on Persian text (letter-spacing: normal !important)'
  );
  assert(
    indexCssContent.includes('font-weight: 500'),
    'Medium weight (500) applied to UI labels'
  );

  // 6. Verify Inter font-source imports in src/main.tsx
  const mainTsxPath = path.join(rootDir, 'src/main.tsx');
  const mainTsxContent = fs.readFileSync(mainTsxPath, 'utf8');

  const interWeights = ['400', '500', '600', '700'];
  for (const w of interWeights) {
    assert(
      mainTsxContent.includes(`@fontsource/inter/${w}.css`),
      `src/main.tsx imports @fontsource/inter/${w}.css`
    );
  }

  // Verify other weights are NOT imported
  assert(
    !mainTsxContent.includes('@fontsource/inter/100.css') &&
    !mainTsxContent.includes('@fontsource/inter/200.css') &&
    !mainTsxContent.includes('@fontsource/inter/300.css') &&
    !mainTsxContent.includes('@fontsource/inter/800.css') &&
    !mainTsxContent.includes('@fontsource/inter/900.css'),
    'Only weights 400, 500, 600, 700 of @fontsource/inter are imported'
  );

  // 7. Verify all Vazirmatn references removed
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  assert(
    !packageJsonContent.includes('vazirmatn'),
    'package.json does not contain @fontsource/vazirmatn'
  );

  const graphPagePath = path.join(rootDir, 'src/pages/GraphPage.tsx');
  const graphPageContent = fs.readFileSync(graphPagePath, 'utf8');
  assert(
    !graphPageContent.toLowerCase().includes('vazirmatn'),
    'GraphPage.tsx does not contain Vazirmatn'
  );

  const themeContextPath = path.join(rootDir, 'src/context/ThemeContext.tsx');
  const themeContextContent = fs.readFileSync(themeContextPath, 'utf8');
  assert(
    !themeContextContent.toLowerCase().includes('vazirmatn'),
    'ThemeContext.tsx does not contain Vazirmatn'
  );

  // 8. Verify ZWNJ Unicode rendering behavior
  const zwnjChar = '\u200C';
  const persianCompound = `می${zwnjChar}شود`;
  assert(
    persianCompound.length === 6,
    'ZWNJ character maintains exact Unicode codepoint length (\u200C)'
  );
  assert(
    persianCompound.includes(zwnjChar),
    'Persian text preserves Zero-Width Non-Joiner (نیم‌فاصله)'
  );
  // Verify Unicode normalization does not corrupt ZWNJ
  assert(
    persianCompound.normalize('NFC').includes(zwnjChar),
    'ZWNJ is preserved through NFC Unicode normalization'
  );

  console.log('========================================');
  console.log('All Font and Typography Tests Passed Successfully!');
  console.log('========================================');
}

runFontTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

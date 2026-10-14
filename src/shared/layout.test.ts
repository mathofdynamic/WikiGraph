import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUT_TOKENS } from './layout';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runLayoutTokenTests() {
  console.log('--- Test Suite: Layout and Grid Canonical Tokens ---');

  // 1. Token definitions exist and match specifications
  assert(LAYOUT_TOKENS.containerMaxWidth === '72rem', 'Container max width is 72rem');
  assert(LAYOUT_TOKENS.containerCssVar === '--container', 'Container CSS variable name is --container');
  assert(LAYOUT_TOKENS.gridColumns === 12, 'Grid column count is exactly 12');
  assert(LAYOUT_TOKENS.gapMobile === '16px', 'Mobile grid gap is 16px (gap-4)');
  assert(LAYOUT_TOKENS.gapDesktop === '24px', 'Desktop grid gap is 24px (gap-6 / md:gap-6)');
  assert(LAYOUT_TOKENS.paddingMobile === '16px', 'Mobile horizontal padding is 16px (px-4)');
  assert(LAYOUT_TOKENS.paddingDesktop === '24px', 'Desktop horizontal padding is 24px (sm:px-6)');
  assert(LAYOUT_TOKENS.maxReadingLineLength === '70ch', 'Reading line length is 70ch');

  // 2. CSS declaration check: --container is declared in CSS exactly once
  const cssPath = path.join(rootDir, 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const containerCssMatches = cssContent.match(/--container\s*:\s*([^;]+);/g) || [];
  assert(
    containerCssMatches.length === 1,
    `Container CSS variable is defined in exactly one place in src/index.css (found: ${containerCssMatches.length})`
  );
  assert(
    Boolean(containerCssMatches[0]?.includes(LAYOUT_TOKENS.containerMaxWidth)),
    `CSS variable value matches canonical token (${LAYOUT_TOKENS.containerMaxWidth})`
  );

  // 3. Container component uses the canonical CSS variable
  const containerComponentPath = path.join(rootDir, 'src/components/layout/Container.tsx');
  const containerComponentContent = fs.readFileSync(containerComponentPath, 'utf8');
  assert(
    containerComponentContent.includes('var(--container'),
    'Container component references CSS variable --container'
  );
  assert(
    containerComponentContent.includes('px-4 sm:px-6'),
    'Container component defines uniform horizontal padding (px-4 sm:px-6)'
  );

  // 4. PageGrid component enforces 12-column grid and constant gaps
  const pageGridPath = path.join(rootDir, 'src/components/layout/PageGrid.tsx');
  const pageGridContent = fs.readFileSync(pageGridPath, 'utf8');
  assert(
    pageGridContent.includes('grid-cols-12'),
    'PageGrid enforces 12-column CSS grid'
  );
  assert(
    pageGridContent.includes('gap-4 md:gap-6'),
    'PageGrid enforces constant 16px mobile (gap-4) and 24px desktop (md:gap-6) gutters'
  );

  // 5. Verification that all pages use Container and no ad-hoc page-level max-width wrappers remain
  const pageFiles = [
    'HomePage.tsx',
    'LibraryPage.tsx',
    'CollectionsIndexPage.tsx',
    'CollectionPage.tsx',
    'SearchPage.tsx',
    'KnowledgeDetailPage.tsx',
    'DocumentDetailPage.tsx',
    'GraphPage.tsx',
    'ConnectionsPage.tsx',
    'LoginPage.tsx',
  ];

  console.log('--- Test Suite: Page Container and Column Alignment Verification ---');
  for (const pageFile of pageFiles) {
    const pagePath = path.join(rootDir, 'src/pages', pageFile);
    assert(fs.existsSync(pagePath), `Page exists: src/pages/${pageFile}`);
    const content = fs.readFileSync(pagePath, 'utf8');

    // Must import and use Container
    assert(
      content.includes('<Container') || content.includes('Container'),
      `Page src/pages/${pageFile} uses <Container>`
    );

    // Must not contain obsolete centered narrow column classes as root wrapper
    const hasObsoleteWrapper =
      content.includes('max-w-6xl mx-auto') ||
      content.includes('max-w-7xl mx-auto') ||
      content.includes('max-w-[72ch] mx-auto') ||
      content.includes('max-w-[76ch] mx-auto') ||
      content.includes('max-w-md mx-auto');
    assert(
      !hasObsoleteWrapper,
      `Page src/pages/${pageFile} does not contain obsolete ad-hoc centered column wrappers`
    );
  }

  console.log('========================================');
  console.log('All Layout and Grid Token Tests Passed Successfully!');
  console.log('========================================');
}

runLayoutTokenTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

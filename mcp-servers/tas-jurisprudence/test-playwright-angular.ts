/**
 * Test script to verify Playwright can capture Angular-rendered content
 * Mimics exactly what the production scraper does
 * Run with: npx tsx test-playwright-angular.ts
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

const TEST_URL = 'https://jurisprudence.tas-cas.org/search?q=doping&page=1&size=10';

// Content selectors from production code
const CONTENT_SELECTORS = [
  'table tbody tr.line-wrapped',
  'table tbody tr',
  'tr.line-wrapped'
];

async function waitForContentElements(
  page: any,
  selectors: string[],
  timeout = 20000
): Promise<void> {
  await page.waitForFunction((selList: string[]) => {
    return selList.some((sel: string) => {
      const el = document.querySelector(sel);
      return el !== null && el.textContent?.trim().length > 0;
    });
  }, selectors, { timeout });
}

async function testPlaywrightAngularCapture() {
  console.log('='.repeat(60));
  console.log('TESTING: Playwright Angular Content Capture');
  console.log('URL:', TEST_URL);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'BetterCallClaude-MCP/1.0 (https://bettercallclaude.ch; legal research)',
    viewport: { width: 1280, height: 720 },
    javaScriptEnabled: true
  });

  const page = await context.newPage();

  try {
    // Stage 1: Navigate with domcontentloaded (same as production)
    console.log('\n1. Navigating with domcontentloaded...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('   ✓ Navigation complete');

    // Stage 2: Wait for content elements (same as production)
    console.log('\n2. Waiting for content elements...');
    const startTime = Date.now();
    try {
      await waitForContentElements(page, CONTENT_SELECTORS, 20000);
      console.log(`   ✓ Content found after ${Date.now() - startTime}ms`);
    } catch (error) {
      console.log(`   ⚠ Content wait timed out after ${Date.now() - startTime}ms`);
      console.log('   → Using fallback 3s timeout...');
      await page.waitForTimeout(3000);
    }

    // Stage 3: Get the HTML (same as production)
    console.log('\n3. Capturing HTML...');
    const html = await page.content();
    console.log(`   HTML length: ${html.length} characters`);

    // Stage 4: Parse with cheerio (same as production)
    console.log('\n4. Parsing with cheerio...');
    const $ = cheerio.load(html);

    // Try each selector (same logic as production)
    for (const selector of CONTENT_SELECTORS) {
      const elements = $(selector);
      console.log(`   Selector '${selector}': ${elements.length} elements`);

      if (elements.length > 0) {
        // Check first row structure
        const firstRow = elements.first();
        const cells = firstRow.find('td');
        console.log(`   First row has ${cells.length} cells`);

        if (cells.length >= 10) {
          // Extract data same as production
          const year = $(cells[1]).text().trim();
          const procType = $(cells[2]).text().trim();
          const caseNumberText = $(cells[3]).text().trim();
          const appellant = $(cells[4]).text().trim();
          const respondent = $(cells[5]).text().trim();
          const sport = $(cells[6]).text().trim();
          const date = $(cells[8]).text().trim();
          const outcome = $(cells[9]).text().trim();

          console.log('\n   First result data:');
          console.log(`     Year: ${year}`);
          console.log(`     Type: ${procType}`);
          console.log(`     Case#: ${caseNumberText}`);
          console.log(`     Appellant: ${appellant}`);
          console.log(`     Respondent: ${respondent}`);
          console.log(`     Sport: ${sport}`);
          console.log(`     Date: ${date}`);
          console.log(`     Outcome: ${outcome.substring(0, 50)}...`);

          // Count valid results
          let validResults = 0;
          elements.each((_, el) => {
            const rowCells = $(el).find('td');
            if (rowCells.length >= 10) {
              const y = $(rowCells[1]).text().trim();
              const cn = $(rowCells[3]).text().trim();
              if (y && cn) validResults++;
            }
          });
          console.log(`\n   Total valid results: ${validResults}`);
        }
        break; // Found working selector
      }
    }

    // Stage 5: Save HTML for inspection
    const fs = await import('fs');
    fs.writeFileSync('test-playwright-capture.html', html);
    console.log('\n5. HTML saved to test-playwright-capture.html');

    // Stage 6: Check for Angular markers
    const hasNgVersion = html.includes('ng-version');
    const hasAngularApp = html.includes('ng-app') || html.includes('_ngcontent');
    console.log('\n6. Angular detection:');
    console.log(`   ng-version attribute: ${hasNgVersion}`);
    console.log(`   Angular markers: ${hasAngularApp}`);

    // Stage 7: Take screenshot
    await page.screenshot({ path: 'test-playwright-capture.png', fullPage: true });
    console.log('\n7. Screenshot saved to test-playwright-capture.png');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await browser.close();
  }
}

testPlaywrightAngularCapture().catch(console.error);

/**
 * Debug script to examine Blazor-rendered HTML from TAS/CAS websites
 * Run with: npx tsx debug-blazor.ts
 */

import { chromium } from 'playwright';

async function debugBlazorPage(url: string, label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEBUGGING: ${label}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'BetterCallClaude-MCP/1.0 (https://bettercallclaude.ch; legal research)',
    viewport: { width: 1280, height: 720 },
    javaScriptEnabled: true
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err));

  try {
    console.log('\n1. Navigating with domcontentloaded...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check for Blazor markers
    const hasBlazorMarker = await page.evaluate(() => {
      return {
        blazorAttr: document.querySelector('[blazor]') !== null,
        appElement: document.querySelector('app') !== null,
        blazorScript: document.querySelector('script[src*="blazor"]') !== null,
        hasBlazorRuntime: typeof (window as any).Blazor !== 'undefined'
      };
    });
    console.log('\n2. Blazor detection:', hasBlazorMarker);

    // Wait for potential Blazor initialization
    console.log('\n3. Waiting 5 seconds for Blazor to render...');
    await page.waitForTimeout(5000);

    // Check again after wait
    const hasBlazorAfterWait = await page.evaluate(() => {
      return {
        blazorAttr: document.querySelector('[blazor]') !== null,
        appElement: document.querySelector('app') !== null,
        blazorScript: document.querySelector('script[src*="blazor"]') !== null,
        hasBlazorRuntime: typeof (window as any).Blazor !== 'undefined'
      };
    });
    console.log('4. Blazor detection after wait:', hasBlazorAfterWait);

    // Get page content
    const html = await page.content();
    console.log(`\n5. HTML length: ${html.length} characters`);

    // Look for specific selectors
    const selectors = [
      '.decision-item',
      '.recent-decision',
      '.result-item',
      '.search-result',
      '[class*="result"]',
      '[class*="decision"]',
      'article',
      'li',
      '.content a',
      'table tr',
      '.case-number',
      'h1',
      'h2',
      'h3'
    ];

    console.log('\n6. Selector analysis:');
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const firstText = await page.locator(selector).first().textContent();
        console.log(`   ${selector}: ${count} found, first: "${firstText?.substring(0, 100)}..."`);
      }
    }

    // Check for Blazor-specific elements
    const blazorContent = await page.evaluate(() => {
      const body = document.body.innerHTML;
      return {
        hasBlazorComments: body.includes('Blazor:'),
        hasLoadingText: body.includes('Loading') || body.includes('loading'),
        hasServerRendered: body.includes('type":"server"'),
        bodyPreview: body.substring(0, 500)
      };
    });
    console.log('\n7. Blazor content analysis:', {
      hasBlazorComments: blazorContent.hasBlazorComments,
      hasLoadingText: blazorContent.hasLoadingText,
      hasServerRendered: blazorContent.hasServerRendered,
      bodyPreview: blazorContent.bodyPreview
    });

    // Take a screenshot
    await page.screenshot({ path: `debug-${label.replace(/\s+/g, '-')}.png`, fullPage: true });
    console.log(`\n8. Screenshot saved: debug-${label.replace(/\s+/g, '-')}.png`);

    // Save HTML for inspection
    const fs = await import('fs');
    fs.writeFileSync(`debug-${label.replace(/\s+/g, '-')}.html`, html);
    console.log(`9. HTML saved: debug-${label.replace(/\s+/g, '-')}.html`);

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await browser.close();
  }
}

async function main() {
  // Test both pages
  await debugBlazorPage(
    'https://www.tas-cas.org/en/jurisprudence/recent-decisions.html',
    'Recent Decisions'
  );

  await debugBlazorPage(
    'https://jurisprudence.tas-cas.org/search?q=doping&page=1&size=10',
    'Search Doping'
  );
}

main().catch(console.error);

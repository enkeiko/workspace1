/**
 * Debug script to investigate Naver Place mobile search results data structure
 */

import puppeteer from 'puppeteer';

async function debugSearchResults() {
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set mobile viewport
    await page.setViewport({
      width: 375,
      height: 812,
      isMobile: true,
      hasTouch: true
    });

    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    const url = 'https://m.place.naver.com/restaurant/list?query=태장식당&start=1';
    console.log('Navigating to:', url);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(3000);

    console.log('\n=== INVESTIGATING WINDOW VARIABLES ===\n');

    // Check all window.__ variables
    const windowVariables = await page.evaluate(() => {
      const variables = {};
      for (let key in window) {
        if (key.startsWith('__')) {
          try {
            variables[key] = {
              exists: true,
              type: typeof window[key],
              hasData: window[key] ? Object.keys(window[key]).length : 0
            };
          } catch (e) {
            variables[key] = { exists: true, error: e.message };
          }
        }
      }
      return variables;
    });

    console.log('Window variables found:');
    console.log(JSON.stringify(windowVariables, null, 2));

    // Check specific variables
    console.log('\n=== CHECKING SPECIFIC VARIABLES ===\n');

    // 1. Check __APOLLO_STATE__
    const apolloState = await page.evaluate(() => {
      return window.__APOLLO_STATE__ ? {
        exists: true,
        keys: Object.keys(window.__APOLLO_STATE__),
        sample: window.__APOLLO_STATE__
      } : { exists: false };
    });
    console.log('__APOLLO_STATE__:');
    console.log(JSON.stringify(apolloState, null, 2));

    // 2. Check __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      return window.__NEXT_DATA__ ? {
        exists: true,
        keys: Object.keys(window.__NEXT_DATA__),
        sample: window.__NEXT_DATA__
      } : { exists: false };
    });
    console.log('\n__NEXT_DATA__:');
    console.log(JSON.stringify(nextData, null, 2));

    // 3. Check __INITIAL_STATE__
    const initialState = await page.evaluate(() => {
      return window.__INITIAL_STATE__ ? {
        exists: true,
        keys: Object.keys(window.__INITIAL_STATE__),
        sample: window.__INITIAL_STATE__
      } : { exists: false };
    });
    console.log('\n__INITIAL_STATE__:');
    console.log(JSON.stringify(initialState, null, 2));

    // 4. Check for data in script tags
    console.log('\n=== CHECKING SCRIPT TAGS ===\n');
    const scriptData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const dataScripts = [];

      scripts.forEach((script, index) => {
        const content = script.textContent;
        if (content && (
          content.includes('__APOLLO_STATE__') ||
          content.includes('__NEXT_DATA__') ||
          content.includes('INITIAL_STATE') ||
          content.includes('apolloState') ||
          content.includes('searchResults') ||
          content.includes('places')
        )) {
          dataScripts.push({
            index,
            id: script.id,
            type: script.type,
            contentPreview: content.substring(0, 500)
          });
        }
      });

      return dataScripts;
    });
    console.log('Relevant script tags found:', scriptData.length);
    scriptData.forEach(script => {
      console.log(`\nScript ${script.index}:`);
      console.log('Type:', script.type);
      console.log('ID:', script.id);
      console.log('Preview:', script.contentPreview);
    });

    // 5. Check DOM structure
    console.log('\n=== CHECKING DOM STRUCTURE ===\n');
    const domInfo = await page.evaluate(() => {
      return {
        hasNextRoot: !!document.getElementById('__next'),
        hasAppRoot: !!document.getElementById('app'),
        hasRoot: !!document.getElementById('root'),
        bodyClasses: document.body.className,
        mainElements: Array.from(document.querySelectorAll('main, [role="main"]')).length,
        listElements: Array.from(document.querySelectorAll('[class*="list"], [class*="search"], [class*="result"]')).length
      };
    });
    console.log('DOM structure:', JSON.stringify(domInfo, null, 2));

    // 6. Try to extract visible search results from DOM
    console.log('\n=== EXTRACTING VISIBLE RESULTS FROM DOM ===\n');
    const visibleResults = await page.evaluate(() => {
      const results = [];

      // Try different selectors for place items
      const selectors = [
        'li[data-id]',
        'a[href*="/restaurant/"]',
        '[class*="place"]',
        '[class*="item"]',
        '[class*="card"]'
      ];

      let elements = [];
      for (let selector of selectors) {
        const found = Array.from(document.querySelectorAll(selector));
        if (found.length > 0) {
          console.log(`Found ${found.length} elements with selector: ${selector}`);
          elements = found;
          break;
        }
      }

      elements.slice(0, 3).forEach((el, idx) => {
        results.push({
          index: idx,
          tagName: el.tagName,
          id: el.id,
          dataId: el.getAttribute('data-id'),
          href: el.href || el.getAttribute('href'),
          className: el.className,
          textContent: el.textContent.substring(0, 200)
        });
      });

      return results;
    });
    console.log('Visible results sample:', JSON.stringify(visibleResults, null, 2));

    // 7. Check for API calls in network requests
    console.log('\n=== CHECKING NETWORK REQUESTS ===\n');
    const apiCalls = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api') || url.includes('graphql') || url.includes('search')) {
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('json')) {
            const data = await response.json();
            apiCalls.push({
              url,
              status: response.status(),
              dataSample: JSON.stringify(data).substring(0, 500)
            });
          }
        } catch (e) {
          // Ignore errors
        }
      }
    });

    // Reload page to capture network requests
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('API calls captured:', apiCalls.length);
    apiCalls.forEach(call => {
      console.log('\nAPI Call:');
      console.log('URL:', call.url);
      console.log('Status:', call.status);
      console.log('Data sample:', call.dataSample);
    });

    // 8. Take a screenshot for visual reference
    await page.screenshot({ path: 'debug-search-results.png', fullPage: true });
    console.log('\n=== Screenshot saved as debug-search-results.png ===\n');

    // 9. Try to extract the actual Next.js props
    console.log('\n=== EXTRACTING NEXT.JS PAGE PROPS ===\n');
    const nextProps = await page.evaluate(() => {
      const nextDataScript = document.getElementById('__NEXT_DATA__');
      if (nextDataScript) {
        try {
          const data = JSON.parse(nextDataScript.textContent);
          return {
            found: true,
            keys: Object.keys(data),
            props: data.props ? Object.keys(data.props) : [],
            pageProps: data.props?.pageProps ? Object.keys(data.props.pageProps) : [],
            fullData: data
          };
        } catch (e) {
          return { found: true, error: e.message };
        }
      }
      return { found: false };
    });
    console.log('Next.js page props:', JSON.stringify(nextProps, null, 2));

    console.log('\n=== DEBUG COMPLETE ===\n');

  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    await browser.close();
  }
}

debugSearchResults().catch(console.error);

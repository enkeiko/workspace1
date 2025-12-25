# Quick Start: Fix SearchRankCrawler in 5 Minutes

## The Problem
`SearchRankCrawler` returns empty results because it's looking for wrong keys in Apollo State.

## The Solution
Three simple fixes to `src/modules/crawler/SearchRankCrawler.js`

---

## Fix 1: Update `_parseSearchResults()` Method

**Location**: Lines 147-204

**Replace entire method with**:

```javascript
_parseSearchResults(apolloState) {
  const results = [];

  // Access ROOT_QUERY
  const rootQuery = apolloState.ROOT_QUERY;
  if (!rootQuery) {
    logger.warn('ROOT_QUERY not found in Apollo State');
    return results;
  }

  // Find restaurantList query
  const restaurantListKey = Object.keys(rootQuery).find(key =>
    key.startsWith('restaurantList(')
  );

  if (!restaurantListKey) {
    logger.warn('restaurantList query not found in ROOT_QUERY');
    return results;
  }

  const restaurantListData = rootQuery[restaurantListKey];
  const items = restaurantListData.items || [];

  // Resolve references
  items.forEach((itemRef, index) => {
    const refKey = itemRef.__ref;
    const placeData = apolloState[refKey];

    if (!placeData) {
      logger.debug(`Could not resolve reference: ${refKey}`);
      return;
    }

    results.push({
      placeId: placeData.id,
      name: placeData.name || '',
      category: placeData.category || '',
      rating: placeData.visitorReviewScore || 0,      // FIXED
      reviewCount: parseInt(placeData.visitorReviewCount || '0'),  // FIXED
      address: placeData.roadAddress || placeData.address || '',
      localRank: index + 1
    });
  });

  return results;
}
```

---

## Fix 2: Update `_getTotalResults()` Method

**Location**: Lines 210-219

**Replace entire method with**:

```javascript
_getTotalResults(apolloState) {
  const rootQuery = apolloState.ROOT_QUERY;
  if (!rootQuery) return null;

  const restaurantListKey = Object.keys(rootQuery).find(key =>
    key.startsWith('restaurantList(')
  );

  if (!restaurantListKey) return null;

  const restaurantListData = rootQuery[restaurantListKey];
  return restaurantListData.total || null;
}
```

---

## Fix 3: Add Mobile Setup in `_findRankInternal()`

**Location**: After line 76 (after `await page.setUserAgent(...)`)

**Add these lines**:

```javascript
// Set mobile viewport
await page.setViewport({
  width: 375,
  height: 812,
  isMobile: true,
  hasTouch: true
});

await page.setUserAgent(this.config.userAgent);

// Add language header
await page.setExtraHTTPHeaders({
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
});
```

**And change line 89 from**:
```javascript
await new Promise(r => setTimeout(r, 1000));
```

**To**:
```javascript
await page.waitForTimeout(2000);  // Increased from 1s to 2s
```

---

## Verify the Fix

Run the demo script to test:

```bash
node extract-search-results-demo.js
```

Expected output:
```
=== SUMMARY ===
Total results: 1
Places extracted: 1

First place details:
- ID: 2099518162
- Name: 보미카츠
- Category: 돈가스
```

---

## Alternative: Copy Entire Fixed File

**Instead of manual fixes**, you can:

1. Backup current file:
   ```bash
   cp src/modules/crawler/SearchRankCrawler.js src/modules/crawler/SearchRankCrawler.js.backup
   ```

2. Copy fixed version:
   ```bash
   cp SearchRankCrawler-FIXED.js src/modules/crawler/SearchRankCrawler.js
   ```

3. Test it!

---

## What Changed?

### Before (Wrong):
```javascript
// ❌ Looking for non-existent keys
apolloState['SearchResult:xxx']
apolloState['Place:xxx']

// ❌ Wrong field names
placeData.visitorReviewsScore
placeData.visitorReviewsTotal
```

### After (Correct):
```javascript
// ✅ Correct path
apolloState.ROOT_QUERY['restaurantList(...)']
apolloState['RestaurantListSummary:xxx']

// ✅ Correct field names
placeData.visitorReviewScore
placeData.visitorReviewCount
```

---

## Need More Details?

- **Quick Summary**: Read `SEARCHRANKCRAWLER_FIX_SUMMARY.md`
- **Full Report**: Read `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md`
- **Executive Overview**: Read `INVESTIGATION_SUMMARY.md`
- **Working Example**: Run `extract-search-results-demo.js`

---

## That's It!

Three simple fixes. 5 minutes. Problem solved. ✅

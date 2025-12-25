# SearchRankCrawler Fix Summary

## Quick Reference: What's Wrong and How to Fix It

---

## Problem Overview

The `SearchRankCrawler` returns empty results because it's looking for data in the wrong place within `window.__APOLLO_STATE__`.

---

## The Three Critical Fixes

### Fix #1: Access ROOT_QUERY First

**WRONG (Current Code - Line 151-155)**:
```javascript
// ❌ Looking directly in Apollo State for these keys
const searchResultKeys = Object.keys(apolloState).filter(key =>
  key.startsWith('SearchResult:') ||   // These keys don't exist
  key.startsWith('Query:') ||          // in search results
  key.includes('searchResult')
);
```

**CORRECT**:
```javascript
// ✅ Access ROOT_QUERY first
const rootQuery = apolloState.ROOT_QUERY;
if (!rootQuery) return results;

// ✅ Find the restaurantList query
const restaurantListKey = Object.keys(rootQuery).find(key =>
  key.startsWith('restaurantList(')
);
```

---

### Fix #2: Correct Reference Resolution

**WRONG (Current Code - Line 159-174)**:
```javascript
// ❌ Fallback looks for "Place:" keys
const placeKeys = Object.keys(apolloState).filter(key =>
  key.startsWith('Place:')  // But search results use "RestaurantListSummary:"
);
```

**CORRECT**:
```javascript
// ✅ Get items from the query result
const restaurantListData = rootQuery[restaurantListKey];
const items = restaurantListData.items || [];

// ✅ Resolve each reference
items.forEach((itemRef, index) => {
  const refKey = itemRef.__ref;  // e.g., "RestaurantListSummary:2099518162:2099518162"
  const placeData = apolloState[refKey];  // Get actual data
  // ... process placeData
});
```

---

### Fix #3: Correct Field Names

**WRONG (Current Code - Line 169-170, 196-197)**:
```javascript
// ❌ Wrong field names (extra 's' in Reviews)
rating: placeData.visitorReviewsScore,    // Does not exist
reviewCount: placeData.visitorReviewsTotal  // Does not exist
```

**CORRECT**:
```javascript
// ✅ Correct field names (no 's' in Review)
rating: placeData.visitorReviewScore,     // Correct
reviewCount: placeData.visitorReviewCount   // Correct (and it's a string like "21")
```

---

## Complete Method Replacements

### Replace `_parseSearchResults()` (Lines 147-204)

```javascript
_parseSearchResults(apolloState) {
  const results = [];

  // Get ROOT_QUERY
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

  // Resolve references and extract data
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
      rating: placeData.visitorReviewScore || 0,  // FIXED: Correct field name
      reviewCount: parseInt(placeData.visitorReviewCount || '0'),  // FIXED: Correct field name
      address: placeData.roadAddress || placeData.address || '',
      localRank: index + 1
    });
  });

  return results;
}
```

### Replace `_getTotalResults()` (Lines 210-219)

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

## Additional Improvements

### Update User Agent (Line 22)

**Current**:
```javascript
userAgent: config.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
```

**Better** (more complete):
```javascript
userAgent: config.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
```

### Add Mobile Viewport (After Line 76)

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

### Increase Wait Time (Line 89)

**Current**:
```javascript
await new Promise(r => setTimeout(r, 1000));  // 1 second
```

**Better**:
```javascript
await page.waitForTimeout(2000);  // 2 seconds for Apollo State to populate
```

---

## Visual Comparison: Data Structure

### What the Current Code Expects:
```
window.__APOLLO_STATE__
├── SearchResult:xxx         ← ❌ Doesn't exist
├── Query:xxx               ← ❌ Doesn't exist
└── Place:xxx               ← ❌ Wrong format
```

### What Actually Exists:
```
window.__APOLLO_STATE__
├── ROOT_QUERY                                    ← ✅ Start here!
│   └── "restaurantList({...})": {               ← ✅ Find this
│       ├── items: [
│       │   { __ref: "RestaurantListSummary:123:123" }  ← ✅ References to resolve
│       │   ]
│       └── total: 1
├── RestaurantListSummary:123:123                ← ✅ Actual place data
│   ├── id: "123"
│   ├── name: "보미카츠"
│   ├── visitorReviewScore: null                 ← ✅ Correct field name
│   └── visitorReviewCount: "21"                 ← ✅ Correct field name
└── VisitorImages:xxx
```

---

## Testing the Fix

### Test Script
Use the provided demo script to verify the extraction works:

```bash
node extract-search-results-demo.js
```

Expected output:
```
Total results: 1
Places extracted: 1

First place details:
- ID: 2099518162
- Name: 보미카츠
- Category: 돈가스
- Address: 태장동 773-6
- Rating: N/A
- Review Count: 21
```

---

## Files Reference

1. **Full Investigation Report**: `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md`
2. **Working Demo Script**: `extract-search-results-demo.js`
3. **Fixed Implementation**: `SearchRankCrawler-FIXED.js`
4. **Original File to Update**: `src/modules/crawler/SearchRankCrawler.js`

---

## Summary Checklist

- [ ] Update `_parseSearchResults()` to access `ROOT_QUERY`
- [ ] Update query key search from `SearchResult:` to `restaurantList(`
- [ ] Fix field names: `visitorReviewScore` and `visitorReviewCount`
- [ ] Update `_getTotalResults()` to use correct query structure
- [ ] Add mobile viewport setup
- [ ] Increase wait time to 2 seconds
- [ ] Update user agent string
- [ ] Add Accept-Language header
- [ ] Test with provided demo script

---

## Quick Apply

If you want to apply these fixes immediately:

1. Copy `SearchRankCrawler-FIXED.js` content
2. Replace the content of `src/modules/crawler/SearchRankCrawler.js`
3. Update the import path for utilities if needed
4. Run tests

Or apply the three critical fixes manually using the code snippets above.

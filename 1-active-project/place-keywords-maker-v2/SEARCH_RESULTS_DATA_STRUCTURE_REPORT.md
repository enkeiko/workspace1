# Naver Place Search Results Data Structure Investigation Report

**Date**: 2025-11-21
**URL Pattern**: `https://m.place.naver.com/restaurant/list?query={keyword}&start={start}`
**Test URL**: `https://m.place.naver.com/restaurant/list?query=태장식당&start=1`

---

## Executive Summary

The search results data **IS** available in `window.__APOLLO_STATE__`, but the current `SearchRankCrawler` implementation is looking for the wrong keys and using incorrect parsing logic. This report provides the correct data structure and extraction method.

---

## 1. Available Global Variables

When accessing Naver Place mobile search results, the following `window.__*` variables are available:

```javascript
{
  "__APOLLO_STATE__": {
    "exists": true,
    "type": "object",
    "hasData": 11  // Contains search results and place data
  },
  "__PLACE_STATE__": {
    "exists": true,
    "type": "object",
    "hasData": 4
  },
  "__LOCATION_STATE__": {
    "exists": true,
    "type": "object",
    "hasData": 0
  },
  "__PROFILE_STATE__": {
    "exists": true,
    "type": "object",
    "hasData": 4
  },
  "__ncaptcha_api": {
    "exists": true,
    "type": "object",
    "hasData": 3
  }
}
```

**Key Finding**: `__NEXT_DATA__` and `__INITIAL_STATE__` do NOT exist on search results pages.

---

## 2. Correct Data Structure: `__APOLLO_STATE__`

### 2.1 Apollo State Structure

The `__APOLLO_STATE__` contains:
- `ROOT_QUERY`: The main query results container
- Place data objects keyed by type and ID (e.g., `RestaurantListSummary:2099518162:2099518162`)
- Related objects like visitor images, reviews, panoramas, etc.

### 2.2 Key Object Structure

```javascript
window.__APOLLO_STATE__ = {
  "ROOT_QUERY": {
    "__typename": "Query",
    "restaurantList({\"input\":{...}})": {
      "__typename": "RestaurantListResult",
      "items": [
        { "__ref": "RestaurantListSummary:2099518162:2099518162" }
      ],
      "restaurantCategory": "restaurant",
      "queryString": "pr=place_m_salt&version=2.0.0...",
      "siteSort": "rel.dsc",
      "selectedFilter": { /* filter object */ },
      "total": 1,
      "location": { /* location data */ }
    },
    "adBusinesses({\"input\":{...}})": {
      /* ad businesses data */
    }
  },
  "RestaurantListSummary:2099518162:2099518162": {
    /* actual place data */
  }
}
```

---

## 3. Correct Extraction Method

### 3.1 Step-by-Step Process

1. **Access Apollo State**: `window.__APOLLO_STATE__`
2. **Get ROOT_QUERY**: `apolloState.ROOT_QUERY`
3. **Find restaurantList key**: Look for keys starting with `"restaurantList("`
4. **Extract items array**: Get `restaurantListData.items`
5. **Resolve references**: Each item is `{ "__ref": "RestaurantListSummary:ID:ID" }`
6. **Get place data**: Use the `__ref` value as key to get actual data from Apollo State

### 3.2 Sample Code

```javascript
const searchResults = await page.evaluate(() => {
  if (!window.__APOLLO_STATE__) {
    return { error: '__APOLLO_STATE__ not found' };
  }

  const apolloState = window.__APOLLO_STATE__;
  const rootQuery = apolloState.ROOT_QUERY;

  if (!rootQuery) {
    return { error: 'ROOT_QUERY not found' };
  }

  // Find the restaurantList query
  const restaurantListKey = Object.keys(rootQuery).find(key =>
    key.startsWith('restaurantList(')
  );

  if (!restaurantListKey) {
    return { error: 'restaurantList query not found' };
  }

  const restaurantListData = rootQuery[restaurantListKey];
  const items = restaurantListData.items || [];

  // Extract place data
  const places = items.map(itemRef => {
    const refKey = itemRef.__ref;
    const placeData = apolloState[refKey];

    if (!placeData) return null;

    return {
      placeId: placeData.id,
      name: placeData.name,
      category: placeData.category,
      // ... extract other fields
    };
  }).filter(place => place !== null);

  return {
    success: true,
    total: restaurantListData.total,
    places: places
  };
});
```

---

## 4. Complete Place Data Schema

### 4.1 Core Fields

```javascript
{
  // Identity
  "placeId": "2099518162",                    // The unique place ID
  "apolloCacheId": "2099518162",
  "id": "2099518162",
  "dbType": "drt",
  "__typename": "RestaurantListSummary",

  // Basic Info
  "name": "보미카츠",
  "category": "돈가스",
  "businessCategory": "restaurant",
  "description": null,

  // Address Information
  "address": "태장동 773-6",                  // Old address
  "roadAddress": "현충로 17 1층",             // Road address
  "fullAddress": "강원특별자치도 원주시...",   // Complete address
  "sigudongAddress": "원주시 태장동",         // City/District
  "commonAddress": "원주 태장동",             // Common address

  // Location
  "x": "127.9547258",                        // Longitude
  "y": "37.3573879",                         // Latitude
  "distance": "89km",                        // Distance from search center

  // Contact
  "phone": null,                             // Main phone (may be null)
  "virtualPhone": "0507-1434-4867",         // Virtual phone number

  // Images
  "imageUrl": "https://ldb-phinf.pstatic.net/...",  // Main image
  "imageCount": 2,                                   // Total image count
  "imageUrls": [                                     // All images array
    "https://ldb-phinf.pstatic.net/...",
    "https://ldb-phinf.pstatic.net/..."
  ],
  "visitorImages": [                                 // Visitor uploaded images
    { "__ref": "VisitorImages:id" }
  ],

  // Reviews and Ratings
  "visitorReviewScore": null,                // Rating score (can be null)
  "visitorReviewCount": "21",                // Visitor review count
  "blogCafeReviewCount": "5",                // Blog/Cafe review count
  "bookingReviewCount": "0",                 // Booking review count
  "totalReviewCount": "5",                   // Total review count
  "visitorReviews": [                        // Preview of visitor reviews
    { "__ref": "VisitorReviews:id" }
  ],
  "microReview": null,

  // Business Features
  "hasBooking": null,                        // Has booking system
  "hasNPay": false,                          // Naver Pay available
  "newOpening": true,                        // Recently opened
  "hasWheelchairEntrance": true,             // Wheelchair accessible
  "options": "포장,유아의자,무선 인터넷...",   // Comma-separated features

  // Business Hours
  "businessHours": null,                     // Old format (deprecated)
  "newBusinessHours": {
    "__typename": "NewBusinessHours",
    "status": "영업 중",                      // Current status
    "description": "19:30에 라스트오더"      // Additional info
  },

  // Pricing and Popularity
  "priceCategory": "2만원 대",               // Price range
  "saveCount": "~100",                       // Save/bookmark count

  // Category Information
  "categoryCodeList": [                      // Category codes
    "220036", "220038", "220082", "220812"
  ],
  "detailCid": {
    "__typename": "DetailCid",
    "c0": "220036/220038/220082/220812",
    "c1": "1004760/1004380/1002043",
    "c2": "1004760/1006737",
    "c3": null
  },

  // URLs
  "bookingUrl": null,                        // Booking page URL
  "talktalkUrl": null,                       // Talktalk URL
  "routeUrl": "https://m.search.naver.com...", // Route finding URL
  "bookingHubUrl": null,

  // Promotions
  "promotionTitle": null,
  "coupon": null,

  // Special Features
  "streetPanorama": {                        // Street view panorama
    "__ref": "Panorama:aqMgo/eHsS0T/cGu9JF9wA=="
  },
  "broadcastInfo": null,                     // TV broadcast info
  "michelinGuide": null,                     // Michelin guide info
  "broadcasts": null,

  // Delivery Services
  "naverOrder": {
    "__typename": "NaverOrder",
    "items": [],
    "isDelivery": false,
    "isTableOrder": false,
    "isPreOrder": false,
    "isPickup": false
  },
  "baemin": null,                            // Baemin delivery info
  "yogiyo": null,                            // Yogiyo delivery info
  "deliveryArea": null,
  "isCvsDelivery": false,

  // Additional
  "agencyId": null,
  "bookingBusinessId": null,
  "bookingDisplayName": "방문자 리뷰",
  "bookingVisitId": null,
  "bookingPickupId": null,
  "popularMenuImages": null,
  "foryouLabel": null,
  "foryouTasteType": null,
  "naverBookingCategory": null,
  "tvcastId": null,
  "uniqueBroadcasts": null,
  "realTimeBookingInfo": null,
  "posInfo": {
    "__typename": "POSInfo",
    "isPOS": false,
    "items": []
  }
}
```

---

## 5. Search Results Metadata

```javascript
{
  "query": "pr=place_m_salt&version=2.0.0&st=poi...",  // Full query string
  "total": 1,                                          // Total result count
  "restaurantCategory": "restaurant",                  // Category type
  "siteSort": "rel.dsc",                              // Sort order
  "selectedFilter": {                                  // Active filters
    "__typename": "SelectedFilter",
    "filterOpening": true,                             // Only open places
    "keywordFilter": "filterOpening^true",
    // ... other filter options
  },
  "location": {                                        // Search location
    "__typename": "RestaurantLocation",
    "sasX": null,
    "sasY": null
  }
}
```

---

## 6. Problems with Current Implementation

### 6.1 SearchRankCrawler Issues (Lines 147-204)

**Problem 1**: Looking for wrong keys
```javascript
// WRONG - These keys don't exist in search results
const searchResultKeys = Object.keys(apolloState).filter(key =>
  key.startsWith('SearchResult:') ||    // ❌ Wrong
  key.startsWith('Query:') ||           // ❌ Wrong
  key.includes('searchResult')          // ❌ Wrong
);
```

**Correct approach**:
```javascript
// CORRECT - Look in ROOT_QUERY
const rootQuery = apolloState.ROOT_QUERY;
const restaurantListKey = Object.keys(rootQuery).find(key =>
  key.startsWith('restaurantList(')     // ✅ Correct
);
```

**Problem 2**: Fallback to Place: keys
```javascript
// This fallback won't work because search results use:
// "RestaurantListSummary:ID:ID" format, not "Place:ID"
const placeKeys = Object.keys(apolloState).filter(key =>
  key.startsWith('Place:')               // ❌ Wrong format
);
```

**Problem 3**: Wrong field names
```javascript
// Current code uses:
rating: placeData.visitorReviewsScore    // ❌ Wrong field name
reviewCount: placeData.visitorReviewsTotal  // ❌ Wrong field name

// Should be:
rating: placeData.visitorReviewScore     // ✅ No 's' in Reviews
reviewCount: placeData.visitorReviewCount  // ✅ Different field name
```

### 6.2 Why It Returns Empty Results

1. The code looks for `SearchResult:` keys that don't exist
2. Fallback looks for `Place:` keys, but search results use `RestaurantListSummary:` format
3. Even if it found the keys, field names are incorrect
4. The `items` array extraction logic doesn't account for the nested query structure in `ROOT_QUERY`

---

## 7. Correct Implementation Example

See the working implementation in:
- `C:\Users\Nk Ko\Documents\workspace\2-projects\place-keywords-maker-v2\extract-search-results-demo.js`

Key points:
1. Access `window.__APOLLO_STATE__.ROOT_QUERY`
2. Find key starting with `"restaurantList("`
3. Get `items` array from that query result
4. Resolve `__ref` references to get actual place data
5. Use correct field names: `visitorReviewScore`, `visitorReviewCount`, etc.

---

## 8. Test Results

**Test URL**: `https://m.place.naver.com/restaurant/list?query=태장식당&start=1`

**Results**:
- Total results: 1
- Places extracted: 1
- Place ID: 2099518162
- Place Name: 보미카츠
- Category: 돈가스
- Address: 태장동 773-6
- Visitor Review Count: 21
- Rating: null (no rating score yet)
- New Opening: true

---

## 9. Recommended Fixes for SearchRankCrawler

### Fix 1: Update `_parseSearchResults` method (lines 147-204)

Replace the entire method with:

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

  // Extract place data by resolving references
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
      rating: placeData.visitorReviewScore || 0,  // Correct field name
      reviewCount: parseInt(placeData.visitorReviewCount || '0'),  // Correct field name
      address: placeData.roadAddress || placeData.address || '',
      localRank: index + 1
    });
  });

  return results;
}
```

### Fix 2: Update `_getTotalResults` method (lines 210-219)

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

## 10. Additional Findings

### 10.1 Pagination
- The `start` parameter in the URL controls pagination
- `start=1` for first page, `start=10` for second page (assuming 9 results per page)
- The actual results per page may vary (typically 9-15)

### 10.2 Mobile User Agent Required
The mobile user agent is important:
```javascript
'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
```

### 10.3 Wait Time
A 2-3 second wait after page load is recommended to ensure Apollo State is fully populated.

### 10.4 Alternative Data Sources
- `__PLACE_STATE__` exists but has limited data (4 keys)
- Network API calls could be an alternative, but Apollo State is more reliable

---

## 11. Conclusion

The data structure investigation revealed that:

1. ✅ **Apollo State exists and contains all search results**
2. ✅ **The data structure is well-organized and comprehensive**
3. ❌ **Current SearchRankCrawler is looking in the wrong place**
4. ✅ **Correct extraction method has been identified and tested**
5. ✅ **Complete field mappings documented**

**Next Steps**:
1. Update `SearchRankCrawler._parseSearchResults()` method
2. Update `SearchRankCrawler._getTotalResults()` method
3. Add unit tests with mock Apollo State data
4. Test with various keywords and pagination scenarios

---

## Appendix A: Full Apollo State Example

See `debug-search-results.js` output for complete Apollo State structure.

## Appendix B: Working Demo Script

Location: `extract-search-results-demo.js`

Run with: `node extract-search-results-demo.js`

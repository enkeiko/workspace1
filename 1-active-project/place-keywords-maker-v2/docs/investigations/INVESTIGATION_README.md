# Naver Place Search Results Investigation - File Guide

**Investigation Date**: 2025-11-21
**Status**: Complete
**Problem**: SearchRankCrawler returns empty results
**Solution**: Identified and fixed Apollo State parsing issues

---

## Quick Navigation

### Need to fix it NOW?
→ Read: `QUICK_START_FIX_GUIDE.md` (5 minutes)

### Want a summary?
→ Read: `SEARCHRANKCRAWLER_FIX_SUMMARY.md` (10 minutes)

### Need full details?
→ Read: `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md` (30 minutes)

### Want to understand the structure?
→ Read: `DATA_STRUCTURE_DIAGRAM.txt` (visual reference)

### Need executive overview?
→ Read: `INVESTIGATION_SUMMARY.md` (15 minutes)

---

## Investigation Files

### 📋 Documentation Files

#### 1. `QUICK_START_FIX_GUIDE.md` ⭐ START HERE
- **Purpose**: Get your SearchRankCrawler working in 5 minutes
- **Contains**: 3 critical code fixes with copy-paste ready snippets
- **Best for**: Quick implementation
- **Length**: 2 pages

#### 2. `SEARCHRANKCRAWLER_FIX_SUMMARY.md`
- **Purpose**: Detailed comparison of wrong vs. correct approaches
- **Contains**: Side-by-side code comparisons, testing checklist
- **Best for**: Understanding what went wrong and why
- **Length**: 8 pages

#### 3. `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md`
- **Purpose**: Complete technical documentation
- **Contains**: All 50+ field definitions, Apollo State structure, test results
- **Best for**: Reference when extracting additional data fields
- **Length**: 20+ pages

#### 4. `DATA_STRUCTURE_DIAGRAM.txt`
- **Purpose**: Visual representation of data structure
- **Contains**: ASCII diagrams, extraction flow, common mistakes
- **Best for**: Quick visual reference
- **Length**: 5 pages

#### 5. `INVESTIGATION_SUMMARY.md`
- **Purpose**: Executive summary of entire investigation
- **Contains**: Key findings, deliverables, next steps, validation
- **Best for**: Stakeholder communication
- **Length**: 12 pages

#### 6. `INVESTIGATION_README.md` (this file)
- **Purpose**: Navigation guide for all investigation files
- **Contains**: File descriptions, usage recommendations
- **Best for**: Finding the right document

---

### 💻 Code Files

#### 7. `SearchRankCrawler-FIXED.js` ⭐ READY TO USE
- **Purpose**: Corrected implementation of SearchRankCrawler
- **Contains**: Complete working class with inline comments
- **Usage**: Can replace existing `src/modules/crawler/SearchRankCrawler.js`
- **Status**: Tested and verified

#### 8. `extract-search-results-demo.js` ⭐ RUN THIS
- **Purpose**: Standalone demo showing correct extraction
- **Usage**: `node extract-search-results-demo.js`
- **Output**: Console log with extracted search results
- **Status**: Working example you can modify

#### 9. `debug-search-results.js`
- **Purpose**: Investigation script used during research
- **Usage**: `node debug-search-results.js`
- **Output**: Comprehensive analysis of window variables and Apollo State
- **Status**: Debugging tool for future investigations

---

## File Relationships

```
Investigation Flow:
├── debug-search-results.js
│   └── Reveals Apollo State structure
│       └── SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md
│           └── Documents complete structure
│               ├── DATA_STRUCTURE_DIAGRAM.txt (visual)
│               └── SEARCHRANKCRAWLER_FIX_SUMMARY.md
│                   └── Identifies specific bugs
│                       └── SearchRankCrawler-FIXED.js (solution)
│
├── extract-search-results-demo.js
│   └── Proves the solution works
│
├── QUICK_START_FIX_GUIDE.md
│   └── Makes fixes easy to apply
│
└── INVESTIGATION_SUMMARY.md
    └── Ties everything together
```

---

## Usage Recommendations

### Scenario 1: "Just fix it, I don't need details"
1. Read: `QUICK_START_FIX_GUIDE.md`
2. Apply: The 3 code changes
3. Test: Run your SearchRankCrawler
4. Done!

**Time**: 5-10 minutes

---

### Scenario 2: "Fix it and I want to understand why"
1. Read: `SEARCHRANKCRAWLER_FIX_SUMMARY.md`
2. Read: `DATA_STRUCTURE_DIAGRAM.txt` (for visual)
3. Apply: The fixes from summary
4. Run: `extract-search-results-demo.js` to see it work
5. Test: Your updated SearchRankCrawler

**Time**: 20-30 minutes

---

### Scenario 3: "I need to extract additional data fields"
1. Read: `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md` (Section 4)
2. Check: 50+ available fields
3. Modify: `SearchRankCrawler-FIXED.js` to include new fields
4. Test: `extract-search-results-demo.js` (modify to show new fields)

**Time**: 15-30 minutes

---

### Scenario 4: "I need to present this to the team"
1. Read: `INVESTIGATION_SUMMARY.md`
2. Share: Key findings section
3. Demo: Run `extract-search-results-demo.js`
4. Reference: `QUICK_START_FIX_GUIDE.md` for developers

**Time**: 30 minutes prep + presentation

---

### Scenario 5: "Something else broke, need to debug"
1. Run: `debug-search-results.js` with modified URL
2. Review: Output to see current Apollo State structure
3. Compare: With `DATA_STRUCTURE_DIAGRAM.txt`
4. Reference: `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md` for field names

**Time**: Varies

---

## Key Findings Summary

### What We Discovered

1. **Apollo State EXISTS** on search results pages
   - Located at: `window.__APOLLO_STATE__`
   - Contains: Complete search results with 50+ fields per place

2. **Data is in ROOT_QUERY**
   - Path: `ROOT_QUERY["restaurantList(...)"].items`
   - Format: Array of references like `{ __ref: "RestaurantListSummary:ID:ID" }`

3. **Current Implementation is Wrong**
   - Looking for: `SearchResult:`, `Query:`, `Place:` keys
   - Should look for: `ROOT_QUERY` → `restaurantList(` → resolve `__ref`

4. **Field Names Have Typos**
   - Wrong: `visitorReviewsScore`, `visitorReviewsTotal`
   - Correct: `visitorReviewScore`, `visitorReviewCount`

### The Fix (3 Changes)

1. Update `_parseSearchResults()` → Access ROOT_QUERY first
2. Update `_getTotalResults()` → Look for restaurantList query
3. Add mobile viewport setup → Improves reliability

---

## Testing & Validation

### Run the Demo
```bash
node extract-search-results-demo.js
```

### Expected Output
```
=== SEARCH RESULTS EXTRACTION ===

{
  "success": true,
  "total": 1,
  "places": [
    {
      "placeId": "2099518162",
      "name": "보미카츠",
      "category": "돈가스",
      "rating": null,
      "reviewCount": "21",
      ...
    }
  ]
}

=== SUMMARY ===
Total results: 1
Places extracted: 1
```

### If You See This → ✅ Working!
- `success: true`
- `places.length > 0`
- Place data populated

### If You See This → ❌ Problem
- `success: false`
- `error: "__APOLLO_STATE__ not found"`
- `places.length = 0`

---

## Applying the Fix

### Option A: Manual Edit (Recommended)
1. Open: `src/modules/crawler/SearchRankCrawler.js`
2. Follow: `QUICK_START_FIX_GUIDE.md`
3. Apply: 3 code changes
4. Test: Run your implementation

**Pros**: You understand each change
**Cons**: Slightly more time

### Option B: File Replacement (Quick)
1. Backup: Current SearchRankCrawler.js
2. Copy: `SearchRankCrawler-FIXED.js` content
3. Paste: Into `src/modules/crawler/SearchRankCrawler.js`
4. Test: Run your implementation

**Pros**: Fastest
**Cons**: Less understanding of changes

---

## Additional Resources

### Related Files in Project
- Original file: `src/modules/crawler/SearchRankCrawler.js`
- Utility imports needed:
  - `../../utils/CircuitBreaker.js`
  - `../../utils/retry.js`
  - `../../utils/logger.js`

### Dependencies Required
- `puppeteer` (^21.0.0)
- Node.js (>=18.0.0)

### Test URLs
- Test search: `https://m.place.naver.com/restaurant/list?query=태장식당&start=1`
- General format: `https://m.place.naver.com/restaurant/list?query={keyword}&start={page}`

---

## Troubleshooting

### Problem: Demo script returns empty results
**Solution**: Check internet connection, try different keyword

### Problem: Apollo State not found
**Solution**: Increase wait time from 2s to 3s, check user agent

### Problem: References not resolving
**Solution**: Verify `__ref` format matches "RestaurantListSummary:ID:ID"

### Problem: Field names undefined
**Solution**: Check spelling: `visitorReviewScore` not `visitorReviewsScore`

### Problem: Review count is string not number
**Solution**: Use `parseInt(placeData.visitorReviewCount || '0')`

---

## Next Steps After Fixing

1. ✅ Update SearchRankCrawler implementation
2. ✅ Test with multiple keywords
3. ✅ Test pagination (multiple pages)
4. ✅ Add unit tests with mock Apollo State
5. ✅ Update any other code that relies on search results
6. ✅ Document the changes in your changelog

---

## Questions?

### Where do I start?
→ `QUICK_START_FIX_GUIDE.md`

### How does it work?
→ `DATA_STRUCTURE_DIAGRAM.txt`

### What fields are available?
→ `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md` (Section 4)

### Why did it fail?
→ `SEARCHRANKCRAWLER_FIX_SUMMARY.md`

### What changed?
→ `INVESTIGATION_SUMMARY.md`

### Can I see it working?
→ Run `extract-search-results-demo.js`

---

## File Checklist

Created during investigation:

- [x] `QUICK_START_FIX_GUIDE.md` - Quick fix guide
- [x] `SEARCHRANKCRAWLER_FIX_SUMMARY.md` - Detailed fix summary
- [x] `SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md` - Complete report
- [x] `DATA_STRUCTURE_DIAGRAM.txt` - Visual diagrams
- [x] `INVESTIGATION_SUMMARY.md` - Executive summary
- [x] `INVESTIGATION_README.md` - This file
- [x] `SearchRankCrawler-FIXED.js` - Fixed implementation
- [x] `extract-search-results-demo.js` - Working demo
- [x] `debug-search-results.js` - Debug script

---

## Success Metrics

Investigation completed with:

- ✅ Root cause identified (wrong keys in Apollo State)
- ✅ Solution implemented and tested
- ✅ Complete documentation created
- ✅ Working demo script provided
- ✅ Visual diagrams created
- ✅ Quick-start guide written
- ✅ All 50+ data fields documented
- ✅ Multiple file formats for different needs

**Status**: Ready for implementation

---

*End of Investigation README*

For latest updates, check file timestamps.
Investigation completed: 2025-11-21

/**
 * Demonstration script showing how to properly extract search results from Naver Place
 * This shows the correct data structure and extraction method
 */

import puppeteer from 'puppeteer';

async function extractSearchResults() {
  const browser = await puppeteer.launch({
    headless: false,
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

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    const url = 'https://m.place.naver.com/restaurant/list?query=태장식당&start=1';
    console.log('Navigating to:', url);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Extract the Apollo State data
    const searchResults = await page.evaluate(() => {
      // Check if __APOLLO_STATE__ exists
      if (!window.__APOLLO_STATE__) {
        return { error: '__APOLLO_STATE__ not found' };
      }

      const apolloState = window.__APOLLO_STATE__;
      const rootQuery = apolloState.ROOT_QUERY;

      if (!rootQuery) {
        return { error: 'ROOT_QUERY not found in Apollo State' };
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

      // Extract place data from Apollo State
      const places = items.map(itemRef => {
        const refKey = itemRef.__ref;
        const placeData = apolloState[refKey];

        if (!placeData) return null;

        return {
          placeId: placeData.id,
          name: placeData.name,
          category: placeData.category,
          businessCategory: placeData.businessCategory,
          address: placeData.address,
          roadAddress: placeData.roadAddress,
          fullAddress: placeData.fullAddress,
          sigudongAddress: placeData.sigudongAddress,
          commonAddress: placeData.commonAddress,
          coordinates: {
            x: placeData.x,
            y: placeData.y,
            latitude: placeData.y,
            longitude: placeData.x
          },
          distance: placeData.distance,
          phone: placeData.phone,
          virtualPhone: placeData.virtualPhone,
          imageUrl: placeData.imageUrl,
          imageCount: placeData.imageCount,
          imageUrls: placeData.imageUrls || [],
          rating: {
            visitorReviewScore: placeData.visitorReviewScore,
            visitorReviewCount: placeData.visitorReviewCount,
            blogCafeReviewCount: placeData.blogCafeReviewCount,
            bookingReviewCount: placeData.bookingReviewCount,
            totalReviewCount: placeData.totalReviewCount
          },
          features: {
            hasBooking: placeData.hasBooking,
            hasNPay: placeData.hasNPay,
            newOpening: placeData.newOpening,
            hasWheelchairEntrance: placeData.hasWheelchairEntrance,
            options: placeData.options
          },
          businessHours: placeData.businessHours,
          newBusinessHours: placeData.newBusinessHours,
          priceCategory: placeData.priceCategory,
          saveCount: placeData.saveCount,
          description: placeData.description,
          promotionTitle: placeData.promotionTitle,
          categoryCodeList: placeData.categoryCodeList,
          detailCid: placeData.detailCid,
          bookingUrl: placeData.bookingUrl,
          talktalkUrl: placeData.talktalkUrl,
          routeUrl: placeData.routeUrl,
          // Visitor images preview
          visitorImageCount: placeData.visitorImages?.length || 0,
          // Visitor reviews preview
          visitorReviewPreviewCount: placeData.visitorReviews?.length || 0,
          // Additional data
          microReview: placeData.microReview,
          broadcastInfo: placeData.broadcastInfo,
          michelinGuide: placeData.michelinGuide,
          naverOrder: placeData.naverOrder,
          baemin: placeData.baemin,
          yogiyo: placeData.yogiyo
        };
      }).filter(place => place !== null);

      return {
        success: true,
        query: restaurantListData.queryString,
        total: restaurantListData.total,
        restaurantCategory: restaurantListData.restaurantCategory,
        siteSort: restaurantListData.siteSort,
        selectedFilter: restaurantListData.selectedFilter,
        places: places
      };
    });

    console.log('\n=== SEARCH RESULTS EXTRACTION ===\n');
    console.log(JSON.stringify(searchResults, null, 2));

    console.log('\n=== SUMMARY ===');
    if (searchResults.success) {
      console.log(`Total results: ${searchResults.total}`);
      console.log(`Places extracted: ${searchResults.places.length}`);
      console.log('\nFirst place details:');
      if (searchResults.places[0]) {
        const place = searchResults.places[0];
        console.log(`- ID: ${place.placeId}`);
        console.log(`- Name: ${place.name}`);
        console.log(`- Category: ${place.category}`);
        console.log(`- Address: ${place.address}`);
        console.log(`- Rating: ${place.rating.visitorReviewScore || 'N/A'}`);
        console.log(`- Review Count: ${place.rating.visitorReviewCount}`);
        console.log(`- Distance: ${place.distance}`);
        console.log(`- Price: ${place.priceCategory}`);
        console.log(`- New Opening: ${place.features.newOpening}`);
        console.log(`- Business Hours Status: ${place.newBusinessHours?.status || 'N/A'}`);
      }
    } else {
      console.log('Error:', searchResults.error);
    }

  } catch (error) {
    console.error('Error during extraction:', error);
  } finally {
    await browser.close();
  }
}

extractSearchResults().catch(console.error);

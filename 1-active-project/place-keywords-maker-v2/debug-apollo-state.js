/**
 * Apollo State 구조 디버깅 스크립트
 */

import puppeteer from 'puppeteer';

const placeId = '1575722042';

async function debugApolloState() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // 모바일 URL 사용 (Apollo State 있음)
  const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
  console.log(`Loading: ${url}\n`);

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // 여러 데이터 소스 확인
  const dataInfo = await page.evaluate(() => {
    return {
      hasApolloState: !!window.__APOLLO_STATE__,
      hasNextData: !!window.__NEXT_DATA__,
      hasInitialState: !!window.__INITIAL_STATE__,
      apolloKeys: window.__APOLLO_STATE__ ? Object.keys(window.__APOLLO_STATE__).length : 0,
      nextDataProps: window.__NEXT_DATA__?.props ? Object.keys(window.__NEXT_DATA__.props) : [],
    };
  });

  console.log('=== Data Sources ===');
  console.log(JSON.stringify(dataInfo, null, 2));

  // __NEXT_DATA__ 확인
  if (dataInfo.hasNextData) {
    const nextData = await page.evaluate(() => {
      const data = window.__NEXT_DATA__;
      return {
        page: data.page,
        buildId: data.buildId,
        propsKeys: data.props ? Object.keys(data.props) : [],
        pagePropsKeys: data.props?.pageProps ? Object.keys(data.props.pageProps) : [],
        initialStateKeys: data.props?.pageProps?.initialState ? Object.keys(data.props.pageProps.initialState) : [],
      };
    });
    console.log('\n=== __NEXT_DATA__ Structure ===');
    console.log(JSON.stringify(nextData, null, 2));

    // initialState에서 Apollo 캐시 찾기
    const apolloCache = await page.evaluate(() => {
      const state = window.__NEXT_DATA__?.props?.pageProps?.initialState;
      if (!state) return null;

      // Apollo 캐시 찾기
      const apolloKey = Object.keys(state).find(k => k.includes('apollo') || k === 'ROOT_QUERY');
      if (apolloKey) return { key: apolloKey, sample: state[apolloKey] };

      // 첫 번째 큰 객체 반환
      for (const key of Object.keys(state)) {
        if (typeof state[key] === 'object' && Object.keys(state[key]).length > 10) {
          return { key, keysCount: Object.keys(state[key]).length, sampleKeys: Object.keys(state[key]).slice(0, 20) };
        }
      }
      return state;
    });
    console.log('\n=== Apollo Cache in __NEXT_DATA__ ===');
    console.log(JSON.stringify(apolloCache, null, 2));
  }

  // Apollo State 전체 키 목록 확인
  const apolloKeys = await page.evaluate(() => {
    // __NEXT_DATA__에서 Apollo State 찾기
    let state = window.__APOLLO_STATE__;
    if (!state && window.__NEXT_DATA__?.props?.pageProps?.initialState) {
      state = window.__NEXT_DATA__.props.pageProps.initialState;
    }
    if (!state) return { error: 'No Apollo State found' };
    return Object.keys(state);
  });

  console.log('=== Apollo State Keys ===\n');

  if (apolloKeys.error) {
    console.log('Error:', apolloKeys.error);
    await browser.close();
    return;
  }

  // 키 분류
  const keyGroups = {
    PlaceDetailBase: [],
    Place: [],
    Menu: [],
    Review: [],
    Image: [],
    Keyword: [],
    BusinessHours: [],
    ROOT_QUERY: [],
    Other: [],
  };

  apolloKeys.forEach(key => {
    if (key.startsWith('PlaceDetailBase:')) keyGroups.PlaceDetailBase.push(key);
    else if (key.startsWith('Place:')) keyGroups.Place.push(key);
    else if (key.includes('Menu')) keyGroups.Menu.push(key);
    else if (key.includes('Review') || key.includes('review')) keyGroups.Review.push(key);
    else if (key.includes('Image') || key.includes('Photo')) keyGroups.Image.push(key);
    else if (key.includes('Keyword') || key.includes('keyword')) keyGroups.Keyword.push(key);
    else if (key.includes('Business') || key.includes('Hour')) keyGroups.BusinessHours.push(key);
    else if (key === 'ROOT_QUERY') keyGroups.ROOT_QUERY.push(key);
    else keyGroups.Other.push(key);
  });

  Object.entries(keyGroups).forEach(([group, keys]) => {
    if (keys.length > 0) {
      console.log(`\n[${group}] (${keys.length})`);
      keys.slice(0, 10).forEach(k => console.log(`  - ${k}`));
      if (keys.length > 10) console.log(`  ... and ${keys.length - 10} more`);
    }
  });

  // PlaceDetailBase 데이터 확인
  const placeData = await page.evaluate((pid) => {
    const state = window.__APOLLO_STATE__;
    const keys = Object.keys(state).filter(k => k.includes(pid));
    const result = {};
    keys.forEach(k => {
      result[k] = state[k];
    });
    return result;
  }, placeId);

  console.log('\n\n=== Place Data for', placeId, '===\n');

  Object.entries(placeData).forEach(([key, value]) => {
    console.log(`\n[${key}]`);
    if (typeof value === 'object') {
      const fields = Object.keys(value);
      console.log(`Fields: ${fields.join(', ')}`);

      // 중요 필드 값 출력
      const importantFields = ['name', 'category', 'virtualPhone', 'phone', 'roadAddress',
        'categoryCodeList', 'gdid', 'businessHours', 'breakTime', 'lastOrder'];
      importantFields.forEach(f => {
        if (value[f] !== undefined) {
          console.log(`  ${f}: ${JSON.stringify(value[f])}`);
        }
      });
    }
  });

  // 리뷰 관련 키 확인
  const reviewKeys = apolloKeys.filter(k =>
    k.includes('Review') || k.includes('review') || k.includes('visitor')
  );

  console.log('\n\n=== Review Related Keys ===\n');
  for (const key of reviewKeys.slice(0, 5)) {
    const data = await page.evaluate((k) => window.__APOLLO_STATE__[k], key);
    console.log(`\n[${key}]`);
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  }

  // 키워드 관련 키 확인
  const keywordKeys = apolloKeys.filter(k =>
    k.includes('Keyword') || k.includes('keyword') || k.includes('Voted')
  );

  console.log('\n\n=== Keyword Related Keys ===\n');
  for (const key of keywordKeys.slice(0, 5)) {
    const data = await page.evaluate((k) => window.__APOLLO_STATE__[k], key);
    console.log(`\n[${key}]`);
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  }

  await browser.close();
  console.log('\n\nDone!');
}

debugApolloState().catch(console.error);

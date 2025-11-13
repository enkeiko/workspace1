const fs = require('fs');

/**
 * 🔥 최종 완벽 파서
 *
 * Apollo State에서 모든 정보를 완벽하게 추출합니다
 */

function parseUltimate(apolloFilePath, placeId) {
  console.log('\n🔥 완벽 파싱 시작...\n');

  const apolloState = JSON.parse(fs.readFileSync(apolloFilePath, 'utf-8'));

  const placeKey = `PlaceDetailBase:${placeId}`;
  const placeDetail = apolloState[placeKey];

  if (!placeDetail) {
    throw new Error('플레이스 정보를 찾을 수 없습니다.');
  }

  // ========== 기본 정보 ==========
  console.log('📋 기본 정보 추출 중...');
  const basicInfo = {
    id: placeDetail.id,
    name: placeDetail.name,
    category: placeDetail.category,
    roadAddress: placeDetail.roadAddress,
    address: placeDetail.address,
    phone: placeDetail.phone || (placeDetail.hasMobilePhoneNumber ? '스마트콜 사용' : '전화번호 없음'),
    virtualPhone: placeDetail.virtualPhone,
    talktalkUrl: placeDetail.talktalkUrl,
    coordinate: {
      lat: placeDetail.coordinate?.y,
      lng: placeDetail.coordinate?.x
    }
  };

  // ========== 메뉴 수집 (이미지 포함) ==========
  console.log('🍴 메뉴 정보 수집 중...');
  const menus = [];
  Object.keys(apolloState).forEach(key => {
    if (key.startsWith(`Menu:${placeId}_`)) {
      const menu = apolloState[key];
      menus.push({
        name: menu.name,
        price: menu.price,
        priceFormatted: menu.price ? `${Number(menu.price).toLocaleString()}원` : null,
        description: menu.description || '',
        recommend: menu.recommend || false,
        images: menu.images || []
      });
    }
  });
  console.log(`  ✓ ${menus.length}개 메뉴 수집`);

  // 메뉴 요약
  const menuSummary = {
    total: menus.length,
    recommended: menus.filter(m => m.recommend).length,
    priceRange: menus.length > 0 ? {
      min: Math.min(...menus.filter(m => m.price).map(m => Number(m.price))),
      max: Math.max(...menus.filter(m => m.price).map(m => Number(m.price)))
    } : null,
    list: menus
  };

  // ========== 리뷰 통계 ==========
  console.log('📊 리뷰 통계 수집 중...');
  const reviewStats = {
    total: placeDetail.visitorReviewsTotal || 0,
    textTotal: placeDetail.visitorReviewsTextReviewTotal || 0,
    score: placeDetail.visitorReviewsScore || 0,
    microReviews: placeDetail.microReviews || []
  };

  // ========== 블로그 리뷰 수집 ==========
  console.log('💬 블로그 리뷰 수집 중...');
  const blogReviews = [];
  Object.keys(apolloState).forEach(key => {
    const obj = apolloState[key];

    // 다양한 리뷰 타입 체크
    if (obj && obj.contents && typeof obj.contents === 'string' && obj.contents.length > 50) {
      blogReviews.push({
        id: obj.id || key,
        title: obj.title || '',
        contents: obj.contents,
        author: obj.author || obj.blogger || obj.home || '',
        date: obj.date || obj.visitDate || obj.createDate || '',
        url: obj.url || obj.blogUrl || '',
        images: obj.images || obj.thumbnails || [],
        tags: obj.tags || obj.hashTags || [],
        rank: obj.rank || null
      });
    }
  });
  console.log(`  ✓ ${blogReviews.length}개 블로그 리뷰 수집`);

  // 리뷰 요약 (처음 3개)
  const reviewSummaries = blogReviews.slice(0, 3).map(r => ({
    author: r.author,
    preview: r.contents.substring(0, 200) + '...',
    date: r.date
  }));

  // ========== 이미지 수집 ==========
  console.log('📸 이미지 수집 중...');
  const images = {
    menu: [],
    interior: [],
    food: [],
    all: []
  };

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('Image:') || key.startsWith('Photo:')) {
      const img = apolloState[key];
      if (img && img.url) {
        const imageData = {
          url: img.url,
          description: img.description || img.name || '',
          category: img.category || 'unknown'
        };

        images.all.push(imageData);

        if (img.category === 'MENU' || img.description?.includes('메뉴')) {
          images.menu.push(imageData);
        } else if (img.category === 'INTERIOR' || img.description?.includes('내부')) {
          images.interior.push(imageData);
        } else if (img.category === 'FOOD') {
          images.food.push(imageData);
        }
      }
    }
  });

  // 메뉴 이미지도 추가
  menus.forEach(menu => {
    if (menu.images && menu.images.length > 0) {
      menu.images.forEach(url => {
        images.menu.push({
          url: url,
          description: menu.name,
          category: 'MENU'
        });
        images.all.push({
          url: url,
          description: menu.name,
          category: 'MENU'
        });
      });
    }
  });

  console.log(`  ✓ 총 ${images.all.length}개 이미지 (메뉴: ${images.menu.length}, 내부: ${images.interior.length}, 음식: ${images.food.length})`);

  // ========== 편의시설 및 기타 정보 ==========
  const facilities = {
    conveniences: placeDetail.conveniences || [],
    paymentInfo: placeDetail.paymentInfo || [],
    parkingInfo: placeDetail.road || null
  };

  // ========== 최종 데이터 ==========
  const result = {
    ...basicInfo,
    menuSummary,
    menus: menus.slice(0, 50), // 최대 50개
    reviewStats,
    blogReviews: blogReviews.slice(0, 10), // 최대 10개 전체 리뷰
    reviewSummaries, // 간략 요약 3개
    images,
    facilities,
    url: `https://map.naver.com/p/entry/place/${placeId}`,
    collectedAt: new Date().toISOString()
  };

  return result;
}

function printSummary(data) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 수집 결과 요약');
  console.log('='.repeat(70) + '\n');

  console.log(`📌 이름: ${data.name}`);
  console.log(`🏷️  카테고리: ${data.category}`);
  console.log(`📍 주소: ${data.roadAddress}`);
  console.log(`📞 전화: ${data.phone}`);
  console.log(`⭐ 평점: ${data.reviewStats.score} (리뷰 ${data.reviewStats.total}개, 텍스트 ${data.reviewStats.textTotal}개)`);

  console.log(`\n🍴 메뉴 정보:`);
  console.log(`   총 ${data.menuSummary.total}개 (추천: ${data.menuSummary.recommended}개)`);
  if (data.menuSummary.priceRange) {
    console.log(`   가격대: ${data.menuSummary.priceRange.min.toLocaleString()}원 ~ ${data.menuSummary.priceRange.max.toLocaleString()}원`);
  }
  console.log(`\n   [ 메뉴 목록 ]`);
  data.menus.slice(0, 10).forEach((menu, i) => {
    const badge = menu.recommend ? '👍' : '  ';
    console.log(`   ${badge} ${menu.name}: ${menu.priceFormatted || '가격 미표시'}`);
    if (menu.description) {
      console.log(`      ${menu.description}`);
    }
  });
  if (data.menus.length > 10) {
    console.log(`   ... 외 ${data.menus.length - 10}개`);
  }

  console.log(`\n💬 리뷰 정보:`);
  console.log(`   블로그 리뷰 ${data.blogReviews.length}개 수집`);
  if (data.reviewStats.microReviews.length > 0) {
    console.log(`   한줄평: "${data.reviewStats.microReviews[0]}"`);
  }

  if (data.reviewSummaries.length > 0) {
    console.log(`\n   [ 최근 리뷰 미리보기 ]`);
    data.reviewSummaries.forEach((review, i) => {
      console.log(`   ${i + 1}. ${review.author} (${review.date})`);
      console.log(`      ${review.preview}`);
      console.log('');
    });
  }

  console.log(`📸 이미지: 총 ${data.images.all.length}개`);
  console.log(`   - 메뉴: ${data.images.menu.length}개`);
  console.log(`   - 내부: ${data.images.interior.length}개`);
  console.log(`   - 음식: ${data.images.food.length}개`);

  console.log(`\n✨ 편의시설: ${data.facilities.conveniences.join(', ')}`);
  console.log(`💳 결제: ${data.facilities.paymentInfo.join(', ')}`);

  if (data.facilities.parkingInfo) {
    console.log(`\n🅿️  주차 정보:`);
    console.log(`   ${data.facilities.parkingInfo}`);
  }

  console.log(`\n🔗 ${data.url}`);
  console.log('\n' + '='.repeat(70) + '\n');
}

// 실행
if (require.main === module) {
  const apolloFile = process.argv[2] || './places-advanced/place-1768171911-apollo.json';
  const placeId = process.argv[3] || '1768171911';

  try {
    const result = parseUltimate(apolloFile, placeId);

    // 요약 출력
    printSummary(result);

    // 파일 저장
    const outputFile = `./places-advanced/place-${placeId}-FULL.json`;
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`💾 완전한 데이터 저장: ${outputFile}\n`);

    // 통계
    console.log('📈 수집 통계:');
    console.log(`   메뉴: ${result.menus.length}개`);
    console.log(`   블로그 리뷰: ${result.blogReviews.length}개`);
    console.log(`   이미지: ${result.images.all.length}개`);
    console.log(`   총 데이터 크기: ${(JSON.stringify(result).length / 1024).toFixed(2)} KB\n`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  }
}

module.exports = { parseUltimate };

/**
 * 경쟁업체 정보 수집 모듈
 * 네이버 플레이스 및 다이닝코드의 경쟁/유사 업체 정보를 수집합니다
 *
 * @version 0.2
 * @date 2025-11-28
 */

export class CompetitorCollector {
  constructor(page) {
    this.page = page;
  }

  /**
   * 네이버 플레이스 "이 장소와 비슷한 맛집" 수집
   * @param {string} placeId - 현재 플레이스 ID
   * @param {number} limit - 수집할 최대 개수 (기본 10개)
   * @returns {Promise<Array>}
   */
  async collectNaverCompetitors(placeId, limit = 10) {
    try {
      const homeUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;

      await this.page.goto(homeUrl, {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });

      await new Promise(r => setTimeout(r, 1500));

      // 페이지 끝까지 스크롤하여 "이 장소와 비슷한 맛집" 섹션 로드
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 50);
        });
      });

      await new Promise(r => setTimeout(r, 1500));

      const competitors = await this.page.evaluate((currentPlaceId) => {
        const results = [];

        // "이 장소와 비슷한 맛집" 또는 "라이브볼과 비슷한 맛집" 섹션 찾기
        const sections = Array.from(document.querySelectorAll('h2, h3, div, section'));
        let similarSection = null;

        for (const section of sections) {
          const text = section.textContent || '';
          if (text.includes('비슷한 맛집') || text.includes('이 장소와')) {
            // 섹션의 부모나 다음 형제 요소에서 링크들 찾기
            similarSection = section.closest('section, div[class*="section"]') || section.parentElement;
            break;
          }
        }

        // 비슷한 맛집 섹션에서 링크 찾기
        let allLinks = [];
        if (similarSection) {
          allLinks = similarSection.querySelectorAll('a[href*="/restaurant/"], a[href*="/place/"]');
        } else {
          // 섹션을 못 찾았으면 페이지 하단의 모든 플레이스 링크 찾기
          allLinks = document.querySelectorAll('a[href*="/restaurant/"], a[href*="/place/"]');
        }

        let skippedAds = 0;

        allLinks.forEach((link, index) => {
          const href = link.href;
          const match = href.match(/\/(?:restaurant|place)\/(\d+)/);

          if (match && match[1] !== currentPlaceId) {
            // 처음 2개는 광고이므로 스킵
            if (skippedAds < 2) {
              skippedAds++;
              return;
            }

            // 링크의 부모 컨테이너에서 정보 추출
            const container = link.closest('article, li, div[class*="item"], div[class*="card"]') || link;

            // 업체명 - 가장 구체적인 요소에서 추출
            let name = '';
            // 링크 내부의 첫 번째 텍스트 노드 또는 span 찾기
            const nameEl = link.querySelector('span[class*="place"], span[class*="name"], strong, b') ||
                          link.querySelector('div:first-child span') ||
                          link;

            if (nameEl && nameEl !== link) {
              name = nameEl.textContent.trim();
            } else {
              // 링크의 전체 텍스트에서 첫 줄만 추출
              const fullText = link.textContent.trim();
              const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              if (lines.length > 0) {
                name = lines[0];
              }
            }

            // 업체명에서 불필요한 텍스트 제거
            name = name
              .replace(/네이버페이/g, '')
              .replace(/예약/g, '')
              .replace(/톡톡/g, '')
              .replace(/쿠폰/g, '')
              .replace(/다이어트.*/g, '') // "다이어트" 이후 모든 텍스트 제거
              .replace(/샐러드.*/g, '') // "샐러드" 이후 모든 텍스트 제거 (카테고리)
              .replace(/샌드위치.*/g, '') // "샌드위치" 이후 모든 텍스트 제거
              .replace(/초밥.*/g, '') // "초밥" 이후 모든 텍스트 제거
              .replace(/포케.*/g, '') // "포케" 이후 모든 텍스트 제거
              .replace(/강남구.*/g, '') // "강남구" 이후 모든 텍스트 제거 (주소)
              .replace(/서울.*/g, '') // "서울" 이후 모든 텍스트 제거 (주소)
              .trim();

            if (name && name.length > 0 && name.length < 100) {
              // 카테고리는 별도로 추출하지 않음 (위에서 제거됨)
              let category = '';

              // 평점
              let rating = '';
              const ratingEl = container.querySelector('[class*="rating"], [class*="score"], [class*="star"]');
              if (ratingEl) rating = ratingEl.textContent.trim();

              // 리뷰 수
              let reviewCount = '';
              const reviewEl = container.querySelector('[class*="review"]');
              if (reviewEl) {
                const reviewText = reviewEl.textContent.trim();
                const reviewMatch = reviewText.match(/리뷰\s*(\d+)/);
                if (reviewMatch) reviewCount = reviewMatch[1];
              }

              // 거리
              let distance = '';
              const distanceEl = container.querySelector('[class*="distance"], [class*="meter"], [class*="km"]');
              if (distanceEl) {
                distance = distanceEl.textContent.trim();
              } else {
                // 텍스트에서 거리 패턴 찾기
                const text = container.textContent;
                const distMatch = text.match(/(\d+(?:\.\d+)?(?:km|m))/);
                if (distMatch) distance = distMatch[1];
              }

              results.push({
                placeId: match[1],
                name: name,
                category: category,
                rating: rating,
                reviewCount: reviewCount,
                distance: distance,
                url: href.split('?')[0], // query string 제거
                source: 'naver_similar'
              });
            }
          }
        });

        // 중복 제거
        const unique = [];
        const seen = new Set();
        results.forEach(comp => {
          if (!seen.has(comp.placeId)) {
            seen.add(comp.placeId);
            unique.push(comp);
          }
        });

        return unique;
      }, placeId);

      return competitors.slice(0, limit);

    } catch (error) {
      console.error(`Failed to collect Naver competitors: ${error.message}`);
      return [];
    }
  }

  /**
   * 다이닝코드 "비슷한 맛집" 수집
   * @param {string} diningcodeUrl - 다이닝코드 URL
   * @param {number} limit - 수집할 최대 개수 (기본 10개)
   * @returns {Promise<Array>}
   */
  async collectDiningcodeCompetitors(diningcodeUrl, limit = 10) {
    try {
      await this.page.goto(diningcodeUrl, {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });

      await new Promise(r => setTimeout(r, 1500));

      // 스크롤
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 50);
        });
      });

      await new Promise(r => setTimeout(r, 1000));

      const competitors = await this.page.evaluate(() => {
        const results = [];

        // "비슷한 맛집" 섹션 찾기 - 공백 정규화 필요
        const sections = Array.from(document.querySelectorAll('h2, h3, div, section'));
        let similarSection = null;

        for (const section of sections) {
          const text = (section.textContent || '').trim().replace(/\s+/g, ' ');
          if (text.includes('비슷한 맛집') && !text.includes('근처')) {
            similarSection = section.closest('section, div[class*="section"]') || section.parentElement;
            break;
          }
        }

        // 비슷한 맛집 섹션에서 링크 찾기
        let allLinks = [];
        if (similarSection) {
          // 모든 앵커를 찾은 후 href로 필터링 (href 속성이 동적으로 로드될 수 있음)
          const anchors = similarSection.querySelectorAll('a');
          allLinks = Array.from(anchors).filter(a =>
            a.href && a.href.includes('diningcode.com/profile')
          );
        } else {
          // 섹션을 못 찾았으면 similar_rest_card 클래스로 찾기
          const cards = document.querySelectorAll('a.similar_rest_card');
          allLinks = Array.from(cards).filter(a =>
            a.href && a.href.includes('diningcode.com/profile')
          );
        }

        allLinks.forEach((link, idx) => {
          const href = link.href;
          const match = href.match(/rid=([^&]+)/);

          // 업체명 - 링크 자체의 텍스트에서 추출
          let name = '';
          const textContent = link.textContent.trim();
          if (textContent && textContent.length > 0) {
            // 여러 줄일 경우 빈 줄 제거하고 첫 번째 의미있는 텍스트 추출
            const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
              // "현 식당에서 XXXm" 같은 거리 정보는 제외
              const rawName = lines.find(l => !l.includes('현 식당') && !l.includes('거리')) || lines[0];
              // 연속된 공백을 하나의 스페이스로 정규화
              name = rawName.replace(/\s+/g, ' ').trim();
            }
          }

          if (name && name.length > 0) {
            // 카테고리 (현재는 추출하지 않음)
            let category = '';

            // 평점 (현재는 추출하지 않음)
            let rating = '';

            // 거리 - "현 식당에서 118m" 형식에서 추출
            let distance = '';
            const fullText = link.textContent;
            const distMatch = fullText.match(/현 식당에서 (\d+(?:\.\d+)?(?:km|m))/);
            if (distMatch) {
              distance = distMatch[1];
            } else {
              // 일반적인 거리 패턴도 시도
              const generalMatch = fullText.match(/(\d+(?:\.\d+)?(?:km|m))/);
              if (generalMatch) distance = generalMatch[1];
            }

            results.push({
              rid: match ? match[1] : '',
              name: name,
              category: category,
              rating: rating,
              distance: distance,
              url: href.split('?')[0],
              source: 'diningcode_similar'
            });
          }
        });

        return results;
      });

      return competitors.slice(0, limit);

    } catch (error) {
      console.error(`Failed to collect Diningcode competitors: ${error.message}`);
      return [];
    }
  }

  /**
   * 모든 플랫폼에서 경쟁업체 수집
   * @param {string} placeId - 네이버 플레이스 ID
   * @param {string|null} diningcodeUrl - 다이닝코드 URL (옵션)
   * @param {Object} options - 옵션
   * @returns {Promise<Object>}
   */
  async collectAll(placeId, diningcodeUrl = null, options = {}) {
    const limit = options.limit || 10;

    const result = {
      naver: [],
      diningcode: []
    };

    // 네이버 플레이스 경쟁업체 수집
    result.naver = await this.collectNaverCompetitors(placeId, limit);

    // 다이닝코드 경쟁업체 수집 (URL이 있는 경우만)
    if (diningcodeUrl) {
      result.diningcode = await this.collectDiningcodeCompetitors(diningcodeUrl, limit);
    }

    return result;
  }
}

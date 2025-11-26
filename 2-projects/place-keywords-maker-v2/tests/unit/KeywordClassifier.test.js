/**
 * Unit tests for KeywordClassifier
 * V2.1: 5-category keyword classification testing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { KeywordClassifier } from '../../src/modules/parser/KeywordClassifier.js';

describe('KeywordClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new KeywordClassifier();
  });

  describe('classify()', () => {
    it('should classify keywords into 5 categories', () => {
      const mockPlaceData = {
        basic: {
          category: '음식점 > 한식 > 고기/구이',
          name: '강남 숯불갈비',
          description: '맛있는 정통 한식 갈비 전문점. 분위기 좋고 서비스 친절합니다.',
          tags: ['24시간', '배달']
        },
        menus: [
          { name: 'LA갈비', price: 35000, isRecommended: true },
          { name: '된장찌개', price: 8000 }
        ],
        reviews: {
          summary: {
            positive: ['맛있', '친절', '분위기'],
            negative: []
          }
        }
      };

      const mockAddressParsed = {
        locationKeywords: ['강남역', '강남', '역삼동']
      };

      const result = classifier.classify(mockPlaceData, mockAddressParsed);

      // 5가지 카테고리 존재 확인
      expect(result).toHaveProperty('core');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('menu');
      expect(result).toHaveProperty('attribute');
      expect(result).toHaveProperty('sentiment');

      // Core 키워드 확인
      expect(result.core).toContain('음식점');
      expect(result.core).toContain('한식');

      // Location 키워드 확인
      expect(result.location).toContain('강남역');
      expect(result.location).toContain('강남');

      // Menu 키워드 확인
      expect(result.menu).toContain('LA갈비');

      // Attribute 키워드 확인
      expect(result.attribute.length).toBeGreaterThan(0);

      // Sentiment 키워드 확인
      expect(result.sentiment).toContain('맛있');
      expect(result.sentiment).toContain('친절');
    });

    it('should handle empty data gracefully', () => {
      const emptyData = { basic: {} };
      const result = classifier.classify(emptyData, null);

      expect(result.core).toEqual([]);
      expect(result.location).toEqual([]);
      expect(result.menu).toEqual([]);
      expect(result.attribute).toEqual([]);
      expect(result.sentiment).toEqual([]);
    });
  });

  describe('_extractCoreKeywords()', () => {
    it('should extract core keywords from category', () => {
      const placeData = {
        basic: {
          category: '음식점 > 한식 > 삼겹살',
          name: '맛있는집',
          tags: ['배달', '포장']
        }
      };

      const keywords = classifier._extractCoreKeywords(placeData);

      expect(keywords).toContain('음식점');
      expect(keywords).toContain('한식');
      expect(keywords).toContain('삼겹살');
      expect(keywords).toContain('배달');
      expect(keywords).toContain('포장');
    });
  });

  describe('_extractMenuKeywords()', () => {
    it('should extract menu names from menus array', () => {
      const placeData = {
        menus: [
          { name: '김치찌개', isRecommended: true },
          { name: '된장찌개', isPopular: true },
          { name: '제육볶음' }
        ]
      };

      const keywords = classifier._extractMenuKeywords(placeData);

      expect(keywords).toContain('김치찌개');
      expect(keywords).toContain('된장찌개');
      expect(keywords).toContain('제육볶음');
    });

    it('should prioritize recommended and popular menus', () => {
      const placeData = {
        menus: [
          { name: '일반메뉴1' },
          { name: '추천메뉴', isRecommended: true },
          { name: '인기메뉴', isPopular: true }
        ]
      };

      const keywords = classifier._extractMenuKeywords(placeData);

      // 추천/인기 메뉴가 먼저 오는지 확인
      const recommendedIndex = keywords.indexOf('추천메뉴');
      const popularIndex = keywords.indexOf('인기메뉴');
      const regularIndex = keywords.indexOf('일반메뉴1');

      expect(recommendedIndex).toBeLessThan(regularIndex);
      expect(popularIndex).toBeLessThan(regularIndex);
    });

    it('should clean menu names', () => {
      const placeData = {
        menus: [
          { name: '갈비탕(특)' },
          { name: '김치찌개 [2인]' }
        ]
      };

      const keywords = classifier._extractMenuKeywords(placeData);

      expect(keywords).toContain('갈비탕');
      expect(keywords).toContain('김치찌개');
    });

    it('should limit to 20 menus', () => {
      const menus = Array.from({ length: 30 }, (_, i) => ({
        name: `메뉴${i + 1}`
      }));

      const placeData = { menus };
      const keywords = classifier._extractMenuKeywords(placeData);

      expect(keywords.length).toBeLessThanOrEqual(20);
    });
  });

  describe('_extractAttributeKeywords()', () => {
    it('should extract attribute keywords from description', () => {
      const placeData = {
        basic: {
          description: '깔끔한 인테리어와 친절한 서비스. 가성비 좋은 맛집입니다.'
        }
      };

      const result = classifier._extractAttributeKeywords(placeData);

      expect(result.keywords).toContain('깔끔');
      expect(result.keywords).toContain('친절');
      expect(result.keywords).toContain('가성비');
    });

    it('should categorize attributes correctly', () => {
      const placeData = {
        basic: {
          description: '분위기 좋고 서비스 친절하며 가성비 최고'
        }
      };

      const result = classifier._extractAttributeKeywords(placeData);

      expect(result.breakdown.atmosphere).toContain('분위기');
      expect(result.breakdown.service).toContain('친절');
      expect(result.breakdown.price).toContain('가성비');
    });

    it('should extract facilities as convenience attributes', () => {
      const placeData = {
        basic: { description: '' },
        facilities: [
          { name: '주차가능', available: true },
          { name: '단체석', available: true },
          { name: 'WiFi', available: false }
        ]
      };

      const result = classifier._extractAttributeKeywords(placeData);

      expect(result.breakdown.convenience).toContain('주차가능');
      expect(result.breakdown.convenience).toContain('단체석');
      expect(result.breakdown.convenience).not.toContain('WiFi');
    });
  });

  describe('_extractSentimentKeywords()', () => {
    it('should extract positive sentiment from reviews', () => {
      const placeData = {
        reviews: {
          summary: {
            positive: ['맛있', '최고', '추천'],
            negative: []
          }
        }
      };

      const result = classifier._extractSentimentKeywords(placeData);

      expect(result.breakdown.positive).toContain('맛있');
      expect(result.breakdown.positive).toContain('최고');
      expect(result.breakdown.positive).toContain('추천');
    });

    it('should extract negative sentiment from reviews', () => {
      const placeData = {
        reviews: {
          summary: {
            positive: [],
            negative: ['별로', '실망']
          }
        }
      };

      const result = classifier._extractSentimentKeywords(placeData);

      expect(result.breakdown.negative).toContain('별로');
      expect(result.breakdown.negative).toContain('실망');
    });

    it('should extract sentiment from blog reviews', () => {
      const placeData = {
        reviews: {
          summary: { positive: [], negative: [] },
          blogReviews: [
            { content: '정말 맛있고 좋았어요. 강력 추천합니다!' },
            { content: '아쉽고 실망스러웠습니다.' }
          ]
        }
      };

      const result = classifier._extractSentimentKeywords(placeData);

      expect(result.keywords).toContain('맛있');
      expect(result.keywords).toContain('좋');
      expect(result.keywords).toContain('추천');
      expect(result.keywords).toContain('아쉬');
      expect(result.keywords).toContain('실망');
    });
  });

  describe('_deduplicateAndSort()', () => {
    it('should remove duplicates', () => {
      const keywords = ['맛집', '한식', '맛집', '갈비', '한식'];
      const result = classifier._deduplicateAndSort(keywords);

      expect(result).toHaveLength(3);
      expect(result).toContain('맛집');
      expect(result).toContain('한식');
      expect(result).toContain('갈비');
    });

    it('should sort by frequency', () => {
      const keywords = ['A', 'B', 'A', 'C', 'A', 'B'];
      const result = classifier._deduplicateAndSort(keywords);

      // A가 3번, B가 2번, C가 1번이므로 A > B > C 순서
      expect(result[0].toLowerCase()).toBe('a');
      expect(result[1].toLowerCase()).toBe('b');
      expect(result[2].toLowerCase()).toBe('c');
    });
  });

  describe('getStatistics()', () => {
    it('should return keyword statistics', () => {
      const classified = {
        core: ['한식', '음식점'],
        location: ['강남', '역삼'],
        menu: ['갈비', '찌개'],
        attribute: ['분위기', '깔끔'],
        sentiment: ['맛있', '좋']
      };

      const stats = classifier.getStatistics(classified);

      expect(stats.total).toBe(10);
      expect(stats.byCategory.core).toBe(2);
      expect(stats.byCategory.location).toBe(2);
      expect(stats.byCategory.menu).toBe(2);
      expect(stats.byCategory.attribute).toBe(2);
      expect(stats.byCategory.sentiment).toBe(2);
    });

    it('should handle attribute and sentiment breakdown', () => {
      const classified = {
        core: [],
        location: [],
        menu: [],
        attribute: ['분위기', '친절'],
        sentiment: ['맛있', '좋', '별로'],
        _details: {
          attributeBreakdown: {
            atmosphere: ['분위기'],
            service: ['친절'],
            price: [],
            quality: [],
            convenience: []
          },
          sentimentBreakdown: {
            positive: ['맛있', '좋'],
            negative: ['별로']
          }
        }
      };

      const stats = classifier.getStatistics(classified);

      expect(stats.attributeDetail.atmosphere).toBe(1);
      expect(stats.attributeDetail.service).toBe(1);
      expect(stats.sentimentDetail.positive).toBe(2);
      expect(stats.sentimentDetail.negative).toBe(1);
    });
  });
});

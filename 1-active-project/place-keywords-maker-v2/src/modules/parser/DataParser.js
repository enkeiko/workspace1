/**
 * DataParser - 크롤링된 데이터 파싱 및 정규화
 * V2.1: 115점 만점 완성도 평가 시스템
 */

import { logger } from '../../utils/logger.js';

export class DataParser {
  constructor(config = {}) {
    this.config = {
      minReviewLength: config.minReviewLength || 10,
      maxKeywordsPerCategory: config.maxKeywordsPerCategory || 5,
      // V2.1: 115점 만점 완성도 평가 기준
      completenessWeights: config.completenessWeights || {
        basicInfo: 20,      // 기본 정보
        menu: 20,           // 메뉴
        reviews: 25,        // 리뷰
        images: 15,         // 이미지
        facilities: 10,     // 편의시설
        keywords: 15,       // 키워드
        manualData: 10      // 수동 데이터
      },
    };
  }

  /**
   * 매장 데이터 파싱
   * @param {Object} rawData - 크롤링된 원본 데이터
   * @returns {Object} 파싱된 데이터
   */
  parse(rawData) {
    try {
      return {
        id: rawData.id,
        basicInfo: this._parseBasicInfo(rawData),
        menu: this._parseMenu(rawData.menu),
        photos: this._parsePhotos(rawData.photos),
        reviews: this._parseReviews(rawData.reviews),
        hours: this._parseHours(rawData.hours),
        description: rawData.description || '',
      };
    } catch (error) {
      logger.error('Failed to parse data:', error);
      throw error;
    }
  }

  /**
   * 기본 정보 파싱
   * @private
   */
  _parseBasicInfo(rawData) {
    return {
      name: this._sanitize(rawData.name),
      category: this._sanitize(rawData.category),
      address: this._sanitize(rawData.address),
      phone: this._sanitize(rawData.phone),
    };
  }

  /**
   * 메뉴 데이터 파싱
   * @private
   */
  _parseMenu(menuData) {
    if (!menuData || !Array.isArray(menuData)) {
      return [];
    }

    return menuData.map(item => ({
      name: this._sanitize(item.name),
      price: this._parsePrice(item.price),
      description: this._sanitize(item.description),
    }));
  }

  /**
   * 사진 데이터 파싱
   * @private
   */
  _parsePhotos(photosData) {
    if (!photosData || !Array.isArray(photosData)) {
      return [];
    }

    return photosData.map(photo => ({
      url: photo.url,
      category: photo.category || 'general',
    }));
  }

  /**
   * 리뷰 데이터 파싱
   * @private
   */
  _parseReviews(reviewsData) {
    if (!reviewsData || !Array.isArray(reviewsData)) {
      return [];
    }

    return reviewsData
      .filter(review => review.text && review.text.length >= this.config.minReviewLength)
      .map(review => ({
        text: this._sanitize(review.text),
        rating: review.rating || 0,
        date: review.date || new Date().toISOString(),
      }));
  }

  /**
   * 영업 시간 파싱
   * @private
   */
  _parseHours(hoursData) {
    if (!hoursData) {
      return null;
    }

    return {
      weekday: hoursData.weekday || '',
      weekend: hoursData.weekend || '',
      holiday: hoursData.holiday || '',
    };
  }

  /**
   * 가격 문자열 파싱
   * @private
   */
  _parsePrice(priceStr) {
    if (!priceStr) return null;

    const cleaned = priceStr.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : null;
  }

  /**
   * 문자열 정리 (HTML 태그, 특수문자 제거)
   * @private
   */
  _sanitize(str) {
    if (!str) return '';

    return str
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/\s+/g, ' ')     // 연속 공백 제거
      .trim();
  }

  // 완성도 평가 기능 제거됨 (2025-11-27)
  // 데이터 수집에만 집중하고, 평가는 별도 모듈로 분리 예정
}

/**
 * validators.js
 * 데이터 검증 함수들
 *
 * L1_FEATURE_SPEC.md 명세 기반 구현
 * - JSON Schema 검증
 * - 비즈니스 규칙 검증
 * - 품질 체크
 */

// ============================================
// 필수 필드 검증
// ============================================

/**
 * 필수 필드 존재 여부 확인
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateRequiredFields(data) {
  const errors = [];

  // 최상위 필수 필드
  if (!data.version) errors.push({ field: 'version', message: 'Missing required field' });
  if (!data.collected_at) errors.push({ field: 'collected_at', message: 'Missing required field' });
  if (!data.collection_level) errors.push({ field: 'collection_level', message: 'Missing required field' });
  if (!data.collector_version) errors.push({ field: 'collector_version', message: 'Missing required field' });
  if (!data.place) errors.push({ field: 'place', message: 'Missing required field' });
  if (!data.metadata) errors.push({ field: 'metadata', message: 'Missing required field' });

  // place 객체 필수 필드
  if (data.place) {
    if (!data.place.id) errors.push({ field: 'place.id', message: 'Missing required field' });
    if (!data.place.name) errors.push({ field: 'place.name', message: 'Missing required field' });
    if (!data.place.category) errors.push({ field: 'place.category', message: 'Missing required field' });
    if (!data.place.address) errors.push({ field: 'place.address', message: 'Missing required field' });

    if (data.place.address && !data.place.address.raw) {
      errors.push({ field: 'place.address.raw', message: 'Missing required field' });
    }
  }

  // metadata 객체 필수 필드
  if (data.metadata) {
    if (!data.metadata.completeness) {
      errors.push({ field: 'metadata.completeness', message: 'Missing required field' });
    } else {
      if (data.metadata.completeness.score === undefined || data.metadata.completeness.score === null) {
        errors.push({ field: 'metadata.completeness.score', message: 'Missing required field' });
      }
      if (!data.metadata.completeness.grade) {
        errors.push({ field: 'metadata.completeness.grade', message: 'Missing required field' });
      }
    }

    if (!data.metadata.collection_stats) {
      errors.push({ field: 'metadata.collection_stats', message: 'Missing required field' });
    } else {
      if (data.metadata.collection_stats.attempts === undefined) {
        errors.push({ field: 'metadata.collection_stats.attempts', message: 'Missing required field' });
      }
      if (data.metadata.collection_stats.duration_ms === undefined) {
        errors.push({ field: 'metadata.collection_stats.duration_ms', message: 'Missing required field' });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// 데이터 타입 검증
// ============================================

/**
 * 데이터 타입 검증
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateDataTypes(data) {
  const errors = [];

  // version: 문자열 (Semantic Versioning)
  if (data.version && typeof data.version !== 'string') {
    errors.push({ field: 'version', message: 'Must be a string' });
  } else if (data.version && !/^\d+\.\d+\.\d+$/.test(data.version)) {
    errors.push({ field: 'version', message: 'Must follow semantic versioning (e.g., 2.0.0)' });
  }

  // collected_at: ISO 8601 날짜 문자열
  if (data.collected_at) {
    try {
      const date = new Date(data.collected_at);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'collected_at', message: 'Must be a valid ISO 8601 date string' });
      }
    } catch (error) {
      errors.push({ field: 'collected_at', message: 'Must be a valid ISO 8601 date string' });
    }
  }

  // collection_level: enum
  if (data.collection_level) {
    const validLevels = ['BASIC', 'STANDARD', 'COMPLETE'];
    if (!validLevels.includes(data.collection_level)) {
      errors.push({
        field: 'collection_level',
        message: `Must be one of: ${validLevels.join(', ')}`
      });
    }
  }

  // place.id: 10-15자리 숫자 문자열
  if (data.place?.id && !/^\d{10,15}$/.test(data.place.id)) {
    errors.push({ field: 'place.id', message: 'Must be a 10-15 digit number string' });
  }

  // place.name: 1-100자
  if (data.place?.name) {
    if (typeof data.place.name !== 'string') {
      errors.push({ field: 'place.name', message: 'Must be a string' });
    } else if (data.place.name.length === 0 || data.place.name.length > 100) {
      errors.push({ field: 'place.name', message: 'Must be between 1 and 100 characters' });
    }
  }

  // place.rating: 0-5 범위
  if (data.place?.rating !== null && data.place?.rating !== undefined) {
    if (typeof data.place.rating !== 'number') {
      errors.push({ field: 'place.rating', message: 'Must be a number' });
    } else if (data.place.rating < 0 || data.place.rating > 5) {
      errors.push({ field: 'place.rating', message: 'Must be between 0 and 5' });
    }
  }

  // place.reviewCount: 양수
  if (data.place?.reviewCount !== null && data.place?.reviewCount !== undefined) {
    if (!Number.isInteger(data.place.reviewCount) || data.place.reviewCount < 0) {
      errors.push({ field: 'place.reviewCount', message: 'Must be a non-negative integer' });
    }
  }

  // metadata.completeness.score: 0-100
  if (data.metadata?.completeness?.score !== undefined) {
    const score = data.metadata.completeness.score;
    if (typeof score !== 'number' || score < 0 || score > 100) {
      errors.push({ field: 'metadata.completeness.score', message: 'Must be a number between 0 and 100' });
    }
  }

  // metadata.completeness.grade: enum
  if (data.metadata?.completeness?.grade) {
    const validGrades = ['A+', 'A', 'B', 'C', 'D'];
    if (!validGrades.includes(data.metadata.completeness.grade)) {
      errors.push({
        field: 'metadata.completeness.grade',
        message: `Must be one of: ${validGrades.join(', ')}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// 비즈니스 규칙 검증
// ============================================

/**
 * 완성도 점수와 등급 일치성 검증
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateCompletenessConsistency(data) {
  const errors = [];

  if (!data.metadata?.completeness) return { valid: true, errors };

  const score = data.metadata.completeness.score;
  const grade = data.metadata.completeness.grade;

  const gradeMap = {
    'A+': [90, 100],
    'A': [75, 89],
    'B': [60, 74],
    'C': [40, 59],
    'D': [0, 39]
  };

  const [min, max] = gradeMap[grade] || [0, 0];

  if (score < min || score > max) {
    errors.push({
      field: 'metadata.completeness',
      message: `Grade ${grade} does not match score ${score}. Expected score between ${min} and ${max}`,
      severity: 'ERROR'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 메뉴 가격 합리성 검증
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateMenuPrices(data) {
  const errors = [];

  if (!data.place?.menus || data.place.menus.length === 0) {
    return { valid: true, errors };
  }

  const menus = data.place.menus;
  const prices = menus.map(m => m.price).filter(p => p !== null && p !== undefined);

  if (prices.length === 0) return { valid: true, errors };

  // 평균 가격 계산
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // 평균 가격이 너무 낮음 (< 1,000원)
  if (avgPrice < 1000) {
    errors.push({
      field: 'place.menus',
      message: `Average menu price ${avgPrice}원 seems too low`,
      severity: 'WARNING'
    });
  }

  // 평균 가격이 너무 높음 (> 100,000원)
  if (avgPrice > 100000) {
    errors.push({
      field: 'place.menus',
      message: `Average menu price ${avgPrice}원 seems too high`,
      severity: 'WARNING'
    });
  }

  // 개별 메뉴 가격 검증
  menus.forEach((menu, idx) => {
    if (menu.price !== null && menu.price !== undefined) {
      if (menu.price < 0) {
        errors.push({
          field: `place.menus[${idx}].price`,
          message: `Negative price: ${menu.price}`,
          severity: 'ERROR'
        });
      }
      if (menu.price > 10000000) {
        errors.push({
          field: `place.menus[${idx}].price`,
          message: `Price exceeds maximum: ${menu.price}`,
          severity: 'ERROR'
        });
      }
    }
  });

  return {
    valid: errors.filter(e => e.severity === 'ERROR').length === 0,
    errors,
    warnings: errors.filter(e => e.severity === 'WARNING')
  };
}

/**
 * 위치 좌표 유효성 검증 (한국 내부)
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateLocationBounds(data) {
  const errors = [];

  if (!data.place?.address?.location) {
    return { valid: true, errors };
  }

  const { lat, lng } = data.place.address.location;

  // 대한민국 좌표 범위
  // 위도: 33-43, 경도: 124-132
  if (lat < 33 || lat > 43 || lng < 124 || lng > 132) {
    errors.push({
      field: 'place.address.location',
      message: `Location (${lat}, ${lng}) is outside of South Korea`,
      severity: 'ERROR'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 수집 시간 검증 (미래 시각이 아닌지)
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateCollectionTime(data) {
  const errors = [];

  if (!data.collected_at) return { valid: true, errors };

  try {
    const collectedAt = new Date(data.collected_at);
    const now = new Date();

    if (collectedAt > now) {
      errors.push({
        field: 'collected_at',
        message: `Collection time ${data.collected_at} is in the future`,
        severity: 'ERROR'
      });
    }
  } catch (error) {
    // 이미 validateDataTypes에서 검증됨
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 수집 레벨과 완성도 점수 일치성 검증
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function validateLevelAndCompleteness(data) {
  const errors = [];

  if (!data.collection_level || !data.metadata?.completeness?.score) {
    return { valid: true, errors };
  }

  const level = data.collection_level;
  const score = data.metadata.completeness.score;

  const expectedScores = {
    'BASIC': [50, 70],
    'STANDARD': [70, 90],
    'COMPLETE': [85, 100]
  };

  const [minScore, maxScore] = expectedScores[level] || [0, 100];

  if (score < minScore || score > maxScore) {
    errors.push({
      field: 'collection_level',
      message: `Collection level ${level} should have score between ${minScore}-${maxScore}, got ${score}`,
      severity: 'WARNING'
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'ERROR').length === 0,
    errors,
    warnings: errors.filter(e => e.severity === 'WARNING')
  };
}

// ============================================
// 품질 체크
// ============================================

/**
 * 품질 체크 실행
 * @param {object} data - L1 출력 데이터
 * @returns {object} 검증 결과
 */
function runQualityChecks(data) {
  const allErrors = [];
  const allWarnings = [];

  // 1. 필수 필드 검증
  const requiredResult = validateRequiredFields(data);
  if (!requiredResult.valid) {
    allErrors.push(...requiredResult.errors.map(e => ({ ...e, check: 'required_fields', severity: 'CRITICAL' })));
  }

  // 2. 데이터 타입 검증
  const typeResult = validateDataTypes(data);
  if (!typeResult.valid) {
    allErrors.push(...typeResult.errors.map(e => ({ ...e, check: 'data_types', severity: 'HIGH' })));
  }

  // 3. 완성도 일치성 검증
  const completenessResult = validateCompletenessConsistency(data);
  if (!completenessResult.valid) {
    allErrors.push(...completenessResult.errors);
  }

  // 4. 메뉴 가격 검증
  const priceResult = validateMenuPrices(data);
  if (priceResult.errors) {
    priceResult.errors.forEach(e => {
      if (e.severity === 'ERROR') allErrors.push(e);
      if (e.severity === 'WARNING') allWarnings.push(e);
    });
  }

  // 5. 위치 좌표 검증
  const locationResult = validateLocationBounds(data);
  if (!locationResult.valid) {
    allErrors.push(...locationResult.errors);
  }

  // 6. 수집 시간 검증
  const timeResult = validateCollectionTime(data);
  if (!timeResult.valid) {
    allErrors.push(...timeResult.errors);
  }

  // 7. 레벨/완성도 일치성
  const levelResult = validateLevelAndCompleteness(data);
  if (levelResult.warnings) {
    allWarnings.push(...levelResult.warnings);
  }

  // Critical 에러가 있으면 저장 불가
  const criticalErrors = allErrors.filter(e => e.severity === 'CRITICAL');
  const highErrors = allErrors.filter(e => e.severity === 'HIGH');
  const otherErrors = allErrors.filter(e => e.severity !== 'CRITICAL' && e.severity !== 'HIGH');

  return {
    passed: criticalErrors.length === 0,
    shouldSave: criticalErrors.length === 0,
    summary: {
      critical: criticalErrors.length,
      errors: highErrors.length + otherErrors.length,
      warnings: allWarnings.length,
      total: allErrors.length + allWarnings.length
    },
    issues: {
      critical: criticalErrors,
      errors: [...highErrors, ...otherErrors],
      warnings: allWarnings
    }
  };
}

// ============================================
// 내보내기
// ============================================

module.exports = {
  validateRequiredFields,
  validateDataTypes,
  validateCompletenessConsistency,
  validateMenuPrices,
  validateLocationBounds,
  validateCollectionTime,
  validateLevelAndCompleteness,
  runQualityChecks
};

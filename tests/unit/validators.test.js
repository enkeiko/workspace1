/**
 * validators.test.js
 * validators.js 단위 테스트
 *
 * 목표 커버리지: 90%
 */

const {
  validateRequiredFields,
  validateDataTypes,
  validateCompletenessConsistency,
  validateMenuPrices,
  validateLocationBounds,
  validateCollectionTime,
  validateLevelAndCompleteness,
  runQualityChecks
} = require('../../src/utils/validators');

// ============================================
// Test Fixtures (재사용 가능한 테스트 데이터)
// ============================================

const validL1Data = {
  version: '2.0.0',
  collected_at: '2024-01-15T10:30:00Z',
  collection_level: 'STANDARD',
  collector_version: '1.0.0',
  place: {
    id: '1234567890',
    name: '테스트 식당',
    category: '한식',
    address: {
      raw: '서울특별시 강남구 역삼동 123-45',
      location: {
        lat: 37.5,
        lng: 127.0
      }
    },
    rating: 4.5,
    reviewCount: 100,
    menus: [
      { name: '김치찌개', price: 8000 },
      { name: '된장찌개', price: 7000 }
    ]
  },
  metadata: {
    completeness: {
      score: 85,
      grade: 'A'
    },
    collection_stats: {
      attempts: 1,
      duration_ms: 5000
    }
  }
};

// ============================================
// 필수 필드 검증 테스트
// ============================================

describe('validateRequiredFields', () => {
  it('should pass for valid complete data', () => {
    const result = validateRequiredFields(validL1Data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when top-level required fields are missing', () => {
    const data = { ...validL1Data };
    delete data.version;
    delete data.collected_at;

    const result = validateRequiredFields(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.field === 'version')).toBe(true);
    expect(result.errors.some(e => e.field === 'collected_at')).toBe(true);
  });

  it('should fail when place required fields are missing', () => {
    const data = {
      ...validL1Data,
      place: {
        address: {}
      }
    };

    const result = validateRequiredFields(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'place.id')).toBe(true);
    expect(result.errors.some(e => e.field === 'place.name')).toBe(true);
    expect(result.errors.some(e => e.field === 'place.category')).toBe(true);
  });

  it('should fail when place.address.raw is missing', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        address: { location: { lat: 37.5, lng: 127.0 } }
      }
    };

    const result = validateRequiredFields(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'place.address.raw')).toBe(true);
  });

  it('should fail when metadata required fields are missing', () => {
    const data = {
      ...validL1Data,
      metadata: {}
    };

    const result = validateRequiredFields(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'metadata.completeness')).toBe(true);
    expect(result.errors.some(e => e.field === 'metadata.collection_stats')).toBe(true);
  });

  it('should fail when completeness.score is missing', () => {
    const data = {
      ...validL1Data,
      metadata: {
        ...validL1Data.metadata,
        completeness: {
          grade: 'A'
        }
      }
    };

    const result = validateRequiredFields(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'metadata.completeness.score')).toBe(true);
  });
});

// ============================================
// 데이터 타입 검증 테스트
// ============================================

describe('validateDataTypes', () => {
  it('should pass for valid data types', () => {
    const result = validateDataTypes(validL1Data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for invalid version format', () => {
    const data1 = { ...validL1Data, version: 123 };
    expect(validateDataTypes(data1).valid).toBe(false);

    const data2 = { ...validL1Data, version: '2.0' };
    expect(validateDataTypes(data2).valid).toBe(false);

    const data3 = { ...validL1Data, version: 'v2.0.0' };
    expect(validateDataTypes(data3).valid).toBe(false);
  });

  it('should fail for invalid collected_at', () => {
    const data = { ...validL1Data, collected_at: 'invalid-date' };
    const result = validateDataTypes(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'collected_at')).toBe(true);
  });

  it('should fail for invalid collection_level', () => {
    const data = { ...validL1Data, collection_level: 'INVALID' };
    const result = validateDataTypes(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'collection_level')).toBe(true);
  });

  it('should fail for invalid place.id format', () => {
    const data = {
      ...validL1Data,
      place: { ...validL1Data.place, id: '123' } // Too short
    };
    const result = validateDataTypes(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'place.id')).toBe(true);
  });

  it('should fail for invalid place.name', () => {
    // Note: Empty string '' is falsy, so it's not validated by the current implementation
    // It would be caught by validateRequiredFields instead

    const data = {
      ...validL1Data,
      place: { ...validL1Data.place, name: 'a'.repeat(101) }
    };
    expect(validateDataTypes(data).valid).toBe(false);
  });

  it('should fail for invalid place.rating', () => {
    const data1 = {
      ...validL1Data,
      place: { ...validL1Data.place, rating: -1 }
    };
    expect(validateDataTypes(data1).valid).toBe(false);

    const data2 = {
      ...validL1Data,
      place: { ...validL1Data.place, rating: 6 }
    };
    expect(validateDataTypes(data2).valid).toBe(false);

    const data3 = {
      ...validL1Data,
      place: { ...validL1Data.place, rating: '4.5' }
    };
    expect(validateDataTypes(data3).valid).toBe(false);
  });

  it('should fail for invalid place.reviewCount', () => {
    const data1 = {
      ...validL1Data,
      place: { ...validL1Data.place, reviewCount: -10 }
    };
    expect(validateDataTypes(data1).valid).toBe(false);

    const data2 = {
      ...validL1Data,
      place: { ...validL1Data.place, reviewCount: 10.5 }
    };
    expect(validateDataTypes(data2).valid).toBe(false);
  });

  it('should fail for invalid completeness.score', () => {
    const data1 = {
      ...validL1Data,
      metadata: {
        ...validL1Data.metadata,
        completeness: { ...validL1Data.metadata.completeness, score: -10 }
      }
    };
    expect(validateDataTypes(data1).valid).toBe(false);

    const data2 = {
      ...validL1Data,
      metadata: {
        ...validL1Data.metadata,
        completeness: { ...validL1Data.metadata.completeness, score: 150 }
      }
    };
    expect(validateDataTypes(data2).valid).toBe(false);
  });

  it('should fail for invalid completeness.grade', () => {
    const data = {
      ...validL1Data,
      metadata: {
        ...validL1Data.metadata,
        completeness: { ...validL1Data.metadata.completeness, grade: 'F' }
      }
    };
    const result = validateDataTypes(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'metadata.completeness.grade')).toBe(true);
  });

  it('should pass when optional fields are null', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        rating: null,
        reviewCount: null
      }
    };
    const result = validateDataTypes(data);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// 완성도 일치성 검증 테스트
// ============================================

describe('validateCompletenessConsistency', () => {
  it('should pass when grade matches score', () => {
    const testCases = [
      { score: 95, grade: 'A+' },
      { score: 80, grade: 'A' },
      { score: 65, grade: 'B' },
      { score: 50, grade: 'C' },
      { score: 20, grade: 'D' }
    ];

    testCases.forEach(({ score, grade }) => {
      const data = {
        ...validL1Data,
        metadata: {
          ...validL1Data.metadata,
          completeness: { score, grade }
        }
      };
      const result = validateCompletenessConsistency(data);
      expect(result.valid).toBe(true);
    });
  });

  it('should fail when grade does not match score', () => {
    const data = {
      ...validL1Data,
      metadata: {
        ...validL1Data.metadata,
        completeness: { score: 95, grade: 'C' } // Mismatch
      }
    };
    const result = validateCompletenessConsistency(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should pass when completeness is missing', () => {
    const data = {
      ...validL1Data,
      metadata: {}
    };
    const result = validateCompletenessConsistency(data);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// 메뉴 가격 검증 테스트
// ============================================

describe('validateMenuPrices', () => {
  it('should pass for valid menu prices', () => {
    const result = validateMenuPrices(validL1Data);
    expect(result.valid).toBe(true);
  });

  it('should warn when average price is too low', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: [
          { name: '물', price: 100 },
          { name: '물2', price: 200 }
        ]
      }
    };
    const result = validateMenuPrices(data);
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should warn when average price is too high', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: [
          { name: '고급 코스', price: 200000 },
          { name: '특선 코스', price: 300000 }
        ]
      }
    };
    const result = validateMenuPrices(data);
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should fail for negative prices', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: [{ name: '테스트', price: -1000 }]
      }
    };
    const result = validateMenuPrices(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.severity === 'ERROR')).toBe(true);
  });

  it('should fail for prices exceeding maximum', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: [{ name: '초고가', price: 20000000 }]
      }
    };
    const result = validateMenuPrices(data);
    expect(result.valid).toBe(false);
  });

  it('should pass when menus are empty', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: []
      }
    };
    const result = validateMenuPrices(data);
    expect(result.valid).toBe(true);
  });

  it('should pass when menus are missing', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: undefined
      }
    };
    const result = validateMenuPrices(data);
    expect(result.valid).toBe(true);
  });

  it('should handle menus with null prices', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        menus: [
          { name: '메뉴1', price: 5000 },
          { name: '메뉴2', price: null }
        ]
      }
    };
    const result = validateMenuPrices(data);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// 위치 좌표 검증 테스트
// ============================================

describe('validateLocationBounds', () => {
  it('should pass for valid Korean coordinates', () => {
    const testCases = [
      { lat: 37.5, lng: 127.0 }, // Seoul
      { lat: 35.1, lng: 129.0 }, // Busan
      { lat: 33.5, lng: 126.5 }  // Jeju
    ];

    testCases.forEach(location => {
      const data = {
        ...validL1Data,
        place: {
          ...validL1Data.place,
          address: { ...validL1Data.place.address, location }
        }
      };
      const result = validateLocationBounds(data);
      expect(result.valid).toBe(true);
    });
  });

  it('should fail for coordinates outside Korea', () => {
    const testCases = [
      { lat: 30, lng: 127.0 },    // Too far south
      { lat: 45, lng: 127.0 },    // Too far north
      { lat: 37.5, lng: 120 },    // Too far west
      { lat: 37.5, lng: 135 }     // Too far east
    ];

    testCases.forEach(location => {
      const data = {
        ...validL1Data,
        place: {
          ...validL1Data.place,
          address: { ...validL1Data.place.address, location }
        }
      };
      const result = validateLocationBounds(data);
      expect(result.valid).toBe(false);
    });
  });

  it('should pass when location is missing', () => {
    const data = {
      ...validL1Data,
      place: {
        ...validL1Data.place,
        address: { raw: '서울특별시 강남구' }
      }
    };
    const result = validateLocationBounds(data);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// 수집 시간 검증 테스트
// ============================================

describe('validateCollectionTime', () => {
  it('should pass for valid past time', () => {
    const data = {
      ...validL1Data,
      collected_at: '2024-01-01T00:00:00Z'
    };
    const result = validateCollectionTime(data);
    expect(result.valid).toBe(true);
  });

  it('should fail for future time', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const data = {
      ...validL1Data,
      collected_at: futureDate.toISOString()
    };
    const result = validateCollectionTime(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'collected_at')).toBe(true);
  });

  it('should pass when collected_at is missing', () => {
    const data = { ...validL1Data };
    delete data.collected_at;

    const result = validateCollectionTime(data);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// 레벨/완성도 일치성 검증 테스트
// ============================================

describe('validateLevelAndCompleteness', () => {
  it('should pass when level matches completeness score', () => {
    const testCases = [
      { level: 'BASIC', score: 60 },
      { level: 'STANDARD', score: 80 },
      { level: 'COMPLETE', score: 95 }
    ];

    testCases.forEach(({ level, score }) => {
      const data = {
        ...validL1Data,
        collection_level: level,
        metadata: {
          ...validL1Data.metadata,
          completeness: { ...validL1Data.metadata.completeness, score }
        }
      };
      const result = validateLevelAndCompleteness(data);
      expect(result.valid).toBe(true);
    });
  });

  it('should warn when level does not match score', () => {
    const data = {
      ...validL1Data,
      collection_level: 'BASIC',
      metadata: {
        ...validL1Data.metadata,
        completeness: { ...validL1Data.metadata.completeness, score: 95 }
      }
    };
    const result = validateLevelAndCompleteness(data);
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should pass when level or score is missing', () => {
    const data1 = { ...validL1Data };
    delete data1.collection_level;
    expect(validateLevelAndCompleteness(data1).valid).toBe(true);

    const data2 = { ...validL1Data, metadata: {} };
    expect(validateLevelAndCompleteness(data2).valid).toBe(true);
  });
});

// ============================================
// 품질 체크 통합 테스트
// ============================================

describe('runQualityChecks', () => {
  it('should pass all checks for valid data', () => {
    const result = runQualityChecks(validL1Data);

    expect(result.passed).toBe(true);
    expect(result.shouldSave).toBe(true);
    expect(result.summary.critical).toBe(0);
  });

  it('should fail when critical errors exist', () => {
    const data = { ...validL1Data };
    delete data.version;
    delete data.place;

    const result = runQualityChecks(data);

    expect(result.passed).toBe(false);
    expect(result.shouldSave).toBe(false);
    expect(result.summary.critical).toBeGreaterThan(0);
    expect(result.issues.critical.length).toBeGreaterThan(0);
  });

  it('should categorize errors by severity', () => {
    const data = {
      ...validL1Data,
      version: '2.0', // Invalid version format (HIGH)
      place: {
        ...validL1Data.place,
        menus: [{ name: '테스트', price: -1000 }] // Negative price (ERROR)
      }
    };

    const result = runQualityChecks(data);

    expect(result.summary.errors).toBeGreaterThan(0);
    expect(result.issues.errors.length).toBeGreaterThan(0);
  });

  it('should collect warnings separately', () => {
    const data = {
      ...validL1Data,
      collection_level: 'BASIC',
      metadata: {
        ...validL1Data.metadata,
        completeness: {
          score: 95, // Mismatch with BASIC level
          grade: 'A+'
        }
      }
    };

    const result = runQualityChecks(data);

    expect(result.summary.warnings).toBeGreaterThan(0);
    expect(result.issues.warnings.length).toBeGreaterThan(0);
  });

  it('should return comprehensive summary', () => {
    const result = runQualityChecks(validL1Data);

    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('shouldSave');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('critical');
    expect(result.summary).toHaveProperty('errors');
    expect(result.summary).toHaveProperty('warnings');
    expect(result.summary).toHaveProperty('total');
    expect(result).toHaveProperty('issues');
    expect(result.issues).toHaveProperty('critical');
    expect(result.issues).toHaveProperty('errors');
    expect(result.issues).toHaveProperty('warnings');
  });
});

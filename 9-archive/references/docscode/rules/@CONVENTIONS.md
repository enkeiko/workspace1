# 📝 코딩 컨벤션 및 체크리스트

> **일관성 있는 코드 작성을 위한 규칙**

---

## 🎯 기본 원칙

### 1. 완전한 코드 작성
- ❌ **금지**: TODO 주석으로 불완전한 코드
- ✅ **필수**: 실행 가능한 완전한 코드

### 2. 명확한 에러 처리
- ❌ **금지**: 에러 무시 또는 빈 catch
- ✅ **필수**: 에러 코드 + 로깅 + 복구 시도

### 3. 로거 사용
- ❌ **금지**: console.log 남발
- ✅ **필수**: logger.info/warn/error 사용

### 4. 경로 설정 파일화
- ❌ **금지**: 하드코딩된 경로
- ✅ **필수**: local.config.yml 사용

---

## 📋 체크리스트

### 🔹 코드 작성 전

```markdown
- [ ] Backlog가 READY 상태인가?
- [ ] Analysis 문서를 확인했는가?
- [ ] Feature 문서를 읽었는가?
- [ ] 영향받는 다른 프로젝트가 있는가?
- [ ] 에러 코드를 정의했는가?
```

### 🔹 코드 작성 중

```markdown
- [ ] 완전한 코드 작성 (TODO 없음)
- [ ] 에러 처리 추가
- [ ] 로거 사용
- [ ] 진행률 로그 추가 (긴 작업)
- [ ] 주석 작성 (복잡한 로직)
- [ ] 타입 정의 (TypeScript 사용 시)
```

### 🔹 코드 작성 후

```markdown
- [ ] 로컬 테스트 실행
- [ ] 에러 시나리오 테스트
- [ ] 로그 확인
- [ ] 문서 업데이트 (필요 시)
- [ ] meta.json 업데이트
```

---

## 💻 코드 스타일

### JavaScript/Node.js

#### ✅ 좋은 예

```javascript
/**
 * 쿠폰을 장바구니에 적용합니다
 * @param {string} cartId - 장바구니 ID
 * @param {string} couponCode - 쿠폰 코드
 * @returns {Promise<Cart>} 업데이트된 장바구니
 * @throws {Error} E_COUPON_001, E_COUPON_002
 */
async function applyCoupon(cartId, couponCode) {
  const logger = require('./logger');

  try {
    // 1. 장바구니 조회
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error('E_CART_001: 장바구니를 찾을 수 없습니다');
    }

    // 2. 쿠폰 유효성 검사
    const coupon = await Coupon.findByCode(couponCode);
    if (!coupon || !coupon.isValid()) {
      throw new Error('E_COUPON_001: 유효하지 않은 쿠폰입니다');
    }

    // 3. 중복 사용 체크
    if (cart.hasCoupon()) {
      throw new Error('E_COUPON_002: 쿠폰은 1개만 사용 가능합니다');
    }

    // 4. 할인 적용
    const discount = calculateDiscount(cart.total, coupon);
    cart.applyDiscount(discount);
    cart.attachCoupon(coupon);

    await cart.save();

    logger.info('✅ 쿠폰 적용 완료', {
      cartId,
      couponCode,
      discount
    });

    return cart;

  } catch (error) {
    logger.error('❌ 쿠폰 적용 실패', {
      cartId,
      couponCode,
      error: error.message
    });
    throw error;
  }
}

module.exports = { applyCoupon };
```

#### ❌ 나쁜 예

```javascript
// TODO: 쿠폰 적용 함수
function applyCoupon(cartId, couponCode) {
  // TODO: 장바구니 조회
  // TODO: 쿠폰 검증
  // TODO: 할인 적용
  console.log('쿠폰 적용');
}
```

### 파일 구조

```
src/
├── services/               # 비즈니스 로직
│   ├── coupon-service.js
│   └── cart-service.js
├── models/                 # 데이터 모델
│   ├── Coupon.js
│   └── Cart.js
├── utils/                  # 유틸리티
│   ├── logger.js
│   └── validator.js
└── main.js                 # 진입점
```

---

## 📝 명명 규칙

### 파일명
- **케밥-케이스**: `coupon-service.js`, `cart-manager.js`
- **의미 명확**: `user-auth.js` (✅) vs `auth.js` (❌)

### 변수명
- **카멜케이스**: `cartId`, `couponCode`, `isValid`
- **의미 명확**: `totalPrice` (✅) vs `tp` (❌)
- **불린 변수**: `is/has/can` 접두사 (`isValid`, `hasError`)

### 함수명
- **카멜케이스**: `applyCoupon`, `validateCart`
- **동사 시작**: `getCart`, `createOrder`, `updateUser`
- **명확한 동작**: `validateCouponCode` (✅) vs `check` (❌)

### 상수명
- **대문자 스네이크**: `MAX_DISCOUNT_RATE`, `DEFAULT_TIMEOUT`
- **의미 명확**: `API_BASE_URL` (✅) vs `URL` (❌)

---

## 🚨 에러 처리

### 에러 코드 체계

**형식**: `E_{MODULE}_{NUMBER}: 설명`

**예시**:
```javascript
// Place_Keywords_maker
E_L1_001: 크롤러 JSON이 없습니다
E_L1_002: JSON 파싱 실패
E_L1_003: 필수 필드 누락
E_L1_004: 주소 파싱 실패

E_L2_001: 네이버 API 호출 실패
E_L2_002: AI API 호출 실패
E_L2_003: 검색량 데이터 없음

E_L3_001: 목표키워드가 없습니다
E_L3_002: 점수 계산 실패
```

### 에러 처리 패턴

```javascript
async function processData(placeId) {
  const logger = require('./logger');

  try {
    const data = await fetchData(placeId);

    // 필수 필드 검증
    if (!data || !data.name) {
      throw new Error('E_L1_003: 필수 필드 누락 - name');
    }

    return processResult(data);

  } catch (error) {
    // 에러 로깅
    logger.error(`❌ 데이터 처리 실패: ${placeId}`, {
      error: error.message,
      stack: error.stack
    });

    // 에러 코드별 복구 시도
    if (error.message.includes('E_L1_001')) {
      logger.warn('⚠️  크롤러 데이터 없음. 재시도 중...');
      return await retryCrawl(placeId);
    }

    // 복구 불가능 시 에러 전파
    throw error;
  }
}
```

---

## 📊 로깅 규칙

### 로그 레벨

```javascript
logger.debug('상세 디버그 정보');  // 개발 중에만
logger.info('✅ 정상 처리 완료');   // 주요 단계
logger.warn('⚠️  경고: 대체 방법 사용'); // 경고
logger.error('❌ 에러 발생', { error }); // 에러
```

### 진행률 표시

```javascript
const total = items.length;
items.forEach((item, index) => {
  const current = index + 1;
  const percentage = Math.round((current / total) * 100);
  const barLength = 20;
  const filled = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  logger.info(`[${current}/${total}] ${bar} ${percentage}% 처리 중`);

  processItem(item);
});
```

**출력 예시**:
```
[3/10] ██████░░░░░░░░░░░░░░ 30% 처리 중
[5/10] ██████████░░░░░░░░░░ 50% 처리 중
[10/10] ████████████████████ 100% 처리 중
```

### 단계별 로그

```javascript
logger.info('📊 L1 데이터 수집 시작');
logger.info('ℹ️  데이터 소스 스캔 완료: 크롤러 JSON 15개');
logger.info('✅ 크롤러 데이터 로드: 14/15 (93%)');
logger.warn('⚠️  현재 키워드 파일 없는 매장 3개');
logger.info('🔍 키워드 요소 분류 중');
logger.info('✅ 완성도 평가: HIGH 10개, MID 4개');
```

---

## 🔧 설정 파일 관리

### local.config.yml

**구조**:
```yaml
projects:
  place-keywords-maker:
    path: ~/workspace/Place_Keywords_maker
    type: tool
    framework: nodejs

  place-crawler:
    path: ~/workspace/Place_Crawler
    type: tool
    framework: nodejs

api_keys:
  openai: ${OPENAI_API_KEY}
  anthropic: ${ANTHROPIC_API_KEY}
  naver_client_id: ${NAVER_CLIENT_ID}
  naver_client_secret: ${NAVER_CLIENT_SECRET}

settings:
  log_level: info
  crawl_delay: 5000
  max_retries: 3
```

### 사용 예시

```javascript
const yaml = require('js-yaml');
const fs = require('fs');

const config = yaml.load(
  fs.readFileSync('../local.config.yml', 'utf8')
);

const projectPath = config.projects['place-keywords-maker'].path;
const apiKey = process.env.OPENAI_API_KEY || config.api_keys.openai;
```

---

## 🧪 테스트 작성

### 테스트 구조

```javascript
// test/coupon-service.test.js

const { applyCoupon } = require('../src/services/coupon-service');
const { Cart, Coupon } = require('../src/models');

describe('CouponService', () => {
  describe('applyCoupon', () => {
    test('유효한 쿠폰 적용 성공', async () => {
      const cartId = 'cart-123';
      const couponCode = 'SAVE10';

      const result = await applyCoupon(cartId, couponCode);

      expect(result.hasCoupon()).toBe(true);
      expect(result.appliedCoupon.code).toBe(couponCode);
    });

    test('중복 쿠폰 사용 시 에러', async () => {
      const cartId = 'cart-with-coupon';
      const couponCode = 'SAVE10';

      await expect(
        applyCoupon(cartId, couponCode)
      ).rejects.toThrow('E_COUPON_002');
    });

    test('만료된 쿠폰 사용 시 에러', async () => {
      const cartId = 'cart-123';
      const couponCode = 'EXPIRED';

      await expect(
        applyCoupon(cartId, couponCode)
      ).rejects.toThrow('E_COUPON_001');
    });
  });
});
```

---

## 📚 주석 작성

### JSDoc 스타일

```javascript
/**
 * 장바구니 총액을 계산합니다
 *
 * @param {Cart} cart - 장바구니 객체
 * @param {Object} options - 옵션
 * @param {boolean} options.includeTax - 세금 포함 여부
 * @param {boolean} options.includeShipping - 배송비 포함 여부
 * @returns {number} 총액
 * @throws {Error} E_CART_001 - 장바구니가 비어있는 경우
 *
 * @example
 * const total = calculateTotal(cart, {
 *   includeTax: true,
 *   includeShipping: false
 * });
 */
function calculateTotal(cart, options = {}) {
  // 구현
}
```

### 복잡한 로직 주석

```javascript
// 쿠폰 할인율 계산
// 1. 기본 할인율 적용
// 2. 최대 할인율 제한 (50%)
// 3. 최소 주문 금액 체크
const discountRate = Math.min(
  coupon.rate,
  MAX_DISCOUNT_RATE
);

if (cart.total < coupon.minOrderAmount) {
  discountRate = 0; // 최소 금액 미달 시 할인 없음
}
```

---

## 🔐 보안 규칙

### API 키 관리

**❌ 금지**:
```javascript
const apiKey = 'sk-1234567890abcdef';
```

**✅ 권장**:
```javascript
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('E_CONFIG_001: API 키가 설정되지 않았습니다');
}
```

### 민감 정보 로깅 금지

**❌ 금지**:
```javascript
logger.info('API Key:', apiKey);
logger.debug('User password:', password);
logger.info('Credit card:', cardNumber);
```

**✅ 권장**:
```javascript
logger.info('API 호출 성공');
logger.debug('Token length:', token.length);
logger.info('Payment processed', {
  amount,
  last4: cardNumber.slice(-4)
});
```

---

## 📂 파일 구조 규칙

### 프로젝트 구조

```
project/
├── src/
│   ├── services/        # 비즈니스 로직
│   ├── models/          # 데이터 모델
│   ├── utils/           # 유틸리티
│   ├── config/          # 설정
│   └── main.js          # 진입점
├── data/
│   ├── input/           # 입력 데이터 (읽기 전용)
│   └── output/          # 출력 데이터 (쓰기 가능)
├── test/                # 테스트
├── docs/                # 문서
├── package.json
└── README.md
```

### 파일명 규칙

```
services/
├── coupon-service.js     ✅ 케밥-케이스
├── cart-service.js       ✅
└── CouponService.js      ❌ 파스칼케이스 금지

models/
├── Coupon.js             ✅ 클래스는 파스칼케이스
├── Cart.js               ✅
└── coupon.js             ❌ 모델은 대문자 시작
```

---

## ✅ Pull Request 체크리스트

```markdown
## 코드 품질
- [ ] TODO 주석 없음
- [ ] 에러 처리 완료
- [ ] 로거 사용
- [ ] 주석 작성
- [ ] 하드코딩 제거

## 테스트
- [ ] 로컬 테스트 통과
- [ ] 에러 시나리오 테스트
- [ ] 엣지 케이스 테스트

## 문서
- [ ] README 업데이트 (필요 시)
- [ ] API 문서 업데이트 (필요 시)
- [ ] Changelog 작성

## 보안
- [ ] API 키 하드코딩 없음
- [ ] 민감 정보 로깅 없음
- [ ] 입력 검증 완료

## 규칙 준수
- [ ] @CONVENTIONS.md 준수
- [ ] @ERROR_CODES.md 참조
- [ ] 파일명 규칙 준수
```

---

## 📚 참고 자료

- `rules/@ARCHITECTURE.md` - 시스템 아키텍처
- `rules/@ERROR_CODES.md` - 에러 코드 정의
- `workflows/new-feature-development.md` - 개발 워크플로우

---

**버전**: 1.0.0
**업데이트**: 2025-10-28
**작성자**: AI (Claude)

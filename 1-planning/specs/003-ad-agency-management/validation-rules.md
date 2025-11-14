# 검증 규칙 명세서 - Phase 1

**프로젝트명**: 42ment 광고대행사 관리 시스템
**Phase**: 1 (MVP)
**버전**: 1.0
**작성일**: 2025-11-14

---

## 📌 개요

본 문서는 시스템 전반에 걸쳐 적용되는 데이터 검증 규칙을 정의합니다.

### 검증 레벨
1. **클라이언트 검증** (Client-side): 사용자 경험 향상을 위한 즉각적인 피드백
2. **서버 검증** (Server-side): 필수 검증, 보안 및 데이터 무결성 보장

**원칙**: 모든 중요 검증은 서버에서 반드시 수행

---

## 🔧 공통 검증 규칙

### 1. 문자열 (String)

#### 1.1. 기본 규칙
| 규칙 | 설명 | 정규식/로직 |
|------|------|-------------|
| 빈 문자열 | 필수 필드는 빈 문자열 불허 | `value.trim().length > 0` |
| 공백 제거 | 앞뒤 공백 자동 제거 | `value.trim()` |
| NULL 허용 | 선택 필드만 NULL 허용 | - |

#### 1.2. 길이 제한
| 필드 유형 | 최소 | 최대 |
|-----------|------|------|
| 짧은 텍스트 (이름, 제목) | 1 | 100 |
| 중간 텍스트 (주소) | 0 | 255 |
| 긴 텍스트 (메모) | 0 | 1000 |
| 매우 긴 텍스트 (설명, 요약) | 0 | 2000 |

#### 1.3. 특수 형식

**이메일**
```javascript
// 정규식
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// 검증
function validateEmail(email) {
  if (!email) return { valid: false, message: "이메일을 입력해주세요" }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "올바른 이메일 형식이 아닙니다" }
  }
  if (email.length > 100) {
    return { valid: false, message: "이메일은 100자를 초과할 수 없습니다" }
  }
  return { valid: true }
}
```

**전화번호**
```javascript
// 정규식 (한국 전화번호)
const PHONE_REGEX = /^0\d{1,2}-\d{3,4}-\d{4}$/

// 검증
function validatePhone(phone) {
  if (!phone) return { valid: true } // 선택 필드

  // 하이픈 자동 제거 후 재포맷
  const cleaned = phone.replace(/-/g, '')

  if (!/^0\d{9,10}$/.test(cleaned)) {
    return { valid: false, message: "올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)" }
  }

  return { valid: true }
}
```

**사업자번호**
```javascript
// 정규식
const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/

// 검증
function validateBusinessNumber(number) {
  if (!number) return { valid: true } // 선택 필드

  if (!BUSINESS_NUMBER_REGEX.test(number)) {
    return { valid: false, message: "올바른 사업자번호 형식이 아닙니다 (예: 123-45-67890)" }
  }

  return { valid: true }
}
```

**URL**
```javascript
// 정규식
const URL_REGEX = /^https?:\/\/.+/

// 검증
function validateUrl(url) {
  if (!url) return { valid: true }

  if (!URL_REGEX.test(url)) {
    return { valid: false, message: "올바른 URL 형식이 아닙니다 (http:// 또는 https:// 필요)" }
  }

  return { valid: true }
}
```

---

### 2. 숫자 (Number)

#### 2.1. 기본 규칙
```javascript
function validateNumber(value, min = null, max = null) {
  // NULL 체크
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: "숫자를 입력해주세요" }
  }

  // 숫자 형식 체크
  const num = Number(value)
  if (isNaN(num)) {
    return { valid: false, message: "올바른 숫자 형식이 아닙니다" }
  }

  // 최소값 체크
  if (min !== null && num < min) {
    return { valid: false, message: `${min} 이상의 값을 입력해주세요` }
  }

  // 최대값 체크
  if (max !== null && num > max) {
    return { valid: false, message: `${max} 이하의 값을 입력해주세요` }
  }

  return { valid: true }
}
```

#### 2.2. 금액 (Amount)
```javascript
function validateAmount(amount) {
  const result = validateNumber(amount, 0)
  if (!result.valid) return result

  // 소수점 2자리까지만 허용
  if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
    return { valid: false, message: "금액은 소수점 2자리까지만 입력 가능합니다" }
  }

  // 최대값: 999,999,999.99
  if (amount > 999999999.99) {
    return { valid: false, message: "금액이 너무 큽니다" }
  }

  return { valid: true }
}
```

#### 2.3. 수량 (Quantity)
```javascript
function validateQuantity(quantity) {
  const result = validateNumber(quantity, 1)
  if (!result.valid) return result

  // 정수만 허용
  if (!Number.isInteger(Number(quantity))) {
    return { valid: false, message: "수량은 정수만 입력 가능합니다" }
  }

  // 최대값: 99999
  if (quantity > 99999) {
    return { valid: false, message: "수량이 너무 큽니다 (최대: 99999)" }
  }

  return { valid: true }
}
```

---

### 3. 날짜 (Date)

#### 3.1. 기본 규칙
```javascript
// 날짜 형식: YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function validateDate(date) {
  if (!date) return { valid: false, message: "날짜를 입력해주세요" }

  // 형식 체크
  if (!DATE_REGEX.test(date)) {
    return { valid: false, message: "올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)" }
  }

  // 유효한 날짜인지 체크
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return { valid: false, message: "유효하지 않은 날짜입니다" }
  }

  return { valid: true, date: dateObj }
}
```

#### 3.2. 날짜 범위
```javascript
function validateDateRange(startDate, endDate) {
  const start = validateDate(startDate)
  if (!start.valid) return start

  const end = validateDate(endDate)
  if (!end.valid) return end

  // 시작일이 종료일보다 이후인지 체크
  if (start.date > end.date) {
    return { valid: false, message: "시작일은 종료일보다 이전이어야 합니다" }
  }

  return { valid: true }
}
```

#### 3.3. 미래/과거 날짜
```javascript
function validateFutureDate(date) {
  const result = validateDate(date)
  if (!result.valid) return result

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (result.date < today) {
    return { valid: false, message: "미래 날짜를 입력해주세요" }
  }

  return { valid: true }
}

function validatePastDate(date) {
  const result = validateDate(date)
  if (!result.valid) return result

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (result.date > today) {
    return { valid: false, message: "과거 또는 오늘 날짜를 입력해주세요" }
  }

  return { valid: true }
}
```

---

### 4. 파일 (File)

#### 4.1. 파일 크기
```javascript
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function validateFileSize(file) {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다`
    }
  }
  return { valid: true }
}
```

#### 4.2. 파일 확장자
```javascript
const ALLOWED_EXTENSIONS = {
  document: ['pdf', 'doc', 'docx', 'hwp'],
  image: ['jpg', 'jpeg', 'png', 'gif'],
  excel: ['xls', 'xlsx', 'csv']
}

function validateFileExtension(file, type = 'document') {
  const extension = file.name.split('.').pop().toLowerCase()
  const allowed = ALLOWED_EXTENSIONS[type]

  if (!allowed.includes(extension)) {
    return {
      valid: false,
      message: `허용되지 않는 파일 형식입니다 (허용: ${allowed.join(', ')})`
    }
  }

  return { valid: true }
}
```

#### 4.3. MIME 타입
```javascript
const ALLOWED_MIME_TYPES = {
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/png', 'image/gif']
}

function validateMimeType(file, type = 'document') {
  const allowed = ALLOWED_MIME_TYPES[type]

  if (!allowed.includes(file.type)) {
    return { valid: false, message: "허용되지 않는 파일 형식입니다" }
  }

  return { valid: true }
}
```

#### 4.4. 파일명 검증
```javascript
// 위험한 문자 제거
const DANGEROUS_CHARS = /[<>:"\/\\|?*\x00-\x1f]/g

function validateFileName(fileName) {
  if (DANGEROUS_CHARS.test(fileName)) {
    return { valid: false, message: "파일명에 사용할 수 없는 문자가 포함되어 있습니다" }
  }

  if (fileName.length > 255) {
    return { valid: false, message: "파일명이 너무 깁니다 (최대: 255자)" }
  }

  return { valid: true }
}
```

---

## 📋 엔티티별 검증 규칙

### 1. 회사 정보 (Company Info)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| companyName | string | Y | 1-100자 | "회사명을 입력해주세요" / "회사명은 100자를 초과할 수 없습니다" |
| ceoName | string | Y | 1-50자 | "대표자명을 입력해주세요" / "대표자명은 50자를 초과할 수 없습니다" |
| businessNumber | string | Y | 형식: XXX-XX-XXXXX | "사업자번호를 입력해주세요" / "올바른 사업자번호 형식이 아닙니다" |
| address | string | Y | 1-255자 | "주소를 입력해주세요" / "주소는 255자를 초과할 수 없습니다" |
| phone | string | Y | 전화번호 형식 | "전화번호를 입력해주세요" / "올바른 전화번호 형식이 아닙니다" |
| email | string | Y | 이메일 형식 | "이메일을 입력해주세요" / "올바른 이메일 형식이 아닙니다" |

---

### 2. 은행 계좌 (Bank Account)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| bankName | string | Y | 1-50자 | "은행명을 입력해주세요" |
| accountNumber | string | Y | 1-50자 | "계좌번호를 입력해주세요" |
| accountHolder | string | Y | 1-50자 | "예금주를 입력해주세요" |
| isDefault | char | N | 'Y' or 'N' | "올바른 값이 아닙니다" |

**비즈니스 규칙**:
```javascript
// 기본 계좌는 하나만 존재
function validateDefaultAccount(isDefault, accountId = null) {
  if (isDefault === 'Y') {
    // DB 조회: 다른 기본 계좌 존재 여부 확인
    const existingDefault = await db.query(
      'SELECT id FROM bank_account WHERE is_default = "Y" AND id != ?',
      [accountId]
    )

    if (existingDefault.length > 0) {
      return {
        valid: false,
        message: "이미 기본 계좌가 존재합니다. 기존 기본 계좌를 해제한 후 설정해주세요"
      }
    }
  }

  return { valid: true }
}
```

---

### 3. 고객 (Client)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| companyName | string | Y | 1-100자 | "회사명을 입력해주세요" |
| ceoName | string | Y | 1-50자 | "대표자명을 입력해주세요" |
| contactName | string | Y | 1-50자 | "담당자명을 입력해주세요" |
| phone | string | Y | 전화번호 형식 | "전화번호를 입력해주세요" |
| email | string | N | 이메일 형식 | "올바른 이메일 형식이 아닙니다" |
| businessNumber | string | N | 사업자번호 형식 | "올바른 사업자번호 형식이 아닙니다" |
| address | string | N | 최대 255자 | "주소는 255자를 초과할 수 없습니다" |
| memo | string | N | 최대 1000자 | "메모는 1000자를 초과할 수 없습니다" |
| status | string | N | active/inactive/suspended | "올바른 상태값이 아닙니다" |
| reportFrequency | string | N | monthly/weekly/daily | "올바른 발송 주기가 아닙니다" |
| reportDay | string | N | 1-31 | "올바른 발송일이 아닙니다" |
| reportEmails | string | N | 이메일 목록 (쉼표 구분) | "올바른 이메일 형식이 아닙니다" |
| reportEnabled | char | N | 'Y' or 'N' | "올바른 값이 아닙니다" |

**비즈니스 규칙**:
```javascript
// 보고서 활성화 시 필수 필드
function validateReportSettings(data) {
  if (data.reportEnabled === 'Y') {
    if (!data.reportFrequency) {
      return { valid: false, message: "발송 주기를 선택해주세요" }
    }
    if (!data.reportDay) {
      return { valid: false, message: "발송일을 입력해주세요" }
    }
    if (!data.reportEmails) {
      return { valid: false, message: "수신 이메일을 입력해주세요" }
    }

    // 이메일 목록 검증
    const emails = data.reportEmails.split(',').map(e => e.trim())
    for (const email of emails) {
      const result = validateEmail(email)
      if (!result.valid) {
        return { valid: false, message: `올바르지 않은 이메일이 포함되어 있습니다: ${email}` }
      }
    }
  }

  return { valid: true }
}

// 고객 삭제 시 연관 데이터 확인
function validateClientDeletion(clientId) {
  const dependencies = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM store WHERE client_id = ?) as stores,
      (SELECT COUNT(*) FROM contract WHERE client_id = ?) as contracts,
      (SELECT COUNT(*) FROM sales_order WHERE client_id = ?) as orders
  `, [clientId, clientId, clientId])

  const { stores, contracts, orders } = dependencies[0]

  if (stores > 0 || contracts > 0 || orders > 0) {
    return {
      valid: false,
      message: "연관된 데이터가 있어 삭제할 수 없습니다",
      details: { stores, contracts, orders }
    }
  }

  return { valid: true }
}
```

---

### 4. 광고 계정 (Ad Account)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| platform | string | Y | 1-50자 | "플랫폼을 입력해주세요" |
| accountId | string | Y | 1-100자 | "계정 ID를 입력해주세요" |
| password | string | N | 1-255자 (암호화 전) | "비밀번호는 255자를 초과할 수 없습니다" |
| apiKey | string | N | 1-500자 (암호화 전) | "API 키는 500자를 초과할 수 없습니다" |
| accessLevel | string | N | 1-50자 | "접근 권한은 50자를 초과할 수 없습니다" |
| expiryDate | date | N | 날짜 형식 | "올바른 날짜 형식이 아닙니다" |
| status | string | N | active/inactive/expired | "올바른 상태값이 아닙니다" |

**비즈니스 규칙**:
```javascript
// 만료일 검증
function validateExpiryDate(expiryDate) {
  if (!expiryDate) return { valid: true }

  const result = validateDate(expiryDate)
  if (!result.valid) return result

  // 과거 날짜 경고 (에러 아님)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (result.date < today) {
    return {
      valid: true,
      warning: "만료일이 과거입니다. 계정 상태를 'expired'로 변경하는 것을 권장합니다"
    }
  }

  return { valid: true }
}
```

---

### 5. 매장 (Store)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| storeName | string | Y | 1-100자 | "매장명을 입력해주세요" |
| address | string | N | 최대 255자 | "주소는 255자를 초과할 수 없습니다" |
| businessType | string | N | 최대 50자 | "업종은 50자를 초과할 수 없습니다" |
| phone | string | N | 전화번호 형식 | "올바른 전화번호 형식이 아닙니다" |
| memo | string | N | 최대 1000자 | "메모는 1000자를 초과할 수 없습니다" |

---

### 6. 상품 카테고리 (Product Category)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| categoryName | string | Y | 1-100자 | "카테고리명을 입력해주세요" |
| defaultPrice | decimal | Y | >= 0 | "기본 단가를 입력해주세요" / "기본 단가는 0 이상이어야 합니다" |
| description | string | N | 최대 500자 | "설명은 500자를 초과할 수 없습니다" |

**비즈니스 규칙**:
```javascript
// 카테고리명 중복 검증
function validateCategoryNameDuplicate(categoryName, categoryId = null) {
  const existing = await db.query(
    'SELECT id FROM product_category WHERE category_name = ? AND id != ?',
    [categoryName, categoryId]
  )

  if (existing.length > 0) {
    return { valid: false, message: "이미 존재하는 카테고리명입니다" }
  }

  return { valid: true }
}
```

---

### 7. 고객별 단가 (Client Product Price)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| productCategoryId | integer | Y | 존재하는 카테고리 ID | "상품 카테고리를 선택해주세요" |
| customPrice | decimal | Y | > 0 | "단가를 입력해주세요" / "단가는 0보다 커야 합니다" |
| effectiveFrom | date | Y | 날짜 형식 | "시작일을 입력해주세요" |
| effectiveUntil | date | N | 날짜 형식, >= effectiveFrom | "종료일은 시작일 이후여야 합니다" |
| memo | string | N | 최대 500자 | "메모는 500자를 초과할 수 없습니다" |

**비즈니스 규칙**:
```javascript
// 기간 중복 검증
function validatePricePeriodOverlap(data) {
  const query = `
    SELECT id
    FROM client_product_price
    WHERE client_id = ?
      AND product_category_id = ?
      AND id != ?
      AND (
        (effective_from <= ? AND (effective_until IS NULL OR effective_until >= ?))
        OR
        (effective_from <= ? AND (effective_until IS NULL OR effective_until >= ?))
        OR
        (effective_from >= ? AND effective_from <= ?)
      )
  `

  const params = [
    data.clientId,
    data.productCategoryId,
    data.id || 0,
    data.effectiveFrom, data.effectiveFrom,
    data.effectiveUntil || '9999-12-31', data.effectiveUntil || '9999-12-31',
    data.effectiveFrom, data.effectiveUntil || '9999-12-31'
  ]

  const existing = await db.query(query, params)

  if (existing.length > 0) {
    return {
      valid: false,
      message: "해당 기간에 이미 등록된 단가가 있습니다",
      details: { existingId: existing[0].id }
    }
  }

  return { valid: true }
}
```

---

### 8. 견적서 (Quote)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| storeId | integer | N | 존재하는 매장 ID | "올바른 매장을 선택해주세요" |
| quoteDate | date | Y | 날짜 형식 | "견적일을 입력해주세요" |
| status | string | N | pending/approved/rejected/converted | "올바른 상태값이 아닙니다" |
| vatIncluded | char | N | 'Y' or 'N' | "올바른 값이 아닙니다" |
| memo | string | N | 최대 1000자 | "메모는 1000자를 초과할 수 없습니다" |
| items | array | Y | 최소 1개 | "최소 1개 이상의 품목을 추가해주세요" |

**견적 품목 (Quote Item)**:
| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| productName | string | Y | 1-100자 | "상품명을 입력해주세요" |
| quantity | integer | Y | >= 1 | "수량은 1 이상이어야 합니다" |
| unitPrice | decimal | Y | >= 0 | "단가는 0 이상이어야 합니다" |
| memo | string | N | 최대 500자 | "메모는 500자를 초과할 수 없습니다" |

**비즈니스 규칙**:
```javascript
// 견적서 수정 가능 여부
function validateQuoteEditable(quoteStatus) {
  if (quoteStatus === 'converted') {
    return {
      valid: false,
      message: "이미 주문으로 전환된 견적서는 수정할 수 없습니다"
    }
  }

  return { valid: true }
}

// 견적서 삭제 가능 여부
function validateQuoteDeletable(quoteStatus) {
  if (quoteStatus === 'converted') {
    return {
      valid: false,
      message: "이미 주문으로 전환된 견적서는 삭제할 수 없습니다"
    }
  }

  return { valid: true }
}

// 주문 전환 가능 여부
function validateQuoteConvertible(quoteStatus) {
  if (quoteStatus === 'converted') {
    return {
      valid: false,
      message: "이미 전환된 견적서입니다"
    }
  }

  if (quoteStatus === 'rejected') {
    return {
      valid: false,
      message: "거부된 견적서는 주문으로 전환할 수 없습니다"
    }
  }

  return { valid: true }
}
```

---

### 9. 주문 (Order)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| storeId | integer | N | 존재하는 매장 ID | "올바른 매장을 선택해주세요" |
| quoteId | integer | N | 존재하는 견적서 ID | "올바른 견적서를 선택해주세요" |
| orderDate | date | Y | 날짜 형식 | "주문일을 입력해주세요" |
| deliveryDate | date | N | 날짜 형식, >= orderDate | "납품일은 주문일 이후여야 합니다" |
| status | string | N | pending/in_progress/completed/cancelled | "올바른 상태값이 아닙니다" |
| vatIncluded | char | N | 'Y' or 'N' | "올바른 값이 아닙니다" |
| memo | string | N | 최대 1000자 | "메모는 1000자를 초과할 수 없습니다" |
| items | array | Y | 최소 1개 | "최소 1개 이상의 품목을 추가해주세요" |

**비즈니스 규칙**:
```javascript
// 주문 수정 가능 여부
function validateOrderEditable(orderStatus) {
  if (orderStatus === 'completed') {
    return {
      valid: false,
      message: "완료된 주문은 수정할 수 없습니다"
    }
  }

  if (orderStatus === 'cancelled') {
    return {
      valid: false,
      message: "취소된 주문은 수정할 수 없습니다"
    }
  }

  return { valid: true }
}

// 주문 취소 가능 여부
function validateOrderCancellable(orderId) {
  // 세금계산서 발행 여부 확인
  const invoice = await db.query(
    'SELECT id FROM invoice WHERE order_id = ? AND invoice_type != "cancelled"',
    [orderId]
  )

  if (invoice.length > 0) {
    return {
      valid: false,
      message: "세금계산서가 발행된 주문은 취소할 수 없습니다"
    }
  }

  return { valid: true }
}
```

---

### 10. 계약서 (Contract)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| storeId | integer | N | 존재하는 매장 ID | "올바른 매장을 선택해주세요" |
| contractName | string | Y | 1-255자 | "계약명을 입력해주세요" |
| startDate | date | Y | 날짜 형식 | "시작일을 입력해주세요" |
| endDate | date | Y | 날짜 형식, > startDate | "종료일은 시작일 이후여야 합니다" |
| contractAmount | decimal | Y | >= 0 | "계약 금액을 입력해주세요" |
| contractSummary | string | N | 최대 2000자 | "계약 내용은 2000자를 초과할 수 없습니다" |
| isAutoRenewal | char | N | 'Y' or 'N' | "올바른 값이 아닙니다" |

**비즈니스 규칙**:
```javascript
// 계약 기간 검증
function validateContractPeriod(startDate, endDate) {
  const result = validateDateRange(startDate, endDate)
  if (!result.valid) return result

  // 최소 계약 기간: 1일
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end <= start) {
    return { valid: false, message: "계약 종료일은 시작일보다 이후여야 합니다" }
  }

  return { valid: true }
}
```

---

### 11. 세금계산서 (Invoice)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| orderId | integer | N | 존재하는 주문 ID | "올바른 주문을 선택해주세요" |
| issueDate | date | Y | 날짜 형식 | "발행일을 입력해주세요" |
| subtotal | decimal | Y | >= 0 | "공급가액을 입력해주세요" |
| vat | decimal | Y | >= 0 | "부가세를 입력해주세요" |
| total | decimal | Y | = subtotal + vat | "합계 금액이 올바르지 않습니다" |
| invoiceType | string | N | normal/modified/cancelled | "올바른 유형이 아닙니다" |

**비즈니스 규칙**:
```javascript
// 세금계산서 중복 발행 검증
function validateInvoiceDuplicate(orderId) {
  const existing = await db.query(
    'SELECT id, invoice_number FROM invoice WHERE order_id = ? AND invoice_type = "normal"',
    [orderId]
  )

  if (existing.length > 0) {
    return {
      valid: false,
      message: "해당 주문에 대한 세금계산서가 이미 발행되었습니다",
      details: {
        existingInvoiceId: existing[0].id,
        existingInvoiceNumber: existing[0].invoice_number
      }
    }
  }

  return { valid: true }
}

// 수정 세금계산서 발행 가능 여부
function validateInvoiceModifiable(invoiceId) {
  const invoice = await db.query(
    'SELECT is_paid FROM invoice WHERE id = ?',
    [invoiceId]
  )

  if (invoice[0].is_paid === 'Y') {
    return {
      valid: false,
      message: "입금이 완료된 세금계산서는 수정할 수 없습니다"
    }
  }

  return { valid: true }
}

// VAT 계산 검증
function validateVatCalculation(subtotal, vat) {
  const calculatedVat = Math.round(subtotal * 0.1)

  if (Math.abs(vat - calculatedVat) > 0.01) {
    return {
      valid: false,
      message: `부가세 계산이 올바르지 않습니다 (계산값: ${calculatedVat})`
    }
  }

  return { valid: true }
}
```

---

### 12. 입금 (Payment)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| invoiceId | integer | Y | 존재하는 세금계산서 ID | "세금계산서를 선택해주세요" |
| paymentDate | date | Y | 날짜 형식 | "입금일을 입력해주세요" |
| amount | decimal | Y | > 0 | "입금액을 입력해주세요" / "입금액은 0보다 커야 합니다" |
| bankAccountId | integer | Y | 존재하는 계좌 ID | "입금 계좌를 선택해주세요" |
| memo | string | N | 최대 500자 | "메모는 500자를 초과할 수 없습니다" |

**비즈니스 규칙**:
```javascript
// 입금액 초과 검증
function validatePaymentAmount(invoiceId, amount, paymentId = null) {
  const invoice = await db.query(`
    SELECT
      total,
      (SELECT COALESCE(SUM(amount), 0)
       FROM payment
       WHERE invoice_id = ? AND id != ?) as paid_amount
    FROM invoice
    WHERE id = ?
  `, [invoiceId, paymentId || 0, invoiceId])

  const { total, paid_amount } = invoice[0]
  const remaining = total - paid_amount

  if (amount > remaining) {
    return {
      valid: false,
      message: `입금액이 미수금을 초과합니다 (미수금: ${remaining}원)`
    }
  }

  return { valid: true }
}
```

---

### 13. 보고서 (Report)

| 필드 | 타입 | 필수 | 검증 규칙 | 에러 메시지 |
|------|------|------|-----------|-------------|
| clientId | integer | Y | 존재하는 고객 ID | "고객을 선택해주세요" |
| storeId | integer | Y | 존재하는 매장 ID | "매장을 선택해주세요" |
| reportPeriodStart | date | Y | 날짜 형식 | "보고 기간 시작일을 입력해주세요" |
| reportPeriodEnd | date | Y | 날짜 형식, >= start | "보고 기간 종료일은 시작일 이후여야 합니다" |
| template | string | Y | 1-50자 | "템플릿을 선택해주세요" |
| impressions | integer | N | >= 0 | "노출수는 0 이상이어야 합니다" |
| clicks | integer | N | >= 0 | "클릭수는 0 이상이어야 합니다" |
| conversions | integer | N | >= 0 | "전환수는 0 이상이어야 합니다" |
| cost | decimal | N | >= 0 | "광고비는 0 이상이어야 합니다" |
| reviewCount | integer | N | >= 0 | "리뷰 수는 0 이상이어야 합니다" |
| rating | decimal | N | 0-5 | "평점은 0-5 사이여야 합니다" |
| summary | string | N | 최대 2000자 | "성과 요약은 2000자를 초과할 수 없습니다" |
| improvements | string | N | 최대 2000자 | "개선 사항은 2000자를 초과할 수 없습니다" |

**비즈니스 규칙**:
```javascript
// 키워드 순위 JSON 검증
function validateKeywordRanking(keywordRanking) {
  if (!keywordRanking) return { valid: true }

  try {
    const parsed = JSON.parse(keywordRanking)

    if (!Array.isArray(parsed)) {
      return { valid: false, message: "키워드 순위는 배열 형식이어야 합니다" }
    }

    for (const item of parsed) {
      if (!item.keyword || typeof item.rank !== 'number') {
        return {
          valid: false,
          message: "각 키워드는 'keyword'와 'rank' 필드를 가져야 합니다"
        }
      }
    }

    return { valid: true }
  } catch (e) {
    return { valid: false, message: "올바른 JSON 형식이 아닙니다" }
  }
}
```

---

## ⚠️ 에러 응답 형식

### HTTP 422 Unprocessable Entity (검증 실패)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값 검증에 실패했습니다",
    "details": {
      "companyName": ["회사명을 입력해주세요"],
      "phone": ["올바른 전화번호 형식이 아닙니다"],
      "email": ["올바른 이메일 형식이 아닙니다"]
    }
  }
}
```

### HTTP 409 Conflict (비즈니스 규칙 위반)

```json
{
  "success": false,
  "error": {
    "code": "QUOTE_ALREADY_CONVERTED",
    "message": "이미 주문으로 전환된 견적서는 수정할 수 없습니다",
    "details": {
      "quoteId": 5,
      "orderId": 10
    }
  }
}
```

---

## 🔍 SQL Injection 방지

### Prepared Statements 사용
```javascript
// ❌ 위험: SQL Injection 취약
const query = `SELECT * FROM client WHERE company_name = '${companyName}'`

// ✅ 안전: Prepared Statement
const query = 'SELECT * FROM client WHERE company_name = ?'
const result = await db.query(query, [companyName])
```

---

## 🛡️ XSS 방지

### 입력값 이스케이프
```javascript
// HTML 이스케이프
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

// 사용 예
const safeName = escapeHtml(userInput)
```

---

## 🔐 Path Traversal 방지

### 파일 경로 검증
```javascript
function validateFilePath(filePath) {
  // 위험한 패턴
  const dangerousPatterns = [
    '../',
    '..\\',
    '/etc/',
    'C:\\',
    '/root/',
    '/home/'
  ]

  for (const pattern of dangerousPatterns) {
    if (filePath.includes(pattern)) {
      return { valid: false, message: "허용되지 않는 파일 경로입니다" }
    }
  }

  // 허용된 디렉토리 내에 있는지 확인
  const allowedBase = '/uploads/'
  const resolved = path.resolve(filePath)

  if (!resolved.startsWith(path.resolve(allowedBase))) {
    return { valid: false, message: "허용되지 않는 파일 경로입니다" }
  }

  return { valid: true }
}
```

---

**문서 버전**: 1.0
**최종 수정일**: 2025-11-14
**작성자**: Claude (Validation Engineer)
**다음 검토 예정일**: Sprint 1 착수 전

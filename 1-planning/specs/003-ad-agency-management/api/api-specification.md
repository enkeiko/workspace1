# API 명세서 - Phase 1

**프로젝트명**: 42ment 광고대행사 관리 시스템
**Phase**: 1 (MVP)
**버전**: 1.0
**작성일**: 2025-11-14
**API Version**: v1

---

## 📌 API 개요

### Base URL
```
Production:  https://api.42ment.com/v1
Development: http://localhost:3000/v1
```

### 인증 방식
- **JWT Bearer Token**
- Header: `Authorization: Bearer {token}`

### 공통 응답 형식

**성공 응답**:
```json
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지 (선택)"
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": { ... }
  }
}
```

### HTTP 상태 코드
- `200 OK`: 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 중복/충돌
- `422 Unprocessable Entity`: 검증 실패
- `500 Internal Server Error`: 서버 오류

---

## 🔐 1. 인증 (Authentication)

### 1.1. 로그인

**POST** `/auth/login`

**Request**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "admin",
      "name": "관리자"
    }
  }
}
```

---

### 1.2. 로그아웃

**POST** `/auth/logout`

**Request**: (Empty body)

**Response** (200):
```json
{
  "success": true,
  "message": "로그아웃되었습니다"
}
```

---

### 1.3. 비밀번호 변경

**POST** `/auth/change-password`

**Request**:
```json
{
  "oldPassword": "old123",
  "newPassword": "new123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "비밀번호가 변경되었습니다"
}
```

---

## 🏢 2. 내정보 관리 (Company Info)

### 2.1. 회사 정보 조회

**GET** `/company/info`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyName": "42ment 광고대행사",
    "ceoName": "홍길동",
    "businessNumber": "123-45-67890",
    "address": "서울시 강남구...",
    "phone": "02-1234-5678",
    "email": "info@42ment.com",
    "businessRegistrationFile": "/uploads/2025/11/company/1/...",
    "createdAt": "2025-11-01T00:00:00Z",
    "updatedAt": "2025-11-14T10:30:00Z"
  }
}
```

---

### 2.2. 회사 정보 수정

**PUT** `/company/info`

**Request**:
```json
{
  "companyName": "42ment 광고대행사",
  "ceoName": "홍길동",
  "businessNumber": "123-45-67890",
  "address": "서울시 강남구...",
  "phone": "02-1234-5678",
  "email": "info@42ment.com"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 회사 정보 */ },
  "message": "회사 정보가 수정되었습니다"
}
```

---

### 2.3. 사업자등록증 업로드

**POST** `/company/info/business-registration`

**Request**: (multipart/form-data)
```
file: <binary>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "filePath": "/uploads/2025/11/company/1/20251114153045_a7f3b2_사업자등록증.pdf"
  },
  "message": "파일이 업로드되었습니다"
}
```

---

## 💳 3. 회사 계좌 (Bank Account)

### 3.1. 계좌 목록 조회

**GET** `/bank-accounts`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "bankName": "국민은행",
      "accountNumber": "123-456-789",
      "accountHolder": "42ment",
      "isDefault": "Y",
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### 3.2. 계좌 등록

**POST** `/bank-accounts`

**Request**:
```json
{
  "bankName": "국민은행",
  "accountNumber": "123-456-789",
  "accountHolder": "42ment",
  "isDefault": "N"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 계좌 정보 */ },
  "message": "계좌가 등록되었습니다"
}
```

---

### 3.3. 계좌 수정

**PUT** `/bank-accounts/:id`

**Request**:
```json
{
  "bankName": "신한은행",
  "accountNumber": "987-654-321",
  "accountHolder": "42ment",
  "isDefault": "Y"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 계좌 정보 */ },
  "message": "계좌가 수정되었습니다"
}
```

---

### 3.4. 계좌 삭제

**DELETE** `/bank-accounts/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "계좌가 삭제되었습니다"
}
```

---

## 👥 4. 고객 관리 (Client)

### 4.1. 고객 목록 조회

**GET** `/clients`

**Query Parameters**:
- `page` (integer, default: 1): 페이지 번호
- `limit` (integer, default: 20): 페이지당 개수
- `search` (string): 검색어 (회사명, 담당자명, 전화번호)
- `status` (string): 상태 필터 (active/inactive/suspended)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "companyName": "ABC 카페",
        "ceoName": "김철수",
        "contactName": "이영희",
        "phone": "010-1234-5678",
        "email": "abc@example.com",
        "businessNumber": "111-22-33444",
        "address": "서울시 강남구...",
        "memo": "우수 고객",
        "status": "active",
        "reportFrequency": "monthly",
        "reportEnabled": "Y",
        "createdAt": "2025-11-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

### 4.2. 고객 상세 조회

**GET** `/clients/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyName": "ABC 카페",
    "ceoName": "김철수",
    "contactName": "이영희",
    "phone": "010-1234-5678",
    "email": "abc@example.com",
    "businessNumber": "111-22-33444",
    "address": "서울시 강남구...",
    "memo": "우수 고객",
    "status": "active",
    "reportFrequency": "monthly",
    "reportDay": "5",
    "reportEmails": "abc@example.com,manager@example.com",
    "reportTemplate": "monthly_report",
    "reportEnabled": "Y",
    "deactivatedAt": null,
    "deactivationReason": null,
    "createdAt": "2025-11-01T00:00:00Z",
    "updatedAt": "2025-11-14T10:30:00Z"
  }
}
```

---

### 4.3. 고객 등록

**POST** `/clients`

**Request**:
```json
{
  "companyName": "ABC 카페",
  "ceoName": "김철수",
  "contactName": "이영희",
  "phone": "010-1234-5678",
  "email": "abc@example.com",
  "businessNumber": "111-22-33444",
  "address": "서울시 강남구...",
  "memo": "우수 고객",
  "reportFrequency": "monthly",
  "reportDay": "5",
  "reportEmails": "abc@example.com,manager@example.com",
  "reportTemplate": "monthly_report",
  "reportEnabled": "Y"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 고객 정보 */ },
  "message": "고객이 등록되었습니다"
}
```

---

### 4.4. 고객 수정

**PUT** `/clients/:id`

**Request**: (4.3과 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 고객 정보 */ },
  "message": "고객 정보가 수정되었습니다"
}
```

---

### 4.5. 고객 삭제

**DELETE** `/clients/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "고객이 삭제되었습니다"
}
```

**Error** (409 - 연관 데이터 존재):
```json
{
  "success": false,
  "error": {
    "code": "CLIENT_HAS_DEPENDENCIES",
    "message": "연관된 데이터가 있어 삭제할 수 없습니다",
    "details": {
      "stores": 3,
      "orders": 10
    }
  }
}
```

---

### 4.6. 고객 비활성화

**POST** `/clients/:id/deactivate`

**Request**:
```json
{
  "reason": "계약 종료"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "고객이 비활성화되었습니다"
}
```

---

### 4.7. 고객 재활성화

**POST** `/clients/:id/reactivate`

**Response** (200):
```json
{
  "success": true,
  "message": "고객이 재활성화되었습니다"
}
```

---

### 4.8. 고객 목록 다운로드

**GET** `/clients/export`

**Query Parameters**:
- `format` (string): csv | excel
- `search`, `status`: 필터 조건

**Response** (200):
```
Content-Type: text/csv (or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
Content-Disposition: attachment; filename="clients_20251114.csv"

(CSV/Excel 파일 바이너리)
```

---

## 📱 5. 광고 계정 (Ad Account)

### 5.1. 고객별 광고 계정 조회

**GET** `/clients/:clientId/ad-accounts`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "clientId": 1,
      "platform": "naver",
      "accountId": "naver_abc123",
      "password": "******",
      "apiKey": "******",
      "accessLevel": "admin",
      "expiryDate": "2026-12-31",
      "status": "active",
      "memo": "메인 계정",
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### 5.2. 광고 계정 등록

**POST** `/clients/:clientId/ad-accounts`

**Request**:
```json
{
  "platform": "naver",
  "accountId": "naver_abc123",
  "password": "plaintext_password",
  "apiKey": "plaintext_api_key",
  "accessLevel": "admin",
  "expiryDate": "2026-12-31",
  "status": "active",
  "memo": "메인 계정"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 계정 정보 (비밀번호/API 키는 마스킹) */ },
  "message": "광고 계정이 등록되었습니다"
}
```

---

### 5.3. 광고 계정 비밀번호/API 키 조회 (복호화)

**GET** `/ad-accounts/:id/credentials`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "password": "decrypted_password",
    "apiKey": "decrypted_api_key"
  }
}
```

**참고**:
- 조회 시마다 감사 로그에 기록
- 1분에 10회 제한 (rate limiting)

---

### 5.4. 광고 계정 수정

**PUT** `/ad-accounts/:id`

**Request**: (5.2와 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 계정 정보 */ },
  "message": "광고 계정이 수정되었습니다"
}
```

---

### 5.5. 광고 계정 삭제

**DELETE** `/ad-accounts/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "광고 계정이 삭제되었습니다"
}
```

---

## 🏪 6. 매장 관리 (Store)

### 6.1. 매장 목록 조회

**GET** `/stores`

**Query Parameters**:
- `page`, `limit`: 페이지네이션
- `clientId` (integer): 고객 ID 필터
- `search` (string): 검색어 (매장명, 주소)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "clientId": 1,
        "clientName": "ABC 카페",
        "storeName": "ABC 강남점",
        "address": "서울시 강남구...",
        "businessType": "카페",
        "phone": "02-1234-5678",
        "memo": "",
        "createdAt": "2025-11-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 6.2. 매장 상세 조회

**GET** `/stores/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clientId": 1,
    "clientName": "ABC 카페",
    "storeName": "ABC 강남점",
    "address": "서울시 강남구...",
    "businessType": "카페",
    "phone": "02-1234-5678",
    "memo": "",
    "createdAt": "2025-11-01T00:00:00Z",
    "updatedAt": "2025-11-14T10:30:00Z"
  }
}
```

---

### 6.3. 매장 등록

**POST** `/stores`

**Request**:
```json
{
  "clientId": 1,
  "storeName": "ABC 강남점",
  "address": "서울시 강남구...",
  "businessType": "카페",
  "phone": "02-1234-5678",
  "memo": ""
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 매장 정보 */ },
  "message": "매장이 등록되었습니다"
}
```

---

### 6.4. 매장 수정

**PUT** `/stores/:id`

**Request**: (6.3과 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 매장 정보 */ },
  "message": "매장 정보가 수정되었습니다"
}
```

---

### 6.5. 매장 삭제

**DELETE** `/stores/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "매장이 삭제되었습니다"
}
```

---

## 📦 7. 상품 관리 (Product)

### 7.1. 상품 카테고리 목록 조회

**GET** `/product-categories`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "categoryName": "블로그 작업",
      "defaultPrice": 50000,
      "description": "블로그 포스팅 작업",
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### 7.2. 상품 카테고리 등록

**POST** `/product-categories`

**Request**:
```json
{
  "categoryName": "블로그 작업",
  "defaultPrice": 50000,
  "description": "블로그 포스팅 작업"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 카테고리 정보 */ },
  "message": "상품 카테고리가 등록되었습니다"
}
```

---

### 7.3. 고객별 특별 단가 조회

**GET** `/clients/:clientId/product-prices`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "clientId": 1,
      "productCategoryId": 1,
      "categoryName": "블로그 작업",
      "customPrice": 45000,
      "effectiveFrom": "2025-11-01",
      "effectiveUntil": "2025-12-31",
      "memo": "연말 특별 할인",
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### 7.4. 고객별 특별 단가 등록

**POST** `/clients/:clientId/product-prices`

**Request**:
```json
{
  "productCategoryId": 1,
  "customPrice": 45000,
  "effectiveFrom": "2025-11-01",
  "effectiveUntil": "2025-12-31",
  "memo": "연말 특별 할인"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 특별 단가 정보 */ },
  "message": "고객별 단가가 등록되었습니다"
}
```

**Error** (409 - 기간 중복):
```json
{
  "success": false,
  "error": {
    "code": "PRICE_PERIOD_OVERLAP",
    "message": "해당 기간에 이미 등록된 단가가 있습니다",
    "details": {
      "existingId": 5,
      "existingPeriod": "2025-10-01 ~ 2025-12-31"
    }
  }
}
```

---

### 7.5. 고객별 특별 단가 삭제

**DELETE** `/client-product-prices/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "고객별 단가가 삭제되었습니다"
}
```

---

## 📝 8. 견적서 관리 (Quote)

### 8.1. 견적서 목록 조회

**GET** `/quotes`

**Query Parameters**:
- `page`, `limit`: 페이지네이션
- `clientId` (integer): 고객 ID 필터
- `status` (string): 상태 필터 (pending/approved/rejected/converted)
- `startDate`, `endDate` (string): 날짜 범위 (YYYY-MM-DD)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "quoteNumber": "Q-202511-001",
        "clientId": 1,
        "clientName": "ABC 카페",
        "storeId": 1,
        "storeName": "ABC 강남점",
        "quoteDate": "2025-11-14",
        "status": "pending",
        "subtotal": 100000,
        "vat": 10000,
        "total": 110000,
        "vatIncluded": "N",
        "createdAt": "2025-11-14T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 8.2. 견적서 상세 조회

**GET** `/quotes/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "quoteNumber": "Q-202511-001",
    "clientId": 1,
    "clientName": "ABC 카페",
    "storeId": 1,
    "storeName": "ABC 강남점",
    "quoteDate": "2025-11-14",
    "status": "pending",
    "subtotal": 100000,
    "vat": 10000,
    "total": 110000,
    "vatIncluded": "N",
    "memo": "11월 작업 견적",
    "items": [
      {
        "id": 1,
        "productName": "블로그 작업",
        "quantity": 2,
        "unitPrice": 50000,
        "subtotal": 100000,
        "memo": ""
      }
    ],
    "createdAt": "2025-11-14T10:00:00Z",
    "updatedAt": "2025-11-14T10:00:00Z"
  }
}
```

---

### 8.3. 견적서 생성

**POST** `/quotes`

**Request**:
```json
{
  "clientId": 1,
  "storeId": 1,
  "quoteDate": "2025-11-14",
  "vatIncluded": "N",
  "memo": "11월 작업 견적",
  "items": [
    {
      "productName": "블로그 작업",
      "quantity": 2,
      "unitPrice": 50000,
      "memo": ""
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "quoteNumber": "Q-202511-001",
    /* ... */
  },
  "message": "견적서가 생성되었습니다"
}
```

**참고**:
- `quoteNumber`는 자동 생성
- `unitPrice`는 고객별 단가 우선 적용 (없으면 기본 단가)
- `subtotal`, `vat`, `total`은 자동 계산

---

### 8.4. 견적서 수정

**PUT** `/quotes/:id`

**Request**: (8.3과 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 견적서 정보 */ },
  "message": "견적서가 수정되었습니다"
}
```

**Error** (400 - 전환된 견적서):
```json
{
  "success": false,
  "error": {
    "code": "QUOTE_ALREADY_CONVERTED",
    "message": "이미 주문으로 전환된 견적서는 수정할 수 없습니다"
  }
}
```

---

### 8.5. 견적서 삭제

**DELETE** `/quotes/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "견적서가 삭제되었습니다"
}
```

---

### 8.6. 견적서 상태 변경

**PATCH** `/quotes/:id/status`

**Request**:
```json
{
  "status": "approved"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 견적서 정보 */ },
  "message": "견적서 상태가 변경되었습니다"
}
```

---

### 8.7. 견적서 PDF 다운로드

**GET** `/quotes/:id/pdf`

**Response** (200):
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Q-202511-001.pdf"

(PDF 파일 바이너리)
```

---

### 8.8. 견적서 → 주문 전환

**POST** `/quotes/:id/convert-to-order`

**Response** (201):
```json
{
  "success": true,
  "data": {
    "orderId": 10,
    "orderNumber": "O-202511-005"
  },
  "message": "주문으로 전환되었습니다"
}
```

**프로세스**:
1. Quote 상태 → `converted`
2. Order 생성 (quote_id 연결)
3. QuoteItem → OrderItem 복사

---

## 📦 9. 주문 관리 (Order)

### 9.1. 주문 목록 조회

**GET** `/orders`

**Query Parameters**:
- `page`, `limit`: 페이지네이션
- `clientId` (integer): 고객 ID 필터
- `storeId` (integer): 매장 ID 필터
- `status` (string): 상태 필터 (pending/in_progress/completed/cancelled)
- `startDate`, `endDate` (string): 주문일 범위

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "orderNumber": "O-202511-001",
        "clientId": 1,
        "clientName": "ABC 카페",
        "storeId": 1,
        "storeName": "ABC 강남점",
        "orderDate": "2025-11-14",
        "deliveryDate": "2025-11-30",
        "status": "in_progress",
        "total": 110000,
        "createdAt": "2025-11-14T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 9.2. 주문 상세 조회

**GET** `/orders/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "O-202511-001",
    "clientId": 1,
    "clientName": "ABC 카페",
    "storeId": 1,
    "storeName": "ABC 강남점",
    "quoteId": 5,
    "quoteNumber": "Q-202511-003",
    "orderDate": "2025-11-14",
    "deliveryDate": "2025-11-30",
    "status": "in_progress",
    "subtotal": 100000,
    "vat": 10000,
    "total": 110000,
    "vatIncluded": "N",
    "memo": "",
    "items": [
      {
        "id": 1,
        "productName": "블로그 작업",
        "quantity": 2,
        "unitPrice": 50000,
        "subtotal": 100000,
        "memo": ""
      }
    ],
    "createdAt": "2025-11-14T10:00:00Z",
    "updatedAt": "2025-11-14T15:30:00Z"
  }
}
```

---

### 9.3. 주문 생성

**POST** `/orders`

**Request**:
```json
{
  "clientId": 1,
  "storeId": 1,
  "orderDate": "2025-11-14",
  "deliveryDate": "2025-11-30",
  "vatIncluded": "N",
  "memo": "",
  "items": [
    {
      "productName": "블로그 작업",
      "quantity": 2,
      "unitPrice": 50000,
      "memo": ""
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 주문 정보 */ },
  "message": "주문이 생성되었습니다"
}
```

---

### 9.4. 주문 수정

**PUT** `/orders/:id`

**Request**: (9.3과 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 주문 정보 */ },
  "message": "주문이 수정되었습니다"
}
```

**Error** (400 - 완료된 주문):
```json
{
  "success": false,
  "error": {
    "code": "ORDER_ALREADY_COMPLETED",
    "message": "완료된 주문은 수정할 수 없습니다"
  }
}
```

---

### 9.5. 주문 상태 변경

**PATCH** `/orders/:id/status`

**Request**:
```json
{
  "status": "completed"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 주문 정보 */ },
  "message": "주문 상태가 변경되었습니다"
}
```

**Error** (400 - 세금계산서 발행 후 취소):
```json
{
  "success": false,
  "error": {
    "code": "ORDER_HAS_INVOICE",
    "message": "세금계산서가 발행된 주문은 취소할 수 없습니다"
  }
}
```

---

### 9.6. 주문 목록 다운로드

**GET** `/orders/export`

**Query Parameters**:
- `format` (string): csv | excel
- 필터 조건들

**Response** (200): CSV/Excel 파일

---

## 📜 10. 계약서 관리 (Contract)

### 10.1. 계약서 목록 조회

**GET** `/contracts`

**Query Parameters**:
- `page`, `limit`
- `clientId`
- `expiringInDays` (integer): N일 이내 만료 (예: 7, 30)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "clientId": 1,
        "clientName": "ABC 카페",
        "contractName": "2025년 마케팅 대행 계약",
        "startDate": "2025-01-01",
        "endDate": "2025-12-31",
        "contractAmount": 10000000,
        "daysRemaining": 47,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 10.2. 계약서 상세 조회

**GET** `/contracts/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clientId": 1,
    "clientName": "ABC 카페",
    "storeId": null,
    "storeName": null,
    "contractName": "2025년 마케팅 대행 계약",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "contractAmount": 10000000,
    "contractSummary": "블로그 작업 월 10회...",
    "contractFile": "/uploads/2025/11/contract/1/...",
    "parentContractId": null,
    "isAutoRenewal": "N",
    "renewalCount": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

---

### 10.3. 계약서 등록

**POST** `/contracts`

**Request**:
```json
{
  "clientId": 1,
  "storeId": null,
  "contractName": "2025년 마케팅 대행 계약",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "contractAmount": 10000000,
  "contractSummary": "블로그 작업 월 10회...",
  "isAutoRenewal": "N"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 계약 정보 */ },
  "message": "계약서가 등록되었습니다"
}
```

---

### 10.4. 계약서 파일 업로드

**POST** `/contracts/:id/file`

**Request**: (multipart/form-data)
```
file: <binary>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "filePath": "/uploads/2025/11/contract/1/..."
  },
  "message": "계약서 파일이 업로드되었습니다"
}
```

---

### 10.5. 계약 갱신

**POST** `/contracts/:id/renew`

**Request**:
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "contractAmount": 11000000
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "newContractId": 15,
    "parentContractId": 1,
    "renewalCount": 1
  },
  "message": "계약이 갱신되었습니다"
}
```

---

### 10.6. 계약 갱신 이력 조회

**GET** `/contracts/:id/renewal-history`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "contractName": "2025년 마케팅 대행 계약 (1차)",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "contractAmount": 10000000,
      "renewalCount": 0
    },
    {
      "id": 15,
      "contractName": "2025년 마케팅 대행 계약 (2차)",
      "startDate": "2026-01-01",
      "endDate": "2026-12-31",
      "contractAmount": 11000000,
      "renewalCount": 1
    }
  ]
}
```

---

## 💰 11. 세금계산서 관리 (Invoice)

### 11.1. 세금계산서 목록 조회

**GET** `/invoices`

**Query Parameters**:
- `page`, `limit`
- `clientId`
- `invoiceType` (string): normal/modified/cancelled
- `isPaid` (string): Y/N
- `startDate`, `endDate`: 발행일 범위

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "invoiceNumber": "I-202511-001",
        "clientId": 1,
        "clientName": "ABC 카페",
        "orderId": 5,
        "orderNumber": "O-202511-003",
        "issueDate": "2025-11-14",
        "total": 110000,
        "paidAmount": 110000,
        "isPaid": "Y",
        "invoiceType": "normal",
        "createdAt": "2025-11-14T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 11.2. 세금계산서 상세 조회

**GET** `/invoices/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoiceNumber": "I-202511-001",
    "clientId": 1,
    "clientName": "ABC 카페",
    "orderId": 5,
    "orderNumber": "O-202511-003",
    "issueDate": "2025-11-14",
    "subtotal": 100000,
    "vat": 10000,
    "total": 110000,
    "paidAmount": 110000,
    "isPaid": "Y",
    "invoiceType": "normal",
    "originalInvoiceId": null,
    "invoiceFile": "/uploads/2025/11/invoice/1/...",
    "createdAt": "2025-11-14T10:00:00Z",
    "updatedAt": "2025-11-14T15:00:00Z"
  }
}
```

---

### 11.3. 세금계산서 발행 (정상)

**POST** `/invoices`

**Request**:
```json
{
  "clientId": 1,
  "orderId": 5,
  "issueDate": "2025-11-14",
  "subtotal": 100000,
  "vat": 10000,
  "total": 110000
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoiceNumber": "I-202511-001",
    /* ... */
  },
  "message": "세금계산서가 발행되었습니다"
}
```

**Error** (409 - 중복 발행):
```json
{
  "success": false,
  "error": {
    "code": "INVOICE_ALREADY_EXISTS",
    "message": "해당 주문에 대한 세금계산서가 이미 발행되었습니다",
    "details": {
      "existingInvoiceId": 10,
      "existingInvoiceNumber": "I-202511-008"
    }
  }
}
```

---

### 11.4. 수정 세금계산서 발행

**POST** `/invoices/:originalId/modify`

**Request**:
```json
{
  "issueDate": "2025-11-15",
  "subtotal": 120000,
  "vat": 12000,
  "total": 132000
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 25,
    "invoiceNumber": "I-202511-001-M1",
    "invoiceType": "modified",
    "originalInvoiceId": 1,
    /* ... */
  },
  "message": "수정 세금계산서가 발행되었습니다"
}
```

**Error** (400 - 입금 완료):
```json
{
  "success": false,
  "error": {
    "code": "INVOICE_ALREADY_PAID",
    "message": "입금이 완료된 세금계산서는 수정할 수 없습니다"
  }
}
```

---

### 11.5. 취소 세금계산서 발행

**POST** `/invoices/:originalId/cancel`

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 26,
    "invoiceNumber": "I-202511-001-C",
    "invoiceType": "cancelled",
    "originalInvoiceId": 1,
    "subtotal": -100000,
    "vat": -10000,
    "total": -110000,
    /* ... */
  },
  "message": "취소 세금계산서가 발행되었습니다"
}
```

---

### 11.6. 세금계산서 파일 업로드

**POST** `/invoices/:id/file`

**Request**: (multipart/form-data)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "filePath": "/uploads/2025/11/invoice/1/..."
  },
  "message": "세금계산서 파일이 업로드되었습니다"
}
```

---

## 💸 12. 입금 관리 (Payment)

### 12.1. 입금 목록 조회

**GET** `/payments`

**Query Parameters**:
- `page`, `limit`
- `clientId`
- `invoiceId`
- `startDate`, `endDate`: 입금일 범위

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "clientId": 1,
        "clientName": "ABC 카페",
        "invoiceId": 1,
        "invoiceNumber": "I-202511-001",
        "paymentDate": "2025-11-20",
        "amount": 110000,
        "bankAccountId": 1,
        "bankName": "국민은행",
        "memo": "",
        "createdAt": "2025-11-20T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 12.2. 입금 등록

**POST** `/payments`

**Request**:
```json
{
  "clientId": 1,
  "invoiceId": 1,
  "paymentDate": "2025-11-20",
  "amount": 110000,
  "bankAccountId": 1,
  "memo": ""
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 입금 정보 */ },
  "message": "입금이 등록되었습니다"
}
```

**참고**:
- 입금 등록 시 `Invoice.paidAmount` 자동 갱신 (트리거)
- `Invoice.isPaid` 자동 갱신 (paidAmount >= total이면 'Y')

---

### 12.3. 입금 수정

**PUT** `/payments/:id`

**Request**: (12.2와 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 입금 정보 */ },
  "message": "입금 정보가 수정되었습니다"
}
```

---

### 12.4. 입금 삭제

**DELETE** `/payments/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "입금이 삭제되었습니다"
}
```

---

## 📊 13. 정산 및 매출 (Settlement)

### 13.1. 고객별 미수금 조회

**GET** `/settlements/unpaid`

**Query Parameters**:
- `clientId` (integer, optional): 특정 고객만

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "clientId": 1,
      "clientName": "ABC 카페",
      "totalInvoice": 1000000,
      "totalPayment": 800000,
      "unpaidAmount": 200000,
      "unpaidInvoices": [
        {
          "invoiceId": 5,
          "invoiceNumber": "I-202511-003",
          "issueDate": "2025-11-10",
          "total": 110000,
          "paidAmount": 50000,
          "unpaid": 60000,
          "daysOverdue": 4
        }
      ]
    }
  ]
}
```

---

### 13.2. 매출 요약 (월별)

**GET** `/settlements/sales-summary`

**Query Parameters**:
- `startMonth` (string): YYYY-MM
- `endMonth` (string): YYYY-MM

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "month": "2025-11",
      "totalSales": 5000000,
      "totalReceived": 4500000,
      "unpaid": 500000,
      "invoiceCount": 50
    },
    {
      "month": "2025-10",
      "totalSales": 4800000,
      "totalReceived": 4800000,
      "unpaid": 0,
      "invoiceCount": 48
    }
  ]
}
```

---

### 13.3. 고객별 매출 조회

**GET** `/settlements/sales-by-client`

**Query Parameters**:
- `startDate`, `endDate` (string): YYYY-MM-DD

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "clientId": 1,
      "clientName": "ABC 카페",
      "totalSales": 1200000,
      "orderCount": 12,
      "avgOrderAmount": 100000
    }
  ]
}
```

---

### 13.4. 상품별 매출 조회

**GET** `/settlements/sales-by-product`

**Query Parameters**:
- `startDate`, `endDate`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "productName": "블로그 작업",
      "totalQuantity": 100,
      "totalSales": 5000000,
      "avgPrice": 50000
    }
  ]
}
```

---

## 📄 14. 보고서 관리 (Report)

### 14.1. 보고서 목록 조회

**GET** `/reports`

**Query Parameters**:
- `page`, `limit`
- `clientId`
- `storeId`
- `startDate`, `endDate`: 보고 기간 시작일 기준

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "clientId": 1,
        "clientName": "ABC 카페",
        "storeId": 1,
        "storeName": "ABC 강남점",
        "reportPeriodStart": "2025-11-01",
        "reportPeriodEnd": "2025-11-30",
        "template": "monthly_report",
        "sentAt": "2025-12-01T10:00:00Z",
        "sentStatus": "success",
        "createdAt": "2025-11-30T15:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 14.2. 보고서 상세 조회

**GET** `/reports/:id`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clientId": 1,
    "clientName": "ABC 카페",
    "storeId": 1,
    "storeName": "ABC 강남점",
    "reportPeriodStart": "2025-11-01",
    "reportPeriodEnd": "2025-11-30",
    "template": "monthly_report",
    "impressions": 100000,
    "clicks": 5000,
    "conversions": 100,
    "cost": 500000,
    "keywordRanking": "[{\"keyword\":\"강남카페\",\"rank\":3}]",
    "reviewCount": 50,
    "rating": 4.5,
    "summary": "11월 성과 요약...",
    "improvements": "개선 사항...",
    "attachments": "[\"path1.png\",\"path2.png\"]",
    "sentAt": "2025-12-01T10:00:00Z",
    "sentTo": "abc@example.com,manager@example.com",
    "sentMethod": "email",
    "sentStatus": "success",
    "createdAt": "2025-11-30T15:00:00Z",
    "updatedAt": "2025-12-01T10:00:00Z"
  }
}
```

---

### 14.3. 보고서 생성

**POST** `/reports`

**Request**:
```json
{
  "clientId": 1,
  "storeId": 1,
  "reportPeriodStart": "2025-11-01",
  "reportPeriodEnd": "2025-11-30",
  "template": "monthly_report",
  "impressions": 100000,
  "clicks": 5000,
  "conversions": 100,
  "cost": 500000,
  "keywordRanking": "[{\"keyword\":\"강남카페\",\"rank\":3}]",
  "reviewCount": 50,
  "rating": 4.5,
  "summary": "11월 성과 요약...",
  "improvements": "개선 사항..."
}
```

**Response** (201):
```json
{
  "success": true,
  "data": { /* 생성된 보고서 정보 */ },
  "message": "보고서가 생성되었습니다"
}
```

---

### 14.4. 보고서 수정

**PUT** `/reports/:id`

**Request**: (14.3과 동일)

**Response** (200):
```json
{
  "success": true,
  "data": { /* 업데이트된 보고서 정보 */ },
  "message": "보고서가 수정되었습니다"
}
```

---

### 14.5. 보고서 첨부 파일 업로드

**POST** `/reports/:id/attachments`

**Request**: (multipart/form-data)
```
files: <binary[]>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "attachments": [
      "/uploads/2025/11/report/1/file1.png",
      "/uploads/2025/11/report/1/file2.png"
    ]
  },
  "message": "파일이 업로드되었습니다"
}
```

---

### 14.6. 보고서 PDF 다운로드

**GET** `/reports/:id/pdf`

**Response** (200):
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="report_202511_ABC카페.pdf"

(PDF 파일 바이너리)
```

---

### 14.7. 보고서 발송 기록

**POST** `/reports/:id/send`

**Request**:
```json
{
  "sentTo": "abc@example.com,manager@example.com",
  "sentMethod": "email"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "sentAt": "2025-12-01T10:00:00Z",
    "sentStatus": "success"
  },
  "message": "발송 이력이 기록되었습니다"
}
```

---

## 🔔 15. 알림 관리 (Notification)

### 15.1. 알림 목록 조회

**GET** `/notifications`

**Query Parameters**:
- `isRead` (string): Y/N
- `notificationType` (string): contract_expiry/ad_account_expiry
- `limit` (integer, default: 50)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "notificationType": "contract_expiry",
      "referenceType": "contract",
      "referenceId": 5,
      "title": "[ABC 카페] 계약 만료 임박",
      "message": "계약명: 2025년 마케팅..., 만료일: 2025-12-31 (D-7)",
      "priority": "high",
      "isRead": "N",
      "readAt": null,
      "createdAt": "2025-11-24T00:00:00Z"
    }
  ]
}
```

---

### 15.2. 읽지 않은 알림 개수

**GET** `/notifications/unread-count`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

### 15.3. 알림 읽음 처리

**PATCH** `/notifications/:id/read`

**Response** (200):
```json
{
  "success": true,
  "message": "알림이 읽음 처리되었습니다"
}
```

---

### 15.4. 전체 알림 읽음 처리

**PATCH** `/notifications/read-all`

**Response** (200):
```json
{
  "success": true,
  "message": "모든 알림이 읽음 처리되었습니다"
}
```

---

### 15.5. 알림 삭제

**DELETE** `/notifications/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "알림이 삭제되었습니다"
}
```

---

## 📋 16. 감사 로그 (Audit Log)

### 16.1. 감사 로그 조회

**GET** `/audit-logs`

**Query Parameters**:
- `tableName` (string): 테이블명
- `recordId` (integer): 레코드 ID
- `userId` (string): 사용자 ID
- `action` (string): INSERT/UPDATE/DELETE
- `startDate`, `endDate`: 날짜 범위
- `page`, `limit`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "tableName": "invoice",
        "recordId": 123,
        "action": "UPDATE",
        "fieldName": "total",
        "oldValue": "1000000",
        "newValue": "1100000",
        "userId": "admin",
        "userIp": "192.168.1.100",
        "createdAt": "2025-11-14T15:30:45Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 16.2. 특정 레코드의 변경 이력

**GET** `/audit-logs/record/:tableName/:recordId`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "action": "INSERT",
      "fieldName": null,
      "oldValue": null,
      "newValue": null,
      "userId": "admin",
      "createdAt": "2025-11-14T10:00:00Z"
    },
    {
      "id": 2,
      "action": "UPDATE",
      "fieldName": "total",
      "oldValue": "1000000",
      "newValue": "1100000",
      "userId": "admin",
      "createdAt": "2025-11-14T15:30:45Z"
    }
  ]
}
```

---

## 📊 17. 대시보드 (Dashboard)

### 17.1. 대시보드 데이터 조회

**GET** `/dashboard`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "monthlySales": {
      "month": "2025-11",
      "totalSales": 5000000,
      "totalReceived": 4500000,
      "unpaid": 500000
    },
    "activeClients": 50,
    "activeStores": 120,
    "expiringContracts": [
      {
        "contractId": 5,
        "clientName": "ABC 카페",
        "contractName": "2025년 마케팅...",
        "endDate": "2025-12-31",
        "daysRemaining": 7
      }
    ],
    "recentOrders": [
      {
        "orderId": 100,
        "orderNumber": "O-202511-050",
        "clientName": "ABC 카페",
        "orderDate": "2025-11-14",
        "total": 110000,
        "status": "in_progress"
      }
    ],
    "recentPayments": [
      {
        "paymentId": 50,
        "clientName": "ABC 카페",
        "paymentDate": "2025-11-14",
        "amount": 110000
      }
    ]
  }
}
```

---

## 🔢 18. 번호 생성 (Sequence)

### 18.1. 다음 번호 미리보기

**GET** `/sequences/preview/:type`

**Path Parameters**:
- `type` (string): quote | order | invoice

**Response** (200):
```json
{
  "success": true,
  "data": {
    "nextNumber": "Q-202511-015",
    "lastNumber": 14
  }
}
```

---

## 📁 19. 파일 관리 (File)

### 19.1. 파일 업로드

**POST** `/files/upload`

**Request**: (multipart/form-data)
```
file: <binary>
entityType: "contract" | "invoice" | "report" | "company"
entityId: <integer>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "filePath": "/uploads/2025/11/contract/123/...",
    "originalFilename": "계약서.pdf",
    "fileSize": 2048576
  },
  "message": "파일이 업로드되었습니다"
}
```

---

### 19.2. 파일 다운로드

**GET** `/files/download`

**Query Parameters**:
- `path` (string): 파일 경로

**Response** (200):
```
Content-Type: {MIME Type}
Content-Disposition: attachment; filename="{original_filename}"

(파일 바이너리)
```

---

## ❌ 공통 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 422 | 검증 실패 |
| `DUPLICATE_ENTRY` | 409 | 중복 데이터 |
| `CLIENT_HAS_DEPENDENCIES` | 409 | 연관 데이터 존재로 삭제 불가 |
| `QUOTE_ALREADY_CONVERTED` | 400 | 이미 전환된 견적서 |
| `ORDER_ALREADY_COMPLETED` | 400 | 이미 완료된 주문 |
| `ORDER_HAS_INVOICE` | 400 | 세금계산서 발행됨 |
| `INVOICE_ALREADY_EXISTS` | 409 | 중복 세금계산서 |
| `INVOICE_ALREADY_PAID` | 400 | 입금 완료로 수정/취소 불가 |
| `PRICE_PERIOD_OVERLAP` | 409 | 고객별 단가 기간 중복 |
| `FILE_TOO_LARGE` | 413 | 파일 크기 초과 |
| `INVALID_FILE_TYPE` | 415 | 지원하지 않는 파일 형식 |
| `INTERNAL_ERROR` | 500 | 서버 오류 |

---

**문서 버전**: 1.0
**최종 수정일**: 2025-11-14
**작성자**: Claude (API Architect)
**다음 검토 예정일**: Sprint 1 착수 전

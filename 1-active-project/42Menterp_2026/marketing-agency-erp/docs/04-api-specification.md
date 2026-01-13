# API 명세서

## 1. API 개요

### 1.1 기본 정보
- **Base URL**: `/api`
- **인증 방식**: 향후 JWT 토큰 (MVP에서는 세션 기반)
- **응답 형식**: JSON
- **에러 처리**: 표준화된 에러 응답

### 1.2 공통 응답 형식

#### 성공 응답
```typescript
{
  success: true,
  data: any,
  message?: string
}
```

#### 에러 응답
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### 1.3 HTTP 상태 코드
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 없음
- `404`: 리소스 없음
- `500`: 서버 에러

## 2. 고객 관리 API

### 2.1 고객 목록 조회
**GET** `/api/customers`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| page | number | 아니오 | 페이지 번호 (기본: 1) |
| limit | number | 아니오 | 페이지당 항목 수 (기본: 20) |
| search | string | 아니오 | 검색어 (이름, 사업자번호) |
| tags | string[] | 아니오 | 태그 필터 |

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "ABC 회사",
        "businessNumber": "123-45-67890",
        "contactPerson": "홍길동",
        "email": "contact@abc.com",
        "phone": "02-1234-5678",
        "address": "서울시 강남구",
        "tags": ["VIP", "정기고객"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 2.2 고객 상세 조회
**GET** `/api/customers/[id]`

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ABC 회사",
    "businessNumber": "123-45-67890",
    "businessRegistrationFile": "/files/business-registration-1.pdf",
    "contactPerson": "홍길동",
    "email": "contact@abc.com",
    "phone": "02-1234-5678",
    "address": "서울시 강남구",
    "notes": "메모",
    "tags": ["VIP", "정기고객"],
    "stores": [
      {
        "id": 1,
        "name": "ABC 강남점",
        "type": "restaurant"
      }
    ],
    "orders": [
      {
        "id": 1,
        "orderNumber": "ORD-2024-001",
        "status": "completed",
        "totalAmount": 1000000
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2.3 고객 생성
**POST** `/api/customers`

#### 요청 Body
```json
{
  "name": "ABC 회사",
  "businessNumber": "123-45-67890",
  "contactPerson": "홍길동",
  "email": "contact@abc.com",
  "phone": "02-1234-5678",
  "address": "서울시 강남구",
  "notes": "메모",
  "tags": ["VIP"]
}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ABC 회사",
    ...
  },
  "message": "고객이 성공적으로 생성되었습니다."
}
```

### 2.4 고객 수정
**PUT** `/api/customers/[id]`

#### 요청 Body
```json
{
  "name": "ABC 회사 (수정)",
  "phone": "02-1234-9999",
  ...
}
```

### 2.5 고객 삭제
**DELETE** `/api/customers/[id]`

#### 응답 예시
```json
{
  "success": true,
  "message": "고객이 성공적으로 삭제되었습니다."
}
```

### 2.6 고객 데이터 다운로드
**GET** `/api/customers/export`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| format | string | 아니오 | 다운로드 형식 (excel, csv) |

#### 응답
- 파일 다운로드 (Excel 또는 CSV)

## 3. 매장 관리 API

### 3.1 매장 목록 조회
**GET** `/api/stores`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| page | number | 아니오 | 페이지 번호 |
| limit | number | 아니오 | 페이지당 항목 수 |
| search | string | 아니오 | 검색어 |

### 3.2 매장 상세 조회
**GET** `/api/stores/[id]`

### 3.3 매장 생성
**POST** `/api/stores`

#### 요청 Body
```json
{
  "customerId": 1,
  "name": "ABC 강남점",
  "type": "restaurant",
  "address": "서울시 강남구",
  "phone": "02-1234-5678",
  "website": "https://abc.com",
  "description": "설명"
}
```

### 3.4 매장 수정
**PUT** `/api/stores/[id]`

### 3.5 매장 삭제
**DELETE** `/api/stores/[id]`

### 3.6 매장 분석 정보 조회
**GET** `/api/stores/[id]/analytics`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | 아니오 | 시작일 (YYYY-MM-DD) |
| endDate | string | 아니오 | 종료일 (YYYY-MM-DD) |

### 3.7 매장 분석 정보 등록
**POST** `/api/stores/[id]/analytics`

#### 요청 Body
```json
{
  "analyticsDate": "2024-01-01",
  "reviewCount": 150,
  "rating": 4.5,
  "ranking": 3,
  "viewCount": 5000,
  "metrics": {
    "customMetric": "value"
  }
}
```

## 4. 주문 관리 API

### 4.1 주문 목록 조회
**GET** `/api/orders`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| storeId | number | 아니오 | 매장 ID 필터 |
| status | string | 아니오 | 주문 상태 필터 |
| startDate | string | 아니오 | 시작일 |
| endDate | string | 아니오 | 종료일 |
| page | number | 아니오 | 페이지 번호 |
| limit | number | 아니오 | 페이지당 항목 수 |

### 4.2 주문 상세 조회
**GET** `/api/orders/[id]`

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-001",
    "customer": {
      "id": 1,
      "name": "ABC 회사"
    },
    "store": {
      "id": 1,
      "name": "ABC 강남점"
    },
    "status": "in_progress",
    "orderDate": "2024-01-01",
    "dueDate": "2024-01-15",
    "totalAmount": 1000000,
    "paidAmount": 500000,
    "unpaidAmount": 500000,
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "name": "마케팅 서비스"
        },
        "quantity": 1,
        "unitPrice": 1000000,
        "totalPrice": 1000000
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 4.3 주문 생성
**POST** `/api/orders`

#### 요청 Body
```json
{
  "customerId": 1,
  "storeId": 1,
  "orderDate": "2024-01-01",
  "dueDate": "2024-01-15",
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "unitPrice": 1000000,
      "notes": "메모"
    }
  ],
  "notes": "주문 메모"
}
```

### 4.4 주문 수정
**PUT** `/api/orders/[id]`

### 4.5 주문 상태 변경
**PATCH** `/api/orders/[id]/status`

#### 요청 Body
```json
{
  "status": "completed"
}
```

### 4.6 주문 결제 처리
**POST** `/api/orders/[id]/payment`

#### 요청 Body
```json
{
  "amount": 500000,
  "paymentDate": "2024-01-10",
  "notes": "입금 확인"
}
```

## 5. 견적서 관리 API

### 5.1 견적서 목록 조회
**GET** `/api/quotations`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| status | string | 아니오 | 상태 필터 |
| page | number | 아니오 | 페이지 번호 |
| limit | number | 아니오 | 페이지당 항목 수 |

### 5.2 견적서 상세 조회
**GET** `/api/quotations/[id]`

### 5.3 견적서 생성
**POST** `/api/quotations`

#### 요청 Body
```json
{
  "customerId": 1,
  "storeId": 1,
  "quotationDate": "2024-01-01",
  "validUntil": "2024-01-31",
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "unitPrice": 1000000,
      "description": "서비스 설명"
    }
  ],
  "notes": "견적서 메모"
}
```

### 5.4 견적서 수정
**PUT** `/api/quotations/[id]`

### 5.5 견적서 상태 변경
**PATCH** `/api/quotations/[id]/status`

#### 요청 Body
```json
{
  "status": "sent"
}
```

### 5.6 견적서에서 주문 생성
**POST** `/api/quotations/[id]/convert-to-order`

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "orderNumber": "ORD-2024-001",
      ...
    }
  },
  "message": "견적서가 주문으로 변환되었습니다."
}
```

## 6. 세금계산서 관리 API

### 6.1 세금계산서 목록 조회
**GET** `/api/invoices`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| orderId | number | 아니오 | 주문 ID 필터 |
| status | string | 아니오 | 상태 필터 |
| isPaid | boolean | 아니오 | 지불 여부 필터 |
| startDate | string | 아니오 | 시작일 |
| endDate | string | 아니오 | 종료일 |

### 6.2 세금계산서 상세 조회
**GET** `/api/invoices/[id]`

### 6.3 세금계산서 생성
**POST** `/api/invoices`

#### 요청 Body
```json
{
  "orderId": 1,
  "customerId": 1,
  "invoiceDate": "2024-01-01",
  "dueDate": "2024-01-15",
  "amount": 1000000,
  "notes": "메모"
}
```

### 6.4 세금계산서 수정
**PUT** `/api/invoices/[id]`

### 6.5 세금계산서 지불 처리
**POST** `/api/invoices/[id]/payment`

#### 요청 Body
```json
{
  "paidDate": "2024-01-10",
  "notes": "입금 확인"
}
```

### 6.6 세금계산서 발송
**POST** `/api/invoices/[id]/send`

#### 요청 Body
```json
{
  "method": "kakao", // "kakao", "email"
  "recipient": "010-1234-5678" // 카카오톡 번호 또는 이메일
}
```

## 7. 정산 관리 API

### 7.1 정산 대시보드 데이터
**GET** `/api/settlements/dashboard`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | 아니오 | 시작일 |
| endDate | string | 아니오 | 종료일 |
| period | string | 아니오 | 기간 (day, week, month, quarter, year) |

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 10000000,
      "totalCost": 5000000,
      "totalProfit": 5000000,
      "unpaidAmount": 2000000,
      "prepaidAmount": 1000000
    },
    "revenueByPeriod": [
      {
        "period": "2024-01",
        "revenue": 1000000,
        "cost": 500000,
        "profit": 500000
      }
    ],
    "revenueByCustomer": [
      {
        "customerId": 1,
        "customerName": "ABC 회사",
        "revenue": 5000000
      }
    ],
    "revenueByStore": [
      {
        "storeId": 1,
        "storeName": "ABC 강남점",
        "revenue": 3000000
      }
    ]
  }
}
```

### 7.2 기간별 매출 조회
**GET** `/api/settlements/revenue`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | 예 | 시작일 |
| endDate | string | 예 | 종료일 |
| groupBy | string | 아니오 | 그룹화 (day, week, month) |
| customerId | number | 아니오 | 고객 ID 필터 |
| storeId | number | 아니오 | 매장 ID 필터 |

### 7.3 기간별 비용 조회
**GET** `/api/settlements/costs`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | 예 | 시작일 |
| endDate | string | 예 | 종료일 |
| groupBy | string | 아니오 | 그룹화 (day, week, month) |

## 8. 상담 관리 API

### 8.1 상담 목록 조회
**GET** `/api/consultations`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| storeId | number | 아니오 | 매장 ID 필터 |
| channel | string | 아니오 | 채널 필터 |
| startDate | string | 아니오 | 시작일 |
| endDate | string | 아니오 | 종료일 |

### 8.2 상담 상세 조회
**GET** `/api/consultations/[id]`

### 8.3 상담 생성
**POST** `/api/consultations`

#### 요청 Body
```json
{
  "customerId": 1,
  "storeId": 1,
  "consultationChannel": "kakao",
  "consultationDate": "2024-01-01T10:00:00Z",
  "consultationTopic": "신규 서비스 문의",
  "consultationContent": "상담 내용",
  "actionItems": "다음 액션 아이템",
  "consultationResult": "success",
  "relatedOrderId": 1,
  "relatedQuotationId": 1
}
```

### 8.4 상담 수정
**PUT** `/api/consultations/[id]`

### 8.5 상담 삭제
**DELETE** `/api/consultations/[id]`

## 9. 보고서 관리 API

### 9.1 보고서 목록 조회
**GET** `/api/reports`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| reportType | string | 아니오 | 보고서 유형 필터 |
| status | string | 아니오 | 상태 필터 |

### 9.2 보고서 상세 조회
**GET** `/api/reports/[id]`

### 9.3 보고서 생성
**POST** `/api/reports`

#### 요청 Body
```json
{
  "customerId": 1,
  "storeId": 1,
  "reportType": "performance",
  "reportPeriodStart": "2024-01-01",
  "reportPeriodEnd": "2024-01-31",
  "reportTitle": "1월 성과 보고서",
  "reportTemplateId": 1,
  "reportContent": "보고서 내용"
}
```

### 9.4 보고서 수정
**PUT** `/api/reports/[id]`

### 9.5 보고서 발송
**POST** `/api/reports/[id]/send`

#### 요청 Body
```json
{
  "method": "email", // "email", "kakao"
  "recipient": "contact@abc.com"
}
```

### 9.6 보고서 템플릿 목록
**GET** `/api/reports/templates`

### 9.7 보고서 템플릿 생성
**POST** `/api/reports/templates`

#### 요청 Body
```json
{
  "templateName": "월간 성과 보고서",
  "templateType": "performance",
  "templateContent": "템플릿 내용",
  "templateVariables": ["customerName", "period", "revenue"]
}
```

## 10. 작업 관리 API

### 10.1 작업 목록 조회
**GET** `/api/tasks`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| storeId | number | 아니오 | 매장 ID 필터 |
| orderId | number | 아니오 | 주문 ID 필터 |
| status | string | 아니오 | 상태 필터 |
| priority | string | 아니오 | 우선순위 필터 |
| dueDate | string | 아니오 | 마감일 필터 |

### 10.2 작업 상세 조회
**GET** `/api/tasks/[id]`

### 10.3 작업 생성
**POST** `/api/tasks`

#### 요청 Body
```json
{
  "customerId": 1,
  "storeId": 1,
  "orderId": 1,
  "taskName": "마케팅 캠페인 진행",
  "taskType": "marketing",
  "description": "작업 설명",
  "status": "pending",
  "priority": "high",
  "dueDate": "2024-01-15"
}
```

### 10.4 작업 수정
**PUT** `/api/tasks/[id]`

### 10.5 작업 상태 변경
**PATCH** `/api/tasks/[id]/status`

#### 요청 Body
```json
{
  "status": "in_progress"
}
```

### 10.6 작업 삭제
**DELETE** `/api/tasks/[id]`

## 11. 시간 기록 API

### 11.1 시간 기록 목록 조회
**GET** `/api/time-entries`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| taskId | number | 아니오 | 작업 ID 필터 |
| startDate | string | 아니오 | 시작일 |
| endDate | string | 아니오 | 종료일 |

### 11.2 시간 기록 생성
**POST** `/api/time-entries`

#### 요청 Body
```json
{
  "taskId": 1,
  "entryDate": "2024-01-01",
  "startTime": "2024-01-01T09:00:00Z",
  "endTime": "2024-01-01T18:00:00Z",
  "durationMinutes": 540,
  "description": "작업 설명"
}
```

### 11.3 시간 기록 수정
**PUT** `/api/time-entries/[id]`

### 11.4 시간 기록 삭제
**DELETE** `/api/time-entries/[id]`

### 11.5 시간 집계 조회
**GET** `/api/time-entries/summary`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| taskId | number | 아니오 | 작업 ID 필터 |
| startDate | string | 예 | 시작일 |
| endDate | string | 예 | 종료일 |
| groupBy | string | 아니오 | 그룹화 (day, week, month, task, customer) |

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "totalMinutes": 5400,
    "totalHours": 90,
    "entries": [
      {
        "taskId": 1,
        "taskName": "마케팅 캠페인",
        "totalMinutes": 1800,
        "totalHours": 30
      }
    ]
  }
}
```

## 12. 문서 관리 API

### 12.1 문서 목록 조회
**GET** `/api/documents`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| storeId | number | 아니오 | 매장 ID 필터 |
| orderId | number | 아니오 | 주문 ID 필터 |
| documentType | string | 아니오 | 문서 유형 필터 |
| tags | string[] | 아니오 | 태그 필터 |
| search | string | 아니오 | 검색어 |

### 12.2 문서 상세 조회
**GET** `/api/documents/[id]`

### 12.3 문서 업로드
**POST** `/api/documents`

#### 요청 형식
- `multipart/form-data`

#### Form Data
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| file | File | 예 | 업로드할 파일 |
| customerId | number | 아니오 | 고객 ID |
| storeId | number | 아니오 | 매장 ID |
| orderId | number | 아니오 | 주문 ID |
| documentType | string | 예 | 문서 유형 |
| description | string | 아니오 | 설명 |
| tags | string[] | 아니오 | 태그 |

### 12.4 문서 다운로드
**GET** `/api/documents/[id]/download`

#### 응답
- 파일 다운로드

### 12.5 문서 삭제
**DELETE** `/api/documents/[id]`

## 13. 구매 관리 API

### 13.1 구매 목록 조회
**GET** `/api/purchases`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| vendorId | number | 아니오 | 거래처 ID 필터 |
| status | string | 아니오 | 상태 필터 |
| startDate | string | 아니오 | 시작일 |
| endDate | string | 아니오 | 종료일 |

### 13.2 구매 상세 조회
**GET** `/api/purchases/[id]`

### 13.3 구매 생성
**POST** `/api/purchases`

#### 요청 Body
```json
{
  "vendorId": 1,
  "purchaseDate": "2024-01-01",
  "items": [
    {
      "productId": 1,
      "itemType": "product",
      "quantity": 10,
      "unitPrice": 10000,
      "description": "설명"
    }
  ],
  "notes": "메모"
}
```

### 13.4 구매 수정
**PUT** `/api/purchases/[id]`

### 13.5 구매 삭제
**DELETE** `/api/purchases/[id]`

## 14. 거래처 관리 API

### 14.1 거래처 목록 조회
**GET** `/api/vendors`

### 14.2 거래처 상세 조회
**GET** `/api/vendors/[id]`

### 14.3 거래처 생성
**POST** `/api/vendors`

#### 요청 Body
```json
{
  "name": "XYZ 공급업체",
  "businessNumber": "987-65-43210",
  "contactPerson": "김철수",
  "email": "contact@xyz.com",
  "phone": "02-9876-5432",
  "address": "서울시 서초구",
  "notes": "메모"
}
```

### 14.4 거래처 수정
**PUT** `/api/vendors/[id]`

### 14.5 거래처 삭제
**DELETE** `/api/vendors/[id]`

## 15. 상품 관리 API

### 15.1 상품 목록 조회
**GET** `/api/products`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| category | string | 아니오 | 카테고리 필터 |
| isActive | boolean | 아니오 | 활성 여부 필터 |
| search | string | 아니오 | 검색어 |

### 15.2 상품 상세 조회
**GET** `/api/products/[id]`

### 15.3 상품 생성
**POST** `/api/products`

#### 요청 Body
```json
{
  "name": "마케팅 서비스",
  "category": "marketing",
  "description": "설명",
  "unitPrice": 1000000,
  "unit": "건",
  "isActive": true
}
```

### 15.4 상품 수정
**PUT** `/api/products/[id]`

### 15.5 상품 삭제
**DELETE** `/api/products/[id]`

## 16. 플랫폼 계정 관리 API

### 16.1 플랫폼 계정 목록 조회
**GET** `/api/platform-accounts`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| customerId | number | 아니오 | 고객 ID 필터 |
| storeId | number | 아니오 | 매장 ID 필터 |
| platformType | string | 아니오 | 플랫폼 타입 필터 |
| status | string | 아니오 | 상태 필터 |

### 16.2 플랫폼 계정 상세 조회
**GET** `/api/platform-accounts/[id]`

### 16.3 플랫폼 계정 생성
**POST** `/api/platform-accounts`

#### 요청 Body
```json
{
  "customerId": 1,
  "storeId": 1,
  "platformType": "naver_place",
  "accountEmail": "account@naver.com",
  "accountPassword": "password",
  "delegationStartDate": "2024-01-01",
  "delegationEndDate": "2024-12-31",
  "apiKey": "api-key-here"
}
```

### 16.4 플랫폼 계정 수정
**PUT** `/api/platform-accounts/[id]`

### 16.5 플랫폼 계정 삭제
**DELETE** `/api/platform-accounts/[id]`

## 17. 통계 및 분석 API

### 17.1 통합 검색
**GET** `/api/search`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| q | string | 예 | 검색어 |
| types | string[] | 아니오 | 검색 타입 (customers, stores, orders 등) |

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "customers": [...],
    "stores": [...],
    "orders": [...],
    "total": 50
  }
}
```

### 17.2 알림 목록
**GET** `/api/notifications`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| type | string | 아니오 | 알림 타입 |
| isRead | boolean | 아니오 | 읽음 여부 |

### 17.3 알림 읽음 처리
**POST** `/api/notifications/[id]/read`

## 18. 에러 코드

### 18.1 공통 에러 코드
- `VALIDATION_ERROR`: 입력 데이터 검증 실패
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `UNAUTHORIZED`: 인증 실패
- `FORBIDDEN`: 권한 없음
- `INTERNAL_ERROR`: 서버 내부 에러

### 18.2 도메인별 에러 코드
- `CUSTOMER_NOT_FOUND`: 고객을 찾을 수 없음
- `ORDER_NOT_FOUND`: 주문을 찾을 수 없음
- `INSUFFICIENT_PERMISSION`: 권한 부족
- `DUPLICATE_ENTRY`: 중복된 항목

## 19. API 버전 관리

### 19.1 버전 관리 전략
- 초기 버전: `/api/v1/` (선택사항)
- 향후 확장 시 버전 관리 고려

### 19.2 하위 호환성
- 기존 API는 유지하면서 새 버전 추가
- Deprecated API는 충분한 기간 후 제거


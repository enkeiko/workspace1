# 17. 변경 이력 추적 모듈 상세 설계

> Audit Log Module - 데이터 무결성 및 추적

## 1. 개요

### 1.1 모듈 목적

변경 이력(Audit Log)은 **모든 중요 데이터의 변경을 기록**하는 기능입니다.

- 누가 언제 무엇을 변경했는지 추적
- 데이터 복구 및 롤백 지원
- 감사(Audit) 및 컴플라이언스 대응

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 자동 기록 | 생성/수정/삭제 시 자동 로깅 |
| 변경 내용 저장 | 변경 전/후 값 JSON으로 저장 |
| 사용자 추적 | 변경한 사용자 정보 기록 |
| 이력 조회 | 엔티티별 변경 이력 조회 |
| 복원 기능 | 이전 상태로 복원 (선택적) |

---

## 2. 데이터 모델

### 2.1 AuditLog

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  
  // 대상 엔티티
  entityType String                     // customer, order, invoice, etc.
  entityId   Int                        // 대상 레코드 ID
  
  // 변경 내용
  action     String                     // create, update, delete
  oldValue   String?                    // JSON: 변경 전 값
  newValue   String?                    // JSON: 변경 후 값
  changedFields String?                 // JSON: 변경된 필드 목록 ["name", "phone"]
  
  // 변경 주체
  changedBy  String?                    // 사용자 ID 또는 이름
  changedByName String?                 // 사용자 표시명
  
  // 컨텍스트
  ipAddress  String?                    // IP 주소
  userAgent  String?                    // 브라우저 정보
  requestId  String?                    // 요청 추적 ID
  
  // 메타
  description String?                   // 변경 설명 (선택)
  
  // 타임스탬프
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([action])
  @@index([changedBy])
  @@index([createdAt])
}
```

### 2.2 추적 대상 엔티티

| 엔티티 | entityType | 추적 수준 |
|--------|------------|----------|
| Customer | customer | 전체 |
| Store | store | 전체 |
| Product | product | 전체 |
| Quotation | quotation | 전체 |
| QuotationItem | quotation_item | 상위와 함께 |
| Order | order | 전체 |
| OrderItem | order_item | 상위와 함께 |
| Invoice | invoice | 전체 |
| PurchaseOrder | purchase_order | 전체 |
| Payment | payment | 전체 |
| Supplier | supplier | 전체 |
| CustomerProductPrice | customer_price | 전체 |

---

## 3. API 설계

### 3.1 이력 조회 API

#### GET /api/audit-logs
변경 이력 목록 조회

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| entityType | string | 엔티티 타입 필터 |
| entityId | number | 특정 레코드 필터 |
| action | string | 액션 필터 (create, update, delete) |
| changedBy | string | 변경자 필터 |
| startDate | string | 시작일 |
| endDate | string | 종료일 |
| page | number | 페이지 |
| limit | number | 페이지당 개수 |

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "entityType": "order",
        "entityId": 123,
        "action": "update",
        "changedFields": ["status", "notes"],
        "oldValue": { "status": "pending", "notes": null },
        "newValue": { "status": "confirmed", "notes": "계약 완료" },
        "changedBy": "user_1",
        "changedByName": "김담당",
        "createdAt": "2026-01-05T09:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

#### GET /api/audit-logs/[entityType]/[entityId]
특정 레코드의 변경 이력

**Response:**
```json
{
  "success": true,
  "data": {
    "entity": {
      "type": "order",
      "id": 123,
      "currentValue": { ... }
    },
    "logs": [
      {
        "id": 3,
        "action": "update",
        "changedFields": ["status"],
        "oldValue": { "status": "in_progress" },
        "newValue": { "status": "completed" },
        "changedBy": "user_1",
        "createdAt": "2026-01-10T14:00:00Z"
      },
      {
        "id": 2,
        "action": "update",
        "changedFields": ["status"],
        "oldValue": { "status": "confirmed" },
        "newValue": { "status": "in_progress" },
        "changedBy": "user_1",
        "createdAt": "2026-01-08T10:00:00Z"
      },
      {
        "id": 1,
        "action": "create",
        "newValue": { "orderNumber": "ORD-202601-0001", ... },
        "changedBy": "user_1",
        "createdAt": "2026-01-05T09:30:00Z"
      }
    ]
  }
}
```

---

## 4. 구현 설계

### 4.1 Audit Service

```typescript
// lib/services/audit.service.ts

interface AuditContext {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

class AuditService {
  private context: AuditContext = {};

  setContext(context: AuditContext) {
    this.context = context;
  }

  async logCreate<T extends object>(
    entityType: string,
    entityId: number,
    newValue: T,
    description?: string
  ) {
    return this.createLog({
      entityType,
      entityId,
      action: 'create',
      newValue: this.sanitize(newValue),
      description,
    });
  }

  async logUpdate<T extends object>(
    entityType: string,
    entityId: number,
    oldValue: T,
    newValue: T,
    description?: string
  ) {
    const changedFields = this.getChangedFields(oldValue, newValue);
    
    if (changedFields.length === 0) {
      return null; // 실제 변경 없음
    }

    return this.createLog({
      entityType,
      entityId,
      action: 'update',
      oldValue: this.pickFields(oldValue, changedFields),
      newValue: this.pickFields(newValue, changedFields),
      changedFields,
      description,
    });
  }

  async logDelete<T extends object>(
    entityType: string,
    entityId: number,
    oldValue: T,
    description?: string
  ) {
    return this.createLog({
      entityType,
      entityId,
      action: 'delete',
      oldValue: this.sanitize(oldValue),
      description,
    });
  }

  private async createLog(data: {
    entityType: string;
    entityId: number;
    action: string;
    oldValue?: object;
    newValue?: object;
    changedFields?: string[];
    description?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        changedFields: data.changedFields ? JSON.stringify(data.changedFields) : null,
        changedBy: this.context.userId,
        changedByName: this.context.userName,
        ipAddress: this.context.ipAddress,
        userAgent: this.context.userAgent,
        requestId: this.context.requestId,
        description: data.description,
      },
    });
  }

  private getChangedFields<T extends object>(oldValue: T, newValue: T): string[] {
    const fields: string[] = [];
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    
    for (const key of allKeys) {
      if (this.isIgnoredField(key)) continue;
      
      const oldVal = (oldValue as any)[key];
      const newVal = (newValue as any)[key];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        fields.push(key);
      }
    }
    
    return fields;
  }

  private isIgnoredField(field: string): boolean {
    const ignoredFields = ['updatedAt', 'createdAt', 'id'];
    return ignoredFields.includes(field);
  }

  private sanitize<T extends object>(value: T): object {
    // 민감 정보 마스킹
    const sanitized = { ...value };
    const sensitiveFields = ['password', 'apiKey', 'secret'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        (sanitized as any)[field] = '***MASKED***';
      }
    }
    
    return sanitized;
  }

  private pickFields<T extends object>(value: T, fields: string[]): object {
    const picked: any = {};
    for (const field of fields) {
      if (field in value) {
        picked[field] = (value as any)[field];
      }
    }
    return picked;
  }
}

export const auditService = new AuditService();
```

### 4.2 미들웨어 적용

```typescript
// lib/middleware/auditMiddleware.ts

export function withAudit(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    // 컨텍스트 설정
    auditService.setContext({
      userId: req.headers['x-user-id'] as string,
      userName: req.headers['x-user-name'] as string,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string || generateRequestId(),
    });

    return handler(req, res);
  };
}
```

### 4.3 서비스 레이어 통합

```typescript
// lib/services/order.service.ts

async function updateOrder(orderId: number, data: UpdateOrderInput) {
  // 1. 기존 값 조회
  const oldOrder = await prisma.order.findUnique({ where: { id: orderId } });
  
  // 2. 업데이트
  const newOrder = await prisma.order.update({
    where: { id: orderId },
    data,
  });
  
  // 3. 감사 로그 기록
  await auditService.logUpdate(
    'order',
    orderId,
    oldOrder,
    newOrder,
    `주문 ${newOrder.orderNumber} 수정`
  );
  
  return newOrder;
}

async function deleteOrder(orderId: number) {
  // 1. 기존 값 조회
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  
  // 2. 삭제
  await prisma.order.delete({ where: { id: orderId } });
  
  // 3. 감사 로그 기록
  await auditService.logDelete(
    'order',
    orderId,
    order,
    `주문 ${order.orderNumber} 삭제`
  );
}
```

---

## 5. UI 설계

### 5.1 변경 이력 탭 (엔티티 상세 페이지)

```
┌─────────────────────────────────────────────────────────────────┐
│  주문 ORD-202601-0001                                           │
├─────────────────────────────────────────────────────────────────┤
│  [기본 정보]  [항목]  [발주]  [📋 변경 이력]                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  변경 이력 (5건)                                    [새로고침]  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 2026-01-10 14:00  │  김담당                                ││
│  │ ─────────────────────────────────────────────────────────  ││
│  │ 상태 변경: in_progress → completed                         ││
│  │                                                            ││
│  │ 2026-01-08 10:00  │  김담당                                ││
│  │ ─────────────────────────────────────────────────────────  ││
│  │ 상태 변경: confirmed → in_progress                         ││
│  │                                                            ││
│  │ 2026-01-05 15:30  │  김담당                                ││
│  │ ─────────────────────────────────────────────────────────  ││
│  │ 메모 수정: (없음) → "계약 완료, 1주일 내 완료 요청"        ││
│  │ 상태 변경: pending → confirmed                             ││
│  │                                                            ││
│  │ 2026-01-05 09:30  │  김담당                                ││
│  │ ─────────────────────────────────────────────────────────  ││
│  │ ✨ 주문 생성                                               ││
│  │ 주문번호: ORD-202601-0001                                  ││
│  │ 고객: 길동이네 치킨                                        ││
│  │ 금액: ₩1,000,000                                          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 전체 감사 로그 페이지 `/admin/audit-logs`

```
┌─────────────────────────────────────────────────────────────────┐
│  감사 로그                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [기간: 최근 7일 ▼] [엔티티: 전체 ▼] [액션: 전체 ▼] [검색]     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 시간           │ 사용자 │ 대상         │ 액션  │ 내용     ││
│  ├────────────────┼───────┼─────────────┼──────┼──────────┤│
│  │ 01-10 14:00   │ 김담당 │ 주문 #123   │ 수정 │ 상태 변경││
│  │ 01-10 13:45   │ 이담당 │ 견적 #456   │ 생성 │ 신규 견적││
│  │ 01-10 11:30   │ 김담당 │ 고객 #789   │ 수정 │ 연락처   ││
│  │ 01-10 10:00   │ 박담당 │ 상품 #101   │ 삭제 │ 비활성화 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  < 1 2 3 ... >                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 변경 상세 모달

```
┌─────────────────────────────────────────────────────────────────┐
│  변경 상세                                               [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  대상: 주문 ORD-202601-0001 (#123)                              │
│  액션: 수정 (update)                                            │
│  시간: 2026-01-05 15:30:00                                      │
│  사용자: 김담당 (user_1)                                        │
│  IP: 192.168.1.100                                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  변경된 필드:                                                   │
│                                                                 │
│  ┌─────────────┬─────────────────┬─────────────────┐           │
│  │ 필드        │ 이전 값          │ 새 값           │           │
│  ├─────────────┼─────────────────┼─────────────────┤           │
│  │ status      │ pending         │ confirmed       │           │
│  │ notes       │ (없음)          │ 계약 완료, 1주일│           │
│  │             │                 │ 내 완료 요청    │           │
│  └─────────────┴─────────────────┴─────────────────┘           │
│                                                                 │
│                                        [닫기]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 우선순위

### Phase 1 (필수)
1. [ ] AuditLog 모델 추가
2. [ ] AuditService 구현
3. [ ] 주요 엔티티 CRUD에 적용 (Order, Invoice)

### Phase 2 (권장)
4. [ ] 모든 엔티티에 적용
5. [ ] 엔티티 상세 변경 이력 탭
6. [ ] 전체 감사 로그 페이지

### Phase 3 (선택)
7. [ ] 변경 알림 (중요 변경 시)
8. [ ] 복원 기능 (이전 상태로)
9. [ ] 로그 보관 정책 (오래된 로그 아카이빙)

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |



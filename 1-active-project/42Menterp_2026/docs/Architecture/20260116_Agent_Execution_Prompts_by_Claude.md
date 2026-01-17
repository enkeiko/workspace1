# 에이전트 실행용 독립 프롬프트

> **목적**: 각 프롬프트를 새로운 Claude 세션에 복사-붙여넣기만 하면 바로 실행 가능
> **참조**: Deep_Analysis_Report.md의 각 섹션 내용이 프롬프트에 포함되어 있음
> **사용법**: 아래 프롬프트를 그대로 복사해서 Claude Code에 붙여넣기

---

## 🎯 P0-1: 동시성 제어 구현 (CRITICAL)

```
# Context
당신은 Next.js 16 + Prisma 기반 ERP 시스템의 동시성 제어 문제를 해결하는 백엔드 엔지니어입니다.

# Problem
현재 `app/src/app/api/purchase-orders/grid-save/route.ts` 파일에서 발주 데이터 저장 시 트랜잭션이 없어 Race Condition이 발생합니다.

**현재 코드의 문제점**:
```typescript
// ❌ UNSAFE - 동시 요청 시 데이터 무결성 파괴
const existingItem = await prisma.purchaseOrderItem.findFirst({ where: {...} });
// 이 시점에 다른 요청이 같은 항목 수정 가능!
await prisma.purchaseOrderItem.update({ where: { id: existingItem.id }, data: {...} });
```

**예상 시나리오**:
- 사용자 A와 B가 동시에 같은 발주 수정
- A의 변경사항이 B에 의해 덮어씌워짐
- 재고가 마이너스가 될 수 있음

# Task
다음을 구현해주세요:

## 1. Prisma Transaction + Row-Level Lock 적용

`app/src/app/api/purchase-orders/grid-save/route.ts` 파일을 다음과 같이 수정:

### 1-1. 전체 로직을 트랜잭션으로 감싸기
```typescript
// 138번째 줄 "for (const [channelId, group] of channelGroups)" 앞에 추가
await prisma.$transaction(
  async (tx) => {
    // 기존 for 루프를 여기 안으로 이동
    for (const [channelId, group] of channelGroups) {
      // ...
    }
  },
  {
    isolationLevel: "Serializable", // 최고 격리 수준
    timeout: 10000, // 10초 타임아웃
  }
);
```

### 1-2. SELECT FOR UPDATE 추가
기존 `findFirst`를 `$queryRaw`로 변경하여 Row Lock 적용:

```typescript
// ❌ 기존 코드 (142번째 줄 근처)
let purchaseOrder = await prisma.purchaseOrder.findFirst({
  where: {
    orderWeek: weekKey,
    channelId: channelId === "DEFAULT" ? undefined : channelId,
    status: { not: "CANCELLED" },
  },
  include: { items: true },
});

// ✅ 변경 후
let purchaseOrder = await tx.$queryRaw<PurchaseOrder[]>`
  SELECT * FROM "PurchaseOrder"
  WHERE "orderWeek" = ${weekKey}
    AND "channelId" = ${channelId === "DEFAULT" ? null : channelId}
    AND "status" != 'CANCELLED'
  FOR UPDATE
`;

// 배열 첫 번째 요소 사용
const lockedOrder = purchaseOrder[0] || null;
```

### 1-3. 모든 prisma 호출을 tx로 변경
트랜잭션 내부의 모든 `prisma.XXX`를 `tx.XXX`로 변경:
- `prisma.purchaseOrder.create` → `tx.purchaseOrder.create`
- `prisma.purchaseOrderItem.update` → `tx.purchaseOrderItem.update`
- 등등...

## 2. Optimistic Concurrency Control (Version 필드) 추가

### 2-1. schema.prisma 수정
`app/prisma/schema.prisma` 파일에 version 필드 추가:

```prisma
model PurchaseOrder {
  // ... 기존 필드들

  version   Int      @default(1)  // 👈 추가
  updatedAt DateTime @updatedAt

  // ... 나머지

  @@index([version])  // 👈 인덱스 추가
}

model PurchaseOrderItem {
  // ... 기존 필드들

  version   Int      @default(1)  // 👈 추가
  updatedAt DateTime @updatedAt

  // ... 나머지
}
```

### 2-2. 마이그레이션 실행
```bash
npx prisma migrate dev --name add_version_fields_for_optimistic_locking
```

### 2-3. API에 버전 체크 로직 추가
`grid-save/route.ts`의 update 부분을 다음과 같이 변경:

```typescript
// ❌ 기존 코드 (196번째 줄 근처)
await prisma.purchaseOrderItem.update({
  where: { id: existingItem.id },
  data: {
    totalQty: item.qty,
    dailyQty,
    // ...
  },
});

// ✅ 변경 후 (버전 체크 포함)
const updateResult = await tx.purchaseOrderItem.updateMany({
  where: {
    id: existingItem.id,
    version: existingItem.version,  // 버전 일치 시에만 업데이트
  },
  data: {
    totalQty: item.qty,
    dailyQty,
    // ... 기존 필드들
    version: { increment: 1 },  // 버전 증가
  },
});

// 업데이트 실패 시 (다른 사용자가 먼저 수정함)
if (updateResult.count === 0) {
  throw new Error(
    `동시 수정이 감지되었습니다. 매장: ${store.storeName}, 상품: ${productCode}. 페이지를 새로고침 후 다시 시도해주세요.`
  );
}
```

## 3. 에러 핸들링 개선

트랜잭션 실패 시 명확한 메시지 반환:

```typescript
try {
  await prisma.$transaction(async (tx) => {
    // ... 위에서 작성한 로직
  });
} catch (error) {
  console.error("Transaction failed:", error);

  if (error.message.includes("동시 수정이 감지")) {
    return NextResponse.json(
      {
        error: error.message,
        code: "CONCURRENT_MODIFICATION",
        retryable: true
      },
      { status: 409 } // Conflict
    );
  }

  return NextResponse.json(
    { error: "그리드 저장 실패" },
    { status: 500 }
  );
}
```

## 4. 테스트 시나리오 작성

`__tests__/api/grid-save-concurrency.test.ts` 파일 생성:

```typescript
import { describe, it, expect } from 'vitest';

describe('Grid Save Concurrency Control', () => {
  it('should prevent concurrent modifications', async () => {
    // 동시에 같은 발주 수정 시도
    const promises = [
      fetch('/api/purchase-orders/grid-save', {
        method: 'POST',
        body: JSON.stringify({ weekKey: '2026-W03', rows: [...] }),
      }),
      fetch('/api/purchase-orders/grid-save', {
        method: 'POST',
        body: JSON.stringify({ weekKey: '2026-W03', rows: [...] }),
      }),
    ];

    const results = await Promise.allSettled(promises);

    // 하나는 성공, 하나는 409 에러 발생해야 함
    const statuses = results.map(r => r.status === 'fulfilled' ? r.value.status : 'error');
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });
});
```

# Deliverables
1. ✅ 수정된 `grid-save/route.ts` 파일
2. ✅ 수정된 `schema.prisma` 파일
3. ✅ 마이그레이션 파일
4. ✅ 테스트 코드
5. ✅ 성능 영향도 분석 (Before/After 쿼리 수, 응답 시간)

# Acceptance Criteria
- [ ] 2명이 동시에 같은 발주 수정 시 한 명은 409 에러 발생
- [ ] 에러 메시지가 사용자 친화적임
- [ ] 트랜잭션 타임아웃 10초 이내
- [ ] 기존 기능 모두 정상 동작
- [ ] 마이그레이션 실행 성공

# Important Notes
- 트랜잭션 내부의 모든 Prisma 호출은 `tx` 객체 사용
- version 필드는 절대 수동으로 설정하지 말 것 (자동 증가만)
- 기존 데이터는 version = 1로 자동 설정됨

작업을 시작하시겠습니까?
```

---

## 🎯 P0-2: Batch Insert 전환 (CRITICAL)

```
# Context
당신은 Next.js 16 + Prisma 기반 ERP 시스템의 성능 최적화를 담당하는 백엔드 엔지니어입니다.

# Problem
현재 `app/src/app/api/purchase-orders/grid-save/route.ts`에서 N+1 쿼리 문제로 인해 2,000개 셀 저장 시 60초 타임아웃이 발생합니다.

**현재 코드의 문제점**:
```typescript
// ❌ N번 쿼리 실행 (176-228번째 줄 근처)
for (const item of group.items) {
  const existingItem = purchaseOrder?.items.find(...);

  if (existingItem) {
    await prisma.purchaseOrderItem.update({ ... }); // 쿼리 1번
  } else {
    await prisma.purchaseOrderItem.create({ ... }); // 쿼리 1번
  }
}
// 200개 항목 = 200번 쿼리!
```

**성능 지표**:
- Before: 200개 항목 저장 = 약 30초
- 목표 After: 200개 항목 저장 = 3초 이내

# Task
다음을 구현하여 쿼리 횟수를 200번 → 3번으로 줄여주세요:

## 1. 기존 항목 조회 최적화

### 1-1. findMany로 일괄 조회
```typescript
// grid-save/route.ts의 142번째 줄 이후 수정

// ❌ 기존: 루프 안에서 find
for (const item of group.items) {
  const existingItem = purchaseOrder?.items.find(
    (i) => i.storeId === item.storeId && i.productId === item.productId
  );
}

// ✅ 개선: 미리 Map으로 변환
const existingItemsMap = new Map(
  purchaseOrder?.items.map((item) => [
    `${item.storeId}-${item.productId}`,
    item,
  ]) || []
);

// 사용 시
for (const item of group.items) {
  const key = `${item.storeId}-${item.productId}`;
  const existingItem = existingItemsMap.get(key);
}
```

## 2. Batch Insert 구현

### 2-1. 신규/업데이트 항목 분리
```typescript
// 176번째 줄 이후 for 루프를 다음으로 교체:

const itemsToCreate: Prisma.PurchaseOrderItemCreateManyInput[] = [];
const itemsToUpdate: { id: string; data: Prisma.PurchaseOrderItemUpdateInput }[] = [];

for (const item of group.items) {
  const startDate = parseISO(item.startDate);
  const endDate = parseISO(item.endDate);
  const workDays = differenceInDays(endDate, startDate) + 1;
  const dailyQty = Math.ceil(item.qty / workDays);

  const key = `${item.storeId}-${item.productId}`;
  const existingItem = existingItemsMap.get(key);

  if (existingItem) {
    // Manual Override 보호
    if (existingItem.isManualOverride) {
      summary.itemsSkipped++;
      continue;
    }

    // 업데이트 목록에 추가
    itemsToUpdate.push({
      id: existingItem.id,
      data: {
        totalQty: item.qty,
        dailyQty,
        startDate,
        endDate,
        workDays,
        amount: item.qty * 35, // TODO: 실제 단가 적용
        version: { increment: 1 }, // P0-1에서 추가한 필드
      },
    });
  } else if (purchaseOrder) {
    // 생성 목록에 추가
    itemsToCreate.push({
      purchaseOrderId: purchaseOrder.id,
      storeId: item.storeId,
      productId: item.productId,
      productType: item.productType as ProductType,
      keyword: "",
      totalQty: item.qty,
      dailyQty,
      startDate,
      endDate,
      workDays,
      unitPrice: 35,
      amount: item.qty * 35,
      status: "PENDING",
    });
  }
}
```

### 2-2. createMany 실행
```typescript
// 일괄 생성 (1번 쿼리)
if (itemsToCreate.length > 0) {
  const createResult = await tx.purchaseOrderItem.createMany({
    data: itemsToCreate,
    skipDuplicates: true,
  });
  summary.itemsCreated += createResult.count;
}
```

### 2-3. updateMany를 위한 Raw Query 사용
Prisma의 updateMany는 where 조건에 id 배열을 받을 수 없으므로, 케이스별 업데이트 필요:

**Option A: 트랜잭션 내 개별 update (여전히 빠름)**
```typescript
// 트랜잭션 내에서는 빠르게 실행됨
for (const { id, data } of itemsToUpdate) {
  await tx.purchaseOrderItem.update({
    where: { id },
    data,
  });
}
summary.itemsUpdated += itemsToUpdate.length;
```

**Option B: Raw SQL (최고 성능)**
```typescript
if (itemsToUpdate.length > 0) {
  // CASE WHEN을 사용한 일괄 업데이트 (1번 쿼리)
  const ids = itemsToUpdate.map(u => u.id);
  const cases = itemsToUpdate.map((u, i) =>
    `WHEN id = '${u.id}' THEN ${u.data.totalQty}`
  ).join(' ');

  await tx.$executeRaw`
    UPDATE "PurchaseOrderItem"
    SET
      "totalQty" = CASE ${Prisma.raw(cases)} END,
      "version" = "version" + 1,
      "updatedAt" = NOW()
    WHERE id = ANY(${ids})
  `;
  summary.itemsUpdated += itemsToUpdate.length;
}
```

## 3. 합계 계산 최적화

```typescript
// ❌ 기존 (231번째 줄): aggregate 쿼리
const totals = await prisma.purchaseOrderItem.aggregate({
  where: { purchaseOrderId: purchaseOrder.id },
  _sum: { totalQty: true, amount: true },
});

// ✅ 개선: 메모리에서 계산
const totalQty = itemsToCreate.reduce((sum, item) => sum + item.totalQty, 0)
  + itemsToUpdate.reduce((sum, item) => sum + (item.data.totalQty as number || 0), 0)
  + existingItemsMap.size * (기존 항목들의 평균);

// 또는 기존 항목 합계를 미리 조회
const existingTotal = purchaseOrder?.totalQty || 0;
const newTotal = existingTotal
  - itemsToUpdate.reduce((sum, item) => sum + (existingItem의 기존 qty), 0)
  + itemsToCreate.reduce((sum, item) => sum + item.totalQty, 0)
  + itemsToUpdate.reduce((sum, item) => sum + (item.data.totalQty as number || 0), 0);
```

## 4. 성능 측정 코드 추가

```typescript
export async function POST(request: NextRequest) {
  console.time('⏱️ Grid Save Total Time');
  console.time('⏱️ Transaction Time');

  try {
    // ... 기존 로직

    await prisma.$transaction(async (tx) => {
      console.time('⏱️ Query Time');

      // ... 배치 작업들

      console.timeEnd('⏱️ Query Time');
    });

    console.timeEnd('⏱️ Transaction Time');

    // 쿼리 로그 출력
    console.log('📊 Performance Summary:', {
      itemsCreated: summary.itemsCreated,
      itemsUpdated: summary.itemsUpdated,
      itemsSkipped: summary.itemsSkipped,
      estimatedQueries: 3, // createMany + update loop + aggregate
    });

    console.timeEnd('⏱️ Grid Save Total Time');

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.timeEnd('⏱️ Grid Save Total Time');
    // ... 에러 처리
  }
}
```

## 5. Prisma Query Log 활성화

`app/src/lib/prisma.ts` 파일 수정:

```typescript
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 개발 환경에서 쿼리 로그
if (process.env.NODE_ENV === "development") {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}
```

## 6. 벤치마크 테스트 작성

`scripts/benchmark-grid-save.ts` 파일 생성:

```typescript
import { performance } from 'perf_hooks';

async function benchmarkGridSave() {
  const testCases = [
    { stores: 10, products: 5, expectedTime: 1000 },   // 50개 셀
    { stores: 50, products: 10, expectedTime: 3000 },  // 500개 셀
    { stores: 200, products: 10, expectedTime: 5000 }, // 2000개 셀
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing ${testCase.stores} stores × ${testCase.products} products`);

    const start = performance.now();

    // API 호출
    const response = await fetch('http://localhost:3000/api/purchase-orders/grid-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekKey: '2026-W03',
        rows: generateTestData(testCase.stores, testCase.products),
      }),
    });

    const end = performance.now();
    const duration = end - start;

    console.log(`⏱️  Duration: ${duration.toFixed(0)}ms`);
    console.log(`✅ Expected: ${testCase.expectedTime}ms`);
    console.log(`${duration < testCase.expectedTime ? '✅ PASS' : '❌ FAIL'}`);
  }
}

benchmarkGridSave();
```

# Deliverables
1. ✅ Batch Insert로 변환된 `grid-save/route.ts`
2. ✅ 성능 측정 코드 추가
3. ✅ Prisma Query Log 설정
4. ✅ 벤치마크 스크립트
5. ✅ Before/After 성능 비교 리포트

# Acceptance Criteria
- [ ] 200개 항목 저장 시 3초 이내 완료
- [ ] 쿼리 실행 횟수 200+ → 5개 이하
- [ ] 타임아웃 에러 발생하지 않음
- [ ] 기존 기능 모두 정상 동작
- [ ] 콘솔에 성능 로그 출력됨

# Performance Targets

| 항목 수 | Before | After | 개선율 |
|--------|--------|-------|--------|
| 10개   | 2s     | 0.3s  | 85%    |
| 100개  | 15s    | 1s    | 93%    |
| 200개  | 30s    | 3s    | 90%    |

작업을 시작하시겠습니까?
```

---

## 🎯 P1-1: 키보드 네비게이션 구현

```
# Context
당신은 ERP 시스템의 프론트엔드 UX를 개선하는 시니어 React 개발자입니다.

# Problem
현재 발주 그리드(`WeeklyOrderGrid`)는 마우스로만 조작 가능합니다.
- 200개 매장 × 10개 상품 = 2,000개 셀을 일일이 클릭해야 함
- Enter 키, 화살표 키 등 키보드 네비게이션 미지원
- 실무 사용자의 생산성이 80% 저하됨

# Task
Excel과 같은 키보드 네비게이션을 구현해주세요.

## 요구사항

### 키보드 동작
- **Enter**: 다음 셀로 이동 (오른쪽 → 다음 행 첫 열)
- **Shift+Enter**: 이전 셀로 이동
- **ArrowDown**: 아래 셀로 이동
- **ArrowUp**: 위 셀로 이동
- **ArrowRight**: 오른쪽 셀로 이동
- **ArrowLeft**: 왼쪽 셀로 이동
- **Escape**: 편집 취소 및 포커스 해제
- **Tab**: 기본 동작 유지

### UX 요구사항
- 셀 포커스 시 기존 값이 자동 선택되어야 함 (즉시 타이핑 가능)
- 시각적 포커스 표시 (파란색 테두리)
- 첫 셀에 자동 포커스

## Phase 1: KeyboardInput 컴포넌트 생성

`app/src/components/ui/keyboard-input.tsx` 파일을 새로 생성:

```typescript
"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface KeyboardInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onKeyDown"> {
  onEnter?: (value: string) => void;
  onShiftEnter?: (value: string) => void;
  onEscape?: () => void;
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  selectOnFocus?: boolean;
  enableArrowNavigation?: boolean;
}

export const KeyboardInput = React.forwardRef<
  HTMLInputElement,
  KeyboardInputProps
>(
  (
    {
      onEnter,
      onShiftEnter,
      onEscape,
      onArrowDown,
      onArrowUp,
      onArrowLeft,
      onArrowRight,
      selectOnFocus = true,
      enableArrowNavigation = true,
      className,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;

        switch (e.key) {
          case "Enter":
            e.preventDefault();
            if (e.shiftKey) {
              onShiftEnter?.(value);
            } else {
              onEnter?.(value);
            }
            break;

          case "Escape":
            e.preventDefault();
            e.currentTarget.blur();
            onEscape?.();
            break;

          case "ArrowDown":
            if (enableArrowNavigation && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              onArrowDown?.();
            }
            break;

          case "ArrowUp":
            if (enableArrowNavigation && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              onArrowUp?.();
            }
            break;

          case "ArrowLeft":
            // 커서가 맨 앞에 있을 때만 네비게이션
            if (enableArrowNavigation && e.currentTarget.selectionStart === 0) {
              e.preventDefault();
              onArrowLeft?.();
            }
            break;

          case "ArrowRight":
            // 커서가 맨 뒤에 있을 때만 네비게이션
            if (
              enableArrowNavigation &&
              e.currentTarget.selectionStart === value.length
            ) {
              e.preventDefault();
              onArrowRight?.();
            }
            break;
        }
      },
      [
        onEnter,
        onShiftEnter,
        onEscape,
        onArrowDown,
        onArrowUp,
        onArrowLeft,
        onArrowRight,
        enableArrowNavigation,
      ]
    );

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (selectOnFocus) {
          e.currentTarget.select();
        }
      },
      [selectOnFocus]
    );

    return (
      <Input
        ref={ref}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className={cn("focus-visible:ring-2 focus-visible:ring-blue-500", className)}
        {...props}
      />
    );
  }
);

KeyboardInput.displayName = "KeyboardInput";
```

## Phase 2: Grid 네비게이션 Hook 생성

`app/src/hooks/use-grid-keyboard-navigation.ts` 파일을 새로 생성:

```typescript
import { useCallback, useRef } from "react";

interface GridCoordinate {
  row: number;
  col: number;
}

export function useGridKeyboardNavigation(rowCount: number, colCount: number) {
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const currentCell = useRef<GridCoordinate>({ row: 0, col: 0 });

  const getCellKey = (row: number, col: number) => `${row},${col}`;

  const focusCell = useCallback((row: number, col: number) => {
    // 범위 체크
    if (row < 0 || row >= rowCount || col < 0 || col >= colCount) {
      return false;
    }

    const key = getCellKey(row, col);
    const input = cellRefs.current.get(key);

    if (input) {
      input.focus();
      currentCell.current = { row, col };
      return true;
    }

    return false;
  }, [rowCount, colCount]);

  const moveDown = useCallback(() => {
    const { row, col } = currentCell.current;
    focusCell(row + 1, col);
  }, [focusCell]);

  const moveUp = useCallback(() => {
    const { row, col } = currentCell.current;
    focusCell(row - 1, col);
  }, [focusCell]);

  const moveLeft = useCallback(() => {
    const { row, col } = currentCell.current;
    focusCell(row, col - 1);
  }, [focusCell]);

  const moveRight = useCallback(() => {
    const { row, col } = currentCell.current;
    focusCell(row, col + 1);
  }, [focusCell]);

  const moveNext = useCallback(() => {
    const { row, col } = currentCell.current;

    // 행 끝이 아니면 오른쪽으로
    if (col < colCount - 1) {
      focusCell(row, col + 1);
    }
    // 행 끝이면 다음 행 첫 열로
    else if (row < rowCount - 1) {
      focusCell(row + 1, 0);
    }
  }, [rowCount, colCount, focusCell]);

  const movePrevious = useCallback(() => {
    const { row, col } = currentCell.current;

    // 행 시작이 아니면 왼쪽으로
    if (col > 0) {
      focusCell(row, col - 1);
    }
    // 행 시작이면 이전 행 마지막 열로
    else if (row > 0) {
      focusCell(row - 1, colCount - 1);
    }
  }, [rowCount, colCount, focusCell]);

  const registerCell = useCallback(
    (row: number, col: number, ref: HTMLInputElement | null) => {
      const key = getCellKey(row, col);
      if (ref) {
        cellRefs.current.set(key, ref);
      } else {
        cellRefs.current.delete(key);
      }
    },
    []
  );

  const focusFirstCell = useCallback(() => {
    focusCell(0, 0);
  }, [focusCell]);

  return {
    registerCell,
    moveDown,
    moveUp,
    moveLeft,
    moveRight,
    moveNext,
    movePrevious,
    focusCell,
    focusFirstCell,
  };
}
```

## Phase 3: WeeklyOrderGrid에 적용

`app/src/components/purchase-orders/weekly-order-grid.tsx` 파일 수정:

### 3-1. Import 추가
```typescript
import { KeyboardInput } from "@/components/ui/keyboard-input";
import { useGridKeyboardNavigation } from "@/hooks/use-grid-keyboard-navigation";
```

### 3-2. Hook 사용 (51번째 줄 근처)
```typescript
export function WeeklyOrderGrid({ onSave, onExport, className }: WeeklyOrderGridProps) {
  // ... 기존 state들

  // 👇 추가
  const gridNavigation = useGridKeyboardNavigation(
    stores.length,
    products.length
  );

  // 첫 셀 자동 포커스
  React.useEffect(() => {
    if (stores.length > 0 && products.length > 0) {
      // 500ms 후 포커스 (렌더링 완료 대기)
      const timer = setTimeout(() => {
        gridNavigation.focusFirstCell();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [stores.length, products.length, gridNavigation]);
```

### 3-3. GridCell을 KeyboardInput으로 교체 (406-420번째 줄)

기존 코드를 찾아서:
```typescript
{products.map((product) => {
  const cellData = getCellData(store, product.productCode);
  return (
    <TableCell key={product.productCode} className="p-1">
      <GridCell
        data={cellData}
        onChange={(data) =>
          handleCellChange(store.storeId, product.productCode, data)
        }
        compact
      />
    </TableCell>
  );
})}
```

다음으로 변경:
```typescript
{products.map((product, colIndex) => {
  const cellData = getCellData(store, product.productCode);
  const rowIndex = stores.findIndex((s) => s.storeId === store.storeId);

  return (
    <TableCell key={product.productCode} className="p-1">
      <KeyboardInput
        ref={(el) => gridNavigation.registerCell(rowIndex, colIndex, el)}
        type="number"
        value={cellData.qty || ""}
        onChange={(e) => {
          const qty = parseInt(e.target.value) || 0;
          handleCellChange(store.storeId, product.productCode, {
            ...cellData,
            qty,
          });
        }}
        onEnter={() => gridNavigation.moveNext()}
        onShiftEnter={() => gridNavigation.movePrevious()}
        onArrowDown={() => gridNavigation.moveDown()}
        onArrowUp={() => gridNavigation.moveUp()}
        onArrowLeft={() => gridNavigation.moveLeft()}
        onArrowRight={() => gridNavigation.moveRight()}
        className="w-full text-center"
        placeholder="0"
      />
    </TableCell>
  );
})}
```

## Phase 4: 스타일링 개선

`app/globals.css`에 추가 (또는 Tailwind config):

```css
/* 포커스된 셀 강조 */
.grid-cell-focused {
  @apply ring-2 ring-blue-500 ring-offset-1;
}

/* 키보드 사용자를 위한 접근성 */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
```

## Phase 5: 키보드 단축키 가이드 추가

`weekly-order-grid.tsx`에 도움말 버튼 추가 (280번째 줄 근처):

```typescript
<div className="flex items-center gap-2">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowKeyboardGuide(true)}
  >
    <Keyboard className="h-4 w-4 mr-2" />
    키보드 단축키
  </Button>
  {/* ... 기존 버튼들 */}
</div>

{/* 모달 */}
{showKeyboardGuide && (
  <Dialog open={showKeyboardGuide} onOpenChange={setShowKeyboardGuide}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>키보드 단축키</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd>
          <span>다음 셀로 이동</span>
        </div>
        <div className="flex items-center gap-4">
          <kbd className="px-2 py-1 bg-muted rounded">Shift+Enter</kbd>
          <span>이전 셀로 이동</span>
        </div>
        <div className="flex items-center gap-4">
          <kbd className="px-2 py-1 bg-muted rounded">↑↓←→</kbd>
          <span>방향키로 셀 이동</span>
        </div>
        <div className="flex items-center gap-4">
          <kbd className="px-2 py-1 bg-muted rounded">Esc</kbd>
          <span>편집 취소</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}
```

# Deliverables
1. ✅ KeyboardInput 컴포넌트
2. ✅ useGridKeyboardNavigation Hook
3. ✅ WeeklyOrderGrid 적용
4. ✅ 스타일링
5. ✅ 키보드 가이드 UI
6. ✅ 실제 사용자 테스트 결과

# Acceptance Criteria
- [ ] Enter 키로 2,000개 셀을 순회할 수 있음
- [ ] 화살표 키로 상하좌우 이동 가능
- [ ] 셀 포커스 시 기존 값 자동 선택
- [ ] 시각적 포커스 표시 명확함
- [ ] 첫 셀에 자동 포커스됨
- [ ] 키보드만으로 전체 작업 가능

# Success Metrics
- Before: 200개 매장 입력 = 2시간 (마우스 클릭)
- After: 200개 매장 입력 = 20분 (키보드만 사용)
- **생산성 6배 향상 목표**

작업을 시작하시겠습니까?
```

---

## 🎯 P1-2: Service Layer 분리

```
# Context
당신은 대규모 Next.js 애플리케이션의 아키텍처를 개선하는 시니어 백엔드 아키텍트입니다.

# Problem
현재 비즈니스 로직이 API Route에 직접 작성되어 있어:
- 단위 테스트 불가능 (DB 의존성)
- 코드 재사용 불가능
- 로직 변경 시 전체 재배포 필요
- 260줄짜리 단일 파일로 유지보수 어려움

**예시**:
`app/src/app/api/purchase-orders/grid-save/route.ts` = 260줄

# Task
Clean Architecture 패턴을 적용하여 3개 레이어로 분리해주세요:

```
Controller (API Route)
    ↓ calls
Service (Business Logic)
    ↓ calls
Repository (Data Access)
```

## Architecture

```
app/src/
├── app/api/
│   └── purchase-orders/
│       └── grid-save/
│           └── route.ts          (30줄) ← Controller만
├── actions/
│   └── grid-actions.ts           (Server Action)
├── services/
│   └── grid.service.ts           (비즈니스 로직)
├── repositories/
│   ├── purchase-order.repository.ts
│   └── product.repository.ts
└── lib/validators/
    └── grid.schema.ts            (Zod 스키마)
```

## Step 1: Validator Layer (Zod 스키마)

`app/src/lib/validators/grid.schema.ts` 파일 새로 생성:

```typescript
import { z } from "zod";

export const gridCellSchema = z.object({
  productCode: z.string().min(1, "상품 코드 필수"),
  qty: z.number().int().min(0, "수량은 0 이상"),
  startDate: z.string().datetime("유효한 날짜 형식 필요"),
  endDate: z.string().datetime("유효한 날짜 형식 필요"),
});

export const gridRowSchema = z.object({
  storeId: z.string().cuid("유효하지 않은 매장 ID"),
  cells: z.array(gridCellSchema).min(1, "최소 1개 항목 필요"),
});

export const gridSaveRequestSchema = z.object({
  weekKey: z
    .string()
    .regex(/^\d{4}-W\d{2}$/, "weekKey 형식: YYYY-WXX")
    .refine((key) => {
      const [year, week] = key.split("-W");
      const weekNum = parseInt(week);
      return weekNum >= 1 && weekNum <= 53;
    }, "주차는 1-53 범위"),
  rows: z.array(gridRowSchema).max(500, "최대 500개 매장"),
  createSalesOrder: z.boolean().default(true),
  createPurchaseOrder: z.boolean().default(true),
});

export type GridSaveRequest = z.infer<typeof gridSaveRequestSchema>;
export type GridRow = z.infer<typeof gridRowSchema>;
export type GridCell = z.infer<typeof gridCellSchema>;
```

## Step 2: Repository Layer (Data Access)

### 2-1. Product Repository

`app/src/repositories/product.repository.ts` 파일 새로 생성:

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class ProductRepository {
  /**
   * 활성 상품 목록을 Map으로 반환
   */
  async findActiveProductMap(): Promise<Map<string, ProductInfo>> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        type: true,
        channelId: true,
        saleUnitPrice: true,
        costUnitPrice: true,
      },
    });

    return new Map(
      products.map((p) => [
        p.code,
        {
          id: p.id,
          code: p.code,
          type: p.type as ProductType,
          channelId: p.channelId,
          saleUnitPrice: p.saleUnitPrice,
          costUnitPrice: p.costUnitPrice,
        },
      ])
    );
  }
}

type ProductInfo = {
  id: string;
  code: string;
  type: string;
  channelId: string | null;
  saleUnitPrice: number;
  costUnitPrice: number;
};

type ProductType = "TRAFFIC" | "SAVE" | "REVIEW" | "DIRECTION" | "BLOG" | "RECEIPT";
```

### 2-2. PurchaseOrder Repository

`app/src/repositories/purchase-order.repository.ts` 파일 새로 생성:

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma, PurchaseOrder, PurchaseOrderItem } from "@prisma/client";
import { format } from "date-fns";

export class PurchaseOrderRepository {
  /**
   * 트랜잭션 내에서 발주 및 항목 일괄 저장
   */
  async bulkSaveWithTransaction(
    weekKey: string,
    channelGroups: Map<string, ChannelGroupData>,
    userId: string
  ): Promise<SaveSummary> {
    const summary: SaveSummary = {
      purchaseOrdersCreated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
    };

    await prisma.$transaction(
      async (tx) => {
        for (const [channelId, group] of channelGroups) {
          if (channelId === "DEFAULT" || group.items.length === 0) continue;

          // 1. 기존 발주 조회 (Row Lock)
          let purchaseOrder = await this.findAndLockByWeekAndChannel(
            tx,
            weekKey,
            channelId
          );

          // 2. 발주 없으면 생성
          if (!purchaseOrder) {
            purchaseOrder = await this.createPurchaseOrder(
              tx,
              weekKey,
              channelId,
              userId
            );
            summary.purchaseOrdersCreated++;
          }

          // 3. 항목 처리
          const itemSummary = await this.processPurchaseOrderItems(
            tx,
            purchaseOrder,
            group.items
          );

          summary.itemsCreated += itemSummary.created;
          summary.itemsUpdated += itemSummary.updated;
          summary.itemsSkipped += itemSummary.skipped;

          // 4. 합계 업데이트
          await this.updateTotals(tx, purchaseOrder.id);
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      }
    );

    return summary;
  }

  /**
   * Row Lock을 사용한 발주 조회
   */
  private async findAndLockByWeekAndChannel(
    tx: Prisma.TransactionClient,
    weekKey: string,
    channelId: string
  ): Promise<PurchaseOrderWithItems | null> {
    const result = await tx.$queryRaw<PurchaseOrderWithItems[]>`
      SELECT * FROM "PurchaseOrder"
      WHERE "orderWeek" = ${weekKey}
        AND "channelId" = ${channelId}
        AND "status" != 'CANCELLED'
      FOR UPDATE
    `;

    if (result.length === 0) return null;

    // items 조회
    const order = result[0];
    order.items = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: order.id },
    });

    return order;
  }

  /**
   * 발주 생성
   */
  private async createPurchaseOrder(
    tx: Prisma.TransactionClient,
    weekKey: string,
    channelId: string,
    userId: string
  ): Promise<PurchaseOrder> {
    const dateStr = format(new Date(), "yyMMdd");
    const count = await tx.purchaseOrder.count({
      where: { purchaseOrderNo: { startsWith: `PO${dateStr}` } },
    });
    const purchaseOrderNo = `PO${dateStr}-${String(count + 1).padStart(4, "0")}`;

    return await tx.purchaseOrder.create({
      data: {
        purchaseOrderNo,
        orderWeek: weekKey,
        orderDate: new Date(), // TODO: weekKey로 계산
        channelId,
        status: "DRAFT",
        createdById: userId,
      },
    });
  }

  /**
   * 발주 항목 처리 (Batch Insert)
   */
  private async processPurchaseOrderItems(
    tx: Prisma.TransactionClient,
    purchaseOrder: PurchaseOrderWithItems,
    items: ItemToSave[]
  ): Promise<{ created: number; updated: number; skipped: number }> {
    // 기존 항목 Map
    const existingMap = new Map(
      purchaseOrder.items?.map((item) => [
        `${item.storeId}-${item.productId}`,
        item,
      ]) || []
    );

    const itemsToCreate: Prisma.PurchaseOrderItemCreateManyInput[] = [];
    const itemsToUpdate: { id: string; data: Prisma.PurchaseOrderItemUpdateInput }[] = [];
    let skipped = 0;

    for (const item of items) {
      const key = `${item.storeId}-${item.productId}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Manual Override 보호
        if (existing.isManualOverride) {
          skipped++;
          continue;
        }

        itemsToUpdate.push({
          id: existing.id,
          data: {
            totalQty: item.totalQty,
            dailyQty: item.dailyQty,
            startDate: item.startDate,
            endDate: item.endDate,
            workDays: item.workDays,
            unitPrice: item.unitPrice,
            amount: item.amount,
            version: { increment: 1 },
          },
        });
      } else {
        itemsToCreate.push({
          purchaseOrderId: purchaseOrder.id,
          storeId: item.storeId,
          productId: item.productId,
          productType: item.productType,
          keyword: item.keyword || "",
          totalQty: item.totalQty,
          dailyQty: item.dailyQty,
          startDate: item.startDate,
          endDate: item.endDate,
          workDays: item.workDays,
          unitPrice: item.unitPrice,
          amount: item.amount,
          status: "PENDING",
        });
      }
    }

    // Batch Insert
    let created = 0;
    if (itemsToCreate.length > 0) {
      const result = await tx.purchaseOrderItem.createMany({
        data: itemsToCreate,
        skipDuplicates: true,
      });
      created = result.count;
    }

    // Batch Update
    let updated = 0;
    for (const { id, data } of itemsToUpdate) {
      await tx.purchaseOrderItem.update({ where: { id }, data });
      updated++;
    }

    return { created, updated, skipped };
  }

  /**
   * 발주 합계 업데이트
   */
  private async updateTotals(
    tx: Prisma.TransactionClient,
    purchaseOrderId: string
  ): Promise<void> {
    const totals = await tx.purchaseOrderItem.aggregate({
      where: { purchaseOrderId },
      _sum: { totalQty: true, amount: true },
    });

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        totalQty: totals._sum.totalQty || 0,
        totalAmount: totals._sum.amount || 0,
      },
    });
  }
}

// Types
type PurchaseOrderWithItems = PurchaseOrder & {
  items?: PurchaseOrderItem[];
};

type ChannelGroupData = {
  channelId: string;
  items: ItemToSave[];
};

type ItemToSave = {
  storeId: string;
  productId: string;
  productType: string;
  keyword?: string;
  totalQty: number;
  dailyQty: number;
  startDate: Date;
  endDate: Date;
  workDays: number;
  unitPrice: number;
  amount: number;
};

type SaveSummary = {
  purchaseOrdersCreated: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
};

export type { ChannelGroupData, ItemToSave, SaveSummary };
```

## Step 3: Service Layer (Business Logic)

`app/src/services/grid.service.ts` 파일 새로 생성:

```typescript
import { GridSaveRequest, gridSaveRequestSchema } from "@/lib/validators/grid.schema";
import { PurchaseOrderRepository } from "@/repositories/purchase-order.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { parseISO, differenceInDays } from "date-fns";
import type { ChannelGroupData, ItemToSave, SaveSummary } from "@/repositories/purchase-order.repository";

export class GridService {
  constructor(
    private readonly purchaseOrderRepo: PurchaseOrderRepository,
    private readonly productRepo: ProductRepository
  ) {}

  /**
   * 주간 발주 그리드 저장
   */
  async saveWeeklyGrid(
    request: GridSaveRequest,
    userId: string
  ): Promise<SaveSummary> {
    // 1. 검증
    const validated = gridSaveRequestSchema.parse(request);

    // 2. 상품 매핑 조회
    const productMap = await this.productRepo.findActiveProductMap();

    // 3. 채널별 그룹핑
    const channelGroups = this.groupByChannel(validated.rows, productMap);

    // 4. 저장
    return await this.purchaseOrderRepo.bulkSaveWithTransaction(
      validated.weekKey,
      channelGroups,
      userId
    );
  }

  /**
   * 채널별로 항목 그룹핑
   */
  private groupByChannel(
    rows: GridSaveRequest["rows"],
    productMap: Map<string, any>
  ): Map<string, ChannelGroupData> {
    const groups = new Map<string, ChannelGroupData>();

    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.qty <= 0) continue;

        const product = productMap.get(cell.productCode);
        if (!product) {
          throw new Error(`상품을 찾을 수 없음: ${cell.productCode}`);
        }

        const channelId = product.channelId || "DEFAULT";

        if (!groups.has(channelId)) {
          groups.set(channelId, { channelId, items: [] });
        }

        // 날짜 계산
        const startDate = parseISO(cell.startDate);
        const endDate = parseISO(cell.endDate);
        const workDays = differenceInDays(endDate, startDate) + 1;
        const dailyQty = Math.ceil(cell.qty / workDays);

        const item: ItemToSave = {
          storeId: row.storeId,
          productId: product.id,
          productType: product.type,
          keyword: "",
          totalQty: cell.qty,
          dailyQty,
          startDate,
          endDate,
          workDays,
          unitPrice: product.costUnitPrice || 35,
          amount: cell.qty * (product.costUnitPrice || 35),
        };

        groups.get(channelId)!.items.push(item);
      }
    }

    return groups;
  }
}
```

## Step 4: API Route 리팩토링 (Thin Controller)

`app/src/app/api/purchase-orders/grid-save/route.ts` 파일을 다음으로 **완전 교체**:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GridService } from "@/services/grid.service";
import { PurchaseOrderRepository } from "@/repositories/purchase-order.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    // 1. 인증
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 요청 파싱
    const body = await request.json();

    // 3. Service 의존성 주입
    const service = new GridService(
      new PurchaseOrderRepository(),
      new ProductRepository()
    );

    // 4. 비즈니스 로직 실행
    const result = await service.saveWeeklyGrid(body, session.user.id);

    // 5. 응답
    return NextResponse.json({
      success: true,
      summary: result,
    });
  } catch (error) {
    console.error("Grid save error:", error);

    // Zod 검증 에러
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "입력 데이터 검증 실패",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // 비즈니스 로직 에러
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 알 수 없는 에러
    return NextResponse.json(
      { error: "그리드 저장 실패" },
      { status: 500 }
    );
  }
}
```

**Before**: 260줄
**After**: 50줄 (80% 감소)

## Step 5: 단위 테스트 작성

`app/src/services/__tests__/grid.service.test.ts` 파일 새로 생성:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GridService } from "../grid.service";
import { PurchaseOrderRepository } from "@/repositories/purchase-order.repository";
import { ProductRepository } from "@/repositories/product.repository";

// Mock Repositories
vi.mock("@/repositories/purchase-order.repository");
vi.mock("@/repositories/product.repository");

describe("GridService", () => {
  let service: GridService;
  let mockPurchaseOrderRepo: PurchaseOrderRepository;
  let mockProductRepo: ProductRepository;

  beforeEach(() => {
    mockPurchaseOrderRepo = new PurchaseOrderRepository();
    mockProductRepo = new ProductRepository();
    service = new GridService(mockPurchaseOrderRepo, mockProductRepo);
  });

  describe("saveWeeklyGrid", () => {
    it("should validate weekKey format", async () => {
      const invalidRequest = {
        weekKey: "INVALID",
        rows: [],
      };

      await expect(
        service.saveWeeklyGrid(invalidRequest as any, "user-123")
      ).rejects.toThrow("weekKey 형식");
    });

    it("should group items by channel", async () => {
      // Given
      const productMap = new Map([
        ["PROD-001", { id: "p1", channelId: "ch1", costUnitPrice: 100 }],
        ["PROD-002", { id: "p2", channelId: "ch2", costUnitPrice: 200 }],
      ]);

      vi.spyOn(mockProductRepo, "findActiveProductMap").mockResolvedValue(productMap);
      vi.spyOn(mockPurchaseOrderRepo, "bulkSaveWithTransaction").mockResolvedValue({
        purchaseOrdersCreated: 2,
        itemsCreated: 3,
        itemsUpdated: 0,
        itemsSkipped: 0,
      });

      // When
      const result = await service.saveWeeklyGrid(
        {
          weekKey: "2026-W03",
          rows: [
            {
              storeId: "store-1",
              cells: [
                {
                  productCode: "PROD-001",
                  qty: 10,
                  startDate: "2026-01-13T00:00:00Z",
                  endDate: "2026-01-19T00:00:00Z",
                },
              ],
            },
          ],
        },
        "user-123"
      );

      // Then
      expect(result.itemsCreated).toBe(3);
      expect(mockPurchaseOrderRepo.bulkSaveWithTransaction).toHaveBeenCalled();
    });
  });
});
```

실행:
```bash
npm run test
```

# Deliverables
1. ✅ Validator (Zod 스키마)
2. ✅ Repository 레이어 (2개 파일)
3. ✅ Service 레이어
4. ✅ 리팩토링된 API Route (260줄 → 50줄)
5. ✅ 단위 테스트 (80% 커버리지)
6. ✅ 타입 정의 파일

# Acceptance Criteria
- [ ] API Route가 50줄 이하
- [ ] 비즈니스 로직이 Service에만 존재
- [ ] DB 접근이 Repository에만 존재
- [ ] 단위 테스트 커버리지 80% 이상
- [ ] 기존 기능 모두 정상 동작
- [ ] Zod 검증 에러 시 400 응답

# Architecture Benefits
- ✅ **테스트 가능**: Service를 Mock Repository와 테스트
- ✅ **재사용 가능**: 다른 API에서 Service 재사용
- ✅ **유지보수 쉬움**: 레이어별 책임 명확
- ✅ **확장 용이**: 새 Repository 추가 간단

작업을 시작하시겠습니까?
```

---

## 💡 사용 팁

각 프롬프트는 **완전히 독립적**으로 작동합니다:

1. **복사**: 원하는 프롬프트 전체를 복사
2. **붙여넣기**: 새 Claude 세션에 붙여넣기
3. **실행**: "작업을 시작하시겠습니까?" 질문에 "예" 응답

**다른 에이전트에게 전달할 때**:
- 이 파일 링크와 함께 "P0-1 프롬프트 실행해줘" 라고 요청
- 또는 프롬프트 전체를 복사해서 전달

# 91. 마이그레이션 가이드

> Migration Guide - 스키마 확장 및 데이터 이전

## 1. 개요

### 1.1 마이그레이션 범위

이 가이드는 다음 마이그레이션을 다룹니다:

1. **스키마 확장**: 기존 SQLite에 신규 테이블 추가
2. **데이터베이스 전환**: SQLite → PostgreSQL (Phase 3)
3. **기존 데이터 이전**: 레거시 42ment-erp 데이터

### 1.2 주의사항

⚠️ **마이그레이션 전 반드시 백업**

```bash
# SQLite 백업
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)
```

---

## 2. Phase 1: 스키마 확장 (SQLite 유지)

### 2.1 신규 테이블 추가

#### Step 1: schema.prisma 수정

```prisma
// prisma/schema.prisma에 추가

// ============ 신규 모델 ============

model Supplier {
  id             Int       @id @default(autoincrement())
  name           String
  businessNumber String?   @unique
  contactName    String?
  phone          String?
  email          String?
  address        String?
  serviceTypes   String?   // JSON
  paymentTerms   String?
  bankName       String?
  bankAccount    String?
  accountHolder  String?
  notes          String?
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  products        SupplierProduct[]
  purchaseOrders  PurchaseOrder[]

  @@index([name])
  @@index([businessNumber])
  @@index([isActive])
}

model SupplierProduct {
  id            Int       @id @default(autoincrement())
  supplierId    Int
  productId     Int
  supplierPrice Decimal
  leadTimeDays  Int?
  minOrderQty   Int?      @default(1)
  isPreferred   Boolean   @default(false)
  validFrom     DateTime?
  validUntil    DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  supplier    Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([supplierId, productId])
  @@index([supplierId])
  @@index([productId])
}

model PurchaseOrder {
  id            Int       @id @default(autoincrement())
  orderId       Int?
  supplierId    Int
  storeId       Int?
  poNumber      String    @unique
  poDate        DateTime
  deliveryDate  DateTime?
  completedDate DateTime?
  subtotal      Decimal   @default(0)
  taxAmount     Decimal   @default(0)
  totalAmount   Decimal   @default(0)
  status        String    @default("draft")
  notes         String?
  internalNotes String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  order       Order?              @relation(fields: [orderId], references: [id], onDelete: SetNull)
  supplier    Supplier            @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  store       Store?              @relation(fields: [storeId], references: [id], onDelete: SetNull)
  items       PurchaseOrderItem[]

  @@index([orderId])
  @@index([supplierId])
  @@index([poNumber])
  @@index([status])
}

model PurchaseOrderItem {
  id          Int       @id @default(autoincrement())
  poId        Int
  productId   Int?
  productName String
  productDesc String?
  quantity    Int       @default(1)
  unitPrice   Decimal
  totalPrice  Decimal
  workDetails String?   // JSON
  itemStatus  String    @default("pending")
  completedAt DateTime?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  purchaseOrder PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  product       Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([poId])
  @@index([productId])
}

model Payment {
  id            Int       @id @default(autoincrement())
  invoiceId     Int?
  customerId    Int
  orderId       Int?
  paymentDate   DateTime
  amount        Decimal
  paymentMethod String?
  bankName      String?
  depositorName String?
  transactionId String?
  matchStatus   String    @default("unmatched")
  matchedBy     String?
  matchedAt     DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  invoice   Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  customer  Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@index([customerId])
  @@index([paymentDate])
  @@index([matchStatus])
}

model ProfitAnalysis {
  id            Int       @id @default(autoincrement())
  orderId       Int       @unique
  revenue       Decimal
  costOfGoods   Decimal
  operatingCost Decimal   @default(0)
  totalCost     Decimal
  grossProfit   Decimal
  netProfit     Decimal
  grossMargin   Decimal
  netMargin     Decimal
  analysisDate  DateTime  @default(now())
  isManual      Boolean   @default(false)
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([analysisDate])
}

model CustomerProductPrice {
  id          Int       @id @default(autoincrement())
  customerId  Int
  productId   Int
  customPrice Decimal
  discountRate Decimal?
  validFrom   DateTime?
  validUntil  DateTime?
  minQuantity Int?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([customerId, productId])
  @@index([customerId])
  @@index([productId])
}

model AuditLog {
  id            Int      @id @default(autoincrement())
  entityType    String
  entityId      Int
  action        String
  oldValue      String?
  newValue      String?
  changedFields String?
  changedBy     String?
  changedByName String?
  ipAddress     String?
  userAgent     String?
  requestId     String?
  description   String?
  createdAt     DateTime @default(now())

  @@index([entityType, entityId])
  @@index([action])
  @@index([changedBy])
  @@index([createdAt])
}
```

#### Step 2: 기존 모델 관계 추가

```prisma
// 기존 모델에 관계 추가

model Product {
  // ... 기존 필드 ...
  
  // 추가
  supplierProducts    SupplierProduct[]
  purchaseOrderItems  PurchaseOrderItem[]
  customerPrices      CustomerProductPrice[]
}

model Order {
  // ... 기존 필드 ...
  
  // 추가
  purchaseOrders  PurchaseOrder[]
  profitAnalysis  ProfitAnalysis?
}

model Customer {
  // ... 기존 필드 ...
  
  // 추가
  payments        Payment[]
  customerPrices  CustomerProductPrice[]
}

model Invoice {
  // ... 기존 필드 ...
  
  // 추가
  payments  Payment[]
}

model Store {
  // ... 기존 필드 ...
  
  // 추가
  purchaseOrders  PurchaseOrder[]
}
```

#### Step 3: 마이그레이션 실행

```bash
# 마이그레이션 생성 및 적용
npx prisma migrate dev --name add_supplier_purchase_payment_profit

# Prisma Client 재생성
npx prisma generate
```

### 2.2 마이그레이션 검증

```typescript
// scripts/verify-migration.ts
import { prisma } from '@/lib/prisma/client';

async function verifyMigration() {
  console.log('마이그레이션 검증 시작...\n');

  // 1. 테이블 존재 확인
  const tables = [
    'Supplier',
    'SupplierProduct',
    'PurchaseOrder',
    'PurchaseOrderItem',
    'Payment',
    'ProfitAnalysis',
    'CustomerProductPrice',
    'AuditLog'
  ];

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
      console.log(`✅ ${table}: 존재함 (${count}개 레코드)`);
    } catch (error) {
      console.log(`❌ ${table}: 오류 - ${error.message}`);
    }
  }

  // 2. 관계 테스트
  console.log('\n관계 테스트...');
  
  try {
    const order = await prisma.order.findFirst({
      include: {
        purchaseOrders: true,
        profitAnalysis: true
      }
    });
    console.log('✅ Order 관계: 정상');
  } catch (error) {
    console.log(`❌ Order 관계: ${error.message}`);
  }

  console.log('\n마이그레이션 검증 완료');
}

verifyMigration();
```

```bash
# 검증 스크립트 실행
npx ts-node scripts/verify-migration.ts
```

---

## 3. Phase 3: PostgreSQL 마이그레이션

### 3.1 PostgreSQL 설정

#### Step 1: PostgreSQL 설치/설정

```bash
# Docker로 PostgreSQL 실행 (개발용)
docker run --name erp-postgres \
  -e POSTGRES_USER=erp_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=erp_db \
  -p 5432:5432 \
  -d postgres:15
```

#### Step 2: 환경 변수 수정

```bash
# .env
# SQLite (기존)
# DATABASE_URL="file:./dev.db"

# PostgreSQL (신규)
DATABASE_URL="postgresql://erp_user:your_password@localhost:5432/erp_db?schema=public"
```

#### Step 3: schema.prisma 수정

```prisma
datasource db {
  provider = "postgresql"  // sqlite → postgresql
  url      = env("DATABASE_URL")
}
```

#### Step 4: 데이터 타입 변경

SQLite와 PostgreSQL의 차이점 반영:

```prisma
// SQLite용
// tags String?   // JSON array as string

// PostgreSQL용
// tags String[]  // 네이티브 배열 지원
```

### 3.2 데이터 이전 스크립트

```typescript
// scripts/migrate-sqlite-to-postgres.ts
import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client';

const sqliteUrl = 'file:./prisma/dev.db';
const postgresUrl = process.env.DATABASE_URL;

async function migrateData() {
  const sqlite = new SQLiteClient({
    datasources: { db: { url: sqliteUrl } }
  });
  
  const postgres = new PostgresClient({
    datasources: { db: { url: postgresUrl } }
  });

  console.log('데이터 마이그레이션 시작...\n');

  // 순서 중요: 외래키 의존성 순서대로 이전
  const migrationOrder = [
    'customer',
    'product',
    'supplier',
    'store',
    'quotation',
    'quotationItem',
    'order',
    'orderItem',
    'purchaseOrder',
    'purchaseOrderItem',
    'invoice',
    'payment',
    'consultation',
    'task',
    'timeEntry',
    'document',
    'settlement',
    'supplierProduct',
    'customerProductPrice',
    'profitAnalysis',
    'auditLog'
  ];

  for (const model of migrationOrder) {
    try {
      const data = await (sqlite as any)[model].findMany();
      
      if (data.length > 0) {
        // ID 자동 증가 시퀀스 조정을 위해 createMany 사용
        await (postgres as any)[model].createMany({
          data,
          skipDuplicates: true
        });
        console.log(`✅ ${model}: ${data.length}개 이전 완료`);
      } else {
        console.log(`⏭️ ${model}: 데이터 없음`);
      }
    } catch (error) {
      console.log(`❌ ${model}: ${error.message}`);
    }
  }

  // 시퀀스 리셋 (PostgreSQL)
  console.log('\n시퀀스 리셋 중...');
  for (const model of migrationOrder) {
    try {
      const maxId = await (postgres as any)[model].aggregate({
        _max: { id: true }
      });
      if (maxId._max.id) {
        await postgres.$executeRaw`
          SELECT setval(
            pg_get_serial_sequence('"${model}"', 'id'),
            ${maxId._max.id}
          )
        `;
      }
    } catch (error) {
      // 무시
    }
  }

  await sqlite.$disconnect();
  await postgres.$disconnect();

  console.log('\n마이그레이션 완료!');
}

migrateData();
```

### 3.3 마이그레이션 실행 절차

```bash
# 1. SQLite 백업
cp prisma/dev.db prisma/dev.db.backup

# 2. PostgreSQL 마이그레이션 생성
npx prisma migrate dev --name migrate_to_postgres

# 3. 데이터 이전 스크립트 실행
npx ts-node scripts/migrate-sqlite-to-postgres.ts

# 4. 검증
npx ts-node scripts/verify-migration.ts
```

---

## 4. 레거시 데이터 이전 (42ment-erp)

### 4.1 42ment-erp 데이터 구조 분석

```
42ment-erp (Python/SQLite)
├── clients       → Customer
├── invoices      → Invoice
├── invoice_items → (Order로 통합)
├── services      → Product
└── time_entries  → TimeEntry (일부)
```

### 4.2 매핑 테이블

| 42ment-erp | 42Ment ERP 2026 | 변환 로직 |
|------------|-----------------|----------|
| clients.name | Customer.name | 직접 매핑 |
| clients.email | Customer.email | 직접 매핑 |
| clients.phone | Customer.phone | 직접 매핑 |
| clients.address | Customer.address | 직접 매핑 |
| invoices | Order + Invoice | 분리 생성 |
| invoice_items | OrderItem | 관계 재설정 |
| services | Product | 직접 매핑 |

### 4.3 이전 스크립트

```typescript
// scripts/migrate-legacy-42ment.ts

import Database from 'better-sqlite3';
import { prisma } from '@/lib/prisma/client';

const legacyDb = new Database('path/to/42ment-erp/app.db');

async function migrateLegacy() {
  console.log('42ment-erp 데이터 이전 시작...\n');

  // 1. Clients → Customers
  const clients = legacyDb.prepare('SELECT * FROM clients').all();
  for (const client of clients) {
    await prisma.customer.create({
      data: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: `[42ment-erp 이전] ${client.notes || ''}`,
      }
    });
  }
  console.log(`✅ Clients: ${clients.length}개 이전`);

  // 2. Services → Products
  const services = legacyDb.prepare('SELECT * FROM services').all();
  for (const service of services) {
    await prisma.product.create({
      data: {
        name: service.name,
        description: service.description,
        unitPrice: service.rate || 0,
        unit: 'hour',
        category: 'legacy',
      }
    });
  }
  console.log(`✅ Services: ${services.length}개 이전`);

  // 3. Invoices → Orders + Invoices
  const invoices = legacyDb.prepare('SELECT * FROM invoices').all();
  for (const inv of invoices) {
    // 고객 매핑
    const customer = await prisma.customer.findFirst({
      where: { name: inv.client_name }
    });
    if (!customer) continue;

    // Order 생성
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        orderNumber: `LEGACY-${inv.invoice_number}`,
        orderDate: new Date(inv.invoice_date),
        totalAmount: inv.total || 0,
        status: inv.paid ? 'completed' : 'pending',
        notes: `[42ment-erp 이전] Invoice #${inv.invoice_number}`,
      }
    });

    // Invoice 생성
    await prisma.invoice.create({
      data: {
        orderId: order.id,
        customerId: customer.id,
        invoiceNumber: `LEGACY-${inv.invoice_number}`,
        invoiceDate: new Date(inv.invoice_date),
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        amount: inv.total || 0,
        isPaid: inv.paid === 1,
        paidDate: inv.paid_date ? new Date(inv.paid_date) : null,
      }
    });
  }
  console.log(`✅ Invoices: ${invoices.length}개 이전`);

  legacyDb.close();
  console.log('\n레거시 데이터 이전 완료!');
}

migrateLegacy();
```

---

## 5. 롤백 절차

### 5.1 마이그레이션 롤백

```bash
# 마지막 마이그레이션 롤백
npx prisma migrate reset

# 또는 특정 마이그레이션으로 롤백
npx prisma migrate resolve --rolled-back "마이그레이션_이름"
```

### 5.2 데이터 복원

```bash
# SQLite 백업에서 복원
cp prisma/dev.db.backup prisma/dev.db

# Prisma Client 재생성
npx prisma generate
```

---

## 6. 체크리스트

### Phase 1 마이그레이션 체크리스트

- [ ] 현재 데이터베이스 백업 완료
- [ ] schema.prisma 수정 완료
- [ ] `prisma migrate dev` 성공
- [ ] `prisma generate` 성공
- [ ] 검증 스크립트 통과
- [ ] 애플리케이션 정상 작동 확인

### Phase 3 (PostgreSQL) 마이그레이션 체크리스트

- [ ] PostgreSQL 서버 준비
- [ ] 환경 변수 수정
- [ ] schema.prisma provider 변경
- [ ] 데이터 이전 스크립트 실행
- [ ] 시퀀스 리셋 확인
- [ ] 전체 기능 테스트

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |



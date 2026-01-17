# 42Ment ERP 워크플로우 중심 재개편 작업지시서

> **작성일**: 2026-01-17
> **대상 프로젝트**: 42Menterp_2026
> **목적**: 광고대행사 실무 워크플로우 중심으로 시스템 전면 재구축
> **방법론**: Bottom-up Rebuild (데이터 모델 → 공통 컴포넌트 → 워크플로우 → 도메인 특화)

---

## 🎯 Executive Summary

### 현재 문제점
1. **워크플로우 단절**: 견적 → 주문 → 발주 → 정산의 End-to-End 흐름이 구현되지 않음
2. **표준 패턴 미준수**: Excel 업로드/다운로드, Bulk Actions이 일부 페이지에만 존재
3. **도메인 로직 부재**: 키워드 중심 검색, 성과 기반 정산, 자동 연장 등 광고업 핵심 기능 없음
4. **치명적 오류**: Products 페이지 404, 데이터 일관성 문제

### 재개편 전략
**4-Phase Iterative Rebuild** (각 Phase마다 배포 가능한 MVP 산출)
- **Phase 1**: 데이터 모델 정비 + 공통 컴포넌트 표준화 (2주)
- **Phase 2**: 핵심 워크플로우 구현 (3주)
- **Phase 3**: 도메인 특화 기능 (4주)
- **Phase 4**: 운영 최적화 + 레거시 마이그레이션 (2주)

**총 소요 기간**: 11주 (약 3개월)

---

## Phase 1: Foundation Rebuild (2주)

### 목표
✅ 데이터 모델 정비
✅ 공통 컴포넌트 표준화
✅ 모든 CRUD 페이지에 Excel/Bulk Actions 적용

### 1.1 데이터 모델 개선

#### 작업 내용
```prisma
// prisma/schema.prisma

// 1. 워크플로우 연결 강화
model Quotation {
  id              String          @id @default(cuid())
  quotationNo     String          @unique
  customerId      String
  customer        Customer        @relation(fields: [customerId], references: [id])

  status          QuotationStatus @default(DRAFT)
  items           QuotationItem[]

  // 승인 시 자동 생성되는 주문
  salesOrder      SalesOrder?     @relation("QuotationToOrder")

  totalAmount     Int
  validUntil      DateTime

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([customerId])
  @@index([status])
}

enum QuotationStatus {
  DRAFT       // 작성 중
  SENT        // 발송됨
  ACCEPTED    // 승인됨 (→ SalesOrder 자동 생성)
  REJECTED    // 거절됨
  EXPIRED     // 만료됨
}

model SalesOrder {
  id              String          @id @default(cuid())
  salesOrderNo    String          @unique

  // 상위 문서: Quotation
  quotationId     String?         @unique
  quotation       Quotation?      @relation("QuotationToOrder", fields: [quotationId], references: [id])

  customerId      String
  customer        Customer        @relation(fields: [customerId], references: [id])

  status          SalesOrderStatus @default(DRAFT)
  items           SalesOrderItem[]

  // 하위 문서: PurchaseOrders (상품별 분리)
  purchaseOrders  PurchaseOrder[] @relation("OrderToPurchase")

  totalAmount     Int
  orderDate       DateTime        @default(now())

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([customerId])
  @@index([quotationId])
  @@index([status])
}

model PurchaseOrder {
  id                String              @id @default(cuid())
  purchaseOrderNo   String              @unique

  // 상위 문서: SalesOrder
  salesOrderId      String
  salesOrder        SalesOrder          @relation("OrderToPurchase", fields: [salesOrderId], references: [id])

  // 실행 채널 (파트너사)
  channelId         String
  channel           Channel             @relation(fields: [channelId], references: [id])

  status            PurchaseOrderStatus @default(DRAFT)
  items             PurchaseOrderItem[]

  // 구글 시트 연동
  sheetExports      SheetExport[]
  sheetImports      SheetImport[]

  // 정산 연결
  workStatement     WorkStatement?

  orderWeek         String              // "2026-W03" 형식
  totalAmount       Int

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([salesOrderId])
  @@index([channelId])
  @@index([orderWeek])
  @@index([status])
}

// 2. 광고업 도메인 필드 추가
model PurchaseOrderItem {
  id              String          @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder   @relation(fields: [purchaseOrderId], references: [id])

  storeId         String
  store           Store           @relation(fields: [storeId], references: [id])

  productId       String
  product         Product         @relation(fields: [productId], references: [id])

  // 🔑 키워드 (광고업 핵심)
  keyword         String          @default("")

  // 🎯 성과 목표
  goalType        GoalType        @default(FULL_PERIOD)
  targetRank      Int?            // 목표 순위 (예: 5위 이내)
  currentRank     Int?            // 실시간 순위

  // 📊 성과 측정
  successDays     Int             @default(0)
  failDays        Int             @default(0)

  // 💰 정산
  totalQty        Int
  unitPrice       Int
  amount          Int
  refundPerDay    Int?            // 실패 시 일일 차감액

  // 📸 증빙
  proofUrl        String?
  proofNote       String?
  thumbnailUrl    String?

  // 기간
  startDate       DateTime
  endDate         DateTime
  workDays        Int

  status          ItemStatus      @default(PENDING)

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([purchaseOrderId])
  @@index([storeId])
  @@index([productId])
  @@index([keyword])          // 🔍 검색 최적화
  @@fulltext([keyword, proofNote])  // Full-text search
}

enum GoalType {
  RANKING       // 순위 보장형
  TRAFFIC       // 트래픽 보장형
  FULL_PERIOD   // 단순 기간제
}

// 3. 정산 워크플로우 완성
model WorkStatement {
  id              String          @id @default(cuid())
  statementNo     String          @unique

  // 발주서 1:1 매핑
  purchaseOrderId String          @unique
  purchaseOrder   PurchaseOrder   @relation(fields: [purchaseOrderId], references: [id])

  items           WorkStatementItem[]

  totalAmount     Int
  status          StatementStatus @default(DRAFT)
  confirmedAt     DateTime?

  // 정산 연결
  settlement      Settlement?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([purchaseOrderId])
  @@index([status])
}

model Settlement {
  id                String          @id @default(cuid())
  settlementNo      String          @unique
  settlementMonth   String          // "2026-01"

  // 명세서 연결
  workStatementId   String?         @unique
  workStatement     WorkStatement?  @relation(fields: [workStatementId], references: [id])

  storeId           String
  store             Store           @relation(fields: [storeId], references: [id])

  channelId         String
  channel           Channel         @relation(fields: [channelId], references: [id])

  type              SettlementType

  // 금액
  amount            Int
  billableAmount    Int             // 청구 가능 금액
  unbillableAmount  Int             @default(0)  // 환불/차감 금액
  unbillableReason  String?

  // 소급분 표시
  isRetroactive     Boolean         @default(false)
  originalMonth     String?
  adjustmentNote    String?

  status            SettlementStatus @default(PENDING)

  // 세금계산서
  taxInvoice        TaxInvoice?

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([settlementMonth])
  @@index([storeId])
  @@index([channelId])
  @@index([status])
  @@index([isRetroactive])
}

// 4. 자동 연장 제안
model CampaignRenewal {
  id                String          @id @default(cuid())

  originalOrderId   String
  originalOrder     PurchaseOrder   @relation("OriginalOrder", fields: [originalOrderId], references: [id])

  proposedStartDate DateTime
  proposedEndDate   DateTime
  proposedAmount    Int

  status            RenewalStatus   @default(PENDING)

  renewedOrderId    String?         @unique
  renewedOrder      PurchaseOrder?  @relation("RenewedOrder", fields: [renewedOrderId], references: [id])

  expiryNotifiedAt  DateTime?
  acceptedAt        DateTime?
  acceptedById      String?
  acceptedBy        User?           @relation(fields: [acceptedById], references: [id])

  createdAt         DateTime        @default(now())

  @@index([originalOrderId])
  @@index([status])
}

enum RenewalStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
}

// 5. 성과 기반 정산 규칙
model BillingRule {
  id                String          @id @default(cuid())

  productId         String
  product           Product         @relation(fields: [productId], references: [id])

  ruleType          BillingRuleType
  targetRank        Int?
  minCompletionRate Float?

  refundType        RefundType      @default(DAILY_PRORATED)
  refundRate        Float           @default(1.0)

  effectiveFrom     DateTime        @default(now())
  effectiveTo       DateTime?

  isActive          Boolean         @default(true)
  createdAt         DateTime        @default(now())

  @@index([productId])
}

enum BillingRuleType {
  RANK_GUARANTEE
  COMPLETION_BASED
  HYBRID
}

enum RefundType {
  DAILY_PRORATED
  FULL_REFUND
  NO_REFUND
}

// 6. 고객 공개 리포트
model ClientReport {
  id              String      @id @default(cuid())
  secretToken     String      @unique @default(cuid())

  salesOrderId    String
  salesOrder      SalesOrder  @relation(fields: [salesOrderId], references: [id])

  title           String
  description     String?
  showPricing     Boolean     @default(false)
  expiresAt       DateTime?

  viewCount       Int         @default(0)
  lastViewedAt    DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([secretToken])
}

// 7. 순위 스냅샷 아카이빙
model RankingSnapshot {
  id              String          @id @default(cuid())
  storeKeywordId  String
  storeKeyword    StoreKeyword    @relation(fields: [storeKeywordId], references: [id])

  ranking         Int
  checkDate       DateTime
  checkTime       String          @default("00:00")

  screenshotUrl   String?
  pageUrl         String?

  searchEngine    String          @default("NAVER")
  device          String          @default("MOBILE")

  createdAt       DateTime        @default(now())

  @@index([storeKeywordId, checkDate])
  @@index([checkDate])
}
```

#### 실행 명령
```bash
# 1. 스키마 백업
cd C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app
cp prisma/schema.prisma prisma/schema.backup.$(date +%Y%m%d).prisma

# 2. 스키마 업데이트 (위 내용 반영)

# 3. Migration 생성 및 적용
npx prisma migrate dev --name workflow_rebuild_phase1

# 4. Prisma Client 재생성
npx prisma generate
```

---

### 1.2 공통 컴포넌트 표준화

#### 1.2.1 DataTable 컴포넌트 (필수 기능 내장)

**파일**: `app/src/components/common/data-table-v2.tsx`

```typescript
import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Upload, FileSpreadsheet, Trash2, Edit } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Excel 기능
  enableExcel?: boolean;
  onExcelDownload?: () => Promise<void>;
  onExcelUpload?: (file: File) => Promise<void>;
  onTemplateDownload?: () => Promise<void>;

  // Bulk Actions
  enableBulkActions?: boolean;
  bulkActions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: TData[]) => void;
    variant?: 'default' | 'destructive';
  }[];

  // 필터
  searchPlaceholder?: string;
  searchColumn?: string;

  // 신규 등록
  onNewClick?: () => void;
  newButtonLabel?: string;
}

export function DataTableV2<TData, TValue>({
  columns,
  data,
  enableExcel = true,
  onExcelDownload,
  onExcelUpload,
  onTemplateDownload,
  enableBulkActions = true,
  bulkActions = [],
  searchPlaceholder = '검색...',
  searchColumn,
  onNewClick,
  newButtonLabel = '추가',
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  // 체크박스 컬럼 자동 추가
  const tableColumns = enableBulkActions
    ? [
        {
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      rowSelection,
      globalFilter,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  return (
    <div className="space-y-4">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between">
        {/* 검색 */}
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {enableBulkActions && selectedRows.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  선택된 {selectedRows.length}개 항목
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {bulkActions.map((action, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => action.onClick(selectedRows)}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Excel 버튼 */}
          {enableExcel && (
            <>
              {onTemplateDownload && (
                <Button variant="outline" size="sm" onClick={onTemplateDownload}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  양식 다운로드
                </Button>
              )}
              {onExcelUpload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.xlsx,.xls';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) onExcelUpload(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  엑셀 업로드
                </Button>
              )}
              {onExcelDownload && (
                <Button variant="outline" size="sm" onClick={onExcelDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  엑셀 다운로드
                </Button>
              )}
            </>
          )}

          {/* 신규 등록 */}
          {onNewClick && (
            <Button onClick={onNewClick}>
              {newButtonLabel}
            </Button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-3 text-left">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          이전
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
```

#### 1.2.2 Excel 유틸리티

**파일**: `app/src/lib/excel-utils.ts`

```typescript
import * as XLSX from 'xlsx';

export async function downloadExcelTemplate(
  filename: string,
  columns: { header: string; key: string }[]
) {
  const worksheet = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_aoa(worksheet, [columns.map((col) => col.header)], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, `${filename}_template.xlsx`);
}

export async function downloadExcelData<T>(
  filename: string,
  data: T[],
  columns: { header: string; key: keyof T }[]
) {
  const formattedData = data.map((row) =>
    columns.reduce((acc, col) => {
      acc[col.header] = row[col.key];
      return acc;
    }, {} as any)
  );

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseExcelFile<T>(
  file: File,
  columnMapping: Record<string, keyof T>
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const mapped = json.map((row: any) => {
          const result = {} as T;
          Object.entries(columnMapping).forEach(([excelCol, dataKey]) => {
            result[dataKey] = row[excelCol];
          });
          return result;
        });

        resolve(mapped);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}
```

---

### 1.3 모든 페이지에 표준 패턴 적용

#### 작업 목록

각 페이지를 다음 순서로 리팩토링:

1. **Customers** (이미 양호 - 참고용으로 사용)
2. **Stores** ⚠️ 긴급
3. **Products** 🚨 치명적 (404 수정)
4. **Purchase Orders**
5. **Settlements**
6. **Accounts**

#### 예시: Stores 페이지 리팩토링

**파일**: `app/src/app/(dashboard)/stores/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTableV2 } from '@/components/common/data-table-v2';
import { downloadExcelTemplate, downloadExcelData, parseExcelFile } from '@/lib/excel-utils';
import { toast } from 'sonner';

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  // 데이터 조회
  const fetchStores = async () => {
    const res = await fetch('/api/stores');
    const data = await res.json();
    setStores(data);
  };

  // Excel 양식 다운로드
  const handleTemplateDownload = async () => {
    await downloadExcelTemplate('stores', [
      { header: '매장명', key: 'name' },
      { header: '고객사명', key: 'customerName' },
      { header: '주소', key: 'address' },
      { header: '전화번호', key: 'phone' },
    ]);
    toast.success('양식 다운로드 완료');
  };

  // Excel 데이터 다운로드
  const handleExcelDownload = async () => {
    await downloadExcelData('stores', stores, [
      { header: '매장명', key: 'name' },
      { header: '고객사명', key: 'customerName' },
      { header: '주소', key: 'address' },
      { header: '전화번호', key: 'phone' },
    ]);
    toast.success('엑셀 다운로드 완료');
  };

  // Excel 업로드
  const handleExcelUpload = async (file: File) => {
    try {
      setLoading(true);
      const data = await parseExcelFile(file, {
        '매장명': 'name',
        '고객사명': 'customerName',
        '주소': 'address',
        '전화번호': 'phone',
      });

      const res = await fetch('/api/stores/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: data }),
      });

      const result = await res.json();
      toast.success(`${result.success}건 업로드 완료`);
      fetchStores();
    } catch (error) {
      toast.error('업로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async (selectedRows: any[]) => {
    if (!confirm(`선택한 ${selectedRows.length}개 매장을 삭제하시겠습니까?`)) return;

    try {
      await fetch('/api/stores/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selectedRows.map((r) => r.id) }),
      });
      toast.success('삭제 완료');
      fetchStores();
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  const columns = [
    { accessorKey: 'name', header: '매장명' },
    { accessorKey: 'customerName', header: '고객사' },
    { accessorKey: 'address', header: '주소' },
    { accessorKey: 'phone', header: '전화번호' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">매장 관리</h1>

      <DataTableV2
        columns={columns}
        data={stores}
        enableExcel
        onTemplateDownload={handleTemplateDownload}
        onExcelDownload={handleExcelDownload}
        onExcelUpload={handleExcelUpload}
        enableBulkActions
        bulkActions={[
          {
            label: '선택 삭제',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: 'destructive',
          },
        ]}
        onNewClick={() => router.push('/stores/new')}
        newButtonLabel="매장 추가"
        searchPlaceholder="매장명으로 검색..."
      />
    </div>
  );
}
```

---

### 1.4 Products 404 오류 수정

#### 문제
`/products/new` 라우트가 존재하지 않음

#### 해결
**파일**: `app/src/app/(dashboard)/products/new/page.tsx` 생성

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: 'TRAFFIC',
    baseUnitPrice: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('상품 등록 완료');
        router.push('/products');
      } else {
        toast.error('등록 실패');
      }
    } catch (error) {
      toast.error('오류 발생');
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">상품 추가</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>상품명</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>기본 단가</Label>
          <Input
            type="number"
            value={formData.baseUnitPrice}
            onChange={(e) => setFormData({ ...formData, baseUnitPrice: Number(e.target.value) })}
            required
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">등록</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## Phase 2: Core Workflow Implementation (3주)

### 2.1 워크플로우 자동화 API

#### 2.1.1 견적 승인 → 주문 자동 생성

**파일**: `app/src/app/api/quotations/[id]/accept/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const quotationId = params.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 견적서 승인 처리
      const quotation = await tx.quotation.update({
        where: { id: quotationId },
        data: { status: 'ACCEPTED' },
        include: { items: true, customer: true },
      });

      // 2. 주문서 자동 생성
      const salesOrder = await tx.salesOrder.create({
        data: {
          salesOrderNo: `SO${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          status: 'CONFIRMED',
          totalAmount: quotation.totalAmount,
          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              supplyAmount: item.supplyAmount,
            })),
          },
        },
        include: { items: true },
      });

      return { quotation, salesOrder };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 2.1.2 주문 확정 → 발주서 분리 생성

**파일**: `app/src/app/api/sales-orders/[id]/confirm/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const salesOrderId = params.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: { include: { product: true } } },
      });

      if (!salesOrder) throw new Error('주문을 찾을 수 없습니다');

      // 상품별로 그룹핑
      const itemsByProduct = salesOrder.items.reduce((acc, item) => {
        const productId = item.productId;
        if (!acc[productId]) acc[productId] = [];
        acc[productId].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      // 상품별로 발주서 생성
      const purchaseOrders = await Promise.all(
        Object.entries(itemsByProduct).map(async ([productId, items]) => {
          const product = items[0].product;

          return tx.purchaseOrder.create({
            data: {
              purchaseOrderNo: `PO${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              salesOrderId: salesOrder.id,
              channelId: product.defaultChannelId, // 상품별 기본 채널
              status: 'CONFIRMED',
              orderWeek: `${new Date().getFullYear()}-W${Math.ceil((new Date().getDate()) / 7).toString().padStart(2, '0')}`,
              totalAmount: items.reduce((sum, item) => sum + item.supplyAmount, 0),
              items: {
                create: items.map((item) => ({
                  storeId: item.storeId,
                  productId: item.productId,
                  keyword: item.keyword || '',
                  totalQty: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.supplyAmount,
                  startDate: item.startDate,
                  endDate: item.endDate,
                  workDays: item.workDays,
                  status: 'PENDING',
                })),
              },
            },
          });
        })
      );

      // 주문서 상태 업데이트
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'PROCESSING' },
      });

      return { salesOrder, purchaseOrders };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2.2 구글 시트 연동 (양방향)

#### 2.2.1 발주서 → 시트 Export

**파일**: `app/src/app/api/purchase-orders/[id]/export-to-sheet/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const purchaseOrderId = params.id;

  try {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: {
          include: { store: true, product: true },
        },
        channel: {
          include: { sheetConfig: true },
        },
      },
    });

    if (!purchaseOrder) throw new Error('발주서를 찾을 수 없습니다');

    const sheetConfig = purchaseOrder.channel.sheetConfig;
    if (!sheetConfig) throw new Error('시트 설정이 없습니다');

    // Google Sheets API 인증
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 데이터 변환
    const rows = purchaseOrder.items.map((item) => [
      purchaseOrder.purchaseOrderNo,
      item.store.name,
      item.keyword,
      item.totalQty,
      item.startDate.toISOString().slice(0, 10),
      item.endDate.toISOString().slice(0, 10),
      item.amount,
      '', // 작업 URL (나중에 채워짐)
      '', // 완료일
    ]);

    // 시트에 쓰기
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetConfig.spreadsheetId,
      range: sheetConfig.orderSheetRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    // Export 로그 저장
    await prisma.sheetExport.create({
      data: {
        purchaseOrderId: purchaseOrder.id,
        spreadsheetId: sheetConfig.spreadsheetId,
        sheetName: sheetConfig.orderSheetName,
        rowCount: rows.length,
        status: 'SUCCESS',
      },
    });

    return NextResponse.json({ success: true, rowCount: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 2.2.2 시트 → 작업 결과 Import (Cron)

**파일**: `app/src/app/api/cron/import-sheet-receipts/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';

export async function GET() {
  try {
    // 활성 채널의 시트 설정 조회
    const channels = await prisma.channel.findMany({
      where: { isActive: true },
      include: { sheetConfig: true },
    });

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    for (const channel of channels) {
      const config = channel.sheetConfig;
      if (!config) continue;

      // 수주 시트 데이터 읽기
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: config.receiptSheetRange,
      });

      const rows = response.data.values || [];

      // 헤더 제외
      const dataRows = rows.slice(1);

      for (const row of dataRows) {
        const [orderNo, storeName, keyword, workUrl, completedDate] = row;

        if (!workUrl) continue; // 작업 URL이 없으면 스킵

        // 발주 항목 찾기
        const item = await prisma.purchaseOrderItem.findFirst({
          where: {
            purchaseOrder: { purchaseOrderNo: orderNo },
            keyword: keyword,
            store: { name: storeName },
          },
        });

        if (!item) {
          console.warn(`매칭 실패: ${orderNo} - ${keyword} - ${storeName}`);
          continue;
        }

        // 증빙 업데이트
        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            proofUrl: workUrl,
            status: 'COMPLETED',
          },
        });

        // Import 로그 저장
        await prisma.sheetImport.create({
          data: {
            purchaseOrderId: item.purchaseOrderId,
            purchaseOrderItemId: item.id,
            spreadsheetId: config.spreadsheetId,
            sheetName: config.receiptSheetName,
            matchStatus: 'MATCHED',
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2.3 워크플로우 대시보드

**파일**: `app/src/app/(dashboard)/workflow/page.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function WorkflowDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">워크플로우 현황</h1>

      <div className="grid grid-cols-5 gap-4">
        {/* 견적 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">견적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <div className="text-xs text-muted-foreground mt-1">
              대기중 5건
            </div>
          </CardContent>
        </Card>

        <ArrowRight className="self-center text-muted-foreground" />

        {/* 주문 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
            <div className="text-xs text-muted-foreground mt-1">
              확정 8건
            </div>
          </CardContent>
        </Card>

        <ArrowRight className="self-center text-muted-foreground" />

        {/* 발주 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">발주</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">25</div>
            <div className="text-xs text-muted-foreground mt-1">
              진행중 18건
            </div>
          </CardContent>
        </Card>

        <ArrowRight className="self-center text-muted-foreground" />

        {/* 정산 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">정산</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3</div>
            <div className="text-xs text-muted-foreground mt-1">
              대기 3건
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <div className="font-medium">견적 QT2026-001 승인됨</div>
                <div className="text-xs text-muted-foreground">주문 SO2026-001이 자동 생성됨</div>
              </div>
              <Badge>5분 전</Badge>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <div className="font-medium">발주 PO2026-015 시트 Export 완료</div>
                <div className="text-xs text-muted-foreground">25개 항목이 시트에 전송됨</div>
              </div>
              <Badge>10분 전</Badge>
            </div>

            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <div className="font-medium">캠페인 만료 예정</div>
                <div className="text-xs text-muted-foreground">3일 후 만료되는 발주 12건</div>
              </div>
              <Badge variant="destructive">긴급</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 3: Domain-Specific Features (4주)

### 3.1 키워드 중심 통합 검색

[이전 AdTech 문서의 Universal Search API 구현]

### 3.2 자동 캠페인 연장

[이전 AdTech 문서의 Smart Extension 구현]

### 3.3 성과 기반 정산

[이전 AdTech 문서의 Performance Billing 구현]

### 3.4 고객 공개 리포트

[이전 AdTech 문서의 Client Viewer 구현]

---

## Phase 4: Operation Optimization (2주)

### 4.1 과거 데이터 마이그레이션

[이전 AdTech 문서의 Legacy Import 구현]

### 4.2 성능 최적화

- Database Index 최적화
- React Query 캐싱
- Server-side Pagination

### 4.3 모니터링 및 로깅

- Sentry 에러 추적
- Analytics 대시보드

---

## 실행 체크리스트

### Week 1-2: Foundation
- [ ] 스키마 업데이트 및 마이그레이션
- [ ] DataTableV2 공통 컴포넌트 구현
- [ ] Excel 유틸리티 구현
- [ ] Products 404 오류 수정
- [ ] Stores 페이지 리팩토링
- [ ] Settlements 페이지 리팩토링
- [ ] Accounts 페이지 리팩토링

### Week 3-5: Core Workflow
- [ ] 견적 → 주문 자동화 API
- [ ] 주문 → 발주 분리 API
- [ ] 구글 시트 Export API
- [ ] 구글 시트 Import Cron
- [ ] 워크플로우 대시보드 UI

### Week 6-9: Domain Features
- [ ] Universal Search API
- [ ] Command Palette (⌘K)
- [ ] Campaign Renewal 자동화
- [ ] Performance Billing
- [ ] Client Report Viewer

### Week 10-11: Optimization
- [ ] Legacy Data Migration
- [ ] Performance Tuning
- [ ] Monitoring Setup

---

## 성공 지표

### 정량적 지표
- ✅ 모든 CRUD 페이지 Excel 기능 100% 적용
- ✅ 404/500 에러 0건
- ✅ 페이지 로드 시간 < 2초
- ✅ API 응답 시간 < 500ms

### 정성적 지표
- ✅ 실무자가 엑셀 없이 작업 가능
- ✅ 워크플로우가 자동으로 흐름
- ✅ 키워드로 모든 것을 찾을 수 있음
- ✅ 정산이 자동으로 계산됨

---

## 결론

이 작업지시서는 **최소한의 시간으로 최대한의 가치**를 창출하기 위해 설계되었습니다.

**핵심 원칙**:
1. **워크플로우 우선**: 견적 → 정산의 흐름이 끊기지 않도록
2. **표준 패턴 강제**: 모든 페이지가 동일한 UX/DX 제공
3. **도메인 특화**: 광고업의 언어로 시스템 구축
4. **점진적 개선**: 각 Phase마다 배포 가능한 MVP

**다음 단계**: Phase 1부터 순차적으로 실행하세요.

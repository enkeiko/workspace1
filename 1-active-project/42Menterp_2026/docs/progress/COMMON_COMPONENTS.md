# 공용 컴포넌트 설계 문서

> **작성일**: 2026-01-14
> **버전**: 1.0
> **위치**: `app/src/components/common/`

---

## 1. 디렉토리 구조

```
app/src/components/common/
├── data-table/
│   ├── index.tsx              # DataTable 메인
│   ├── data-table.tsx         # 테이블 본체
│   ├── data-table-header.tsx  # 헤더 (검색, 필터, 버튼)
│   ├── data-table-toolbar.tsx # 툴바 (페이지네이션)
│   ├── data-table-row.tsx     # 행 컴포넌트
│   └── types.ts               # 타입 정의
│
├── bulk-actions/
│   ├── index.tsx              # BulkActionBar 메인
│   ├── bulk-delete.tsx        # 일괄 삭제
│   ├── bulk-status.tsx        # 상태 변경
│   └── types.ts               # 타입 정의
│
├── excel/
│   ├── index.tsx              # 엑셀 관련 export
│   ├── excel-import.tsx       # 업로드 다이얼로그
│   ├── excel-export.tsx       # 내보내기 버튼
│   ├── excel-template.tsx     # 양식 다운로드
│   ├── excel-preview.tsx      # 미리보기 테이블
│   ├── excel-validation.tsx   # 검증 결과 표시
│   └── utils/
│       ├── parser.ts          # 엑셀 파싱
│       ├── generator.ts       # 엑셀 생성
│       └── validators.ts      # 검증 함수
│
└── hooks/
    ├── use-selection.ts       # 선택 상태
    ├── use-bulk-action.ts     # 일괄 액션
    ├── use-pagination.ts      # 페이지네이션
    └── use-excel.ts           # 엑셀 처리
```

---

## 2. DataTable 컴포넌트

### 2.1 Props 인터페이스

```typescript
// types.ts
interface DataTableProps<T> {
  // 필수
  data: T[];
  columns: ColumnDef<T>[];

  // 선택 기능
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  getRowId?: (row: T) => string;

  // 페이지네이션
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;

  // 정렬
  sortable?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;

  // 검색/필터
  searchable?: boolean;
  searchValue?: string;
  onSearch?: (value: string) => void;
  filters?: FilterConfig[];
  onFilter?: (filters: Record<string, string>) => void;

  // 상태
  loading?: boolean;
  emptyMessage?: string;

  // 행 액션
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
}

interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  cell?: (info: { row: T; value: unknown }) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date' | 'dateRange';
  options?: { label: string; value: string }[];
}
```

### 2.2 사용 예시

```tsx
import { DataTable, type ColumnDef } from '@/components/common/data-table';

const columns: ColumnDef<Customer>[] = [
  { id: 'name', header: '고객명', accessorKey: 'name', sortable: true },
  { id: 'businessNo', header: '사업자번호', accessorKey: 'businessNo' },
  {
    id: 'status',
    header: '상태',
    accessorKey: 'status',
    cell: ({ value }) => <StatusBadge status={value as string} />,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => router.push(`/customers/${row.id}`)}>
            상세보기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(row.id)}>
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

<DataTable
  data={customers}
  columns={columns}
  selectable
  selectedIds={selectedIds}
  onSelect={handleSelect}
  onSelectAll={handleSelectAll}
  pagination={pagination}
  onPageChange={setPage}
  searchable
  searchValue={search}
  onSearch={setSearch}
  filters={[
    { id: 'status', label: '상태', type: 'select', options: statusOptions },
  ]}
  loading={isLoading}
  emptyMessage="등록된 고객이 없습니다"
/>
```

---

## 3. BulkActionBar 컴포넌트

### 3.1 Props 인터페이스

```typescript
interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children?: React.ReactNode;  // 추가 액션 버튼
}

interface BulkDeleteProps {
  selectedIds: string[];
  resource: string;  // API 리소스명
  onSuccess?: () => void;
  onError?: (errors: BulkError[]) => void;
  confirmMessage?: string;
}

interface BulkStatusChangeProps {
  selectedIds: string[];
  resource: string;
  options: { label: string; value: string }[];
  onSuccess?: () => void;
  onError?: (errors: BulkError[]) => void;
}

interface BulkError {
  id: string;
  name?: string;
  reason: string;
}
```

### 3.2 사용 예시

```tsx
import { BulkActionBar, BulkDelete, BulkStatusChange } from '@/components/common/bulk-actions';
import { ExcelExportButton } from '@/components/common/excel';

{selectedIds.length > 0 && (
  <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
    <BulkStatusChange
      selectedIds={selectedIds}
      resource="customers"
      options={[
        { label: '활성', value: 'ACTIVE' },
        { label: '일시정지', value: 'PAUSED' },
        { label: '종료', value: 'TERMINATED' },
      ]}
      onSuccess={() => {
        clearSelection();
        refetch();
      }}
    />
    <BulkDelete
      selectedIds={selectedIds}
      resource="customers"
      confirmMessage="선택한 고객을 삭제하시겠습니까?"
      onSuccess={() => {
        clearSelection();
        refetch();
      }}
    />
    <ExcelExportButton resource="customers" ids={selectedIds} />
  </BulkActionBar>
)}
```

### 3.3 UI 디자인

```
┌────────────────────────────────────────────────────────────────┐
│  ✓ 5건 선택됨                                                  │
│                                                                │
│  [상태 변경 ▼]  [일괄 삭제]  [내보내기]           [선택 해제]  │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Excel 컴포넌트

### 4.1 ExcelImport 인터페이스

```typescript
interface ExcelImportProps {
  resource: string;                     // API 리소스명
  fields: ExcelFieldDef[];              // 필드 정의
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: Error) => void;

  // 옵션
  maxRows?: number;                     // 최대 행 수 (기본: 10000)
  allowUpdate?: boolean;                // 기존 데이터 업데이트 허용
  uniqueField?: string;                 // 중복 체크 필드
}

interface ExcelFieldDef {
  key: string;                          // DB 필드명
  header: string;                       // 엑셀 헤더 (한글)
  required?: boolean;                   // 필수 여부
  type?: 'string' | 'number' | 'date' | 'enum' | 'boolean';
  enum?: string[];                      // enum 허용값
  pattern?: RegExp;                     // 검증 패턴
  transform?: (value: unknown) => unknown;  // 값 변환
  validate?: (value: unknown, row: Record<string, unknown>) => string | null;
  description?: string;                 // 양식에 표시할 설명
}

interface ImportResult {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: ImportError[];
  createdIds: string[];
}

interface ImportError {
  row: number;
  field: string;
  value: unknown;
  message: string;
}
```

### 4.2 ExcelImport 사용 예시

```tsx
import { ExcelImport } from '@/components/common/excel';

const customerFields: ExcelFieldDef[] = [
  { key: 'name', header: '고객명', required: true, type: 'string' },
  {
    key: 'businessNo',
    header: '사업자번호',
    pattern: /^\d{3}-\d{2}-\d{5}$/,
    description: '000-00-00000 형식',
  },
  { key: 'representative', header: '대표자', type: 'string' },
  { key: 'contactName', header: '담당자', type: 'string' },
  {
    key: 'contactPhone',
    header: '연락처',
    pattern: /^01[0-9]-\d{3,4}-\d{4}$/,
    description: '010-0000-0000 형식',
  },
  { key: 'contactEmail', header: '이메일', type: 'string' },
  { key: 'address', header: '주소', type: 'string' },
  { key: 'contractStart', header: '계약시작일', type: 'date', description: 'YYYY-MM-DD' },
  { key: 'contractEnd', header: '계약종료일', type: 'date', description: 'YYYY-MM-DD' },
  { key: 'monthlyBudget', header: '월예산', type: 'number' },
  {
    key: 'status',
    header: '상태',
    type: 'enum',
    enum: ['ACTIVE', 'PAUSED', 'TERMINATED'],
    description: 'ACTIVE/PAUSED/TERMINATED',
  },
  { key: 'memo', header: '메모', type: 'string' },
];

<ExcelImport
  resource="customers"
  fields={customerFields}
  allowUpdate
  uniqueField="businessNo"
  onSuccess={(result) => {
    toast.success(`${result.summary.created}건 등록, ${result.summary.updated}건 수정`);
    refetch();
  }}
/>
```

### 4.3 ExcelExport 인터페이스

```typescript
interface ExcelExportProps {
  resource: string;
  ids?: string[];                       // 선택된 ID (없으면 전체)
  fields?: ExcelFieldDef[];             // 내보낼 필드 (없으면 전체)
  filename?: string;                    // 파일명 (기본: {resource}_{date})
  children?: React.ReactNode;           // 버튼 커스텀
}
```

### 4.4 ExcelTemplate 인터페이스

```typescript
interface ExcelTemplateProps {
  resource: string;
  fields: ExcelFieldDef[];
  filename?: string;                    // 파일명 (기본: {resource}_template)
  children?: React.ReactNode;           // 버튼 커스텀
}
```

### 4.5 Import 플로우 UI

```
┌──────────────────────────────────────────────────────────────────────┐
│ 엑셀 업로드                                                    [X]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 1: 파일 선택                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │     📁 파일을 드래그하거나 클릭하여 선택하세요                 │ │
│  │                                                                │ │
│  │     지원 형식: .xlsx, .xls, .csv                               │ │
│  │     최대 10,000행                                              │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [양식 다운로드]                                                     │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                              [취소]  [다음 →]        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ 엑셀 업로드                                                    [X]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 2: 컬럼 매핑                                                   │
│                                                                      │
│  엑셀 컬럼          →    시스템 필드                                 │
│  ──────────────────────────────────────────────                      │
│  [고객명      ▼]   →    고객명 (필수)                ✓ 매칭됨       │
│  [사업자번호  ▼]   →    사업자번호                   ✓ 매칭됨       │
│  [담당자     ▼]    →    담당자                       ✓ 매칭됨       │
│  [Column D   ▼]    →    [선택하세요 ▼]               ⚠ 미매칭       │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                       [← 이전]  [취소]  [다음 →]     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ 엑셀 업로드                                                    [X]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 3: 검증 결과                                                   │
│                                                                      │
│  ✓ 유효: 95건   ⚠ 경고: 3건   ✗ 오류: 2건                          │
│                                                                      │
│  [전체 보기]  [오류만 보기]  [경고만 보기]                           │
│                                                                      │
│  │ # │ 고객명      │ 사업자번호  │ 상태   │ 오류                    │
│  ├───┼─────────────┼─────────────┼────────┼─────────────────────────│
│  │ 5 │ ABC마케팅   │ 123-456789  │        │ ⚠ 형식 오류             │
│  │ 8 │             │ 111-22-3333 │ ACTIVE │ ✗ 고객명 필수           │
│  │12 │ XYZ컴퍼니   │ 123-45-6789 │ ACTIVE │ ⚠ 중복 사업자번호       │
│                                                                      │
│  ☑ 오류 행 건너뛰기                                                 │
│  ☐ 중복 시 기존 데이터 업데이트                                     │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                       [← 이전]  [취소]  [업로드]     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ 업로드 완료                                                    [X]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                            ✓                                         │
│                                                                      │
│                     업로드가 완료되었습니다                          │
│                                                                      │
│                     등록: 93건                                       │
│                     수정: 2건                                        │
│                     건너뜀: 5건                                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                        [확인]        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Hooks

### 5.1 useSelection

```typescript
interface UseSelectionOptions {
  initialSelected?: string[];
}

interface UseSelectionReturn {
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  selectRange: (ids: string[], startId: string, endId: string) => void;
  clear: () => void;
  selectedCount: number;
}

// 사용
const {
  selectedIds,
  isSelected,
  toggle,
  selectAll,
  selectRange,
  clear,
  selectedCount,
} = useSelection();
```

### 5.2 useBulkAction

```typescript
interface UseBulkActionOptions {
  resource: string;
  onSuccess?: () => void;
  onError?: (errors: BulkError[]) => void;
}

interface UseBulkActionReturn {
  update: (ids: string[], data: Record<string, unknown>) => Promise<BulkResult>;
  remove: (ids: string[]) => Promise<BulkResult>;
  isLoading: boolean;
  error: Error | null;
}

// 사용
const { update, remove, isLoading } = useBulkAction({
  resource: 'customers',
  onSuccess: () => refetch(),
});

// 상태 일괄 변경
await update(selectedIds, { status: 'PAUSED' });

// 일괄 삭제
await remove(selectedIds);
```

### 5.3 useExcel

```typescript
interface UseExcelOptions {
  resource: string;
  fields: ExcelFieldDef[];
}

interface UseExcelReturn {
  // 템플릿
  downloadTemplate: () => void;

  // 임포트
  parseFile: (file: File) => Promise<ParseResult>;
  validateData: (data: unknown[]) => ValidationResult;
  importData: (data: unknown[], options: ImportOptions) => Promise<ImportResult>;

  // 익스포트
  exportData: (ids?: string[]) => Promise<void>;
  exportAll: () => Promise<void>;

  // 상태
  isLoading: boolean;
  error: Error | null;
}

// 사용
const {
  downloadTemplate,
  parseFile,
  validateData,
  importData,
  exportData,
} = useExcel({
  resource: 'customers',
  fields: customerFields,
});
```

---

## 6. 구현 우선순위

### Phase 1: 기반 구축

| # | 작업 | 예상 시간 |
|---|------|----------|
| 1 | hooks/use-selection.ts | 2h |
| 2 | data-table 기본 구조 | 4h |
| 3 | bulk-actions/index.tsx | 3h |
| 4 | excel/utils (파싱/생성) | 4h |

### Phase 2: 컴포넌트 완성

| # | 작업 | 예상 시간 |
|---|------|----------|
| 5 | excel-template.tsx | 2h |
| 6 | excel-export.tsx | 3h |
| 7 | excel-import.tsx (Step 1-3) | 6h |
| 8 | bulk-delete, bulk-status | 3h |

### Phase 3: 통합 및 테스트

| # | 작업 | 예상 시간 |
|---|------|----------|
| 9 | customers 페이지 적용 | 4h |
| 10 | stores 페이지 적용 | 3h |
| 11 | 나머지 페이지 적용 | 8h |

---

## 7. 패키지 설치

```bash
cd app

# 엑셀 처리
npm install xlsx file-saver
npm install -D @types/file-saver

# 선택적: 고급 임포트 UI
npm install react-spreadsheet-import
```

---

**이 컴포넌트들은 모든 목록 페이지에서 재사용됩니다. 일관된 UX를 위해 반드시 이 컴포넌트를 사용하세요.**

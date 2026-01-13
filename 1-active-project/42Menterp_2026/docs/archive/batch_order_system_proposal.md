# 주간 일괄 발주 시스템 제안서 (Weekly Batch Order System Proposal) v2

**작성일:** 2026-01-14
**작성자:** Antigravity Agent (ERP Planning Director)

---

## 1. 개요 (Overview)

### 1.1 사용자 니즈 (Updated)
- **핵심:** "기간(Period)"이 있는 상품이 대부분임. 개별/일괄 설정이 필수.
- **수정:** 과거 데이터도 동일한 그리드 인터페이스에서 불러와서 수정할 수 있어야 함.
- **연동:** `고객 - 수주 - 거래명세서 - 발주 - 정산` 흐름이 DB로 연결되되, **각 단계에서 수동 개입(Manual Override)**이 자유로워야 함.

### 1.2 핵심 컨셉: "Smart Grid with Time"
단순 수량 입력판이 아닌, **"기간과 수량을 관리하는 통합 대시보드"**입니다.
입력 모드(Create)와 수정 모드(Edit)를 통합하여, 언제든 특정 주차(Week)의 데이터를 불러와 마치 엑셀처럼 수정할 수 있습니다.

---

## 2. 기능 상세 (Enhanced)

### 2.1 UI 구성: 주간 발주 그리드 (Weekly Order Grid)

**A. 그리드 구조**

| 매장명 | ... | [기간] 활성상품A (트래픽) | [기간] 활성상품B (저장) | 상태 |
|--------|-----|-------------------|-----------------|------|
| **일괄 설정** | | `2026-01-13 ~ 01-19` [▼] | `설정 안함` [▼] | - |
| 강남맛집 | ... | `01-13 ~ 01-19` / [ 100 ] | `(개별) 01-14 ~ 01-16` / [ 50 ] | 완료 |
| 홍대카페 | ... | `01-13 ~ 01-19` / [ 100 ] | `01-13 ~ 01-19` / [ 30 ] | 완료 |

**B. 기간 설정 (Period Management)**
1.  **Global Week Selector:** 화면 상단에서 "2026년 1월 3주차"를 선택하면, 해당 주의 월~일이 기본 기간으로 설정됨.
2.  **Column Bulk Set (열 일괄 설정):** 각 상품 컬럼 헤더 아래에 '일괄 기간 설정' 컨트롤 제공. 변경 시 해당 열의 모든 셀 기간이 업데이트됨.
3.  **Cell Individual Set (셀 개별 설정):** 특정 매장만 기간이 다른 경우, 해당 셀을 클릭하여 오버라이딩 가능.
4.  **Quantity Input:** 기간과 별도로 수량(Qty) 입력.

**C. 양방향 동기화 (Bi-directional Sync)**
- **Load:** 주차 선택 시, DB에 이미 저장된 `SalesOrder`/`PurchaseOrder` 내역을 불러와 그리드에 매핑.
- **Save:** 그리드 수정 후 저장 시, DB의 해당 내역을 `UPDATE`.
    - 수량이 0으로 변경되면 -> DB `Create` 취소 또는 `Delete`.
    - 기간이 변경되면 -> `SalesOrderItem.startDate/endDate` 수정.

### 2.2 프로세스 연결 (The Pipeline)

```mermaid
graph TD
    Grid[주간 발주 그리드] <-->|Sync| SO[수주 (Sales Order)]
    
    subgraph "Automation & Manual Override"
    SO -->|Auto Create| PO[발주 (Purchase Order)]
    SO -->|Auto Create| ST[거래명세서 (Statement)]
    PO -->|Auto Aggregate| STL[정산 (Settlement)]
    end
    
    User((User)) -->|Manual Edit| SO
    User -->|Manual Edit| PO
    User -->|Manual Edit| ST
```

**핵심 로직: "수동 개입의 전파"**
1.  **그리드 수정:** 가장 편리한 진입점. 여기서 고치면 연결된 SO/PO가 자동 갱신됨.
2.  **개별 문서 수정:** 만약 사용자가 `발주서 상세 페이지`에 들어가서 특정 항목을 수동으로 고치면?
    - 시스템은 이를 **'Manual Override'**로 마킹.
    - 이후 그리드에서 일괄 저장을 하더라도, 수동으로 고친 항목은 덮어쓰지 않고 "사용자 변경 건 있음" 알림을 띄움.
    - 정산 시에도 "수동 변경된 발주 내역"을 기준으로 계산.

---

## 3. 구현 상세 가이드

### 3.1 기간 입력 UI (Date Range Picker)
- 엑셀처럼 빠르게 입력하기 위해, **'단축키'** 지원.
    - `w`: 이번 주 (Week) 자동 설정
    - `m`: 이번 달 (Month) 자동 설정
    - Ctrl+C/V: 기간 값도 복사 붙여넣기 지원

### 3.2 데이터 구조 매핑

- **Grid Row** = `Store` (매장)
- **Grid Column** = `Product` (상품)
- **Grid Cell Data**:
  ```typescript
  {
    qty: number;          // 수량
    startDate: string;    // 시작일
    endDate: string;      // 종료일
    isManual: boolean;    // 수동 수정 여부
    status: 'ACTIVE' | 'PAUSED';
  }
  ```

---

## 4. 단계별 실행 계획 (Revised)

- **Phase 1:** **기간 제어 기능이 포함된 그리드 프로토타입** 구현. (가장 중요)
- **Phase 2:** DB 연동 (그리드 저장 시 SO/PO 생성 및 수정).
- **Phase 3:** 수동 개입(Manual Override) 보호 로직 및 알림 구현.

---

**결론:** 선생님의 말씀대로 **"기간 관리"**와 **"양방향 수정"**이 이 시스템의 핵심입니다. 이 두 가지를 최우선으로 고려하여 화면을 설계하겠습니다.

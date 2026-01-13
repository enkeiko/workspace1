# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 사용자/매장

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 3. 사용자 및 권한 관리

### 3.1 권한 레벨

| 레벨 | 역할 | 권한 범위 |
|------|------|----------|
| Super Admin | 본사 관리자 | 전체 시스템 + 파트너 관리 + 정산 + 시스템 설정 |
| Partner Admin | 파트너사 관리자 | 자사 매장/발주/담당자 관리 + 자사 정산 조회 |
| Operator | 담당자 | 매장 등록, 발주 입력, 작업 로그 기록 |
| Viewer | 조회 전용 | 읽기만 가능 |

### 3.2 인증 기능
- 이메일 + 비밀번호 로그인
- 비밀번호 재설정 (이메일 인증)
- 세션 관리 (30분 타임아웃)
- 로그인 이력 기록 (IP, 일시, 성공/실패)

### 3.3 사용자 데이터
```
[users]
- id (PK)
- tenant_id (FK) - 소속 파트너사 (null = 본사)
- email (unique)
- password_hash
- name
- phone
- role: super_admin / partner_admin / operator / viewer
- status: active / inactive / suspended
- last_login_at
- created_at
- updated_at
```

### 3.4 화면별 권한 매트릭스

| 화면 | Super Admin | Partner Admin | Operator | Viewer |
|------|:-----------:|:-------------:|:--------:|:------:|
| **고객/매장** |
| 매장 목록 | 전체 | 자사만 | 자사만 | 자사(읽기) |
| 매장 등록/수정 | O | O | O | X |
| 매장 삭제 | O | O | X | X |
| Excel 업로드 | O | O | O | X |
| **견적** |
| 견적서 목록 | 전체 | 자사만 | 자사만 | 자사(읽기) |
| 견적서 작성 | O | O | O | X |
| 견적서 발송 | O | O | O | X |
| 견적→주문 전환 | O | O | X | X |
| **주문/발주** |
| 주문 목록 | 전체 | 자사만 | 자사만 | 자사(읽기) |
| 발주 등록 | O | O | O | X |
| 발주 확정 | O | O | X | X |
| 발주 취소 | O | O | X | X |
| 발주서 출력 | O | O | O | X |
| **정산** |
| 정산 조회 | 전체 | 자사만 | X | X |
| 정산 처리 | O | X | X | X |
| 입금 확인 | O | O | X | X |
| 세금계산서 발행 | O | X | X | X |
| **파트너/시스템** |
| 파트너사 관리 | O | X | X | X |
| 상품 관리 | O | X | X | X |
| 사용자 관리 | O | 자사만 | X | X |
| 시스템 설정 | O | X | X | X |

**데이터 접근 범위:**
- Super Admin: 전체 테넌트 데이터
- Partner Admin/Operator/Viewer: 자사 테넌트 데이터만 (tenant_id 필터)

---


## 4. 고객/매장 관리

### 4.1 고객 정보

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 고객사명 |
| business_no | string | - | 사업자번호 |
| representative | string | - | 대표자명 |
| contact_name | string | - | 담당자명 |
| contact_phone | string | - | 연락처 |
| contact_email | string | - | 이메일 |
| billing_email | string | - | 정산/계산서 수신 메일 |
| address | string | - | 주소 |
| status | enum | O | active / paused / terminated |
| memo | text | - | 메모 |

### 4.2 고객 기능
- CRUD (등록/조회/수정/삭제)
- 매장(지점) 연결 관리
- 정산/계산서 수신자 관리

### 4.3 고객 데이터
```
[customers]
- id (PK)
- tenant_id (FK) - 소속 파트너사
- name
- business_no
- representative
- contact_name, contact_phone, contact_email
- billing_email
- address
- status
- memo
- created_by (FK)
- created_at
- updated_at
```

### 4.4 매장 정보

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 매장명 |
| mid | string | O | 네이버 플레이스 ID |
| place_url | string | - | 플레이스 URL (자동생성) |
| business_no | string | - | 사업자번호 |
| representative | string | - | 대표자명 |
| contact_name | string | - | 담당자명 |
| contact_phone | string | - | 연락처 |
| contact_email | string | - | 이메일 |
| address | string | - | 주소 |
| category | string | - | 업종 (음식점/카페/미용실 등) |
| contract_start | date | - | 계약 시작일 |
| contract_end | date | - | 계약 종료일 |
| monthly_budget | number | - | 월 예산 |
| status | enum | O | active / paused / terminated |
| memo | text | - | 메모 |

### 4.5 매장 기능
- CRUD (등록/조회/수정/삭제)
- Excel 일괄 업로드/다운로드
- 검색/필터링 (매장명, 상태, 카테고리)
- 사업자등록 상태 조회 (바로빌 API)

### 4.6 매장 데이터
```
[stores]
- id (PK)
- tenant_id (FK) - 소속 파트너사
- customer_id (FK) - 고객사
- name
- mid (unique)
- place_url
- business_no
- representative
- contact_name, contact_phone, contact_email
- address
- category
- contract_start, contract_end
- monthly_budget
- status
- memo
- created_by (FK)
- created_at
- updated_at
```

---




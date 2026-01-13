# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 파트너사

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 10. 파트너사 관리 (멀티테넌시)

### 10.1 파트너사 정보

```
[tenants]
- id (PK)
- name - 파트너사명
- code - 파트너사 코드
- business_no - 사업자번호
- representative - 대표자
- contact_name, contact_phone, contact_email
- address
- commission_type: fixed / rate - 수수료 유형
- default_commission_rate - 기본 수수료율
- bank_name - 정산 계좌 은행
- bank_account - 정산 계좌번호
- bank_holder - 예금주
- status: active / inactive / suspended
- contract_start, contract_end
- memo
- created_at
- updated_at
```

### 10.2 파트너사 관리 기능 (Super Admin)

- 파트너사 등록/수정/비활성화
- 파트너사별 담당자 계정 생성/관리
- 파트너사별 상품 단가 설정
- 파트너사별 발주/매출 현황 조회
- 파트너사 정산 처리

### 10.3 파트너사 화면 (Partner Admin)

- 자사 매장 관리
- 자사 발주 등록/조회
- 자사 정산 현황 조회
- 자사 담당자 관리

---




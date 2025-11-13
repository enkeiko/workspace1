# ⚙️ Brand Studio ERP Core System — Development Constitution v1.1
*(MVP 생략, 독립형 Core 구축을 전제로 한 프로젝트 원칙)*

## 1️⃣ 시스템 철학 (System Philosophy)
> “모든 데이터는 살아있는 구조로 존재해야 하며,  
> AI는 자동화의 주체가 아니라 구조의 가속기이다.”

- 목적은 ‘자동화’가 아니라 **‘구조화된 통제력 확보’**.  
- 기술은 교체 가능하지만 **데이터 구조는 불변의 헌법**이다.  
- 개발의 우선순위는 “작동 → 추적 → 개선 → 확장” 순이다.  

## 2️⃣ 개발 철칙 (Core Development Rules)
① **직접성(Direct Control)**  
- 외부 SaaS 의존 금지: 구글 시트, 허브스팟 등은 단순 export/import 용도로만 사용.  
- 모든 핵심 로직은 **내 코드 내부에서 동작**해야 한다.  
- I/O 포트는 `.csv`, `.json`, `.xlsx` 3가지만 허용.  

② **투명성(Traceability)**  
- 시스템의 모든 동작(자동 계산, AI 조정, 수동 수정)은 **로그로 남는다.**  
- 각 데이터는 생성→수정→삭제의 **전체 이력(History Chain)** 을 가진다.  
- 데이터는 바뀔 수 있지만 **근거는 절대 사라지지 않는다.**

③ **일관성(Consistency over Convenience)**  
- 편의보다 구조적 일관성을 우선.  
- 새로운 기능 추가 시 반드시 기존 `schema_version`과 호환돼야 한다.  
- 필드명, 타입, 관계가 다른 모듈에서 재사용 가능해야 한다.  

④ **단일 진실의 원천(Single Source of Truth)**  
- Order, Purchase, Payment, Adjustment, Report —  
  이 다섯 테이블이 모든 계산의 중심이다.  
- 그 외의 모듈은 이 다섯 가지 중 하나를 참조해야 하며  
  **별도의 금액 로직을 가져서는 안 된다.**

⑤ **AI 보조, 인간 우선(AI-Suggest / Human-Confirm)**  
- AI의 역할: 판단이 아니라 제안.  
- 사람이 승인한 조정만 최종 반영된다.  
- AI의 출력은 반드시 “근거 + 신뢰도”를 명시해야 한다.  

⑥ **Fail-safe 구조**  
- 자동화 실패 시 언제나 수동 경로 존재:  
  `manual_mode=True` → CSV 입력/수정/재계산 가능.  
- 시스템은 절대 정지하지 않는다.  

## 3️⃣ 기술 아키텍처 원칙 (Technical Architecture Principles)
| 계층 | 책임 | 핵심 규칙 |
|------|------|-----------|
| **Core Logic (Python)** | 모든 비즈니스 계산, 데이터 무결성 | 함수형 구조, 사이드이펙트 금지 |
| **Database (SQLite→PostgreSQL)** | 영속 저장소, 버전관리 | 모든 테이블에 `created_at`, `updated_at`, `manual_edit` 필수 |
| **Frontend (Streamlit)** | 사용자 입력·보정·리포트 | 실시간 반영, 로그 표시 |
| **AI Layer (GPT/Claude)** | 데이터 정제·리포트 제안 | 항상 로그 기록 + 승인 대기 |
| **Automation (n8n / Scheduler)** | 주기적 계산, 알림, 백업 | 트리거 단방향, 루프 금지 |
| **Export/Import (I/O)** | Excel, CSV, JSON | schema validation 필수 |

## 4️⃣ 데이터 헌법 (Data Constitution)
① 공통 필드 규약  
```
id
created_at
updated_at
created_by
manual_edit (Y/N)
source (AI/manual/import/api)
notes (비고)
```

② 금액 필드 규약  
```
subtotal   : 공급가
vat        : 부가세
total      : 합계
vat_included (Y/N)
```

③ 참조 규약  
- 각 테이블은 `ref_type` + `ref_id` 로 연결한다.  
- 관계는 **명시적 FK** 대신 “논리적 참조”로 유지 (파일 포터블성 확보).  

④ 버전 규약  
- 모든 스키마는 `/schema/{version}.yaml` 에 명시.  
- 데이터 변경 시 `schema_version` 필드 동기화.  
- 호환성 깨질 경우 반드시 `migration_script.py` 작성.  

## 5️⃣ 리포트 및 조정 원칙
- **자동결산 주기:** 일/주/월  
- **조정원칙:** 사람이 수정한 값이 항상 최종값이며,  
  AI·자동화는 “추천안”만 제시.  
- **보정기록:** 수동 수정 시 `adjustments` 테이블 자동생성  
  (금액, 사유, 작성자, 시각).  
- **리포트 재계산:** 조정 발생 시 즉시 반영 (지연 ≤ 2초).  

## 6️⃣ 개발 및 배포 정책
| 항목 | 원칙 |
|------|------|
| **버전명명** | ERP_Core_v{Major.Minor.Patch} |
| **브랜치정책** | main(운영) / dev(테스트) / feature-루프명 |
| **테스트기준** | 계산 정확도 ±1원, 조정반영률 ≥ 95% |
| **백업주기** | 일단위 DB dump + 주단위 CSV Export |
| **보안정책** | 로컬 우선, 외부 API Key `.env` 관리 |
| **로깅정책** | 모든 동작 `logs/`에 json 로그 자동저장 |

## 7️⃣ 협업 및 유지보수 원칙
- **Spec Kit 우선주의:**  
  모든 기능 변경은 코드 이전에 `/specs/` 문서로 먼저 정의한다.  
- **AI 사용 가이드:**  
  AI는 코드를 수정하지 않고, 명세를 기반으로 코드를 생성·검증한다.  
- **이슈 관리:**  
  버그는 “루프 단위”로 기록 (`order_loop`, `payment_loop` 등).  
- **문서 표준:**  
  모든 기술 문서는 Markdown (`/docs/`),  
  자동 생성 리포트는 `.xlsx` 형식 (`/exports/`).  

## 8️⃣ 통합 원칙 (Integration Principles)
- 외부 연동은 **어댑터 패턴(Adaptor Layer)** 으로만 허용.  
  (예: Popbill, adlog.kr, KakaoTalk API 등)  
- 외부 API는 항상 **mock mode** 지원 (로컬에서 시뮬레이션 가능해야 함).  
- I/O 변환은 `io_converters.py` 에서만 수행한다.  
- DB 구조와 외부 포맷 간 매핑은 `mapping_schema.yaml` 으로 문서화.  

## 9️⃣ 유지보수 철학 (Maintenance Doctrine)
- 시스템은 **항상 부분적으로 작동 가능**해야 한다.  
- 에러 발생 시 “복구 루틴(Fallback)”을 먼저 실행하고,  
  이후 자동으로 로그를 남긴다.  
- 장애 시 AI가 제안하는 수정안은 “적용 전 검증 단계”를 거쳐야 한다.  
- 모든 버전의 리포트는 **시간축 기반 immutable archive**로 보존한다.  

## 🔟 요약 원칙
| 영역 | 핵심 문장 |
|------|-----------|
| 구조 | 데이터가 시스템의 중심, 코드와 도구는 외피 |
| 권한 | 사람이 AI보다 우선한다 |
| 자동화 | 항상 중단 가능해야 한다 |
| 변경 | 모든 수정은 명세(spec) → 코드 순으로 진행 |
| 목표 | 단순·견고·복구가능·확장가능 구조로 완성한다 |

### 📘 One-Line Doctrine
> “AI가 데이터를 계산하고, 사람은 구조를 통제하며,  
> 시스템은 스스로 복구한다.”

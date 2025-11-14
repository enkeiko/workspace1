# NaverPlace 대표키워드 추출 자동화 시스템

📎 **전략 프레임워크**: [42ment Guidebook v1.1](251113_Guidebook_v1.1_full.md) - 이 시스템의 전략적 기반
📎 **전략↔구현 매핑**: [GUIDEBOOK_MAPPING.md](../GUIDEBOOK_MAPPING.md) - C-Sys/D-Sys가 L1/L2/L3로 구현되는 방식

---

## 1. 시스템 개요

**42ment Guidebook v1.1**의 네이버 플레이스 SEO 전략을 구현한 AI 기반 키워드 추출 자동화 시스템입니다.

### 핵심 목표
- **데이터 기반 의사결정**: 감이 아닌 실제 검색량과 AI 분석 기반
- **전략적 키워드 설정**: 단기/장기, 메인/서브, 확장 방향 등 체계적 접근
- **자동화**: 수작업 분석 시간을 90% 단축

### 3단계 프로세스
```
L1: 데이터 수집 및 정렬
    ├─ 크롤러 데이터 수집
    ├─ 현재 대표키워드 수집
    ├─ 수동 메모 병합
    └─ 키워드 추출용 데이터 정렬

L2: 분석 및 목표키워드 설정
    ├─ AI/마케터 협업 분석
    ├─ 네이버 월간 검색량 조회
    ├─ 지역/속성별 키워드 분리/조합
    └─ 목표키워드 설정 (단기/장기, 메인/서브)

L3: 최종 대표키워드 조합
    ├─ 목표키워드 기반 조합
    ├─ 스코어링 및 우선순위 결정
    └─ 최종 대표키워드 선정
```

## 2. 단계별 상세 설명

### L1: 데이터 수집 및 정렬

📎 **Guidebook 연결**: C-Sys-0 (Meta 수집), C-Sys-1 (매핑), B-3 (NAP 관리)

**목적**: 모든 가용 데이터를 최대한 수집하고 분석 가능한 형태로 정렬

**수집 데이터**:
- 크롤러 JSON (장소 정보, 메뉴, 속성, 리뷰 등)
- **현재 대표키워드** (기존 사용 중인 키워드)
- 수동 메모 (마케터 입력 정보)
- 경쟁사 정보 (선택 사항)

**주요 작업**:
1. 다양한 소스에서 데이터 수집
2. 데이터 통합 및 품질 검증
3. 지역 정보 파싱 (시/구/동/역)
4. 키워드 추출용 요소 분류 및 정렬
5. 데이터 완성도 평가

**출력**:
- `data_collected_l1.json` - 수집/정렬된 모든 데이터
- `keyword_elements_l1.json` - 추출 가능한 키워드 요소 목록
- `current_keywords_l1.json` - 현재 사용 중인 대표키워드

**상태 전이**: `INITIAL` → `COLLECTED`

📄 상세 문서: [l1.md](l1.md)

---

### L2: 분석 및 목표키워드 설정

📎 **Guidebook 연결**: C-Sys-2 (효율지수), C-Sys-3 (Improver 연동)

**목적**: AI와 마케터가 협업하여 데이터를 심층 분석하고 전략적 목표키워드 설정

**분석 프로세스**:
1. **AI 자동 분석**
   - 메뉴/속성 기반 키워드 확장
   - 지역별 키워드 조합 생성
   - 속성별 키워드 조합 생성

2. **네이버 검색량 조회**
   - 생성된 모든 키워드의 월간 검색량 조회
   - 트렌드 분석 (상승/하락)
   - 경쟁 강도 파악

3. **마케터 검토 및 분석**
   - AI 분석 결과 검토
   - 비즈니스 목표와 정렬
   - 키워드 분류 및 우선순위 설정

4. **목표키워드 설정**
   - **단기 키워드**: 3개월 내 집중 공략
   - **장기 키워드**: 6개월~1년 육성
   - **메인 키워드**: 핵심 비즈니스 키워드
   - **서브 키워드**: 롱테일/니치 키워드
   - **확장 방향**: 신규 진입 분야

**주요 작업**:
```
키워드 조합 매트릭스 생성:
─────────────────────────────────────────
지역 분리:  강남, 강남역, 역삼동
속성 분리:  주차, 룸, 회식, 데이트
메뉴 분리:  철판닭갈비, 치즈닭갈비

조합 예시:
├─ 지역 + 카테고리: "강남 닭갈비"
├─ 지역 + 메뉴: "강남 철판닭갈비"
├─ 지역 + 속성: "강남 회식 장소"
├─ 속성 + 카테고리: "주차 가능 닭갈비"
└─ 지역 + 속성 + 메뉴: "강남 룸 있는 닭갈비집"

각 조합마다 네이버 월간 검색량 조회
```

**출력**:
- `analyzed_keywords_l2.json` - 검색량 포함 전체 키워드 분석
- `target_keywords_l2.json` - 설정된 목표키워드
- `keyword_matrix_l2.csv` - 키워드 매트릭스 (검색량, 트렌드 포함)
- `analysis_report_l2.md` - 분석 리포트

**상태 전이**: `COLLECTED` → `ANALYZED`

📄 상세 문서: [l2.md](l2.md)

---

### L3: 최종 대표키워드 조합

📎 **Guidebook 연결**: D-Sys (내부 콘텐츠 전략), C-4 (콘텐츠 삽입 규칙)

**목적**: L2에서 설정한 목표키워드를 기반으로 최종 대표키워드 조합 생성

**조합 전략**:
1. 목표키워드 우선순위 적용
2. 검색량 vs 관련성 균형
3. 단기/장기 키워드 균형 배치
4. 메인/서브 키워드 조합

**스코어링 공식**:
```
최종 점수 = (검색량 × 0.4) + (관련성 × 0.3) + (목표 우선순위 × 0.3)

목표 우선순위:
- 단기 메인: 1.0
- 단기 서브: 0.9
- 장기 메인: 0.8
- 장기 서브: 0.7
- 확장 방향: 0.6
```

**조합 규칙**:
- 대표키워드 5개: 단기 메인 3개 + 장기 메인 2개
- 보조키워드 10개: 단기 서브 5개 + 장기 서브 3개 + 확장 2개

**출력**:
- `final_keywords.json` - 최종 대표키워드
- `keyword_strategy.md` - 키워드 전략 가이드
- `implementation_guide.md` - 실행 가이드북
- `audit_report.json` - 전체 프로세스 감사 로그

**상태 전이**: `ANALYZED` → `FINALIZED`

📄 상세 문서: [l3.md](l3.md)

---

## 3. 기술 스택

### Backend
- **런타임**: Node.js 18+ (TypeScript)
- **웹 프레임워크**: Fastify 4.x
- **데이터베이스**: Prisma ORM + SQLite (개발) / PostgreSQL (프로덕션)
- **검증**: Zod 스키마 검증
- **네이버 API**: 네이버 검색 광고 API (월간 검색량 조회)
- **로깅**: Pino

### AI/ML
- **LLM**: OpenAI GPT-4 또는 Claude API
- **용도**: 키워드 분석, 조합 제안, 전략 수립

### Frontend (GUI)
- **프레임워크**: SvelteKit 또는 Next.js
- **차트**: Chart.js (검색량 트렌드 시각화)
- **스타일**: TailwindCSS

## 4. 디렉토리 구조

```
project-root/
├── data/
│   ├── input/
│   │   ├── places-advanced/        # 크롤러 JSON
│   │   ├── current_keywords.json   # 현재 대표키워드 ⭐
│   │   ├── manual_notes.json       # 수동 메모
│   │   └── competitors.json        # 경쟁사 정보 (선택)
│   ├── output/
│   │   ├── l1/
│   │   │   ├── data_collected_l1.json
│   │   │   ├── keyword_elements_l1.json
│   │   │   └── current_keywords_l1.json
│   │   ├── l2/
│   │   │   ├── analyzed_keywords_l2.json
│   │   │   ├── target_keywords_l2.json
│   │   │   ├── keyword_matrix_l2.csv
│   │   │   └── analysis_report_l2.md
│   │   └── l3/
│   │       ├── final_keywords.json
│   │       ├── keyword_strategy.md
│   │       ├── implementation_guide.md
│   │       └── audit_report.json
│   └── logs/
├── src/
│   ├── l1/                          # L1 데이터 수집
│   ├── l2/                          # L2 분석 및 설정
│   ├── l3/                          # L3 조합
│   ├── naver-api/                   # 네이버 검색량 조회 ⭐
│   └── shared/
└── docs_guide/
```

## 5. 상태 전이 시스템

```
INITIAL        → 시작 상태
  ↓
COLLECTED      → L1 완료 (데이터 수집/정렬 완료)
  ↓
ANALYZING      → L2 진행 중 (AI 분석/검색량 조회)
  ↓
REVIEWED       → 마케터 검토 완료
  ↓
ANALYZED       → L2 완료 (목표키워드 설정 완료)
  ↓
COMBINING      → L3 진행 중 (대표키워드 조합)
  ↓
FINALIZED      → L3 완료 (최종 대표키워드 확정)
  ↓
IMPLEMENTED    → 실제 적용 완료
```

## 6. 실행 방법

### CLI 모드
```bash
# 전체 파이프라인 실행
node src/main.js start --brand=히도

# 단계별 실행
node src/main.js l1 --brand=히도
node src/main.js l2 --brand=히도 --naver-api-key=YOUR_KEY
node src/main.js l3 --brand=히도

# 특정 단계부터 재실행
node src/main.js start --brand=히도 --from=l2
```

### GUI 모드
```bash
npm run gui
# http://localhost:3000 접속

# GUI 기능:
# 1. L1: 데이터 업로드 및 정렬 상태 확인
# 2. L2: AI 분석 진행 상황 모니터링 + 마케터 검토 UI
# 3. L3: 대표키워드 조합 미리보기 + 최종 확정
```

## 7. 주요 산출물

### 7.1 L1 산출물
```json
// current_keywords_l1.json (현재 사용 중인 키워드)
{
  "place_id": "1234567890",
  "current_primary": ["강남 닭갈비", "히도 강남점"],
  "current_secondary": ["강남 맛집", "닭갈비 맛집"],
  "performance": {
    "avg_monthly_searches": 5000,
    "click_rate": 0.15
  }
}
```

### 7.2 L2 산출물
```json
// target_keywords_l2.json
{
  "place_id": "1234567890",
  "target_keywords": {
    "short_term": {
      "main": [
        {"keyword": "강남 닭갈비", "volume": 15000, "priority": 1.0},
        {"keyword": "강남역 철판닭갈비", "volume": 8000, "priority": 0.95}
      ],
      "sub": [
        {"keyword": "강남 회식 장소", "volume": 3500, "priority": 0.9}
      ]
    },
    "long_term": {
      "main": [
        {"keyword": "치즈닭갈비 맛집", "volume": 12000, "priority": 0.8}
      ],
      "sub": [
        {"keyword": "강남 데이트 코스", "volume": 4200, "priority": 0.7}
      ]
    },
    "expansion": [
      {"keyword": "강남 프리미엄 닭갈비", "volume": 500, "priority": 0.6, "trend": "rising"}
    ]
  }
}
```

### 7.3 L3 산출물
```json
// final_keywords.json
{
  "place_id": "1234567890",
  "finalized_at": "2025-10-22T10:00:00Z",

  "primary_keywords": [
    {
      "rank": 1,
      "keyword": "강남 닭갈비",
      "type": "short_term_main",
      "volume": 15000,
      "final_score": 0.98,
      "strategy": "블로그 집중 공략, 메타태그 우선"
    },
    {
      "rank": 2,
      "keyword": "강남역 철판닭갈비",
      "type": "short_term_main",
      "volume": 8000,
      "final_score": 0.95,
      "strategy": "시그니처 메뉴 강조"
    },
    {
      "rank": 3,
      "keyword": "강남 회식 장소",
      "type": "short_term_sub",
      "volume": 3500,
      "final_score": 0.89,
      "strategy": "계절 이벤트 연계"
    },
    {
      "rank": 4,
      "keyword": "치즈닭갈비 맛집",
      "type": "long_term_main",
      "volume": 12000,
      "final_score": 0.85,
      "strategy": "6개월 콘텐츠 육성"
    },
    {
      "rank": 5,
      "keyword": "강남 데이트 코스",
      "type": "long_term_sub",
      "volume": 4200,
      "final_score": 0.82,
      "strategy": "분위기 사진 강화"
    }
  ],

  "secondary_keywords": [
    // 10개 보조 키워드
  ],

  "comparison_with_current": {
    "current": ["강남 닭갈비", "히도 강남점"],
    "new": ["강남 닭갈비", "강남역 철판닭갈비", "강남 회식 장소"],
    "changes": [
      {"type": "keep", "keyword": "강남 닭갈비"},
      {"type": "remove", "keyword": "히도 강남점", "reason": "검색량 낮음"},
      {"type": "add", "keyword": "강남역 철판닭갈비", "reason": "고검색량 + 트렌드 상승"}
    ]
  }
}
```

## 8. 네이버 검색량 조회 (L2)

### API 연동
```javascript
// src/naver-api/search-volume.js
async function getMonthlySearchVolume(keywords) {
  const response = await fetch('https://api.naver.com/keywordstool', {
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
    },
    body: JSON.stringify({ keywords })
  });

  return response.json();
}
```

### 배치 처리
- 최대 100개 키워드 동시 조회
- Rate Limiting: 분당 60회 제한
- 캐싱: 조회 결과 24시간 캐싱

## 9. GUI 주요 화면

### L2 마케터 검토 UI
```
┌─────────────────────────────────────────────┐
│ L2: 목표키워드 설정                          │
├─────────────────────────────────────────────┤
│                                             │
│ AI 분석 완료: 125개 키워드 생성              │
│ 네이버 검색량 조회 완료                      │
│                                             │
│ ┌─ 키워드 매트릭스 ──────────────────┐     │
│ │ 키워드           │ 월간 │ 트렌드 │ 분류│  │
│ ├──────────────────┼──────┼────────┼────┤  │
│ │ 강남 닭갈비       │15000│  🔺   │[단기]│  │
│ │ 강남역 철판닭갈비 │ 8000│  🔺   │[단기]│  │
│ │ 치즈닭갈비       │12000│  🔺   │[장기]│  │
│ └──────────────────────────────────────┘     │
│                                             │
│ 목표 설정:                                   │
│ □ 단기 메인  □ 단기 서브                    │
│ □ 장기 메인  □ 장기 서브                    │
│ □ 확장 방향                                 │
│                                             │
│ [일괄 적용] [개별 수정] [저장 후 L3 진행]    │
└─────────────────────────────────────────────┘
```

## 10. 성능 및 비용

### 예상 소요 시간 (단일 매장)
- L1: ~5초 (데이터 수집/정렬)
- L2: ~3분 (AI 분석 30초 + 네이버 API 2분)
- L3: ~10초 (조합 및 스코어링)
- **총**: ~3.5분

### 예상 비용 (단일 매장)
- AI API (GPT-4): ~$0.10
- 네이버 검색량 API: 무료 (일일 한도 내)
- **총**: ~$0.10/매장

## 11. 핵심 차별점

### 기존 방식 vs 새로운 시스템
| 항목 | 기존 | 신규 시스템 |
|------|------|------------|
| 현재 키워드 분석 | ❌ 없음 | ✅ 현재 키워드 수집/분석 |
| 검색량 조회 | 수동 | ✅ 자동 (네이버 API) |
| 키워드 조합 | 감으로 선택 | ✅ 체계적 매트릭스 조합 |
| 전략 수립 | 없음 | ✅ 단기/장기 전략 자동 제안 |
| 소요 시간 | 1시간+ | ✅ 3.5분 |

## 12. 다음 단계

1. [L1 데이터 수집 및 정렬](l1.md) - 시작점
2. [L2 분석 및 목표키워드 설정](l2.md) - 핵심 분석
3. [L3 최종 대표키워드 조합](l3.md) - 최종 산출물

---

**문서 버전**: 2.0
**최종 업데이트**: 2025-10-22
**작성자**: Enkei

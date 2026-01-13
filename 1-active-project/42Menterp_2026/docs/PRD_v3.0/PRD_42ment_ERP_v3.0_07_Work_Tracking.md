# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 작업로그/트래킹

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 11. 마케팅 작업 로그

### 11.1 개요
매장별 마케팅 작업 내역을 기록하여 이력 관리 및 효과 분석

### 11.2 로그 유형

| 유형 | 설명 | 기록 방식 |
|------|------|----------|
| 자동 | 발주/정산 시스템 연동 | 시스템 자동 기록 |
| 수동 | 담당자 직접 입력 | 담당자 수동 입력 |

### 11.3 작업 로그 데이터

```
[work_logs]
- id (PK)
- store_id (FK)
- order_item_id (FK) - 연결된 발주 상세 (nullable)
- log_type: auto / manual
- work_type: 리뷰 / 저장 / 길찾기 / 유입 / 기타
- product_id (FK)
- work_date
- keyword - 작업 키워드
- qty - 작업 수량
- status: pending / in_progress / completed / failed
- result_note - 결과 메모
- evidence_url - 증빙 URL (스크린샷 등)
- created_by (FK)
- created_at
- updated_at
```

### 11.4 작업 로그 기능

**자동 기록:**
- 발주 등록 시 → 작업 예정 로그 생성
- 발주 상태 변경 시 → 로그 상태 업데이트
- 키워드 순위 체크 시 → 결과 자동 연결

**수동 기록:**
- 담당자가 직접 작업 내역 입력
- 증빙 자료 첨부 (이미지 URL)
- 특이사항 메모

### 11.5 작업 로그 화면

```
[매장 상세 > 작업 이력 탭]

필터: [전체 ▼] [2026년 1월 ▼] [말차 ▼]

┌─────────────────────────────────────────────────────────┐
│ 날짜       │ 유형   │ 상품  │ 키워드      │ 수량 │ 상태   │
├─────────────────────────────────────────────────────────┤
│ 2026-01-10 │ 유입   │ 히든  │ 강남 카페   │ 200  │ 완료   │
│ 2026-01-08 │ 저장   │ 말차  │ 압구정 바   │ 100  │ 진행중 │
│ 2026-01-05 │ 리뷰   │ 피닉스│ -          │ 50   │ 완료   │
└─────────────────────────────────────────────────────────┘

[+ 수동 작업 추가]
```

---


## 12. 키워드 순위 트래킹

### 12.1 개요
네이버 플레이스 검색에서 매장의 키워드별 순위를 자동 추적

### 12.2 크롤링 기능 (기존 도구 활용)

**기반 기술:**
- Python + requests + BeautifulSoup
- 네이버 플레이스 검색 결과 파싱
- MID 기반 순위 확인

**핵심 로직:**
```python
def check_keyword_rank(keyword, target_mid, top_n=30):
    """
    키워드 검색 결과에서 target_mid의 순위 확인

    Returns:
        - rank: 순위 (1~30), 미노출 시 0
        - match_type: exact(상위3) / natural(4~30) / none
    """
    results = search_naver_place(keyword)
    for i, place in enumerate(results[:top_n]):
        if place['mid'] == target_mid:
            rank = i + 1
            match_type = 'exact' if rank <= 3 else 'natural'
            return rank, match_type
    return 0, 'none'
```

### 12.3 키워드 관리

```
[store_keywords] - 매장별 트래킹 키워드
- id (PK)
- store_id (FK)
- keyword
- keyword_type: target / location / combined
- is_active
- created_at

[keyword_combinations] - 키워드 조합 설정
- id (PK)
- store_id (FK)
- location_keyword - 위치 키워드 (강남, 홍대 등)
- target_keyword - 목적 키워드 (맛집, 카페 등)
- combined_keyword - 조합 키워드 (강남 맛집)
- is_active
```

### 12.4 순위 트래킹 데이터

```
[keyword_rankings]
- id (PK)
- store_id (FK)
- keyword
- check_date
- check_time
- rank - 순위 (0 = 미노출)
- match_type: exact / natural / none
- previous_rank - 이전 순위
- rank_change - 순위 변동 (+/-)
- created_at

[ranking_snapshots] - 일별 스냅샷
- id (PK)
- store_id (FK)
- snapshot_date
- total_keywords - 총 트래킹 키워드 수
- exposed_count - 노출 키워드 수
- exact_count - 정확매칭 수 (상위 3위)
- natural_count - 자연유입 수 (4~30위)
- avg_rank - 평균 순위
```

### 12.5 트래킹 스케줄

| 주기 | 대상 | 설명 |
|------|------|------|
| 일 1회 | 전체 활성 키워드 | 매일 오전 6시 자동 체크 |
| 수동 | 선택 키워드 | 담당자 즉시 체크 |
| 발주 연동 | 발주 키워드 | 발주 시작/종료일 자동 체크 |

### 12.6 순위 트래킹 화면

```
[매장 상세 > 키워드 순위 탭]

매장: 마르케 (MID: 1374995918)

[키워드 관리]
┌───────────────────────────────────────────────────────────┐
│ 키워드        │ 현재순위 │ 변동  │ 타입     │ 최근체크    │
├───────────────────────────────────────────────────────────┤
│ 강남 카페     │ 2위     │ ▲3   │ 정확매칭 │ 01-12 06:00 │
│ 논현동 소금빵 │ 5위     │ ▼2   │ 자연유입 │ 01-12 06:00 │
│ 압구정 베이커리│ 12위    │ -    │ 자연유입 │ 01-12 06:00 │
│ 강남역 디저트 │ 미노출   │ -    │ -       │ 01-12 06:00 │
└───────────────────────────────────────────────────────────┘

[+ 키워드 추가] [지금 체크] [순위 리포트]

[순위 추이 그래프]
     ^
  1위│    ★
  5위│  ●───●───●
 10위│        ○───○
 15위│
     └─────────────────→
       1/8  1/9  1/10 1/11 1/12
```

### 12.7 키워드 발굴 기능 (기존 도구 연동)

**자동 키워드 발굴:**
```
1. 매장 MID 입력
2. 위치키워드 + 목적키워드 조합 생성
3. 각 조합으로 검색 → 매장 노출 여부 확인
4. 노출 키워드 자동 등록
```

**입력 파일:**
- 위치키워드.txt: 지역명 목록
- 목적키워드.txt: 업종/서비스 키워드

**출력:**
- 정확매칭 키워드 (상위 3위)
- 자연유입 키워드 (4~30위)

### 12.8 데이터 보관 정책

| 데이터 | 보관 기간 | 이후 처리 | 비고 |
|--------|----------|----------|------|
| keyword_rankings | 6개월 | 월별 집계 후 삭제 | 상세 이력 |
| ranking_snapshots | 2년 | 아카이브 테이블 이동 | 일별 요약 |
| 크롤링 원본 로그 | 7일 | 자동 삭제 | 디버깅용 |
| work_logs | 3년 | 아카이브 | 감사 추적용 |

**아카이브 테이블:**
```
[keyword_rankings_archive]
- 동일 스키마
- partition by month

[work_logs_archive]
- 동일 스키마
- partition by year
```

**집계 데이터:**
```
[keyword_monthly_stats] - 월별 키워드 통계
- id (PK)
- store_id (FK)
- keyword
- year_month
- avg_rank - 평균 순위
- best_rank - 최고 순위
- worst_rank - 최저 순위
- exposure_days - 노출 일수
- exact_days - 정확매칭 일수
- created_at
```

**보관 정책 설정:**
```
[data_retention_settings]
- entity_type: keyword_rankings / work_logs / etc
- retention_days - 보관 일수
- archive_enabled - 아카이브 여부
- last_cleanup_at - 마지막 정리 일시
```

---




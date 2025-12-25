# L3 — 최종 대표키워드 조합

## 목적

L2에서 설정한 목표키워드를 바탕으로 **최종 대표키워드 5개**와 **보조키워드 10개**를 조합하여 확정합니다. 단기/장기, 메인/서브 균형을 맞추고, 실행 가능한 키워드 전략을 수립합니다.

## 핵심 원칙

1. **목표 우선순위 반영**: L2에서 설정한 단기/장기, 메인/서브 분류 기반
2. **균형 조합**: 트래픽(검색량) vs 관련성(전환율) 균형
3. **실행 전략 포함**: 각 키워드별 구체적 활용 방법 제시
4. **성과 측정 가능**: 현재 키워드와 비교하여 예상 효과 측정

## 입력 데이터

### 1. target_keywords_l2.json
**위치**: `data/output/l2/target_keywords_l2.json`

```json
{
  "place_id": "1234567890",
  "short_term": {
    "main": [...],
    "sub": [...]
  },
  "long_term": {
    "main": [...],
    "sub": [...]
  },
  "expansion": [...]
}
```

### 2. analyzed_keywords_l2.json
**위치**: `data/output/l2/analyzed_keywords_l2.json`
    
전체 키워드 분석 데이터 (검색량, 트렌드, 관련성 포함)

### 3. current_keywords_l1.json
**위치**: `data/output/l1/current_keywords_l1.json

현재 사용 중인 키워드 (비교 분석용)

## 처리 단계

### 1단계: 조합 전략 수립
대표키워드와 보조키워드의 배분 전략을 수립합니다.

**기본 조합 규칙**:
```javascript
const COMBINATION_STRATEGY = {
  // 대표 키워드 5개
  primary: {
    short_term_main: 3,   // 단기 메인 3개 (즉시 트래픽)
    long_term_main: 2     // 장기 메인 2개 (지속 성장)
  },

  // 보조 키워드 10개
  secondary: {
    short_term_sub: 5,    // 단기 서브 5개 (롱테일 트래픽)
    long_term_sub: 3,     // 장기 서브 3개 (미래 투자)
    expansion: 2          // 확장 2개 (신규 기회)
  }
};
```

**유연성 규칙**:
```javascript
function applyFlexibility(targetKeywords, strategy) {
  // 단기 메인이 부족하면 장기 메인에서 충원
  if (targetKeywords.short_term.main.length < strategy.primary.short_term_main) {
    const shortfall = strategy.primary.short_term_main - targetKeywords.short_term.main.length;
    const补充 = targetKeywords.long_term.main.slice(0, shortfall);

    logger.warn(`단기 메인 부족: 장기 메인 ${shortfall}개로 충원`);
    targetKeywords.short_term.main.push(...补充);
    targetKeywords.long_term.main = targetKeywords.long_term.main.slice(shortfall);
  }

  // 동일 로직을 다른 카테고리에도 적용
  // ...

  return targetKeywords;
}
```

### 2단계: 최종 스코어링
각 키워드의 최종 점수를 계산하여 정확한 순위를 매깁니다.

**스코어링 공식**:
```
최종 점수 = (검색량 × 0.4) + (관련성 × 0.3) + (목표 우선순위 × 0.3)

여기서:
- 검색량: 정규화된 월간 검색량 (0~1)
- 관련성: AI 분석 관련성 점수 (0~1)
- 목표 우선순위: 분류별 가중치
  - 단기 메인: 1.0
  - 단기 서브: 0.9
  - 장기 메인: 0.8
  - 장기 서브: 0.7
  - 확장: 0.6
```

**구현**:
```javascript
function calculateFinalScore(keyword, maxVolume) {
  const volumeNorm = normalizeVolume(keyword.monthly_volume, maxVolume);
  const relevance = keyword.relevance_score;
  const priorityWeight = keyword.priority;  // L2에서 설정됨

  let score =
    volumeNorm * 0.4 +
    relevance * 0.3 +
    priorityWeight * 0.3;

  // 트렌드 보너스
  if (keyword.trend === 'RISING') {
    score *= 1.1;
  } else if (keyword.trend === 'FALLING') {
    score *= 0.9;
  }

  // 경쟁 강도 조정
  if (keyword.competition === 'LOW') {
    score *= 1.05;  // 낮은 경쟁은 유리
  } else if (keyword.competition === 'HIGH') {
    score *= 0.95;  // 높은 경쟁은 불리
  }

  return Math.min(score, 1.0);
}

function normalizeVolume(volume, max) {
  if (volume === 0) return 0;

  // 로그 스케일 (큰 숫자 편향 완화)
  const logVolume = Math.log10(volume + 1);
  const logMax = Math.log10(max + 1);

  return logVolume / logMax;
}
```

### 3단계: 대표 키워드 선정 (Top 5)
최종 점수를 기반으로 대표 키워드 5개를 선정합니다.

**선정 로직**:
```javascript
function selectPrimaryKeywords(targetKeywords, strategy) {
  const candidates = [];

  // 단기 메인에서 선정
  const shortTermMain = targetKeywords.short_term.main
    .map(k => ({ ...k, final_score: calculateFinalScore(k, getMaxVolume(targetKeywords)) }))
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, strategy.primary.short_term_main);

  candidates.push(...shortTermMain);

  // 장기 메인에서 선정
  const longTermMain = targetKeywords.long_term.main
    .map(k => ({ ...k, final_score: calculateFinalScore(k, getMaxVolume(targetKeywords)) }))
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, strategy.primary.long_term_main);

  candidates.push(...longTermMain);

  // 최종 정렬 (final_score 기준)
  candidates.sort((a, b) => b.final_score - a.final_score);

  // 순위 부여
  candidates.forEach((item, index) => {
    item.rank = index + 1;
  });

  return candidates;
}
```

### 4단계: 보조 키워드 선정 (Top 10)
동일한 방식으로 보조 키워드 10개를 선정합니다.

```javascript
function selectSecondaryKeywords(targetKeywords, strategy) {
  const candidates = [];

  // 단기 서브 선정
  const shortTermSub = targetKeywords.short_term.sub
    .map(k => ({ ...k, final_score: calculateFinalScore(k, getMaxVolume(targetKeywords)) }))
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, strategy.secondary.short_term_sub);

  candidates.push(...shortTermSub);

  // 장기 서브 선정
  const longTermSub = targetKeywords.long_term.sub
    .map(k => ({ ...k, final_score: calculateFinalScore(k, getMaxVolume(targetKeywords)) }))
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, strategy.secondary.long_term_sub);

  candidates.push(...longTermSub);

  // 확장 키워드 선정
  const expansion = targetKeywords.expansion
    .map(k => ({ ...k, final_score: calculateFinalScore(k, getMaxVolume(targetKeywords)) }))
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, strategy.secondary.expansion);

  candidates.push(...expansion);

  // 최종 정렬
  candidates.sort((a, b) => b.final_score - a.final_score);

  // 순위 부여 (6위부터 시작)
  candidates.forEach((item, index) => {
    item.rank = index + 6;
  });

  return candidates;
}
```

### 5단계: 키워드별 실행 전략 수립
각 키워드의 활용 방법을 구체적으로 제시합니다.

**전략 매핑**:
```javascript
function assignImplementationStrategy(keyword) {
  const strategies = {
    high_volume_high_relevance: {
      channels: ['블로그 메인', '메타태그 최우선', '광고 집행'],
      tactics: ['월 3회 이상 포스팅', 'SEO 최적화', '리뷰 유도'],
      priority: '최우선'
    },
    high_volume_low_relevance: {
      channels: ['블로그 보조', '롱폼 콘텐츠'],
      tactics: ['관련성 높이는 콘텐츠', '자연스러운 언급'],
      priority: '보조'
    },
    low_volume_high_relevance: {
      channels: ['시그니처 강조', '전문성 어필'],
      tactics: ['고품질 콘텐츠', '니치 타겟팅'],
      priority: '육성'
    },
    trend_rising: {
      channels: ['선제 투자', 'SNS 활용'],
      tactics: ['트렌드 편승 콘텐츠', '적극 노출'],
      priority: '기회 포착'
    }
  };

  // 키워드 특성 분석
  if (keyword.monthly_volume >= 5000 && keyword.relevance_score >= 0.8) {
    return strategies.high_volume_high_relevance;
  } else if (keyword.monthly_volume >= 5000 && keyword.relevance_score < 0.8) {
    return strategies.high_volume_low_relevance;
  } else if (keyword.monthly_volume < 5000 && keyword.relevance_score >= 0.8) {
    return strategies.low_volume_high_relevance;
  } else if (keyword.trend === 'RISING') {
    return strategies.trend_rising;
  } else {
    return {
      channels: ['일반 콘텐츠'],
      tactics: ['자연스러운 활용'],
      priority: '일반'
    };
  }
}
```

### 6단계: 현재 키워드와 비교 및 변경 사항 분석
현재 키워드와 비교하여 변경 내역을 정리합니다.

**비교 분석**:
```javascript
function compareAndAnalyzeChanges(finalKeywords, currentKeywords) {
  if (!currentKeywords) {
    return {
      changes: [],
      expected_impact: '현재 키워드 없음 - 전체 신규 설정'
    };
  }

  const newPrimary = finalKeywords.primary.map(k => k.keyword);
  const currentPrimary = currentKeywords.current_primary;

  const changes = [];

  // 유지되는 키워드
  for (const keyword of newPrimary) {
    if (currentPrimary.includes(keyword)) {
      changes.push({
        type: 'KEEP',
        keyword: keyword,
        reason: '지속적으로 효과적',
        action: '유지'
      });
    }
  }

  // 제거되는 키워드
  for (const keyword of currentPrimary) {
    if (!newPrimary.includes(keyword)) {
      const analysis = analyzeRemovalReason(keyword, finalKeywords);
      changes.push({
        type: 'REMOVE',
        keyword: keyword,
        reason: analysis.reason,
        action: '보조로 전환 또는 제거'
      });
    }
  }

  // 신규 추가 키워드
  for (const keyword of newPrimary) {
    if (!currentPrimary.includes(keyword)) {
      const item = finalKeywords.primary.find(k => k.keyword === keyword);
      changes.push({
        type: 'ADD',
        keyword: keyword,
        reason: `검색량 ${item.monthly_volume}, 트렌드 ${item.trend}`,
        action: '신규 집중 투자'
      });
    }
  }

  // 예상 효과 계산
  const currentTotalVolume = currentKeywords.performance?.avg_monthly_searches || 0;
  const newTotalVolume = finalKeywords.primary.reduce((sum, k) => sum + k.monthly_volume, 0) / finalKeywords.primary.length;

  const expectedIncrease = ((newTotalVolume - currentTotalVolume) / currentTotalVolume * 100).toFixed(1);

  return {
    changes,
    expected_impact: `예상 트래픽 증가: ${expectedIncrease > 0 ? '+' : ''}${expectedIncrease}%`
  };
}
```

### 7단계: 최종 산출물 생성

**final_keywords.json**:
```json
{
  "place_id": "1234567890",
  "brand_name": "히도 강남점",
  "finalized_at": "2025-10-22T11:00:00Z",

  "primary_keywords": [
    {
      "rank": 1,
      "keyword": "강남 닭갈비",
      "type": "short_term_main",
      "monthly_volume": 15000,
      "trend": "RISING",
      "relevance_score": 0.95,
      "final_score": 0.98,
      "strategy": {
        "channels": ["블로그 메인", "메타태그", "광고"],
        "tactics": ["월 3회 포스팅", "SEO 최적화"],
        "priority": "최우선"
      }
    },
    {
      "rank": 2,
      "keyword": "강남역 철판닭갈비",
      "type": "short_term_main",
      "monthly_volume": 8000,
      "trend": "RISING",
      "final_score": 0.95,
      "strategy": {
        "channels": ["시그니처 강조"],
        "tactics": ["메뉴 사진 보강", "리뷰 유도"]
      }
    },
    // ... 총 5개
  ],

  "secondary_keywords": [
    // ... 총 10개
  ],

  "comparison_with_current": {
    "current": ["강남 닭갈비", "히도 강남점"],
    "new": ["강남 닭갈비", "강남역 철판닭갈비", "강남 회식 장소", ...],
    "changes": [
      {
        "type": "KEEP",
        "keyword": "강남 닭갈비",
        "reason": "지속적으로 효과적"
      },
      {
        "type": "REMOVE",
        "keyword": "히도 강남점",
        "reason": "검색량 낮음 (200)"
      },
      {
        "type": "ADD",
        "keyword": "강남역 철판닭갈비",
        "reason": "검색량 8,000, 트렌드 상승"
      }
    ],
    "expected_impact": "예상 트래픽 증가: +35%"
  },

  "metadata": {
    "total_candidates_analyzed": 125,
    "primary_selected": 5,
    "secondary_selected": 10,
    "scoring_weights": {
      "volume": 0.4,
      "relevance": 0.3,
      "priority": 0.3
    }
  }
}
```

**keyword_strategy.md** (키워드 전략 가이드):
```markdown
# 키워드 전략 가이드

## 대표 키워드 실행 계획

### 1위: 강남 닭갈비 (검색량: 15,000)
**목표**: 3개월 내 상위 노출
**실행 계획**:
- [ ] 블로그 포스팅 10개 작성 (월 3~4개)
- [ ] 메타태그 최적화
- [ ] 네이버 광고 월 30만원 집행
- [ ] 고객 리뷰에 자연스럽게 키워드 유도

**예상 효과**: 월 500명 유입

### 2위: 강남역 철판닭갈비 (검색량: 8,000)
**목표**: 시그니처 메뉴로 강조
**실행 계획**:
- [ ] 철판닭갈비 전문 사진 촬영
- [ ] 메뉴판 1순위 배치
- [ ] SNS 해시태그 집중 활용
- [ ] 블로그 포스팅 5개

## 월별 실행 로드맵

### 1개월차
- 대표 키워드 3개 중심 블로그 10개 작성
- 메타태그 업데이트
- 광고 시작

### 2개월차
- 보조 키워드 확장
- 리뷰 응답에 키워드 자연스럽게 포함
- SNS 활동 강화

### 3개월차
- 성과 측정
- 장기 키워드 육성 시작
- 확장 키워드 테스트

## 예상 성과
- 3개월 후 월 트래픽: 현재 대비 +35%
- 6개월 후: +60%
- 1년 후: +100%
```

**implementation_guide.md** (실행 가이드북):
```markdown
# 키워드 실행 가이드북

## 주간 체크리스트

### 블로그 작성 (주 1회)
- [ ] 대표 키워드 1개 선택
- [ ] 제목에 키워드 포함
- [ ] 본문 자연스럽게 3~5회 언급
- [ ] 메타 설명에 키워드 포함

### 리뷰 응답 (매일)
- [ ] 고객 리뷰 체크
- [ ] 응답에 키워드 자연스럽게 포함
  예: "저희 '강남 닭갈비' 맛집을 방문해 주셔서 감사합니다"

### SNS 포스팅 (주 2회)
- [ ] 보조 키워드 해시태그 활용
- [ ] 사진과 함께 키워드 언급

## 주의사항
- ❌ 키워드 스터핑 금지 (과도한 반복)
- ✅ 자연스러운 문맥에서 사용
- ✅ 사용자 의도에 맞는 콘텐츠

## 성과 측정
- 월 1회: 네이버 플레이스 통계 확인
- 분기 1회: 키워드 순위 체크
- 반기 1회: 전략 재검토
```

## 출력 데이터

1. **final_keywords.json** - 최종 키워드
2. **keyword_strategy.md** - 전략 가이드
3. **implementation_guide.md** - 실행 가이드
4. **audit_report.json** - 전체 감사 로그

## 검증 기준

- ✅ 대표 키워드 5개 선정
- ✅ 보조 키워드 10개 선정
- ✅ 각 키워드별 실행 전략 포함
- ✅ 현재 키워드와 비교 분석 완료
- ✅ 예상 효과 측정 완료

## 실행 방법

```bash
# L3 실행
node src/main.js l3 --brand=히도

# 전체 파이프라인
node src/main.js start --brand=히도
```

## 로그 예시

```
[INFO] L3 최종 조합 시작
[INFO] 조합 전략 수립 완료
[INFO] 최종 스코어링 계산 중...
[INFO] 대표 키워드 선정: 5개
[INFO] 보조 키워드 선정: 10개
[INFO] 실행 전략 수립 완료
[INFO] 현재 키워드 비교 분석 완료
  - 유지: 1개
  - 제거: 1개
  - 신규: 4개
  - 예상 트래픽 증가: +35%
[INFO] 결과 저장: data/output/l3/
[INFO] L3 완료 (소요 시간: 8초)
[INFO] 전체 파이프라인 완료!
```

## 다음 액션

L3 완료 후 실제 적용:
1. **즉시**: 메타태그 업데이트
2. **1주일 내**: 블로그 포스팅 3개 작성
3. **2주일 내**: 광고 시작
4. **1개월 후**: 성과 측정

---

**소요 시간**: ~10초
**총 파이프라인**: L1(5초) + L2(3분) + L3(10초) = **약 3.5분**

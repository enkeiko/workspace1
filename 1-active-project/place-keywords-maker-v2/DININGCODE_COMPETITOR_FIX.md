# 다이닝코드 경쟁업체 수집 구현 완료

## 문제 상황

다이닝코드의 "비슷한 맛집" 섹션에서 경쟁업체 정보를 수집하려 했으나 0개의 결과만 반환되는 문제가 발생했습니다.

## 원인 분석

### 1. 섹션 텍스트 매칭 실패
```javascript
// 문제 코드
if (text.includes('비슷한 맛집')) {
  // ...
}
```

다이닝코드의 실제 HTML 구조:
```html
<h2>
  라이브볼과 비슷한
          맛집


      현재 식당 거리 순
      점수 높은 순
      유사도 순
</h2>
```

- 텍스트에 개행(`\n`)과 연속된 공백이 포함되어 있어 매칭 실패
- 해결: 공백 정규화 `text.trim().replace(/\s+/g, ' ')`

### 2. querySelector 속성 선택자 문제
```javascript
// 문제 코드
allLinks = section.querySelectorAll('a[href*="diningcode.com/profile"]');
// 결과: 0개
```

- `querySelectorAll('a[href*="..."]')`가 동적으로 로드된 href를 찾지 못함
- 해결: 모든 앵커를 먼저 찾고, JavaScript에서 필터링
```javascript
const anchors = section.querySelectorAll('a');
allLinks = Array.from(anchors).filter(a =>
  a.href && a.href.includes('diningcode.com/profile')
);
```

### 3. 업체명에 불필요한 공백 포함
```
프로티너                             역삼역점
```

- 해결: 연속된 공백을 하나로 정규화
```javascript
name = rawName.replace(/\s+/g, ' ').trim();
```

## 최종 구현

### CompetitorCollector.js 수정 사항

#### 1. 섹션 찾기 (라인 232-238)
```javascript
for (const section of sections) {
  const text = (section.textContent || '').trim().replace(/\s+/g, ' ');
  if (text.includes('비슷한 맛집') && !text.includes('근처')) {
    similarSection = section.closest('section, div[class*="section"]') || section.parentElement;
    break;
  }
}
```

#### 2. 링크 추출 (라인 240-254)
```javascript
if (similarSection) {
  // 모든 앵커를 찾은 후 href로 필터링
  const anchors = similarSection.querySelectorAll('a');
  allLinks = Array.from(anchors).filter(a =>
    a.href && a.href.includes('diningcode.com/profile')
  );
}
```

#### 3. 업체명 정규화 (라인 260-272)
```javascript
const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
const rawName = lines.find(l => !l.includes('현 식당') && !l.includes('거리')) || lines[0];
// 연속된 공백을 하나의 스페이스로 정규화
name = rawName.replace(/\s+/g, ' ').trim();
```

#### 4. 거리 추출 (라인 272-282)
```javascript
const distMatch = fullText.match(/현 식당에서 (\d+(?:\.\d+)?(?:km|m))/);
if (distMatch) {
  distance = distMatch[1];
}
```

## 테스트 결과

### 입력
```
URL: https://www.diningcode.com/profile.php?rid=kyGW8k1TTTs9
```

### 출력 (10개 경쟁업체)
```json
{
  "competitors": [
    {
      "rid": "Cc87FqrdJGhv",
      "name": "프로티너 역삼역점",
      "distance": "118m",
      "url": "https://www.diningcode.com/profile.php",
      "source": "diningcode_similar"
    },
    {
      "rid": "01xGkvn6ujhz",
      "name": "렌위치 역삼GFC점",
      "distance": "118m",
      "url": "https://www.diningcode.com/profile.php",
      "source": "diningcode_similar"
    },
    {
      "rid": "EZv5EV4YulEF",
      "name": "주시브로스",
      "distance": "123m",
      "url": "https://www.diningcode.com/profile.php",
      "source": "diningcode_similar"
    }
    // ... 7개 더
  ]
}
```

## 핵심 교훈

1. **텍스트 매칭 시 공백 정규화 필수**: 웹 페이지의 텍스트는 개행과 연속 공백을 포함할 수 있음
2. **querySelector 속성 선택자 제한**: 동적 속성은 JavaScript 필터링이 더 안정적
3. **데이터 정제의 중요성**: 수집한 데이터의 공백, 특수문자 등을 정규화해야 함

## 날짜
2025-11-28

## 관련 파일
- `src/modules/crawler/CompetitorCollector.js`
- `test-diningcode-collection.js` (테스트 스크립트)
- `debug-diningcode-html.js` (디버그 스크립트)

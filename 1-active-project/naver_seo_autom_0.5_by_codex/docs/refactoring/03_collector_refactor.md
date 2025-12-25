# Collector 리팩터링

## 입력/출력
- 입력: `clients/{brand}/intake.json` + `place_id`
- 출력: `clients/{brand}/collector.json` (공통 스키마 준수)

## 기능
- Naver Place 크롤링(Puppeteer 스텁)
- NAP 불일치 탐지(name/address/phone)
- 택소노미 기반 태깅 준비(간단 규칙, 후속 강화 예정)
 - 모의 실행(MOCK): `MOCK_COLLECTOR=1` 시 네트워크 없이 수집 스텁 출력

## 구현 메모
- DOM 셀렉터 의존 최소화, Apollo/네트워크 파싱으로 전환 예정
- 차단 회피: 헤드리스/지연/UA 다양화 등 운영 전략 별도 문서화 권장
- 검증 불가한 수치/가중치는 배제

## 파일
- `src/collector/PlaceCrawler.js`
- `src/collector/index.js`
- `src/utils/*`

## 실행
- Windows PowerShell 샘플: `npm run collector:mock`
- 실제 크롤: `npm run collector`

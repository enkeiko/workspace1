# 파일 관리 정책 - Phase 1

**프로젝트명**: 42ment 광고대행사 관리 시스템
**Phase**: 1 (MVP)
**버전**: 1.0
**작성일**: 2025-11-14

---

## 📌 개요

이 문서는 시스템에서 업로드되는 파일의 저장, 관리, 삭제 정책을 정의합니다.

**대상 파일**:
- 회사 사업자등록증
- 계약서 파일 (PDF, 이미지)
- 세금계산서 파일
- 보고서 첨부 파일

---

## 📁 1. 파일 저장 구조

### 1.1 디렉토리 구조

**기본 경로**: `/uploads/`

**하위 구조**:
```
/uploads/
├── {year}/                    # 연도 (예: 2025)
│   └── {month}/               # 월 (예: 11)
│       ├── company/           # 회사 정보
│       │   └── {id}/          # 회사 ID
│       ├── contract/          # 계약서
│       │   └── {id}/          # 계약 ID
│       ├── invoice/           # 세금계산서
│       │   └── {id}/          # 세금계산서 ID
│       └── report/            # 보고서
│           └── {id}/          # 보고서 ID
```

**예시**:
```
/uploads/2025/11/contract/123/20251114153045_a7f3b2_계약서.pdf
/uploads/2025/11/invoice/456/20251114153120_x9k2n3_세금계산서.pdf
/uploads/2025/11/report/789/20251114153200_p5q8r1_보고서첨부.png
```

---

### 1.2 파일명 규칙

**저장 파일명 포맷**:
```
{timestamp}_{random_string}_{original_filename}
```

**구성 요소**:
1. **timestamp**: `YYYYMMDDHHmmss` (20251114153045)
2. **random_string**: 6자리 알파벳+숫자 (a7f3b2)
3. **original_filename**: 원본 파일명 (UTF-8, 공백 유지)

**예시**:
- 입력: `계약서_2024년.pdf`
- 저장: `20251114153045_a7f3b2_계약서_2024년.pdf`

**파일명 생성 로직**:
```javascript
const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const randomString = generateRandomString(6); // a-z0-9
const safeFilename = sanitizeFilename(originalFilename);
const finalFilename = `${timestamp}_${randomString}_${safeFilename}`;
```

**파일명 정규화**:
- 허용 문자: 한글, 영문, 숫자, `_`, `-`, `.`, 공백
- 금지 문자: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- 금지 문자는 `_`로 치환

---

## 📤 2. 파일 업로드 규칙

### 2.1 허용 파일 형식

**이미지**:
- 확장자: `.jpg`, `.jpeg`, `.png`, `.gif`
- MIME Type: `image/jpeg`, `image/png`, `image/gif`
- 용도: 계약서 스캔, 보고서 첨부

**문서**:
- 확장자: `.pdf`
- MIME Type: `application/pdf`
- 용도: 계약서, 세금계산서, 사업자등록증

**Phase 1 제외**:
- Excel (`.xlsx`, `.xls`) - Phase 2
- Word (`.docx`, `.doc`) - Phase 2
- PowerPoint (`.pptx`, `.ppt`) - Phase 2

---

### 2.2 파일 크기 제한

**단일 파일**:
- 최대 크기: **5MB**
- 초과 시: "파일 크기는 5MB 이하여야 합니다" 오류

**고객별 총 용량** (Phase 2):
- 고객당 최대: 100MB
- Phase 1에서는 미적용

**전체 시스템 용량** (Phase 2):
- 초기 할당: 10GB
- 모니터링 및 확장

---

### 2.3 업로드 프로세스

**Step 1: 클라이언트 검증**
```javascript
// 파일 선택 시
- 파일 형식 체크 (확장자)
- 파일 크기 체크 (5MB)
- 통과 시 업로드 진행
- 실패 시 오류 메시지 표시
```

**Step 2: 서버 검증**
```javascript
// 서버 수신 시
1. MIME Type 검증
2. 파일 크기 재검증
3. 파일명 정규화
4. 바이러스 스캔 (선택, Phase 2)
5. 통과 시 저장 진행
```

**Step 3: 파일 저장**
```javascript
1. 디렉토리 존재 확인 (없으면 생성)
2. 파일명 생성 (timestamp + random + original)
3. 파일 저장
4. 저장 경로를 DB에 기록
```

**Step 4: 응답**
```json
{
  "success": true,
  "file_path": "/uploads/2025/11/contract/123/20251114153045_a7f3b2_계약서.pdf",
  "file_url": "https://example.com/api/files/download?path=...",
  "original_filename": "계약서.pdf",
  "file_size": 2048576
}
```

---

### 2.4 업로드 오류 처리

**클라이언트 오류** (4xx):
- `400 Bad Request`: 파일 형식 불가
- `413 Payload Too Large`: 파일 크기 초과
- `415 Unsupported Media Type`: MIME Type 불일치

**서버 오류** (5xx):
- `500 Internal Server Error`: 저장 실패
- `507 Insufficient Storage`: 디스크 용량 부족

**재시도 정책**:
- 5xx 오류 시 최대 3회 재시도
- 지수 백오프 (2초, 4초, 8초)

---

## 💾 3. 파일 다운로드 규칙

### 3.1 다운로드 엔드포인트

**URL 구조**:
```
GET /api/files/download?path={file_path}
GET /api/files/download/{file_id}
```

**인증**:
- 로그인 필수
- 세션 또는 JWT 토큰

**권한**:
- Phase 1: 모든 로그인 사용자
- Phase 2: 소유자 또는 관리자만

---

### 3.2 다운로드 프로세스

**Step 1: 요청 검증**
```javascript
1. 인증 확인
2. 파일 경로 검증 (path traversal 방어)
3. 파일 존재 확인
4. 권한 확인 (Phase 2)
```

**Step 2: 파일 전송**
```javascript
// Response Headers
Content-Type: {MIME Type}
Content-Disposition: attachment; filename="{original_filename}"
Content-Length: {file_size}
Cache-Control: no-cache

// Body: 파일 바이너리 데이터
```

**Step 3: 로그 기록** (선택, Phase 2)
```javascript
// access_log 테이블
{
  user_id: "admin",
  file_path: "...",
  action: "download",
  ip: "192.168.1.100",
  accessed_at: "2025-11-14 15:30:45"
}
```

---

### 3.3 보안 고려사항

**Path Traversal 방어**:
```javascript
// 금지 패턴
const dangerousPatterns = ['../', '..\\', '/etc/', 'C:\\'];

// 검증
if (dangerousPatterns.some(p => filePath.includes(p))) {
  return res.status(403).json({ error: "Invalid file path" });
}

// 절대 경로 비교
const resolvedPath = path.resolve(filePath);
const uploadsPath = path.resolve('/uploads/');
if (!resolvedPath.startsWith(uploadsPath)) {
  return res.status(403).json({ error: "Access denied" });
}
```

**MIME Type 검증**:
```javascript
// 실제 파일 내용 기반 MIME Type 확인
const fileType = require('file-type');
const buffer = fs.readFileSync(filePath);
const detected = await fileType.fromBuffer(buffer);

if (!detected || !allowedMimeTypes.includes(detected.mime)) {
  return res.status(403).json({ error: "Invalid file type" });
}
```

---

## 🗑️ 4. 파일 삭제 규칙

### 4.1 삭제 시나리오

**시나리오 A: 엔티티 삭제 시**
```
계약서 레코드 삭제 → 계약서 파일도 삭제
```

**시나리오 B: 파일 교체 시**
```
계약서 파일 재업로드 → 기존 파일 삭제
```

**시나리오 C: 엔티티 삭제 제한 시**
```
연관 데이터가 있어 삭제 불가 → 파일도 보존
```

---

### 4.2 삭제 정책

**Phase 1: Hard Delete**
- 엔티티 삭제 시 파일 즉시 삭제
- 복구 불가

**Phase 2: Soft Delete**
- 엔티티 `deleted_at` 설정
- 파일은 30일간 보관
- 30일 후 배치 작업으로 삭제

---

### 4.3 삭제 프로세스 (Phase 1)

**Step 1: 엔티티 삭제 전 체크**
```javascript
// Contract 삭제 예시
1. 연관 데이터 확인 (Order, Invoice 등)
2. 연관 데이터 있으면 삭제 불가
3. 없으면 파일 경로 조회
```

**Step 2: 트랜잭션 시작**
```javascript
BEGIN TRANSACTION;

// DB에서 레코드 삭제
DELETE FROM contract WHERE id = 123;

// 파일 삭제
fs.unlinkSync(contract.contract_file);

COMMIT;
```

**Step 3: 오류 처리**
```javascript
// 파일 삭제 실패 시
catch (error) {
  ROLLBACK;
  // 로그 기록
  logger.error("Failed to delete file", { path, error });
  // 사용자에게 오류 메시지
  throw new Error("파일 삭제 실패");
}
```

---

### 4.4 고아 파일 정리 (Orphan Files)

**발생 원인**:
- 업로드 중단 (DB 저장 전)
- 삭제 실패 (DB는 삭제되었으나 파일 삭제 실패)

**정리 방법** (Phase 2):
```javascript
// 배치 작업 (매주 1회)
1. DB에 없는 파일 경로 찾기
2. 7일 이상 경과한 파일만 삭제
3. 삭제 로그 기록
```

**수동 정리**:
```bash
# 관리자 도구
npm run cleanup-orphan-files --dry-run  # 확인만
npm run cleanup-orphan-files --execute  # 실제 삭제
```

---

## 🔄 5. 백업 정책

### 5.1 백업 범위

**포함**:
- `/uploads/` 디렉토리 전체
- 데이터베이스 파일 경로 레코드

**제외**:
- 임시 파일
- 캐시 파일

---

### 5.2 백업 주기

**일일 백업** (Phase 1):
- 시간: 매일 새벽 3시
- 방식: 증분 백업 (변경된 파일만)
- 보관: 7일

**주간 백업** (Phase 2):
- 시간: 매주 일요일 새벽 2시
- 방식: 전체 백업
- 보관: 4주

**월간 백업** (Phase 2):
- 시간: 매월 1일 새벽 1시
- 방식: 전체 백업
- 보관: 12개월

---

### 5.3 백업 저장소

**Phase 1: 로컬 백업**
- 경로: `/backups/uploads/`
- 용량: 메인 스토리지의 2배 확보

**Phase 2: 클라우드 백업**
- AWS S3, GCP Cloud Storage, 또는 Naver Object Storage
- 버전 관리 활성화
- 라이프사이클 정책
  - 30일 후 Glacier로 이동
  - 1년 후 삭제

---

### 5.4 백업 스크립트

**rsync 백업 예시**:
```bash
#!/bin/bash
# daily-backup.sh

SOURCE="/uploads/"
BACKUP="/backups/uploads/$(date +%Y%m%d)/"

# 디렉토리 생성
mkdir -p "$BACKUP"

# 증분 백업
rsync -av --link-dest="/backups/uploads/latest/" "$SOURCE" "$BACKUP"

# 최신 심볼릭 링크 업데이트
rm -f /backups/uploads/latest
ln -s "$BACKUP" /backups/uploads/latest

# 7일 이상 된 백업 삭제
find /backups/uploads/ -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

**cron 등록**:
```cron
0 3 * * * /opt/app/scripts/daily-backup.sh >> /var/log/backup.log 2>&1
```

---

## 📊 6. 용량 관리

### 6.1 용량 모니터링

**체크 항목**:
- `/uploads/` 디렉토리 총 용량
- 엔티티별 파일 수 및 용량
- 고객별 파일 용량 (Phase 2)

**모니터링 쿼리**:
```sql
-- 엔티티별 파일 수
SELECT
  'contract' AS entity,
  COUNT(*) AS file_count,
  SUM(LENGTH(contract_file)) AS estimated_size
FROM contract
WHERE contract_file IS NOT NULL;
```

**시스템 명령어**:
```bash
# 전체 용량
du -sh /uploads/

# 엔티티별 용량
du -sh /uploads/2025/11/contract/
du -sh /uploads/2025/11/invoice/
du -sh /uploads/2025/11/report/
```

---

### 6.2 용량 임계값 알림

**임계값**:
- **경고 (80%)**: 관리자에게 이메일
- **위험 (90%)**: 관리자 대시보드에 알림
- **긴급 (95%)**: 업로드 제한 (읽기만 가능)

**알림 로직**:
```javascript
const totalSpace = getTotalSpace('/uploads/');
const usedSpace = getUsedSpace('/uploads/');
const usagePercent = (usedSpace / totalSpace) * 100;

if (usagePercent >= 95) {
  disableUpload();
  sendUrgentAlert();
} else if (usagePercent >= 90) {
  sendWarningAlert();
} else if (usagePercent >= 80) {
  sendInfoAlert();
}
```

---

### 6.3 용량 확장 전략

**단기 (Phase 1)**:
- 디스크 추가
- 파티션 확장

**중기 (Phase 2)**:
- 클라우드 스토리지 이전
- S3/Cloud Storage 사용

**장기 (Phase 3)**:
- CDN 연동
- 이미지 최적화 (자동 압축)
- 오래된 파일 아카이빙

---

## 🔐 7. 보안 정책

### 7.1 파일 접근 제어

**서버 레벨**:
- `/uploads/` 디렉토리는 웹 서버의 DocumentRoot 외부 배치
- 직접 URL 접근 불가 (`https://example.com/uploads/` → 403)
- API를 통해서만 다운로드 가능

**권한**:
```bash
# 디렉토리 권한
chmod 750 /uploads/

# 파일 권한
chmod 640 /uploads/**/*

# 소유자
chown appuser:appgroup /uploads/
```

---

### 7.2 파일 업로드 보안

**검증 순서**:
1. ✅ 파일 확장자 체크
2. ✅ MIME Type 체크
3. ✅ 파일 크기 체크
4. ✅ 파일 내용 기반 MIME Type 재검증
5. ⬜ 바이러스 스캔 (Phase 2)
6. ✅ 저장

**위험 파일 차단**:
```javascript
const dangerousExtensions = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.html', '.htm'
];

if (dangerousExtensions.some(ext => filename.endsWith(ext))) {
  return res.status(400).json({ error: "Dangerous file type" });
}
```

---

### 7.3 파일 다운로드 보안

**헤더 설정**:
```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Content-Security-Policy', "default-src 'none'");
res.setHeader('X-Download-Options', 'noopen');
```

**파일명 인코딩**:
```javascript
// 한글 파일명 처리
const encodedFilename = encodeURIComponent(originalFilename);
res.setHeader('Content-Disposition',
  `attachment; filename*=UTF-8''${encodedFilename}`);
```

---

## 📝 8. 파일 메타데이터 관리

### 8.1 DB 저장 정보

**최소 정보**:
- `file_path`: 저장 경로 (VARCHAR 500)
- 엔티티 ID와 연결

**Phase 2 확장**:
```sql
CREATE TABLE file_metadata (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by VARCHAR(50) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX(entity_type, entity_id)
);
```

---

### 8.2 파일 로그 (Phase 2)

**로그 대상**:
- 업로드: 누가, 언제, 무엇을
- 다운로드: 누가, 언제, 무엇을
- 삭제: 누가, 언제, 무엇을

**로그 테이블**:
```sql
CREATE TABLE file_access_log (
  id SERIAL PRIMARY KEY,
  file_path VARCHAR(500) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'upload', 'download', 'delete'
  user_id VARCHAR(50) NOT NULL,
  user_ip VARCHAR(45),
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX(file_path),
  INDEX(accessed_at)
);
```

---

## 🔄 9. 파일 마이그레이션 (Phase 2)

### 9.1 클라우드 마이그레이션

**단계**:
1. 클라우드 스토리지 설정 (S3 버킷 생성)
2. 기존 파일 업로드
   ```bash
   aws s3 sync /uploads/ s3://bucket-name/uploads/
   ```
3. 애플리케이션 코드 수정 (S3 SDK 사용)
4. DB의 file_path 업데이트
5. 로컬 파일 백업 및 삭제

**다운타임 최소화**:
- 읽기: S3 우선, 없으면 로컬
- 쓰기: S3와 로컬 동시 저장
- 전환 완료 후 로컬 삭제

---

## 📋 10. 체크리스트

### 개발 시작 전
- [ ] 파일 저장 디렉토리 생성 (`/uploads/`)
- [ ] 디렉토리 권한 설정 (750)
- [ ] 파일 업로드 API 개발
- [ ] 파일 다운로드 API 개발
- [ ] 파일 삭제 로직 개발
- [ ] MIME Type 검증 라이브러리 설치

### 배포 전
- [ ] 백업 스크립트 작성
- [ ] cron 등록
- [ ] 용량 모니터링 대시보드 구축
- [ ] 파일 접근 제어 테스트
- [ ] Path Traversal 공격 테스트

### 운영 중
- [ ] 일일 백업 확인
- [ ] 주간 용량 리포트
- [ ] 월간 고아 파일 정리
- [ ] 분기별 보안 점검

---

**문서 버전**: 1.0
**최종 수정일**: 2025-11-14
**작성자**: Claude (System Architect)
**검토자**: (검토 필요)
**다음 검토 예정일**: Sprint 1 착수 전

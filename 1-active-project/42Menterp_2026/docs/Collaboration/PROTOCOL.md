# 2-Agent 협업 프로토콜 (Collaboration Protocol) - SLEEP MODE (PROXY)

**작성일:** 2026-01-14
**모드:** **AUTONOMOUS PROXY LOOP**
**변경사항:** 사용자가 부재중이므로, `agent_b_watcher.js` 스크립트가 Agent B의 역할을 대행합니다.

---

## 1. 역할 정의 (Roles)

| Agent | 위치 | 역할 (Responsibilities) | 동작 방식 |
|-------|------|-------------------------|-----------|
| **Agent A** | Terminal 1 | **Dev** (Claude) | Roadmap 구현 -> `HANDOVER` 업데이트 -> 대기 -> 진행 |
| **Agent B** | Terminal 2 | **Proxy** (Script) | `agent_b_watcher.js` 실행.<br>`[REVIEW_READY]` 감지 시 **Git Commit** 후 상태 변경. |

---

## 2. 통신 프로세스

1. **A 구현 완료:** `STATUS: [REVIEW_READY]` 설정.
2. **B (Script) 감지:**
   - `git add . && git commit -m "Snapshot"` 실행 (이력 보존).
   - `docs/Reviews/Auto_Review_Log.md` 기록.
   - `STATUS: [REVIEW_DONE]` 으로 변경.
3. **A 재개:** 다음 Phase 진행.

---

## 3. 실행 명령 (Final Commands)

### Terminal 1 (Agent A - Claude):
```bash
# Claude에게 이 프롬프트를 입력하세요:
@docs/Collaboration/PROTOCOL.md @docs/Collaboration/HANDOVER.md 
지금부터 "Sleep Mode"로 IMPLEMENTATION_ROADMAP-Phase 1을 시작해.
1. 구현 후 HANDOVER를 [REVIEW_READY]로 변경.
2. [REVIEW_DONE]이 될때까지 Loop 대기.
3. 확인되면 다음 Phase 진행.
[ALL_COMPLETED]가 될 때까지 멈추지 마.
```

### Terminal 2 (Agent B - Proxy):
```bash
# 이 명령어를 실행해두고 주무세요:
node scripts/agent_b_watcher.js
```

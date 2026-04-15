# shorts-spreader

여러 클라이언트에 유튜브 쇼츠를 퍼뜨리는 실험형 MVP입니다. 현재 저장소에는 **Next.js 앱 + 커스텀 Node/WebSocket 서버 + Chrome MV3 확장 프로그램**이 함께 들어 있으며, 로컬 부트스트랩과 실시간 모니터링 흐름까지는 구현되어 있습니다.

## 현재 구현 상태

한 줄 요약: **실시간 런타임과 대시보드 모니터링은 동작하지만, 확장 프로그램의 실제 살포/페이지 변형 동작과 배포 패키징은 아직 MVP 이전 단계입니다.**

### 구현됨

- **앱/서버 진입점**
  - `server.js`에서 Next.js와 `ws` WebSocket 서버를 함께 띄웁니다.
  - `src/app/page.jsx`는 `/extension.zip` 다운로드와 `/dashboard` 진입 링크를 노출합니다.
  - `src/app/dashboard/page.jsx`는 `/api/stats` 스냅샷으로 부트스트랩한 뒤 WebSocket 이벤트를 이어 붙여 대시보드를 갱신합니다.

- **실시간 런타임과 상태 모델**
  - `src/lib/state.js`에 인메모리 상태, spread log, 사용자별 카운터, leaderboard 집계가 구현되어 있습니다.
  - `src/lib/protocol.js`는 `register_client`, `register_dashboard`, `set_active_tab`, `spread`, `hit_confirm` 등 inbound/outbound 메시지 스키마를 검증합니다.
  - `src/lib/server-runtime.js`는 클라이언트 등록, active tab 갱신, spread 대상 선정, hit 처리, stats/event broadcast, heartbeat를 담당합니다.

- **HTTP API와 대시보드 UI 셸**
  - `src/app/api/stats/route.js`, `src/app/api/logs/route.js`, `src/app/api/leaderboard/route.js`가 인메모리 상태 기반 조회 API를 제공합니다.
  - `src/components/StatCards.jsx`, `LiveFeed.jsx`, `Leaderboard.jsx`, `NetworkGraph.jsx`가 통계/피드/리더보드/그래프 화면을 구성합니다.
  - `src/hooks/useWebSocket.js`, `src/lib/dashboard-state.js`에 스냅샷 + 실시간 이벤트 병합 로직이 구현되어 있습니다.

- **Chrome MV3 확장 프로그램 기본 골격**
  - `extension/manifest.json`에 background service worker, popup, content script, 권한 구성이 들어 있습니다.
  - `extension/background.js`, `extension/background-core.js`는 클라이언트 ID/닉네임 관리, active tab 스냅샷 전송, WebSocket 재연결, popup 상태 동기화를 처리합니다.
  - `extension/popup.js`, `extension/popup-state.js`는 연결 상태와 개인 카운터를 보여주는 popup UI를 제공합니다.
  - `extension/content.js`는 현재 탭의 eligibility 판별과 active tab 스냅샷 보고를 수행합니다.

- **테스트/도구 체계**
  - `package.json` 기준으로 `build`, `lint`, `test:unit`, `test:protocol`, `test:e2e`, `package` 스크립트가 정의되어 있습니다.
  - `tests/unit/*`, `tests/protocol/*`, `tests/e2e/bootstrap.spec.js`로 런타임/프로토콜/확장 상태/기본 자산 존재 여부를 검증합니다.

### 진행 중이거나 부분 구현 상태

- **대시보드는 운영 모니터링 셸에 가깝습니다.**
  - 실시간 수치와 이벤트는 반영되지만, `NetworkGraph.jsx`는 정교한 네트워크 모델이라기보다 leaderboard/log 기반 시각화 셸에 가깝습니다.

- **확장 프로그램은 연결/상태 보고 쪽이 먼저 구현되어 있습니다.**
  - background/popup/content 간 기본 메시징과 WebSocket 연결은 있으나, 실제 사용자 액션으로 `spread`를 발생시키는 UI/플로우는 저장소에서 확인되지 않습니다.

- **로컬 개발 기준 설정이 하드코딩되어 있습니다.**
  - `extension/shared.js`는 기본 WebSocket 주소를 `ws://localhost:3000`, 대시보드 주소를 `http://localhost:3000/dashboard`로 고정하고 있습니다.

### 아직 안 된 부분

- **실제 hit 전달 효과는 미구현입니다.**
  - `extension/content.js`에서 `deliver_hit` 수신 시 현재는 콘솔 로그만 남기고 `{ delivered: true }`를 응답합니다.
  - `src/lib/state.js`는 성공적인 `deliveryMode`를 `replace`, `overlay`로 가정하지만, 실제 DOM 치환/오버레이 동작은 아직 없습니다.

- **확장 패키징은 placeholder입니다.**
  - `scripts/package-extension.js`는 실제 번들을 만들지 않고 placeholder 텍스트를 `public/extension.zip`에 기록합니다.

- **규칙/정책 기반 확장 기능은 비어 있습니다.**
  - `extension/rules.json`은 현재 `[]`입니다.

- **영속성과 운영 기능이 없습니다.**
  - 상태는 모두 메모리 기반이며 DB, 큐, 외부 서비스 연동, 인증/권한, 운영용 배포 구성은 저장소에서 확인되지 않았습니다.

- **E2E는 아직 얕습니다.**
  - `tests/e2e/bootstrap.spec.js`는 랜딩 페이지/확장에 필요한 자산 존재 여부 중심이고, 실제 spread → hit_confirm 시나리오까지 검증하지는 않습니다.

## 로컬 개발

```bash
npm install
npm run dev
```

자주 쓰는 명령:

- `npm run build`
- `npm run test:unit`
- `npm run test:protocol`
- `npm run test:e2e`
- `npm run package`

# 카페 학습 타이쿤 · v1.0.0

초등학교 4학년을 위한 독립 TypeScript 웹게임. 문제를 맞히면 음식이 생기고, 직원이 서빙한 매출로 카페를 키운다. 기존 Voca-Monster나 외부 서비스에 실행 의존이 없다. 폰트·아트·음악·문제팩은 프로젝트에서 제공한다.

## 실행과 빌드

프로젝트 폴더에서 `node scripts/dev.mjs` 실행 후 http://127.0.0.1:4175/ 접속. 종료는 Ctrl+C. 소스 편집 후 `node scripts/build.mjs`로 재빌드한다. Node.js24 이상을 권장한다. npm이 있으면 dev/build/test/typecheck 스크립트도 사용할 수 있다. 별도 패키지 설치 없이 vendor TypeScript 컴파일러를 사용한다.

## 교실에서 시작하기

1. 수업 게임을 고르고 학습 내용과 10/15/20/30/40/60분 중 시간을 확인한다.
2. 첫 안내를 확인한 뒤 카페 문을 연다. 이 시점부터 시간이 흐른다.
3. 음식이 부족하면 음식 만들기를 눌러 문제를 푼다. 직원은 자동으로 서빙한다.
4. 돈으로 카페·창고·메뉴·직원을 키운다. 아이템은 효과와 가격을 보고 선택한다.
5. 시간이 끝나면 오늘의 카페 운영 결과를 확인한다. 일찍 나가려면 나가기에서 확인한다.

수업 게임은 모두 작은 카페에서 새로 시작하며 카페/오답 기억을 다음 경기로 가져가지 않는다. 임의 일시정지는 없다. 설정·도움말·문제·관리 화면을 열거나 탭을 바꿔도 시간은 흐른다. 브라우저 새로고침은 나가기 확인을 표시하지만 경기 복원은 지원하지 않는다.

## 내 카페 키우기

새 카페 시작/이어하기/새로 시작을 구분한다. 15분씩 영업하고 카페를 같은 브라우저에 저장한다. 구매 후, 30초 간격, 종료·페이지 이탈 때 자동 저장한다. 새로 시작은 확인 후 기존 저장을 백업한다. 영업 마치기 또는 나가기로 정산을 열고 저장 완료 표시를 확인한다. 저장 실패 시 재저장하기 전 다음 영업과 홈 이동을 막아 현재 기록을 보호한다.

이어하기는 저장한 카페 단계·돈·메뉴·직원·창고를 새 영업으로 복원한다. 현재 손님·재고·문제 화면·활성 아이템 효과는 저장하지 않는 기존 정책을 유지한다. 문제팩을 바꿔도 같은 카페를 이어서 키울 수 있다.

## 학습과 도움말

기본 팩은 실제 기존 mathdata의 4학년 2학기 분수의 덧셈 82문항과 원본 쌍둥이 82문항이다. 일반 문제 3개 뒤 오답 복습을 섞으며 정답 생산 보상은 같다. 육성 오답 기억은 문제팩별로 카페 저장과 분리한다. 다른 팩은 공통 JSON을 추가하고 assets/questions/registry.json에 등록한다. 하나뿐일 때는 단순 학습 내용으로, 여러 개일 때는 선택 목록으로 표시한다.

게임 방법에서 다섯 핵심 규칙과 첫 안내 다시 보기를 제공한다. 첫 안내 완료/건너뛰기 preference는 두 모드가 공유한다. 설정에서 음악·효과음의 켜기와 음량을 조절한다. 저장 키: cafe-learning-tycoon.growth.v1, cafe-learning-tycoon.learning.v1/<packId>, cafe-learning-tycoon.audio.v1, cafe-learning-tycoon.tutorial.v1. 외부 전송은 없다.

## 검증과 개발 분석

- `node vendor/typescript/bin/tsc --noEmit`
- `node scripts/build.mjs`
- `node --test tests/*.test.mjs`
- `node scripts/phase5-class-regression.mjs` (승인된 CLASS 경제 비교)

기존 144개와 RC 회귀 3개를 포함한 147개 테스트. 결과 화면 개발 분석과 JSON 내보내기는 `?dev=1`에서만 제공한다. 일반 학생 화면에는 개발 옵션이나 분석 JSON을 표시하지 않는다. QA fixture는 명시적인 개발 URL로만 사용한다. phase8-fixture.html, phase8-tablet.html(640px), phase8-phone.html(375px)은 별도 QA 저장 namespace를 사용한다. QA 자금·시간 조작 수치는 학생 플레이 결과와 구분한다.

## 주요 파일과 보고서

- game/config/modeBalance: 기존 경제·보상·손님·직원 규칙.
- LearningSession/QuestionProvider/MathBankAdapter: 콘텐츠와 학습 기억.
- uxState/finalUx/modeUi/ux.css: 시작 안내, 실시간 시계, 도움말·학생 UX.
- PHASE8_REPORT.md: v1.0 최종 결과와 화면 검증.
- PHASE7_REPORT.md: 원본 문제은행 조사·출처·검증.
- PHASE6_REPORT.md, AUDIO_LICENSES.md, TYPOGRAPHY_REPORT.md: 피드백과 에셋 출처.

공개 게임은 GitHub Pages에서 제공합니다. 카페 경제, 메뉴18종, 일반 손님12종/특수5종, 전략 아이템5종, 좌석·운반·서빙, 승인된 아트·폰트·오디오를 유지한다.

## 공개 배포와 출시 검증

공식 게임: [https://limjiseung62-lgtm.github.io/Cafe-Learning-Tycoon/](https://limjiseung62-lgtm.github.io/Cafe-Learning-Tycoon/)

전체 147개 테스트·TypeScript·production build·164문항·저장 검증 PASS. 최초 공개 게임 파일 128개가 HTTP 200이며 검증 패키지와 SHA-256이 일치했습니다. 문서를 포함한 최종 패키지도 별도로 검증합니다. 최초 공개 배포 workflow #1은 성공했습니다. 최종 release 상태는 PHASE10_REPORT.md에 기록합니다.

개발 소스와 RC 기준 커밋은 로컬 독립 저장소의 release/v1.0.0 브랜치에 보존합니다. 공개 원격 저장소는 QA·개인 경로를 제외한 정적 게임 배포 패키지입니다. 두 저장소의 커밋을 서로 혼동하지 않습니다.

재배포: 전체 검증 후 node scripts/release-stage.mjs로 release/v1.0.0/site를 준비합니다. 공개 artifact 저장소 main/root가 Pages 배포 대상입니다. 게임은 서버·로그인·Firebase 없이 동작합니다. 게임 저장은 브라우저에 두지만 호스팅 제공자의 접속 로그 정책은 별개입니다.

## 라이선스와 출시 자료

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [AUDIO_LICENSES.md](AUDIO_LICENSES.md), [폰트 크레딧](assets/fonts/README.md)을 확인하세요. 카페 아트는 프로젝트 생성물이며 외부 CC0 이미지라고 표기하지 않습니다. 전체 프로젝트에 새 오픈소스 라이선스를 임의로 부여하지 않았습니다.

[출시 안내](RELEASE_NOTES_v1.0.0.md) · [변경 기록](CHANGELOG.md) · [알려진 사항](KNOWN_ISSUES_v1.0.0.md) · [블로그 패키지](release/v1.0.0/README.md)


# Phase 10 — v1.0.0 Production Release

출시일: 2026-10-07. 공식 URL: [카페 학습 타이쿤](https://limjiseung62-lgtm.github.io/Cafe-Learning-Tycoon/). 공개 저장소: [Cafe-Learning-Tycoon](https://github.com/limjiseung62-lgtm/Cafe-Learning-Tycoon).

## Release

기존 카페 프로젝트에는 Git과 배포 설정이 없었습니다. 독립 로컬 Git 저장소를 만들고 정상 RC 기준을 ae2ae4d547c35b1595860784e4cb9a71788a9d4f로 보존했습니다. release/v1.0.0 브랜치의 전체 소스·RC 보고서는 보관하고, 공개 원격 저장소에는 개인 경로·QA·제작용 메타데이터를 제외한 정적 게임 패키지를 올렸습니다. 두 저장소의 커밋은 서로 다릅니다. 최종 커밋은 각각 git rev-parse v1.0.0^{}로 확인할 수 있습니다. 기존 브랜치·태그·사용자 작업을 덮어쓰지 않았습니다.

GitHub Pages의 main/root, HTTPS를 사용합니다. 기존 계정에 사용자가 직접 로그인했고, 저장된 Git 인증을 사용했습니다. 새 계정·유료 결제·billing·서버·Firebase 자원을 만들지 않았습니다. 최초 Pages workflow #1은 43초에 성공했습니다. 이후 문서 배포의 성공도 공개 파일 조회와 최종 smoke로 확인합니다. package 버전은 1.0.0이며 기존 private 설정을 유지했습니다. 최종 태그는 공개 smoke 뒤 생성합니다.

## Verification

- 기존 테스트 144개 + RC 회귀 3개 = 147 PASS, fail/skip/delete 0. phase10-final-tests.txt.
- TypeScript noEmit PASS, production build PASS. vendored Windows x64 compiler/Node24.19.0. 새 OS 설치 검증으로 표현하지 않습니다.
- asset/QuestionPack/save/license/private-path gate PASS. reports/phase10-release-gate.json.
- 전체 164개 정답·선택지·ID 검증 PASS: 82 일반 + 82 쌍둥이.
- 원본 src/tests/assets는 RC 기준 커밋과 변경 0. 경제·정답 생산·효과·아트 불변.
- 40 seed 경제: 90문제 Lv.4 52.5% / Lv.5 47.5%; 120문제 Lv.5 77.5% / Lv.6 22.5%; 150문제 Lv.6 100%. 5창고분 solo 67.5% 관찰 유지.
- 최초 공개 패키지 128개 HTTP200, SHA-256 전부 일치. QA 파일·private-path 아트 prompts 공개404. reports/phase10-production-http.json. 최종 문서 포함 패키지는 final HTTP 기록을 확인하세요.
- desktop 일반 공개 게임 PASS. Jua/Nanum document.fonts.check와 렌더링 PASS.
- 640px/375px 공개 URL 렌더링 PASS. 브라우저 viewport override가 1280px로 남아 적용되지 않아, 크기를 제한한 iframe에서 같은 공개 URL을 로드해 실제 내부 폭 640/375를 확인했습니다. 게임 소스·DOM을 바꾸지 않았습니다. 실물 기기 테스트가 아닙니다.
- 분수·대분수·빈칸·생활 문장을 실제 UI에서 풀고 정답·전체 메뉴 생산을 확인했습니다.
- 오답 generated-012 → 일반3개 → 원본 쌍둥이(2와5/7 +4/7) 재등장·정답 PASS.
- 육성 오답 → 일반1개 → 정산/저장/reload → 일반2개 → 쌍둥이 재등장·정답 PASS.
- 수업 첫 smoke:31문제/30정답,2단계,매출5,670원,손님30명,음식45개. 나가기 확인으로 실제 elapsed 시점에 결과를 생성했습니다. 자연 10분 종료는 RC에서 별도 확인했으며 이 회차를 자연 종료로 표현하지 않습니다.
- 공개 직원 고용·강화, 트레이·서빙·식사·매출·카페 확장 PASS. 고레벨 캡처는 실제 플레이로 4단계까지 도달했습니다. 자동 UI 풀이 속도를 학생의 정상 속도로 일반화하지 않습니다.
- 육성 신규/정산/저장/reload/이어하기 PASS. 1단계1,040원·6문제 저장을 수업2단계 플레이/종료 후에도 그대로 복원했습니다. 다음 영업1문제 추가 누적7, 이후 오답·복습 흐름을 포함해 누적12 기록.
- 사운드 사용자 제스처·소리 준비됨·BGM/SFX 파일200·console 오류0·music/effects off 저장 후reload복원·재활성화 PASS. 청음·물리적 스피커 테스트는 수행하지 않았습니다.
- 공개 desktop/growth/tablet/phone에서 관찰된 console warning/error 0. 에셋·폰트·오디오·저장 중대 오류0. 브라우저 자동 favicon404는 기존 minor 범위로 추적합니다.
- 최종 문서 배포 뒤 수업/육성 경로를 다시 실행한 기록은 reports/phase10-final-smoke.json에 보관합니다.

## Blog / Docs

추천 제목: 카페를 운영하며 분수를 연습하는 초등 학습게임.

원고·메타데이터·공개 캡처·대표 이미지 추천은 release/v1.0.0/에서 찾습니다. 6개 기본 장면과 추가 정산/작은 화면 캡처를 제공합니다. 공개 URL과 실제 검증 수치를 사용했으며 블로그 외부 게시 자체는 수행하지 않았습니다. 내부 개발 용어 대신 수업 게임·내 카페 키우기·문제팩·오답 복습으로 설명했습니다.

README.md, RELEASE_NOTES_v1.0.0.md, CHANGELOG.md, KNOWN_ISSUES_v1.0.0.md, THIRD_PARTY_NOTICES.md를 정리했습니다. 폰트 OFL 전문·Kenney CC0 전문·OatCog 출처는 배포에도 동봉합니다. 생성 아트를 외부 CC0 또는 프로젝트 전체 오픈소스 라이선스로 임의 분류하지 않았습니다.

## Known Issues / Limits

현재 문제팩 범위, Last Order 기본BGM+cue, 5창고분67.5% 후속 관찰, 브라우저 저장 범위, stale-write 안내, 실제 기기/청음 미검증, Windows 빌드 및 원본 출처 테스트 경로, favicon404를 추적합니다. 미해결 BLOCKER/CRITICAL/MAJOR 0. 플랫폼의 Node20 action 강제Node24 및 Ubuntu migration 안내는 게임 오류가 아닙니다.

검증용 고레벨 저장 주입 도구를 production 저장소에 임시 추가하는 요청은 자동 승인 검토가 공개 패키지 범위 밖의 외부 변경이라는 이유로 거절했습니다. 해당 도구는 생성·배포하지 않았고 실제 플레이 캡처로 대체했습니다. credential·토큰을 출력/문서화하지 않았고 사용자 인증을 우회하지 않았습니다.

v1.1 개발을 시작하지 않습니다.

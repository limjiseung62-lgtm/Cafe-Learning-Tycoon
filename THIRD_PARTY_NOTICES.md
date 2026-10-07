# RC 에셋 출처 확인 · 2026-10-07

| 구분 | 실제 사용 파일 | 출처/조건 | 확인 |
|---|---|---|---|
| BGM | assets/audio/bgm/bgm_cafe.wav | [OatCog Coffee House Bump](https://opengameart.org/content/coffee-house-bump), CC0 | 원작 게시의 저작자·CC0 표시, 로컬 RIFF, registry 및 production 파일 대응 |
| SFX | assets/audio/sfx/12개 OGG →25이벤트 | [Kenney Interface Sounds1.0](https://kenney.nl/assets/interface-sounds), CC0 | Kenney-CC0.txt 동봉, OggS 파일 및25이벤트 경로 확인 |
| Display | Jua-Regular.woff2 | [Jua OFL1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/jua/OFL.txt) | Jua-OFL.txt와 저작권 표시 동봉, 원본 TTF 이름 Jua/Regular, 변환 검증 기록 유지 |
| Information | NanumGothic-Regular/Bold.woff2 | [Nanum Gothic OFL1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/OFL.txt) | NanumGothic-OFL.txt와 NHN/Reserved Font Name 표시 동봉, TTF Regular/Bold 이름 및 WOFF2 확인 |
| 카페/메뉴/손님/직원 PNG | assets/art 아래 승인된 원본 | 프로젝트에서 image_gen으로 생성한 아트, 외부 CC0 에셋으로 분류하지 않음 | VISUAL_REPLACEMENT_REPORT 및 poses/캐릭터 제작 기록, prompts.json과 채택 파일 registry 대응 |
| 문제 | fraction-addition-g4-s2.json | 사용자가 제공한 기존 mathdata 재사용 산출물 | Phase7 source audit·원본 해시·전체164개 수학 검증 |
| Compiler | vendor TypeScript / Windows x64 runtime | 동봉 LICENSE | clean copy에서 동일 도구로 build/typecheck, runtime 배포에는 vendor 폴더를 복사하지 않음 |

폰트의 기존 WOFF2 압축·원본 글리프/이름 보존 정책 및 source TTF/OFL 전문을 유지했다. 새 폰트나 외부 이미지·오디오를 가져오지 않았다. Last Order의 미준비 파일은 사용 파일로 잘못 기재하지 않으며 요청하지 않는다. 근거는 AUDIO_LICENSES.md, assets/fonts/README.md, conversion-validation.json, phase9-production-resources.json에 있다. 이 검증은 문서·저작권 표시·레지스트리·실파일 대응 확인이며 생성 아트의 외부 CC0 라이선스를 새로 주장하지 않는다.

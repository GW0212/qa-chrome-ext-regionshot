# QA Automation — RegionShot Chrome Extension

> **Playwright + TypeScript** 기반 크롬 확장 프로그램 자동화 테스트  
> 직접 개발한 **RegionShot** 확장 프로그램의 소스 코드를 분석하여  
> 실제 selector 와 동작 흐름에 맞는 정밀 테스트를 구현했습니다.

[![Extension Tests](https://github.com/GW0212/qa-chrome-ext-regionshot/actions/workflows/playwright.yml/badge.svg)](https://github.com/GW0212/qa-chrome-ext-regionshot/actions/workflows/playwright.yml)

---

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **대상** | RegionShot v7.1.2 — 직접 개발한 단축키 캡쳐 크롬 확장 프로그램 |
| **Framework** | Playwright 1.44 + TypeScript 5.4 |
| **테스트 유형** | 팝업 UI · 단축키 설정 · 캡쳐 동작 |
| **핵심 기술** | `launchPersistentContext` + Service Worker에서 extensionId 자동 추출 |
| **CI/CD** | GitHub Actions + xvfb (headful 필수 환경 대응) |
| **브라우저** | Chrome (확장은 Chromium only) |

---

## 🎯 RegionShot 이란?

단축키를 지정하고 캡쳐 버튼 또는 단축키로 화면을 정지시킨 후  
원하는 영역을 드래그하여 캡쳐하는 크롬 확장 프로그램 (MV3).  

- **팝업** : 캡쳐 시작, 단축키 지정, 7개 언어 UI
- **content script** : 오버레이 삽입 → 영역 드래그 → canvas 캡쳐 → 미리보기 모달
- **background** : Service Worker (MV3)

---

## 🗂️ 테스트 케이스 목록

### 팝업 UI (10 cases)

| ID | 시나리오 |
|----|----------|
| TC-P01 | 팝업이 JS 에러 없이 열린다 |
| TC-P02 | 헤더 타이틀이 "RegionShot" 이다 |
| TC-P03 | 서브타이틀이 "빠른 영역 캡쳐" 텍스트를 포함한다 |
| TC-P04 | "영역 캡쳐 시작" 버튼(#captureBtn)이 표시된다 |
| TC-P05 | "단축키 지정" 버튼(#setShortcutBtn)이 표시된다 |
| TC-P06 | 단축키 표시 영역(#shortcutDisplay)이 기본값을 보여준다 |
| TC-P07 | 언어 선택(#langSelect)에 7개 언어가 존재한다 |
| TC-P08 | 언어를 English로 바꾸면 UI 텍스트가 영문으로 변경된다 |
| TC-P09 | 언어를 日本語로 바꾸면 서브타이틀이 일본어로 표시된다 |
| TC-P10 | 팝업 body 너비가 300px 이상이다 |

### 단축키 설정 (7 cases)

| ID | 시나리오 |
|----|----------|
| TC-S01 | #setShortcutBtn 클릭 시 #recordHint 가 나타난다 |
| TC-S02 | #recordHint 는 초기 상태에서 숨겨져 있다 |
| TC-S03 | 단축키 지정 모드에서 ESC 누르면 #recordHint 가 사라진다 |
| TC-S04 | ESC 취소 후 #shortcutDisplay 가 기존 단축키를 유지한다 |
| TC-S05 | 키 입력 후 #shortcutDisplay 가 새 단축키로 업데이트된다 |
| TC-S06 | chrome.storage API 가 팝업에서 접근 가능하다 |
| TC-S07 | chrome.tabs API 가 팝업에서 접근 가능하다 |

### 캡쳐 동작 (9 cases)

| ID | 시나리오 |
|----|----------|
| TC-C01 | content script 가 일반 페이지에 PING 응답을 반환한다 |
| TC-C02 | #captureBtn 클릭 시 JS 에러가 발생하지 않는다 |
| TC-C03 | 캡쳐 시작 후 일반 페이지에 오버레이(div)가 삽입된다 |
| TC-C04 | 오버레이 삽입 후 ESC 키로 취소하면 오버레이가 제거된다 |
| TC-C05 | 오버레이 상태에서 드래그 시뮬레이션이 JS 에러 없이 동작한다 |
| TC-C06 | 드래그 후 미리보기 모달이 나타난다 |
| TC-C07 | 미리보기 모달에 복사 기능 관련 텍스트가 포함된다 |
| TC-C08 | 미리보기 모달에 닫기 버튼이 존재한다 |
| TC-C09 | extensionId 가 32자 소문자 형식이다 |

**총 26 케이스**

---

## ⚙️ 설치 및 실행

```bash
npm install
npx playwright install chrome

npm test                  # 전체
npm run test:popup        # 팝업 UI
npm run test:shortcut     # 단축키 설정
npm run test:capture      # 캡쳐 동작
npm run report            # HTML 리포트 열기
```

> ⚠️ **headless 모드 불가** — 크롬 확장은 반드시 headful 모드로 실행됩니다.

---

## 🏗️ 프로젝트 구조

```
qa-chrome-ext-regionshot/
├── .github/
│   └── workflows/
│       └── playwright.yml          # CI/CD + xvfb 가상 디스플레이
├── extension/                      # RegionShot 소스 (MV3)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── background.js
│   └── icons/
├── tests/
│   ├── fixtures/
│   │   └── extensionFixture.ts     # 확장 로드 + extensionId 추출
│   ├── popup.spec.ts               # TC-P01 ~ TC-P10
│   ├── shortcut.spec.ts            # TC-S01 ~ TC-S07
│   └── capture.spec.ts             # TC-C01 ~ TC-C09
├── playwright.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📊 테스트 리포트

→ **[Dashboard / Test Report](https://gw0212.github.io/qa-chrome-ext-regionshot/)**

---

## 🔗 관련 링크

- [RegionShot — Chrome Web Store](https://chromewebstore.google.com/detail/cmdljodidfhifgepennkihialidddipa)
- [Playwright — Testing Chrome Extensions](https://playwright.dev/docs/chrome-extensions)

# 수학 시뮬레이션 갤러리

학생들이 제출한 HTML 시뮬레이션과 PDF 보고서를 전시하는 정적 갤러리 사이트입니다.

## 빠른 시작

```bash
cd simul
npm start
```

브라우저에서 http://localhost:3000 을 열면 갤러리를 볼 수 있습니다.

## 학생 파일 추가 방법

1. `submissions/` 폴더에 학생 파일을 넣습니다.
2. `npm run generate` 를 실행해 `data/students.json` 을 갱신합니다.
3. 브라우저를 새로고침합니다.

### 파일명 규칙

```
{학번}_{이름}_{설명}.{확장자}
```

| 종류 | 예시 |
|------|------|
| 시뮬레이션 (HTML) | `30106_김지한_김지한1.html` |
| 보고서 (PDF) | `30106_김지한_수학 시뮬레이터 제작 보고서 30106 김지한.pdf` |

- PDF 파일명은 학생마다 조금씩 달라도 됩니다. `{학번}_{이름}_` 으로 시작하고 `.pdf` 확장자이면 자동 인식합니다.
- 학생당 HTML 2개, PDF 1개를 권장합니다.

### 반(클래스) 필터

학번 앞 3자리를 반 번호로 사용합니다. (예: `30106` → `301반`)

## 배포 (Vercel)

이 프로젝트는 [GitHub](https://github.com/Fairyswim1/simul) + Vercel 연동으로 배포합니다.

1. [Vercel](https://vercel.com)에 로그인 → **Add New Project**
2. `Fairyswim1/simul` 저장소 Import
3. 설정은 기본값 그대로 (Build Command: `npm run build`, Output: `.`)
4. Deploy 클릭

학생 파일을 추가한 뒤 GitHub에 push하면 Vercel이 자동으로 재배포합니다.
빌드 시 `npm run build`가 실행되어 `data/students.json`이 자동 갱신됩니다.

## 좋아요 · 댓글 (Firebase Realtime Database)

각 시뮬레이션 카드에 좋아요와 댓글 기능이 있습니다. 댓글은 **실명**으로만 작성할 수 있습니다.

### 설정 방법

1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 **simul-dbcbe**
2. 왼쪽 **빌드(Build)** → **Realtime Database** 클릭
3. 데이터베이스가 없으면 **데이터베이스 만들기** → 지역 선택 → **게시**
4. 상단 **규칙(Rules)** 탭 → `database.rules.json` 내용 붙여넣기 → **게시**

```json
{
  "rules": {
    "interactions": {
      ".read": true,
      ".write": true
    }
  }
}
```

5. `js/firebase-config.js`에 `databaseURL`이 포함되어 있는지 확인

Firebase 설정 전에도 UI는 보이지만, 클릭 시 설정 안내 메시지가 표시됩니다.

## 폴더 구조

```
simul/
├── submissions/     ← 학생 제출 파일 (HTML, PDF)
├── data/
│   └── students.json  ← 자동 생성 (수동 편집 불필요)
├── scripts/
│   └── generate-data.mjs
├── css/
├── js/
│   ├── firebase-config.js   ← Firebase 설정
│   └── interactions.js      ← 좋아요/댓글
├── database.rules.json
└── index.html
```

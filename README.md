# 🌙 달토끼 AI 연구소 — Netlify 전용 v0.3

이 버전은 **Notion을 CMS(관리자 페이지)** 로 사용하고, **Netlify Functions가 Notion API를 서버에서 읽어** 웹사이트에 보여주는 구조입니다.

## 완성된 흐름

Notion에서 글 수정  
→ Netlify Function이 Notion API로 최신 데이터 조회  
→ 달토끼 홈페이지 카드 자동 갱신  
→ 카드 클릭  
→ Notion 본문을 달토끼 상세페이지 디자인으로 표시

`상태 = 공개`인 콘텐츠만 웹사이트에 표시됩니다.

---

## 가장 중요한 것: 이전 ZIP과 다릅니다

이 버전은 단순 정적 HTML이 아니라 **Netlify Functions**를 사용합니다.

- `public/` : 방문자가 보는 웹사이트
- `netlify/functions/` : Notion을 읽는 서버 코드
- `netlify/lib/` : Notion 공통 처리 코드
- `netlify.toml` : Netlify 설정

Notion 토큰은 브라우저에 넣지 않습니다.

---

# 초보자용 설치 순서

## 1) Notion에서 Integration(연결) 만들기

Notion Developer/Creator Dashboard에서 **Internal Connection**을 하나 만듭니다.

추천 이름:
`달토끼 웹사이트`

필요 권한:
- Read content

생성 후 **Integration Token**을 복사해 둡니다.

> 토큰은 비밀번호와 같습니다. 누구에게도 공개하지 말고 GitHub에도 올리지 마세요.

## 2) 달토끼 CMS에 연결 권한 주기

Notion에서  
`🌙 달토끼 AI 연구소 CMS` 페이지 열기  
→ 오른쪽 위 `•••`  
→ `Connections` 또는 `Add connections`  
→ 방금 만든 `달토끼 웹사이트` 선택

부모 CMS 페이지에 연결하면 아래 DB와 콘텐츠 페이지를 읽을 수 있습니다.

## 3) Netlify에 환경변수 넣기

Netlify 프로젝트 설정에서 Environment variables로 이동해서 추가:

Key:
`NOTION_TOKEN`

Value:
아까 복사한 Notion Integration Token

이 프로젝트는 현재 달토끼 DB의 Data Source ID를 기본값으로 알고 있으므로 `NOTION_DATA_SOURCE_ID`는 생략해도 됩니다.

원하면 추가:
`NOTION_DATA_SOURCE_ID = a51af7b0-f4a2-4afc-950c-d4923b59ac08`

## 4) 배포

### 추천: GitHub → Netlify 연결
Functions가 있는 사이트는 이 방법이 가장 관리하기 쉽습니다.

1. 이 폴더 전체를 GitHub 저장소에 올립니다.
2. Netlify에서 `Add new project` → `Import an existing project`
3. GitHub 저장소 선택
4. `netlify.toml`이 있으므로 publish/functions 설정을 자동으로 읽습니다.
5. Deploy

### 수동 배포
Netlify CLI로도 Functions 포함 수동 배포가 가능합니다.

프로젝트 폴더에서:
`netlify deploy`

처음 한 번 사이트를 연결한 뒤:
`netlify deploy --prod`

## 5) 연결 테스트

배포된 주소 뒤에:

`/setup-check.html`

예:
`https://내사이트.netlify.app/setup-check.html`

초록색 **연결 정상**이 뜨면 완료입니다.

---

# 이후 사용법

## 새 콘텐츠
Notion의 `달토끼 콘텐츠 관리` DB에서 새 항목 생성.

최소 입력:
- 제목
- 종류
- 상태
- 한 줄 요약
- 슬러그
- 사용 AI

그 행을 클릭해서 열린 Notion 페이지에 본문을 자유롭게 작성합니다.

## 웹에 공개
`상태`를 `공개`로 바꿉니다.

홈페이지 카드가 자동 생성되고,
카드를 누르면 Notion 본문이 달토끼 상세페이지로 표시됩니다.

## 수정
Notion 본문을 그냥 수정합니다.

사이트는 Netlify CDN에서 약 60초 캐시하므로 보통 약 1분 안팎으로 새 내용이 보입니다.

---

# Notion 본문에서 현재 웹에 표시되는 것

- 일반 문단
- 제목 1~4
- 글머리 목록 / 번호 목록
- 인용
- 콜아웃
- 체크박스
- 토글
- 구분선
- 코드
- 이미지
- 동영상 링크/파일
- 오디오
- PDF/파일
- 북마크/임베드 링크
- 표
- 컬럼
- 하위 페이지 표시

일부 최신 Notion 전용 블록은 API에서 unsupported로 반환될 수 있으며, 이 경우 웹에서는 안내문만 표시합니다.

---

# 문제 해결

### `NOTION_TOKEN 환경변수가 설정되지 않았습니다`
Netlify Environment variables에 `NOTION_TOKEN`을 넣고 **새 Deploy**를 실행합니다.

### `Notion API 404`
대부분 Notion CMS 페이지를 Integration과 공유하지 않은 경우입니다.
`🌙 달토끼 AI 연구소 CMS` → `•••` → Connections에서 연결합니다.

### Notion 수정 후 바로 안 바뀜
정상입니다. 현재 캐시는 약 60초입니다.
1~2분 후 새로고침해 보세요.

### 이미지만 이전 것이 보임
Notion이 업로드 파일에 임시 signed URL을 사용하기 때문에 서버가 페이지를 다시 읽으면서 URL도 갱신합니다. 현재 캐시를 짧게 둔 이유입니다.

---

## 사이트 관리자가 기억할 문장 하나

**“웹사이트를 고치지 말고 Notion을 고친다.”**

🐰 ※ 정상적인 사용법은 다른 곳에서 찾아주세요.

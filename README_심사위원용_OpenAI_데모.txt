심사위원용 OpenAI 데모 패키지 사용 안내
=====================================

1) 목적
- 이 패키지는 석사학위논문 심사위원께 사전 공유할 수 있는 별도 데모 환경입니다.
- Google Sheet 저장 기능은 포함되어 있지 않습니다.
- OpenAI API를 서버 측에서 호출하므로 브라우저에 API 키가 노출되지 않습니다.

2) 포함 파일
- public/index.html : 심사위원용 안내 첫 화면
- public/demo-flow.html : 전체 실험 흐름 요약
- public/group1-demo.html : Group 1 (Control) 데모
- public/group2-demo.html : Group 2 (Context) 데모
- public/group3-demo.html : Group 3 (Advanced) 데모
- public/post-survey-demo.html : 사후 설문 구성 확인용
- public/finish-demo.html : 데모 종료 화면
- server.js : OpenAI API 호출용 간단한 Express 서버
- .env.example : 환경변수 예시
- package.json : 실행용 패키지 설정

3) 실행 방법
(1) Node.js 18 이상 설치
(2) 현재 폴더에서 아래 실행
    npm install
(3) .env.example 파일을 복사하여 .env 생성
    cp .env.example .env
(4) .env 파일에 OpenAI API Key 입력
    OPENAI_API_KEY=sk-...
(5) 서버 실행
    npm start
(6) 브라우저에서 접속
    http://localhost:3000

4) 데모 활용 팁
- 사전 공유용 링크를 만들려면 이 폴더를 Vercel, Render, Railway 등으로 배포할 수 있습니다.
- 심사 후에는 서버를 내리고 API 키를 교체(rotate)하는 것을 권장합니다.
- 필요하면 index.html에 비밀번호 입력창을 추가해 심사위원 전용으로 제한할 수 있습니다.

5) 주의사항
- OpenAI API 사용량에 따라 요금이 발생할 수 있습니다.
- 이미지 생성은 모델 정책과 혼잡도에 따라 속도 차이가 있을 수 있습니다.
- 본 패키지는 심사용 데모이므로 연구 원자료 수집 기능을 의도적으로 제외했습니다.


6) Vercel 배포용 구성
- public/ : 정적 페이지
- api/guide.js : OpenAI 텍스트 가이드 serverless function
- api/generate-image.js : OpenAI 이미지 생성 serverless function
- vercel.json : Vercel 설정 파일

Vercel에서 배포할 때는 프로젝트 환경변수에 아래를 등록하세요.
- OPENAI_API_KEY
- OPENAI_TEXT_MODEL (선택)
- OPENAI_IMAGE_MODEL (선택)

7) 비밀번호 페이지
- /password.html 에서 비밀번호 입력 후 접근합니다.
- 기본 비밀번호는 public/auth.js 의 REVIEW_DEMO_PASSWORD 값입니다.
- 실제 공유 전에는 이 값을 꼭 수정하는 것을 권장합니다.


8) 링크가 작동하지 않을 때
- ZIP을 풀고 public/index.html을 더블클릭하면 페이지 이동은 되도록 상대경로로 수정했습니다.
- 단, OpenAI 이미지 생성/AI 가이드 버튼은 반드시 서버 환경에서만 작동합니다.
- 로컬 테스트는 프로젝트 루트에서 아래 순서로 실행하세요.
  1. npm install
  2. .env.example을 .env로 복사
  3. .env에 OPENAI_API_KEY 입력
  4. npm start
  5. http://localhost:3000 접속

9) Vercel 배포 시
- 프로젝트 루트 전체를 업로드하세요. public 폴더만 올리면 API가 작동하지 않습니다.
- Vercel 환경변수에 OPENAI_API_KEY를 반드시 등록하세요.

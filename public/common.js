
async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  let data = {};
  try { data = await response.json(); } catch (e) {}
  if (!response.ok) throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
  return data;
}
function setLoading(button, isLoading, label) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.classList.add('opacity-80','cursor-wait');
    button.innerHTML = `<span class="loader mr-2"></span>${label || '처리 중...'}`;
  } else {
    button.disabled = false;
    button.classList.remove('opacity-80','cursor-wait');
    button.innerHTML = button.dataset.originalText || '실행';
  }
}
function updateImage(containerId, imageDataUrl) {
  const box = document.getElementById(containerId);
  if (!box) return;
  if (!imageDataUrl) {
    box.innerHTML = '<div class="text-slate-400 text-sm">생성된 이미지가 여기에 표시됩니다.</div>';
    return;
  }
  box.innerHTML = `<img src="${imageDataUrl}" alt="generated image">`;
}
function setText(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function buildTopNav(activePage) {
  return `
  <nav class="flex flex-wrap gap-2 mb-6">
    <a class="nav-pill ${activePage==='password'?'active':''}" href="password.html"><i class="fa-solid fa-lock"></i>비밀번호</a>
    <a class="nav-pill ${activePage==='index'?'active':''}" href="index.html"><i class="fa-solid fa-circle-info"></i>안내</a>
    <a class="nav-pill ${activePage==='pre'?'active':''}" href="pre-survey-demo.html"><i class="fa-solid fa-clipboard-question"></i>사전 설문</a>
    <a class="nav-pill ${activePage==='flow'?'active':''}" href="demo-flow.html"><i class="fa-solid fa-list-ol"></i>실험 흐름</a>
    <a class="nav-pill ${activePage==='g1'?'active':''}" href="group1-demo.html"><i class="fa-solid fa-pen"></i>Control</a>
    <a class="nav-pill ${activePage==='g2'?'active':''}" href="group2-demo.html"><i class="fa-solid fa-cubes"></i>Context</a>
    <a class="nav-pill ${activePage==='g3'?'active':''}" href="group3-demo.html"><i class="fa-solid fa-trophy"></i>Advanced</a>
    <a class="nav-pill ${activePage==='survey'?'active':''}" href="post-survey-demo.html"><i class="fa-solid fa-clipboard-list"></i>사후 설문</a>
    <a class="nav-pill ${activePage==='finish'?'active':''}" href="finish-demo.html"><i class="fa-solid fa-flag-checkered"></i>종료</a>
    <button onclick="revokeReviewAccess();window.location.href='password.html'" class="nav-pill"><i class="fa-solid fa-right-from-bracket"></i>잠금</button>
  </nav>`;
}

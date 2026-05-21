
const REVIEW_DEMO_PASSWORD = 'review2026';
const REVIEW_DEMO_AUTH_KEY = 'reviewDemoAccessGranted';

function isReviewAuthenticated() {
  return sessionStorage.getItem(REVIEW_DEMO_AUTH_KEY) === 'true';
}
function grantReviewAccess() {
  sessionStorage.setItem(REVIEW_DEMO_AUTH_KEY, 'true');
}
function revokeReviewAccess() {
  sessionStorage.removeItem(REVIEW_DEMO_AUTH_KEY);
}
function requireReviewAuth() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'password.html') return;
  if (!isReviewAuthenticated()) {
    window.location.replace('password.html');
  }
}
document.addEventListener('DOMContentLoaded', requireReviewAuth);

// Принудительный редирект на index.html
if (window.location.pathname === '/' && 
    window.location.search === '' && 
    !document.querySelector('.container')) {
  window.location.href = '/index.html';
}

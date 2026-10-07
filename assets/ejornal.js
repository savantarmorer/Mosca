// Folheador do e-jornal: setas, teclado, arrastar (nativo), tela cheia e PDF (impressão).
(function () {
  var v = document.querySelector('.ej-viewer'); if (!v) return;
  var folhas = [].slice.call(v.querySelectorAll('.folha'));
  var ind = document.querySelector('[data-ej=pag]');
  var dupla = function () { return matchMedia('(min-width:1024px)').matches; };
  function passo() { return dupla() ? folhas[0].offsetWidth * 2 : folhas[0].offsetWidth + parseFloat(getComputedStyle(v).columnGap || 0); }
  function ir(d) { v.scrollBy({ left: d * passo(), behavior: 'smooth' }); }
  function atual() {
    var c = v.scrollLeft + v.clientWidth / 2, idx = 0;
    folhas.forEach(function (f, i) { if (f.offsetLeft <= c) idx = i; });
    if (dupla() && idx > 0) { var par = idx % 2 ? idx : idx - 1; ind.textContent = (par + 1) + (folhas[par + 1] ? '–' + (par + 2) : '') + ' / ' + folhas.length; }
    else ind.textContent = (idx + 1) + ' / ' + folhas.length;
  }
  document.querySelector('[data-ej=ant]').onclick = function () { ir(-1); };
  document.querySelector('[data-ej=prox]').onclick = function () { ir(1); };
  document.querySelector('[data-ej=pdf]').onclick = function () { window.print(); };
  document.querySelector('[data-ej=tela]').onclick = function () {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); ir(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); ir(-1); }
  });
  v.addEventListener('scroll', function () { requestAnimationFrame(atual); }, { passive: true });
  addEventListener('resize', atual); atual(); v.focus({ preventScroll: true });
})();

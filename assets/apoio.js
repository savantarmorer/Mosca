// Apoio ao Mosca via Pix: faixa no topo + convite (pop-up) uma vez por visitante.
(function () {
  var CHAVE = '68.595.950/0001-40';
  var CHAVE_COPIA = '68595950000140';            // Pix por CNPJ: só números
  var ESPERA_DIAS = 7;
  var pagina = location.pathname;
  if (/^\/(denuncia|admin)\//.test(pagina)) return;

  function copiar(botao) {
    var ok = function () { var t = botao.textContent; botao.textContent = 'Chave copiada ✓'; setTimeout(function () { botao.textContent = t; }, 2500); };
    if (navigator.clipboard) navigator.clipboard.writeText(CHAVE_COPIA).then(ok, function () { prompt('Copie a chave Pix:', CHAVE_COPIA); });
    else prompt('Copie a chave Pix:', CHAVE_COPIA);
  }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // Faixa no topo
  var faixa = document.createElement('div');
  faixa.className = 'apoio-faixa';
  faixa.setAttribute('role', 'region'); faixa.setAttribute('aria-label', 'Apoie o Mosca');
  faixa.innerHTML = '<span><b>Jornalismo sem dono precisa de você.</b> Apoie o Mosca via Pix · CNPJ <span class="apoio-chave">' + CHAVE + '</span></span>' +
    '<button type="button" class="apoio-copiar">Copiar chave</button><a href="/apoie/" class="apoio-saiba">Saiba mais</a>';
  document.body.insertBefore(faixa, document.body.firstChild);
  faixa.querySelector('.apoio-copiar').addEventListener('click', function () { copiar(this); });

  // Convite: uma vez, depois de ler ~60% da página ou 40 s; não reaparece por 7 dias após fechar
  if (pagina === '/apoie/') return;
  var ultimo = +ler('mosca_apoio_fechado') || 0;
  if (Date.now() - ultimo < ESPERA_DIAS * 864e5) return;
  var mostrado = false;
  function abrir() {
    if (mostrado) return; mostrado = true;
    var caixa = document.createElement('div');
    caixa.className = 'apoio-pop'; caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'false'); caixa.setAttribute('aria-labelledby', 'apoio-titulo');
    caixa.innerHTML = '<button type="button" class="apoio-fechar" aria-label="Fechar">×</button>' +
      '<p class="apoio-kicker">Apoie o Mosca</p><h2 id="apoio-titulo">O Mosca não tem dono nem patrocinador.</h2>' +
      '<p>Cada reportagem é paga por quem lê. Qualquer valor ajuda a manter a apuração independente — e o incômodo necessário.</p>' +
      '<p class="apoio-pix">Pix (CNPJ)<br><b>' + CHAVE + '</b></p>' +
      '<button type="button" class="apoio-copiar-grande">Copiar chave Pix</button><a href="/apoie/" class="apoio-saiba">Por que apoiar?</a>';
    document.body.appendChild(caixa);
    requestAnimationFrame(function () { caixa.classList.add('aberto'); });
    function fechar() { guardar('mosca_apoio_fechado', Date.now()); caixa.classList.remove('aberto'); setTimeout(function () { caixa.remove(); }, 300); }
    caixa.querySelector('.apoio-fechar').addEventListener('click', fechar);
    caixa.querySelector('.apoio-copiar-grande').addEventListener('click', function () { copiar(this); guardar('mosca_apoio_fechado', Date.now()); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
  }
  setTimeout(abrir, 40000);
  addEventListener('scroll', function () {
    var h = document.documentElement;
    if ((h.scrollTop + innerHeight) / h.scrollHeight > 0.6) abrir();
  }, { passive: true });
})();

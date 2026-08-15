/* ==========================================================================
   Vincent — animações de entrada
   --------------------------------------------------------------------------
   Duas animações independentes, sem dependência entre si:

   HERO   intro de carregamento. Roda uma vez por carregamento do documento —
          abrir o site e atualizar animam de novo, mas rolar até o rodapé e
          voltar ao topo não. Não usa ScrollTrigger.

   SOBRE  reveal disparado pelo scroll, uma vez por carregamento, via
          ScrollTrigger com `once: true`. Nada é persistido: cada refresh
          deixa a animação disponível outra vez.

   SERVIÇOS  reveal uma vez por carregamento, mais a navegação horizontal:
          acima de 1024px a seção é pinada e o scroll vertical desloca o
          track, passando o destaque de card em card. Abaixo disso não há
          pin e o viewport rola na mão.

   Nenhuma delas altera o layout: os elementos partem de um deslocamento
   curto e terminam exatamente na posição definida pelo CSS. Ao final, os
   estilos inline são removidos para que o estado em repouso fique idêntico
   à versão estática aprovada.
   ========================================================================== */

(function () {
  'use strict';

  var FAILSAFE_MS = 3000;           // se o GSAP nunca carregar, libera o Hero
  var raiz = document.documentElement;

  /* --- 1. Decisão, antes do primeiro paint ------------------------------- */

  function reduzMovimento() {
    return typeof matchMedia === 'function' &&
           matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // A navegação de Serviços depende do pin para alcançar os cards seguintes.
  // Sempre que o pin não estiver ativo — redução de movimento, falha do CDN
  // ou breakpoint sem pin — o viewport precisa rolar na mão.
  function liberarServicos() {
    var s = document.querySelector('.servicos');
    if (s) s.classList.add('servicos--livre');
  }

  // Sem intro: o CSS estático já entrega tudo no estado final. Não há nada a
  // esconder nem a revelar — só garantir que Serviços continue navegável.
  var vaiAnimar = !reduzMovimento();

  if (vaiAnimar) raiz.classList.add('is-hero-intro');

  var liberado = false;

  // Microinterações: as transições de `transform` dos botões que o GSAP anima
  // na entrada só podem existir depois que a timeline termina. Enquanto ela
  // roda, o GSAP reescreve o transform a cada quadro e uma `transition`
  // declarada perseguiria cada escrita — o reveal ficaria arrastado. A classe
  // é aplicada em todos os caminhos, inclusive nos de falha, para que o hover
  // continue existindo mesmo sem GSAP ou sem intro.
  function liberarMicro(seletor) {
    var els = document.querySelectorAll(seletor);
    for (var i = 0; i < els.length; i++) els[i].classList.add('micro-pronto');
  }

  function liberar() {
    if (liberado) return;
    liberado = true;
    raiz.classList.remove('is-hero-intro');
    liberarMicro('.hero-nav__contact, .hero-cta');
  }

  // Rede de segurança: se o GSAP não chegar, o Hero aparece inteiro assim mesmo.
  var failsafe = vaiAnimar ? setTimeout(liberar, FAILSAFE_MS) : null;

  /* --- 2. Timeline do Hero ------------------------------------------------ */

  function montarHero() {
    clearTimeout(failsafe);

    if (!window.gsap) {             // CDN indisponível
      liberar();
      return;
    }

    var alvos = {
      assinatura: '.hero-brand__signature',
      navLinks:   '.hero-nav__links',
      contato:    '.hero-nav__contact',
      badge:      '.hero-brand__badge-wrap',
      advogado:   '.hero__advogado',
      avaliacao:  '.hero-rating',
      cta:        '.hero-cta',
      metricas:   '.hero-metrics__item'
    };

    // Só os que existem de fato E estão sendo desenhados. O segundo filtro
    // existe por causa do mobile: abaixo de 767px a pill de regulamentação e o
    // card de avaliação saem com `display: none`, e não faz sentido reservar
    // lugar na timeline para eles. `offsetParent === null` acusa o elemento
    // oculto sem precisar consultar o breakpoint — nenhuma condicional de
    // largura no script, e o desktop continua com os oito alvos.
    function renderizado(el) {
      return el.offsetParent !== null ||
             getComputedStyle(el).position === 'fixed';
    }

    function alvosDe(chave) {
      return Array.prototype.slice.call(
        document.querySelectorAll(alvos[chave])
      ).filter(renderizado);
    }

    var todos = [];
    Object.keys(alvos).forEach(function (chave) {
      todos = todos.concat(alvosDe(chave));
    });

    if (!todos.length) {
      liberar();
      return;
    }

    var tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finalizar
    });

    // A assinatura abre a sequência: a máscara varre da esquerda para a
    // direita, no sentido em que o nome é escrito. Easing quase linear —
    // a mão de quem assina não desacelera como um objeto que entra em cena.
    var assinatura = alvosDe('assinatura');
    if (assinatura.length) {
      tl.to(assinatura, {
        '--sig': '112%',
        duration: 1,
        ease: 'power1.out'
      }, 0);
    }

    // `fromTo` em vez de `from`: o destino precisa ser explícito. Com `from`,
    // o GSAP lê o valor atual do elemento como destino — e o valor atual de
    // `opacity` é o 0 da regra `.is-hero-intro`, o que faria a animação ir de
    // 0 a 0 e os elementos surgirem de uma vez só no clearProps final.
    // Só o eixo declarado é zerado no destino: o advogado carrega um
    // translateX(-50%) no CSS e escrever `x: 0` aqui tiraria a centralização.
    function entra(chave, de, posicao, duracao) {
      var alvo = alvosDe(chave);
      if (!alvo.length) return;         // oculto neste breakpoint: nada a animar
      var inicio = { opacity: 0 };
      var fim = { opacity: 1, duration: duracao };
      if (de.x !== undefined) { inicio.x = de.x; fim.x = 0; }
      if (de.y !== undefined) { inicio.y = de.y; fim.y = 0; }
      if (de.stagger !== undefined) { fim.stagger = de.stagger; }
      tl.fromTo(alvo, inicio, fim, posicao);
    }

    // Navbar e CONTATO entram da direita quase juntos: leem-se como uma
    // composição só, com um respiro de 0.07s entre eles.
    entra('navLinks', { x: 34 }, 0.15, 0.65);
    entra('contato',  { x: 34 }, 0.22, 0.65);

    // Regulamentação — único movimento da esquerda para a direita.
    entra('badge', { x: -28 }, 0.3, 0.6);

    // Advogado, de baixo para cima. Sem escala e sem zoom: o PNG tem corte
    // reto na base e qualquer redimensionamento revelaria o recorte.
    entra('advogado', { y: 44 }, 0.35, 0.75);

    // Card de avaliação como composição única (ícones, estrelas, nota e
    // textos vêm juntos), seguido do CTA na mesma linguagem.
    entra('avaliacao', { x: 40 }, 0.45, 0.65);
    entra('cta',       { x: 40 }, 0.55, 0.6);

    // Métricas: 25+ → 80% → 300+ → 100%, de baixo para cima.
    entra('metricas', { y: 22, stagger: 0.08 }, 0.62, 0.6);

    /* --- 3. Limpeza ------------------------------------------------------ */

    function finalizar() {
      // A ordem importa e é síncrona (sem paint no meio):
      // 1) tirar a classe primeiro — do contrário o clearProps de `opacity`
      //    devolveria o controle à regra `.is-hero-intro { opacity: 0 }` e os
      //    elementos sumiriam por um quadro;
      liberar();

      // 2) remover todo estilo inline. Não é cosmético: `opacity` e
      //    `transform` residuais criam stacking context e trocam o
      //    antialiasing dos textos sobre vidro de subpixel para grayscale,
      //    exatamente o que degradou o Hero quando `.hero` teve z-index.
      //    Também devolve ao CSS o translateX(-50%) do advogado, que
      //    precisa voltar a ser percentual para a responsividade.
      gsap.set(todos, { clearProps: 'opacity,transform' });
      if (assinatura.length) gsap.set(assinatura, { clearProps: '--sig' });

      // O clearProps esvazia o style mas deixa o atributo vazio no elemento.
      // Removê-lo devolve o DOM exatamente à forma da versão estática.
      todos.forEach(function (el) {
        if (el.getAttribute('style') === '') el.removeAttribute('style');
      });
    }
  }

  /* --- 4. Reveal da seção Sobre ------------------------------------------- */

  function initSobreReveal() {
    // Confirmar as duas bibliotecas ANTES de qualquer fromTo: o fromTo tem
    // immediateRender, ou seja, criar o tween já é o que esconde os elementos.
    // Faltando GSAP ou ScrollTrigger, sair aqui deixa o Sobre inteiramente
    // visível, sem tocar em opacity nem em transform.
    if (!window.gsap || !window.ScrollTrigger) { liberarMicro('.sobre__cta'); return; }

    var secao = document.querySelector('.sobre');
    var colEsq = document.querySelector('.sobre__intro');
    var colDir = document.querySelector('.sobre__content');
    if (!secao || !colEsq || !colDir) { liberarMicro('.sobre__cta'); return; }

    var pill = document.querySelector('.sobre__pill');
    var titulo = document.querySelector('.sobre__title');
    var lead = document.querySelector('.sobre__lead');
    var paragrafo = document.querySelector('.sobre__paragraph');
    var cta = document.querySelector('.sobre__cta');
    var todos = [pill, titulo, lead, paragrafo, cta].filter(Boolean);
    if (todos.length !== 5) { liberarMicro('.sobre__cta'); return; }

    // Distância medida, não tabelada. Em 1365px sobram só 32px à direita e no
    // mobile 16px — um ±40px fixo criaria scroll horizontal. A folga é lida
    // nas colunas, que nunca são animadas: medir nos próprios elementos daria
    // valor errado ao recalcular, porque o rect já incluiria o transform.
    // Como os filhos cabem dentro da coluna, a folga dela é sempre a menor.
    function limitar(folga) {
      return Math.max(12, Math.min(40, folga - 4));
    }

    function distEsq() {
      return limitar(colEsq.getBoundingClientRect().left);
    }

    function distDir() {
      return limitar(raiz.clientWidth - colDir.getBoundingClientRect().right);
    }

    var tl = gsap.timeline({
      defaults: { duration: 0.7, ease: 'power3.out' },
      scrollTrigger: {
        trigger: secao,
        start: 'top 80%',
        once: true,             // descer, voltar e reentrar não repetem
        invalidateOnRefresh: true   // recalcula as distâncias se a largura mudar
      },
      onComplete: function () {
        gsap.set(todos, { clearProps: 'opacity,transform' });
        todos.forEach(function (el) {
          if (el.getAttribute('style') === '') el.removeAttribute('style');
        });
        liberarMicro('.sobre__cta');   // agora o hover pode transicionar transform
      }
    });

    // Valores em função para que o `invalidateOnRefresh` os releia.
    function vemDaEsquerda(alvo, posicao) {
      tl.fromTo(alvo, { x: function () { return -distEsq(); }, opacity: 0 },
                      { x: 0, opacity: 1 }, posicao);
    }

    function vemDaDireita(alvo, posicao) {
      tl.fromTo(alvo, { x: function () { return distDir(); }, opacity: 0 },
                      { x: 0, opacity: 1 }, posicao);
    }

    // As duas colunas partem quase juntas (0.00 e 0.06) e se encontram no
    // centro; o botão fecha a composição. Total ≈ 1.0s.
    vemDaEsquerda(pill, 0);
    vemDaDireita(lead, 0.06);
    vemDaEsquerda(titulo, 0.12);
    vemDaDireita(paragrafo, 0.18);
    vemDaDireita(cta, 0.3);

    // A fonte muda a altura do Sobre e desloca o ponto de disparo; recalcular
    // depois que ela carrega evita o trigger ficar preso numa posição antiga.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  /* --- 5. Serviços: reveal + navegação horizontal pinada ------------------- */

  function initServicosAnimation() {
    if (!window.gsap || !window.ScrollTrigger) { liberarServicos(); return; }

    var secao = document.querySelector('.servicos');
    var viewport = document.querySelector('.servicos__viewport');
    var track = document.querySelector('.servicos__track');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.service-card'));
    // O CTA fica no track só pela geometria horizontal; nunca entra em `cards`.
    var cta = document.querySelector('.servicos__cta');
    if (!secao || !viewport || !track || cards.length < 2) { liberarServicos(); return; }

    var ATIVA = 'service-card--active';
    var indiceAtivo = Math.max(0, cards.indexOf(document.querySelector('.' + ATIVA)));

    /* 5.1 Estados visuais lidos do CSS -----------------------------------
       Nada de valores duplicados em JS: um card ativo e um inativo estão
       sempre presentes, então os dois conjuntos vêm dos estilos computados.
       `width` e as margens laterais entram no MESMO tween, com a mesma
       duração e o mesmo easing — como 302.5 − 27.5 = 275, a pegada do card
       no flex fica constante durante toda a transição e os vizinhos não se
       mexem. É por isso que não foi preciso criar slots. */
    var MAPA = [
      ['',                      ['width', 'height', 'marginLeft', 'marginRight']],
      ['.service-card__icon',   ['left', 'top', 'width', 'height',
                                 'paddingTop', 'paddingRight', 'paddingBottom',
                                 'paddingLeft', 'borderRadius']],
      ['.service-card__body',   ['left', 'top']],
      ['.service-card__title',  ['height', 'fontSize']],
      ['.service-card__rule',   ['width']],
      ['.service-card__desc',   ['fontSize']]
    ];

    function medir(card) {
      return MAPA.map(function (par) {
        var el = par[0] ? card.querySelector(par[0]) : card;
        var css = el ? getComputedStyle(el) : null;
        var vals = {};
        if (css) par[1].forEach(function (p) { vals[p] = css[p]; });
        return { sel: par[0], vals: vals };
      });
    }

    var estadoAtivo = null;
    var estadoNormal = null;

    function lerEstados() {
      var umAtivo = cards[indiceAtivo];
      var umNormal = cards[indiceAtivo === 0 ? 1 : 0];
      estadoAtivo = medir(umAtivo);
      estadoNormal = medir(umNormal);
    }

    function aplicar(card, estado, dur) {
      estado.forEach(function (grupo) {
        var el = grupo.sel ? card.querySelector(grupo.sel) : card;
        if (!el) return;
        var vars = {};
        for (var p in grupo.vals) vars[p] = grupo.vals[p];
        vars.duration = dur;
        vars.ease = 'power2.inOut';
        vars.overwrite = 'auto';      // troca rápida de direção não acumula tweens
        gsap.to(el, vars);
      });
    }

    function limpar(card) {
      MAPA.forEach(function (par) {
        var el = par[0] ? card.querySelector(par[0]) : card;
        if (el) gsap.set(el, { clearProps: par[1].join(',') });
      });
    }

    // Só o "+" do card ativo é alcançável por teclado ou clique.
    function acessibilidade(card, ativo) {
      var b = card.querySelector('.service-card__more');
      if (!b) return;
      if (ativo) { b.removeAttribute('aria-hidden'); b.removeAttribute('tabindex'); }
      else { b.setAttribute('aria-hidden', 'true'); b.setAttribute('tabindex', '-1'); }
    }

    var DUR = 0.4;

    function trocarAtivo(novo) {
      if (novo === indiceAtivo || !cards[novo]) return;
      var sai = cards[indiceAtivo];
      var entra = cards[novo];
      indiceAtivo = novo;

      // A classe muda já: o CSS passa a valer como destino e os tweens
      // apenas percorrem o caminho a partir dos valores atuais.
      sai.classList.remove(ATIVA);
      entra.classList.add(ATIVA);
      acessibilidade(sai, false);
      acessibilidade(entra, true);

      aplicar(sai, estadoNormal, DUR);
      aplicar(entra, estadoAtivo, DUR);

      [[sai, 0], [entra, 1]].forEach(function (par) {
        var alvos = [par[0].querySelector('.service-card__glow'),
                     par[0].querySelector('.service-card__more')].filter(Boolean);
        if (alvos.length) {
          gsap.to(alvos, { autoAlpha: par[1], duration: DUR,
                           ease: 'power2.out', overwrite: 'auto' });
        }
      });

      // Ao assentar, o inline sai e quem manda de novo é a classe.
      gsap.delayedCall(DUR + 0.02, function () {
        cards.forEach(function (c) {
          if (!gsap.isTweening(c)) limpar(c);
        });
      });
    }

    /* 5.2 Reveal de entrada — uma vez por carregamento -------------------- */

    var cabecalho = ['.servicos__pill', '.servicos__title', '.servicos__subtitle']
      .map(function (s) { return document.querySelector(s); }).filter(Boolean);

    if (cabecalho.length) {
      var header = document.querySelector('.servicos__header');
      var recuo = function () {
        var folga = header ? header.getBoundingClientRect().left : 40;
        return Math.max(12, Math.min(40, folga - 4));
      };

      var entrada = raiz.clientWidth <= 767 ? 30 : 60;
      var revelaveis = cabecalho.concat(cards);

      // Estados iniciais aplicados por `gsap.set` ANTES da timeline, e a
      // timeline usa `to`. Com `fromTo` o estado inicial de um tween que
      // começa depois de 0 é revertido enquanto a playhead não o alcança:
      // medido, os cards ficavam em opacidade 1 por ~140ms depois do gatilho
      // e só então saltavam para 0 — o "piscar" relatado. O cabeçalho, que
      // começa em 0, não sofria disso.
      gsap.set(cabecalho, { x: function () { return -recuo(); }, opacity: 0 });
      gsap.set(cards, { x: entrada, opacity: 0 });

      gsap.timeline({
        defaults: { duration: 0.7, ease: 'power3.out' },
        scrollTrigger: { trigger: secao, start: 'top 80%', once: true },
        onComplete: function () {
          // Só as propriedades do reveal. O `x` do track pertence ao scrub e
          // não é tocado aqui — reveal e navegação horizontal nunca dividem
          // a mesma propriedade no mesmo elemento.
          gsap.set(revelaveis, { clearProps: 'opacity,transform' });
          revelaveis.forEach(function (el) {
            if (el.getAttribute('style') === '') el.removeAttribute('style');
          });
        }
      })
      .to(cabecalho, { x: 0, opacity: 1, stagger: 0.12 }, 0)
      // Os cards entram da direita; o recorte do viewport impede overflow.
      .to(cards, { x: 0, opacity: 1, stagger: 0.07 }, 0.12);
    }

    /* 5.3 Navegação horizontal pinada — só onde há espaço ----------------- */

    gsap.matchMedia().add('(min-width: 1024px)', function () {
      lerEstados();

      // Os centros dos cards são invariantes: medidos com qualquer card ativo
      // dão sempre os mesmos valores, porque a pegada de 275px não muda. Por
      // isso o deslocamento sai deles, e não de `scrollWidth` — que oscila
      // 14px quando o último card está ativo, já que a margem negativa do
      // item final não recolhe o padding do track.
      function centros() {
        var base = track.getBoundingClientRect().left;
        return cards.map(function (c) {
          var r = c.getBoundingClientRect();
          return r.left - base + r.width / 2;
        });
      }

      // A região de destaque é onde o design põe o card ativo: a posição de
      // repouso do primeiro card. Cada card k precisa andar
      //   deslocamento_k = centro_k − centroDaRegiaoAtiva
      // para chegar lá, e o deslocamento final é o do último card. Os pontos
      // normalizados saem dessa medição — se a geometria mudar, acompanham.
      //
      var pontos = [];
      var distancia = 0;

      // O fim da navegação é a composição final — card 6 mais o CTA — e não a
      // posição isolada do último serviço. O track para quando a borda direita
      // do CTA alcança a margem do layout dentro do viewport; essa margem é o
      // próprio `padding-right` do track, lido do DOM em vez de fixado.
      // Medir pela borda do CTA (e não por `scrollWidth`) também evita a
      // oscilação de 14px que o scrollWidth sofre quando o último card é o ativo.
      function deslocamentoFinal() {
        if (!cta) return 0;
        var margem = parseFloat(getComputedStyle(track).paddingRight) || 0;
        var base = track.getBoundingClientRect().left;   // já reflete o x atual
        var direitaCta = cta.getBoundingClientRect().right - base;
        return Math.max(0, direitaCta - (viewport.clientWidth - margem));
      }

      function recalcular() {
        var c = centros();
        var centroRegiaoAtiva = c[0];
        var passos = c.map(function (v) { return v - centroRegiaoAtiva; });
        var alcance = passos[passos.length - 1];

        // Os pontos de seleção continuam saindo da geometria dos SEIS cards —
        // o CTA não acrescenta um sétimo ponto nem entra na seleção. O que
        // mudou foi só a distância que o track percorre até o frame final.
        pontos = passos.map(function (d) {
          return alcance > 0 ? d / alcance : 0;
        });
        distancia = deslocamentoFinal();
      }

      recalcular();

      function maisProximo(p) {
        var melhor = 0;
        for (var i = 1; i < pontos.length; i++) {
          if (Math.abs(pontos[i] - p) < Math.abs(pontos[melhor] - p)) melhor = i;
        }
        return melhor;
      }

      var st = ScrollTrigger.create({
        trigger: secao,
        start: 'center center',
        end: function () { return '+=' + Math.max(1, distancia); },
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        snap: {
          snapTo: function (valor) { return pontos[maisProximo(valor)]; },
          duration: { min: 0.15, max: 0.3 },
          delay: 0.05,
          ease: 'power2.inOut'
        },
        onRefresh: function () { recalcular(); lerEstados(); },
        onUpdate: function (self) {
          gsap.set(track, { x: -distancia * self.progress });
          var idx = maisProximo(self.progress);
          if (idx !== indiceAtivo) trocarAtivo(idx);   // só quando muda de fato
        }
      });

      return function () {                 // desmonte ao sair do breakpoint
        st.kill(true);
        gsap.set(track, { clearProps: 'transform' });
        if (indiceAtivo !== 0) trocarAtivo(0);
        liberarServicos();
      };
    });

    // Sem pin abaixo de 1024px: os cards precisam rolar na mão.
    gsap.matchMedia().add('(max-width: 1023px)', function () {
      liberarServicos();
    });
  }

  /* --- 6. Reveal da seção Processos --------------------------------------- */

  function initProcessosReveal() {
    // Mesma regra do Sobre: confirmar as bibliotecas ANTES de qualquer fromTo,
    // porque o immediateRender do fromTo é o que esconde os elementos. Sem
    // GSAP ou ScrollTrigger a seção fica inteiramente visível.
    if (!window.gsap || !window.ScrollTrigger) return;

    var secao = document.querySelector('.processos');
    var intro = document.querySelector('.processos__intro');
    var flow = document.querySelector('.processos__flow');
    if (!secao || !intro || !flow) return;

    var esquerda = ['.processos__pill', '.processos__title',
                    '.processos__rule', '.processos__subtitle']
      .map(function (s) { return document.querySelector(s); })
      .filter(Boolean);
    var linha = document.querySelector('.processos__timeline');
    var etapas = Array.prototype.slice.call(document.querySelectorAll('.processo-step'));
    if (esquerda.length < 4 || !etapas.length) return;

    // A seção não tem `overflow: hidden`, então o avanço da direita precisa
    // caber na folga real. Medido nos contêineres (`.processos__intro` e
    // `.processos__flow`), que não são animados — ler nos próprios elementos
    // daria valor errado ao recalcular, porque o rect já traria o transform.
    function limitar(folga, maximo) {
      return Math.max(12, Math.min(maximo, folga - 4));
    }

    function recuoEsq() {
      return limitar(intro.getBoundingClientRect().left, 40);
    }

    function avancoDir() {
      return limitar(raiz.clientWidth - flow.getBoundingClientRect().right, 50);
    }

    var direita = linha ? [linha].concat(etapas) : etapas;
    var alvos = esquerda.concat(direita);

    // Estado inicial aplicado a TODOS os alvos de uma vez, antes da timeline.
    // Um `fromTo` com `stagger` só rende o estado inicial do primeiro alvo no
    // immediateRender — os demais ficariam visíveis e só sumiriam quando a sua
    // parcela do stagger começasse, o que é exatamente o flash a evitar.
    gsap.set(esquerda, { x: function () { return -recuoEsq(); }, opacity: 0 });
    gsap.set(direita, { x: function () { return avancoDir(); }, opacity: 0 });

    var tl = gsap.timeline({
      defaults: { duration: 0.7, ease: 'power3.out' },
      scrollTrigger: {
        trigger: secao,
        start: 'top 80%',
        once: true,                 // voltar pelo scroll não repete
        invalidateOnRefresh: true
      },
      onComplete: function () {
        gsap.set(alvos, { clearProps: 'opacity,transform' });
        alvos.forEach(function (el) {
          if (el.getAttribute('style') === '') el.removeAttribute('style');
        });
      }
    });

    // Os dois lados partem juntos e se cruzam: pill e etapa 01 em 0, etapa 02
    // em 0.08, título em 0.12, etapa 03 em 0.16, linha dourada e etapa 04 em
    // 0.24, subtítulo em 0.36. A composição fecha em ~1.06s.
    tl.fromTo(esquerda,
      { x: function () { return -recuoEsq(); }, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.12 }, 0);

    if (linha) {
      tl.fromTo(linha,
        { x: function () { return avancoDir(); }, opacity: 0 },
        { x: 0, opacity: 1 }, 0);
    }

    tl.fromTo(etapas,
      { x: function () { return avancoDir(); }, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.08 }, 0);
  }

  /* --- 7. Feedbacks: reveal + carrossel ----------------------------------- */

  function initFeedbacksAnimation() {
    if (!window.gsap || !window.ScrollTrigger) return;

    var secao = document.querySelector('.feedbacks');
    var pill = document.querySelector('.feedbacks__pill');
    var titulo = document.querySelector('.feedbacks__title');
    var divisor = document.querySelector('.feedbacks__divider');
    var subtitulo = document.querySelector('.feedbacks__subtitle');
    var fechamento = document.querySelector('.feedbacks__closing');
    var pista = document.querySelector('.feedbacks__cards');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.feedback-card'));
    if (!secao || !pill || !titulo || !divisor || !subtitulo || !pista || cards.length < 3) return;

    var POS = ['feedback-card--left', 'feedback-card--center', 'feedback-card--right'];
    var ATIVA = 'is-active';

    function porPosicao(classe) {
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].classList.contains(classe)) return cards[i];
      }
      return null;
    }

    /* 7.1 Reveal de entrada — em todos os breakpoints -------------------- */

    var mobile = raiz.clientWidth <= 767;
    var descida = mobile ? 20 : 30;        // y do cabeçalho
    var lateral = mobile ? 25 : 50;        // x dos cards laterais
    var queda = mobile ? 24 : 45;          // y do card central
    var rodape = mobile ? 16 : 24;         // y do fechamento

    var esq = porPosicao(POS[0]);
    var centro = porPosicao(POS[1]);
    var dir = porPosicao(POS[2]);
    var alvos = [pill, titulo, divisor, subtitulo, esq, centro, dir];
    if (fechamento) alvos.push(fechamento);

    // Estados iniciais aplicados de uma vez, antes da timeline: um `fromTo`
    // com stagger só renderiza o estado inicial do primeiro alvo, o que
    // deixaria os demais visíveis por um instante.
    gsap.set([pill, titulo, subtitulo], { y: -descida, opacity: 0 });
    gsap.set(divisor, { scaleY: 0, transformOrigin: 'top center', opacity: 0 });
    gsap.set(esq, { x: -lateral, opacity: 0 });
    gsap.set(dir, { x: lateral, opacity: 0 });
    gsap.set(centro, { y: -queda, opacity: 0 });
    if (fechamento) gsap.set(fechamento, { y: -rodape, opacity: 0 });

    var revelado = false;

    var tl = gsap.timeline({
      defaults: { duration: 0.7, ease: 'power3.out' },
      scrollTrigger: { trigger: secao, start: 'top 80%', once: true },
      onComplete: function () {
        revelado = true;
        gsap.set(alvos, { clearProps: 'opacity,transform,transformOrigin' });
        alvos.forEach(function (el) {
          if (el.getAttribute('style') === '') el.removeAttribute('style');
        });
        ScrollTrigger.refresh();
      }
    });

    // Etapa A — cabeçalho descendo, na ordem pill → título → linha → subtítulo.
    tl.to(pill, { y: 0, opacity: 1 }, 0)
      .to(titulo, { y: 0, opacity: 1 }, 0.1)
      .to(divisor, { scaleY: 1, opacity: 1, duration: 0.6 }, 0.2)
      .to(subtitulo, { y: 0, opacity: 1 }, 0.3);

    // Etapa B — os laterais fecham a composição pelas beiradas e o central
    // desce, terminando um respiro depois para reforçar o destaque.
    tl.to(esq, { x: 0, opacity: 1 }, 0.35)
      .to(dir, { x: 0, opacity: 1 }, 0.35)
      .to(centro, { y: 0, opacity: 1 }, 0.45);

    // Etapa C — fechamento inferior.
    if (fechamento) tl.to(fechamento, { y: 0, opacity: 1, duration: 0.6 }, 0.75);

    /* 7.2 Carrossel — só onde há espaço; nunca no mobile ----------------- */

    gsap.matchMedia().add('(min-width: 768px)', function () {
      // Os slots vêm da geometria medida, não de `getPropertyValue('--slot-x')`:
      // abaixo de 1365px o CSS declara o offset em `vw`, e a propriedade
      // devolveria a string "-25.3vw" — `parseFloat` daria 25.3 em vez dos
      // pixels resolvidos, encolhendo o percurso inteiro. Como o card usa
      // `left: calc(50% + var(--slot-x))` com `translateX(-50%)`, o centro
      // dele é exatamente o centro da pista mais o offset do slot.
      var xEsq, xCentro, xDir, passo, foraDir, foraEsq, slots;

      function medirSlots() {
        var salvos = cards.map(function (c) { return c.style.getPropertyValue('--slot-x'); });
        cards.forEach(function (c) { c.style.removeProperty('--slot-x'); });

        var caixa = pista.getBoundingClientRect();
        var meio = caixa.left + caixa.width / 2;
        var s = POS.map(function (classe) {
          var c = porPosicao(classe);
          if (!c) return 0;
          var r = c.getBoundingClientRect();
          return r.left + r.width / 2 - meio;
        });

        cards.forEach(function (c, i) {
          if (salvos[i]) c.style.setProperty('--slot-x', salvos[i]);
        });

        slots = s;
        xEsq = s[0]; xCentro = s[1]; xDir = s[2];
        passo = xDir - xCentro;
        foraDir = xDir + passo;            // entrada/saída fora do enquadramento
        foraEsq = xEsq - passo;
      }

      medirSlots();
      if (!passo) return;

      // Com três depoimentos, a rotação é cíclica: a cada passo o central vai
      // para a esquerda, o da direita assume o centro e o que estava na
      // esquerda reaparece pela direita. São 2 passos, o bastante para cada
      // depoimento ocupar o centro uma vez.
      var ordem = [esq, centro, dir];      // ocupantes dos slots 0,1,2
      var estados = ordem.length;          // 3 estados => 2 transições
      var indice = 0;

      /* Estados visuais lidos do CSS — nada de valores duplicados. */
      var MAPA = [
        ['', ['width', 'height', '--inner-x', '--inner-y', '--inner-w', '--inner-h']],
        ['.feedback-card__quote', ['left', 'top', 'fontSize']],
        ['.feedback-card__stars', ['left', 'top']],
        ['.feedback-card__star', ['width', 'height']],
        ['.feedback-card__text', ['left', 'top']],
        ['.feedback-card__client', ['left', 'top']],
        ['.feedback-card__avatar', ['width', 'height', 'fontSize']],
        ['.feedback-card__identity', ['width']],
        ['.feedback-card__name', ['fontSize']],
        ['.feedback-card__verified', ['fontSize']]
      ];

      function medir(card) {
        return MAPA.map(function (par) {
          var el = par[0] ? card.querySelector(par[0]) : card;
          var css = el ? getComputedStyle(el) : null;
          var vals = {};
          if (css) {
            par[1].forEach(function (p) {
              vals[p] = p.charAt(0) === '-' ? css.getPropertyValue(p).trim() : css[p];
            });
          }
          return { sel: par[0], vals: vals };
        });
      }

      var estadoAtivo = medir(centro);
      var estadoLateral = medir(esq);

      function aplicar(card, estado, dur) {
        estado.forEach(function (grupo) {
          var els = grupo.sel
            ? Array.prototype.slice.call(card.querySelectorAll(grupo.sel))
            : [card];
          if (!els.length) return;
          var vars = {};
          for (var p in grupo.vals) vars[p] = grupo.vals[p];
          vars.duration = dur;
          vars.ease = 'power2.inOut';
          vars.overwrite = 'auto';       // troca rápida não acumula tweens
          gsap.to(els, vars);
        });
      }

      function limpar(card) {
        MAPA.forEach(function (par) {
          var els = par[0]
            ? Array.prototype.slice.call(card.querySelectorAll(par[0]))
            : [card];
          if (els.length) gsap.set(els, { clearProps: par[1].join(',') });
        });
      }

      var DUR = 0.4;

      function aplicarEstado(novo) {
        if (novo === indice) return;
        indice = novo;

        // Quem ocupa cada slot neste estado.
        for (var s = 0; s < 3; s++) {
          var card = ordem[(s + indice) % 3];
          POS.forEach(function (c) { card.classList.remove(c); });
          card.classList.add(POS[s]);
          var ativo = (s === 1);
          card.classList.toggle(ATIVA, ativo);
          aplicar(card, ativo ? estadoAtivo : estadoLateral, DUR);
        }

        gsap.delayedCall(DUR + 0.02, function () {
          cards.forEach(function (c) {
            if (!gsap.isTweening(c)) limpar(c);
          });
        });
      }

      function entre(a, b, t) { return a + (b - a) * t; }

      // Posição do card cuja "faixa" contínua é `faixa` (0 = esquerda,
      // 1 = centro, 2 = direita).
      function porFaixa(faixa) {
        var f = Math.max(0, Math.min(2, faixa));
        var b = Math.min(1, Math.floor(f));
        return entre(slots[b], slots[b + 1], f - b);
      }

      // Posição contínua de cada card em função do progresso.
      // A faixa de um card é `i - p`. Quando ela fica negativa o card está
      // dando a volta: sai pela esquerda perdendo opacidade e reentra pela
      // direita ganhando opacidade — o salto acontece com o card invisível,
      // então o fecho do ciclo não aparece. Depois de completar a volta
      // (faixa ≤ -1) ele volta a ser uma faixa normal, somada de 3.
      function posicionar(p) {
        for (var i = 0; i < 3; i++) {
          var v = i - p;
          var x, alpha = 1;
          if (v >= 0) {
            x = porFaixa(v);
          } else if (v <= -1) {
            x = porFaixa(v + 3);
          } else {
            var t = -v;                      // 0 → 1 ao longo da volta
            if (t < 0.5) {                   // saindo pela esquerda
              x = entre(xEsq, foraEsq, t / 0.5);
              alpha = 1 - t / 0.5;
            } else {                         // reentrando pela direita
              x = entre(foraDir, xDir, (t - 0.5) / 0.5);
              alpha = (t - 0.5) / 0.5;
            }
          }
          gsap.set(ordem[i], { '--slot-x': x + 'px', autoAlpha: alpha });
        }
      }

      var st = ScrollTrigger.create({
        trigger: secao,
        // Feedbacks é a última seção: com `center center` o ponto de início
        // cai 32px além do scroll máximo da página (não há conteúdo abaixo
        // para centralizá-la), e o `end` fica inalcançável — o último
        // depoimento nunca chegaria ao centro. Ancorar pela base resolve
        // quando a seção cabe na viewport; quando ela é mais alta que a
        // viewport, `center center` volta a ser alcançável.
        start: function () {
          return secao.offsetHeight <= window.innerHeight
            ? 'bottom bottom'
            : 'center center';
        },
        end: '+=' + Math.round(passo * 1.3 * (estados - 1)),
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        snap: {
          snapTo: 1 / (estados - 1),
          duration: { min: 0.15, max: 0.3 },
          delay: 0.05,
          ease: 'power2.inOut'
        },
        onRefresh: function () { medirSlots(); },
        onUpdate: function (self) {
          if (!revelado) return;           // carrossel só depois da composição
          var p = self.progress * (estados - 1);
          posicionar(p);
          aplicarEstado(Math.round(p));
        }
      });

      return function () {                 // desmonte ao sair do breakpoint
        st.kill(true);
        cards.forEach(function (c) {
          gsap.set(c, { clearProps: '--slot-x,opacity,visibility' });
          limpar(c);
        });
        aplicarEstado(0);
      };
    });
  }

  /* --- 8. Navegação suave por âncoras -------------------------------------- */

  // O destino não pode sair de uma posição fixa: Serviços e Feedbacks são
  // pinados, e o ScrollTrigger embrulha cada um num `.pin-spacer`. Enquanto a
  // seção está pinada ela fica `position: fixed` e seu rect é o da viewport,
  // não o do documento — medir pelo spacer, que continua no fluxo, dá o ponto
  // certo em qualquer estado.
  function destinoDe(el) {
    // Seção pinada: o destino é o `start` do próprio trigger, que é onde a
    // experiência pinada começa e onde a seção fica enquadrada. Usar a
    // posição do `.pin-spacer` erraria quando o pin começa antes do spacer —
    // é o caso de Feedbacks, ancorado pela base: o clique caía no meio do
    // percurso e o carrossel já aparecia no segundo depoimento.
    if (window.ScrollTrigger) {
      var todos = ScrollTrigger.getAll();
      for (var i = 0; i < todos.length; i++) {
        var t = todos[i];
        if (t.pin && t.trigger === el) return Math.max(0, Math.round(t.start));
      }
    }

    var pai = el.parentNode;
    var alvo = (pai && pai.classList && pai.classList.contains('pin-spacer')) ? pai : el;
    return Math.max(0, Math.round(alvo.getBoundingClientRect().top + window.scrollY));
  }

  function irPara(topo) {
    var suave = !reduzMovimento();
    try {
      window.scrollTo({ top: topo, behavior: suave ? 'smooth' : 'auto' });
    } catch (e) {
      window.scrollTo(0, topo);          // navegadores sem a forma de objeto
    }
  }

  function initSmoothNavigation() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.hero-nav a[href^="#"], a.hero-cta[href^="#"], .sobre__cta[href^="#"], .servicos__cta-button[href^="#"]')
    );
    if (!links.length) return;

    links.forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var alvo = document.querySelector(id);
        // Âncora sem destino no documento (é o caso de #contato): deixa o
        // navegador seguir seu comportamento padrão, sem inventar seção.
        if (!alvo) return;
        ev.preventDefault();
        irPara(destinoDe(alvo));
      });
    });
  }

  /* --- 9. Voltar ao topo --------------------------------------------------- */

  function initBackToTop() {
    var botao = document.querySelector('.ao-topo');
    var hero = document.querySelector('.hero');
    if (!botao) return;

    botao.addEventListener('click', function () { irPara(0); });

    function mostrar() { botao.classList.add('is-visivel'); }
    function esconder() { botao.classList.remove('is-visivel'); }

    if (window.gsap && window.ScrollTrigger && hero) {
      // Um trigger próprio, só de leitura: não anima nada e não encosta na
      // timeline de entrada do Hero.
      ScrollTrigger.create({
        trigger: hero,
        start: 'bottom top',
        onEnter: mostrar,
        onLeaveBack: esconder
      });
      return;
    }

    // Sem GSAP o botão continua funcionando por um listener passivo.
    var alturaHero = hero ? hero.offsetHeight : window.innerHeight;
    var pendente = false;
    window.addEventListener('scroll', function () {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(function () {
        pendente = false;
        if (window.scrollY > alturaHero) mostrar(); else esconder();
      });
    }, { passive: true });
  }

  /* --- 10. Spotlight que acompanha o cursor --------------------------------
     Único efeito desta etapa que precisa de JS: a posição do cursor não é
     expressável em CSS. O script escreve apenas duas custom properties; quem
     desenha o brilho é o `::before` (bloco 23.6 do CSS).

     Uma função só, usada em duas superfícies — o card CTA de Serviços e o
     Hero. `zona` é quem escuta o ponteiro e `medida` é a caixa de referência
     das coordenadas; no card são o mesmo elemento, no Hero o `.hero__inner`
     é quem tem o pseudo, mas quem recebe o mouse é o `.hero` inteiro.

     Custo por quadro: um `getBoundingClientRect` da caixa de referência. Ele
     é necessário porque o card viaja horizontalmente com o scrub de Serviços
     e o Hero rola; ficar fora do rAF faria a leitura acontecer a cada evento
     de `pointermove` em vez de no máximo uma vez por quadro.
     ------------------------------------------------------------------------- */

  function ligarSpotlight(seletorZona, seletorMedida) {
    if (typeof matchMedia !== 'function') return;
    // Mesmo recorte do CSS: sem mouse de verdade não há cursor a seguir, e
    // com movimento reduzido o brilho não deve acompanhar nada.
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduzMovimento()) return;

    var zona = document.querySelector(seletorZona);
    var medida = seletorMedida ? document.querySelector(seletorMedida) : zona;
    if (!zona || !medida) return;

    var cx = 0, cy = 0, agendado = false;

    function aplicar() {
      agendado = false;
      var r = medida.getBoundingClientRect();
      medida.style.setProperty('--mx', (cx - r.left).toFixed(1) + 'px');
      medida.style.setProperty('--my', (cy - r.top).toFixed(1) + 'px');
    }

    function registrar(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      cx = e.clientX;
      cy = e.clientY;
      if (!agendado) {
        agendado = true;
        requestAnimationFrame(aplicar);
      }
    }

    // Na entrada a posição é escrita já, antes de o fade começar: esperar um
    // quadro faria o brilho nascer onde o cursor estava da última vez.
    zona.addEventListener('pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      cx = e.clientX;
      cy = e.clientY;
      aplicar();
    }, { passive: true });

    zona.addEventListener('pointermove', registrar, { passive: true });
  }

  /* --- 11. Disparo -------------------------------------------------------- */

  function iniciar() {
    // Navegação e botão de topo vêm primeiro: precisam funcionar mesmo com
    // redução de movimento ou sem o GSAP.
    initSmoothNavigation();
    initBackToTop();
    ligarSpotlight('.servicos__cta');
    // No Hero quem escuta é a seção inteira; quem recebe as coordenadas (e
    // carrega o pseudo) é o `.hero__inner`, por causa da ordem de pintura.
    ligarSpotlight('.hero', '.hero__inner');

    if (!vaiAnimar) {
      // Sem intro nenhuma timeline vai chamar `liberar`; os botões precisam
      // da classe assim mesmo para que o hover exista.
      liberarMicro('.hero-nav__contact, .hero-cta, .sobre__cta');
      liberarServicos();
      return;
    }

    // Registro único do plugin; cada init mantém sua própria checagem para
    // decidir o que fazer quando as bibliotecas não chegam.
    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    montarHero();
    initSobreReveal();
    initServicosAnimation();
    initProcessosReveal();
    initFeedbacksAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();

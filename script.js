// AliceMay — ナビゲーション / スクロール表示 / ヒーロー動画の切り替え
// 依存ライブラリなし。読み込みは defer。

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- ヘッダー */

  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------ ナビの開閉 */

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  const backdrop = document.querySelector('[data-nav-backdrop]');

  if (toggle && nav && backdrop) {
    const setNav = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = open ? 'メニューを閉じる' : 'メニューを開く';
      nav.classList.toggle('is-open', open);
      backdrop.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });

    backdrop.addEventListener('click', () => setNav(false));

    // リンクを踏んだら閉じる（同一ページ内アンカーのため）
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setNav(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        toggle.focus();
      }
    });

    // デスクトップ幅に戻したときに開きっぱなしを解除する
    const desktop = window.matchMedia('(min-width: 900px)');
    desktop.addEventListener('change', (e) => { if (e.matches) setNav(false); });
  }

  /* ------------------------------------------------ 現在地に合わせたナビ */
  // デスクトップのナビで、いま見えているセクションのリンクに印をつける。

  const navLinks = Array.from(document.querySelectorAll('[data-nav] a[href^="#"]'));

  if (navLinks.length && 'IntersectionObserver' in window) {
    const linkFor = new Map();
    navLinks.forEach((a) => {
      const section = document.querySelector(a.getAttribute('href'));
      if (section) linkFor.set(section, a);
    });

    // 一番上に来ているセクションを選ぶ。複数が同時に見えていても印はひとつ。
    const visible = new Set();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });

      const current = [...linkFor.keys()].find((s) => visible.has(s));
      navLinks.forEach((a) => a.classList.toggle('is-current', a === linkFor.get(current)));
    }, { rootMargin: '-45% 0px -45% 0px' });

    linkFor.forEach((_, section) => spy.observe(section));
  }

  /* -------------------------------------------------------- スクロール表示 */

  const revealTargets = document.querySelectorAll('[data-reveal]');

  // 隣り合う要素は少しずつ遅れて現れる。並び順は親の中での位置から取る。
  revealTargets.forEach((el) => {
    const siblings = Array.from(el.parentElement?.children ?? []).filter((n) => n.hasAttribute?.('data-reveal'));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty('--reveal-i', String(Math.min(i, 5)));
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------ 実績のカウント */
  // 「71点」「41件」の数字を 0 から数え上げる。単位の <small> はそのまま残す。

  const counters = Array.from(document.querySelectorAll('.hero-facts dd'))
    .map((dd) => {
      const node = [...dd.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue));
      return node ? { node, to: parseInt(node.nodeValue, 10) } : null;
    })
    .filter(Boolean);

  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    counters.forEach((c) => { c.node.nodeValue = '0'; });

    const run = () => {
      const duration = 1100;
      const started = performance.now();
      const tick = (now) => {
        // 終盤をゆるめる（easeOutCubic）と、数字が「止まる」感じが出る
        const t = Math.min((now - started) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        counters.forEach((c) => { c.node.nodeValue = String(Math.round(c.to * eased)); });
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const facts = document.querySelector('.hero-facts');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { run(); io.disconnect(); }
      });
    }, { threshold: 0.4 });
    io.observe(facts);
  }

  /* ------------------------------------------------------ ヒーローの動画 */
  // ポスター画像を先に出し、動画は画面に入ってから読み込む。
  // 2本を一定間隔でクロスフェードさせる。1本しか無い場合はそのままループする。

  const media = document.querySelector('[data-hero-media]');
  const videos = media ? Array.from(media.querySelectorAll('[data-hero-video]')) : [];

  if (media && videos.length && !reduceMotion) {
    let index = 0;
    let timer = null;
    let started = false;

    const show = (i) => {
      videos.forEach((v, n) => v.classList.toggle('is-active', n === i));
      const video = videos[i];
      if (video.readyState === 0) video.load();
      const played = video.play();
      if (played) played.catch(() => { /* 自動再生が拒否されたらポスターのまま */ });
    };

    const start = () => {
      if (started) return;
      started = true;

      videos.forEach((v) => { v.src = v.dataset.src; });
      show(0);

      if (videos.length > 1) {
        timer = setInterval(() => {
          index = (index + 1) % videos.length;
          show(index);
        }, 6000);
      }
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { start(); io.disconnect(); }
        });
      }, { threshold: 0.25 });
      io.observe(media);
    } else {
      start();
    }

    // 画面外・別タブでは止めて、無駄なデコードを避ける
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
        videos.forEach((v) => v.pause());
      } else if (started) {
        show(index);
        if (videos.length > 1 && !timer) {
          timer = setInterval(() => {
            index = (index + 1) % videos.length;
            show(index);
          }, 6000);
        }
      }
    });
  }
})();

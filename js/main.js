(function () {
  'use strict';

  /* ===== Mobile navigation ===== */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav-menu');
  var overlay = document.getElementById('nav-overlay');

  function openNav() {
    nav.classList.add('is-open');
    overlay.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрити меню');
  }

  function closeNav() {
    nav.classList.remove('is-open');
    overlay.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Відкрити меню');
  }

  if (burger && nav && overlay) {
    burger.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    overlay.addEventListener('click', closeNav);

    nav.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
      }
    });
  }

  /* ===== Smooth scroll for in-page links ===== */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        var headerH = document.getElementById('site-header').offsetHeight;
        var top = target.getBoundingClientRect().top + window.pageYOffset - headerH + 1;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ===== Video carousel arrows ===== */
  var carousel = document.getElementById('video-carousel');
  var prevBtn = document.getElementById('carousel-prev');
  var nextBtn = document.getElementById('carousel-next');

  function scrollByCard(direction) {
    if (!carousel) return;
    var card = carousel.querySelector('.video-card');
    var gap = 18;
    var step = card ? card.offsetWidth + gap : 260;
    carousel.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { scrollByCard(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { scrollByCard(1); });

  /* ===== Only one video plays at a time (local videos) ===== */
  var localVideos = Array.prototype.slice.call(document.querySelectorAll('.video-el'));

  localVideos.forEach(function (video) {
    video.addEventListener('play', function () {
      localVideos.forEach(function (other) {
        if (other !== video) other.pause();
      });
      pauseAllFacebookEmbeds();
    });
  });

  /* ===== Facebook video cards: click-to-load, deferred iframe ===== */
  function pauseAllFacebookEmbeds() {
    document.querySelectorAll('.fb-embed').forEach(function (iframe) {
      var src = iframe.getAttribute('src');
      iframe.setAttribute('src', src);
    });
  }

  document.querySelectorAll('.video-card--fb').forEach(function (card) {
    var btn = card.querySelector('.fb-play');
    if (!btn) return;

    btn.addEventListener('click', function () {
      localVideos.forEach(function (v) { v.pause(); });

      var fbSrc = card.getAttribute('data-fb-src');
      var frame = card.querySelector('.fb-frame');
      var iframe = document.createElement('iframe');
      iframe.className = 'fb-embed';
      iframe.src = fbSrc;
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');

      frame.innerHTML = '';
      frame.appendChild(iframe);
    }, { once: true });
  });

})();

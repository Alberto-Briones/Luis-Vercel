/**
* Template Name: iPortfolio
* Template URL: https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/
* Updated: Jun 29 2024 with Bootstrap v5.3.3
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/

(function() {
  "use strict";

  /**
   * Theme toggle + extra interactions moved from inline script
   */
  document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;

    if (themeToggle && themeIcon) {
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      applyTheme(currentTheme);

      themeToggle.addEventListener('click', function() {
        const current = body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('theme', next);
        if (typeof gtag !== 'undefined') {
          gtag('event', 'theme_change', { event_category: 'UI', event_label: next, value: next === 'dark' ? 1 : 0 });
        }
      });

      function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        if (theme === 'dark') {
          themeIcon.className = 'bi bi-moon';
          themeToggle.title = 'Cambiar a modo claro';
        } else {
          themeIcon.className = 'bi bi-sun';
          themeToggle.title = 'Cambiar a modo oscuro';
        }
      }

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    // Scroll indicator
    const scrollIndicator = document.getElementById('scroll-indicator');
    if (scrollIndicator) {
      window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        scrollIndicator.style.setProperty('--scroll-width', scrollPercent + '%');
      });
    }

    // Floating WhatsApp button
    const floatingBtn = document.getElementById('floating-btn');
    if (floatingBtn) {
      window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) floatingBtn.classList.add('show');
        else floatingBtn.classList.remove('show');
      });
      floatingBtn.addEventListener('click', function() {
        const phoneNumber = '527911107340';
        const message = 'Hola Luis, vi tu portafolio y me interesa contactarte para una oportunidad laboral.';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        if (typeof gtag !== 'undefined') {
          gtag('event', 'whatsapp_click', { event_category: 'Contacto', event_label: 'Floating Button', value: 1 });
        }
      });
    }

    // Social links analytics
    const links = document.querySelectorAll('#social-links a');
    links.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const href = link.getAttribute('href');
        let red = '';
        if (link.classList.contains('facebook')) red = 'Facebook';
        else if (link.classList.contains('instagram')) red = 'Instagram';
        else if (link.classList.contains('linkedin')) red = 'LinkedIn';
        else if (link.classList.contains('github')) red = 'GitHub';
        if (typeof gtag !== 'undefined') {
          gtag('event', 'click_red_social', { event_category: 'Redes sociales', event_label: red, social_network: red });
        }
        setTimeout(() => { window.open(href, '_blank'); }, 100);
      });
    });


    // Section load/observer
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-loaded');
          entry.target.classList.remove('section-loading');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('section').forEach(section => {
      section.classList.add('section-loading');
      observer.observe(section);
    });


    // Parallax hero image
    window.addEventListener('scroll', function() {
      const scrolled = window.pageYOffset;
      const heroImg = document.querySelector('.hero img');
      if (heroImg) heroImg.style.transform = `translateY(${scrolled * 0.5}px)`;
    });
  });

  /**
   * Header toggle
   */
  const headerToggleBtn = document.querySelector('.header-toggle');

  function headerToggle() {
    document.querySelector('#header').classList.toggle('header-show');
    headerToggleBtn.classList.toggle('bi-list');
    headerToggleBtn.classList.toggle('bi-x');
  }
  headerToggleBtn.addEventListener('click', headerToggle);

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.header-show')) {
        headerToggle();
      }
    });

  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

  /**
   * Init typed.js
   */
  const selectTyped = document.querySelector('.typed');
  if (selectTyped) {
    let typed_strings = selectTyped.getAttribute('data-typed-items');
    typed_strings = typed_strings.split(',');
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Initiate Pure Counter
   */
  new PureCounter();

  /**
   * Animate the skills items on reveal
   */
  let skillsAnimation = document.querySelectorAll('.skills-animation');
  skillsAnimation.forEach((item) => {
    new Waypoint({
      element: item,
      offset: '80%',
      handler: function(direction) {
        let progress = item.querySelectorAll('.progress .progress-bar');
        progress.forEach(el => {
          el.style.width = el.getAttribute('aria-valuenow') + '%';
        });
      }
    });
  });

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Init isotope layout and filters
   */
  document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
    let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
    let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
    let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

    let initIsotope;
    imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
      initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
        itemSelector: '.isotope-item',
        layoutMode: layout,
        filter: filter,
        sortBy: sort
      });
    });

    isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
      filters.addEventListener('click', function() {
        isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
        this.classList.add('filter-active');
        initIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        if (typeof aosInit === 'function') {
          aosInit();
        }
      }, false);
    });

  });

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener('load', function(e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy (solo animación): marca activo el enlace de la sección
   * que cruza una línea guía del viewport para mejorar precisión.
   */
  function initScrollSpy() {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    if (!sections.length) return;

    function updateActiveNav() {
      const guideY = window.scrollY + window.innerHeight * 0.35; // línea guía al 35%
      let current = sections[0];
      for (const sec of sections) {
        const top = sec.getBoundingClientRect().top + window.scrollY;
        if (top <= guideY) current = sec; else break;
      }
      if (current && current.id) {
        document.querySelectorAll('.navmenu a').forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.navmenu a[href="#${current.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    }

    let ticking = false;
    function onScrollOrResize() {
      if (!ticking) {
        window.requestAnimationFrame(() => { updateActiveNav(); ticking = false; });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('load', updateActiveNav);
    updateActiveNav();
  }

  // Inicializar scrollspy
  initScrollSpy();

  // Navegación por anclas (click) manteniendo animación activa
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      document.querySelectorAll('#navmenu a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          const targetId = this.getAttribute('href');
          const target = document.querySelector(targetId);

          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.navmenu a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const header = document.querySelector('.header');
            if (header && header.classList.contains('header-show')) {
              header.classList.remove('header-show');
              const toggleBtn = document.querySelector('.header-toggle');
              if (toggleBtn) { toggleBtn.classList.remove('bi-x'); toggleBtn.classList.add('bi-list'); }
            }
          }
        });
      });
    }, 300);
  });

})();
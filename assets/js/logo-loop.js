// LogoLoop - Adaptación del componente de React Bits para vanilla JavaScript
class LogoLoop {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.options = {
      speed: options.speed || 120,
      direction: options.direction || 'left',
      width: options.width || '100%',
      logoHeight: options.logoHeight || 48,
      gap: options.gap || 40,
      pauseOnHover: options.pauseOnHover !== false,
      fadeOut: options.fadeOut || false,
      fadeOutColor: options.fadeOutColor || '#ffffff',
      scaleOnHover: options.scaleOnHover || false,
      ariaLabel: options.ariaLabel || 'Technology logos',
      className: options.className || '',
      mode: options.mode || 'circular', // 'circular' | 'linear'
      ...options
    };
    
    this.offset = 0;
    this.velocity = 0;
    this.targetVelocity = 0;
    this.seqWidth = 0;
    this.copyCount = 2;
    this.isHovered = false;
    this.animationId = null;
    this.lastTimestamp = null;
    // Drag & inertia state
    this.isDragging = false;
    this.dragStartAngle = 0;
    this.lastDragAngle = 0;
    this.lastDragTime = 0;
    this.inertia = 0; // additional angular speed from user interaction (rad/s)
    this.init();
  }

  // Mostrar/ocultar tooltip para modo lineal
  showLinearTooltip(text, evt) {
    if (!this.linearTooltip) return;
    const span = this.linearTooltip.querySelector('.logoloop-linear-tooltip__text');
    if (span) span.textContent = text || '';
    this.linearTooltip.hidden = false;
    this.positionLinearTooltipAtEvent(evt);
  }

  hideLinearTooltip() {
    if (this.linearTooltip) this.linearTooltip.hidden = true;
  }

  positionLinearTooltipAtEvent(evt) {
    if (!this.linearTooltip || !this.linearViewport) return;
    const vpRect = this.linearViewport.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const x = clientX - vpRect.left;
    const y = clientY - vpRect.top;
    // posicionar arriba del cursor, centrado
    const offsetY = -16; // subir un poco
    this.linearTooltip.style.transform = `translate(${Math.max(12, Math.min(vpRect.width-12, x))}px, ${Math.max(12, y+offsetY)}px)`;
  }

  // Arrastre y scroll para modo lineal
  addLinearDragEvents() {
    if (!this.linearViewport || !this.linearTrack) return;
    let isDown = false; let startX = 0; let startOffset = 0;

    const onDown = (e) => {
      isDown = true;
      this._linearPaused = true;
      this.linearViewport.style.cursor = 'grabbing';
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      startOffset = this._linearX || 0;
      e.preventDefault();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    };

    const onMove = (e) => {
      if (!isDown) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const dx = x - startX;
      this._linearX = startOffset + dx;
      this.linearTrack.style.transform = `translateX(${this._linearX}px)`;
    };

    const onUp = () => {
      isDown = false;
      this.linearViewport.style.cursor = 'grab';
      // reanudar auto-scroll
      this._linearPaused = false;
      window.removeEventListener('pointermove', onMove);
    };

    this.linearViewport.addEventListener('pointerdown', onDown);

    // Scroll con rueda del mouse (horizontal)
    this.linearViewport.addEventListener('wheel', (e) => {
      // Desplaza horizontal con wheel; suaviza multiplicando
      const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX);
      this._linearPaused = true;
      this._linearX -= delta * 0.6;
      this.linearTrack.style.transform = `translateX(${this._linearX}px)`;
      // reanudar luego de un pequeño timeout
      clearTimeout(this._wheelResumeTimer);
      this._wheelResumeTimer = setTimeout(() => { this._linearPaused = false; }, 180);
      e.preventDefault();
    }, { passive: false });
  }

  // Estructura alternativa: carrusel horizontal lineal (móvil)
  createStructureLinear() {
    const logos = this.getLogos();
    const items = logos.map((logo, i) => {
      const isNodeItem = 'node' in logo;
      const content = isNodeItem ? logo.node : `<img src="${logo.src}" alt="${logo.alt||''}" title="${logo.title||''}" loading="lazy" />`;
      const label = (isNodeItem ? (logo.ariaLabel || logo.title) : (logo.alt || logo.title)) || 'logo';
      return `<div class="logoloop-linear__item" role="img" aria-label="${label}" title="${label}" data-tech-name="${label}">${content}</div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="logoloop-linear-viewport ${this.options.className}" style="overflow:hidden;width:100%;padding:6px 8px;cursor:grab;position:relative;">
        <div class="logoloop-linear-track" id="logoloop-linear-track" style="display:inline-flex;flex-wrap:nowrap;align-items:center;gap:12px;will-change:transform;">
          ${items}
          ${items}
        </div>
        <div class="logoloop-linear-tooltip" id="logoloop-linear-tooltip" hidden>
          <span class="logoloop-linear-tooltip__text">Tecnologías</span>
        </div>
      </div>
    `;
    // Asegurar que el contenedor no tenga una altura fija pensada para el modo circular
    this.container.style.height = 'auto';

    // Referencias para carrusel lineal por transform
    this.linearViewport = this.container.querySelector('.logoloop-linear-viewport');
    this.linearTrack = this.container.querySelector('#logoloop-linear-track');
    this.linearTooltip = this.container.querySelector('#logoloop-linear-tooltip');
    this._linearX = 0;
    this._linearLastTs = 0;
    this.linearSpeed = this.options.linearSpeed || 40; // px/seg

    // Pausa en hover si aplica
    if (this.options.pauseOnHover) {
      this.linearViewport.addEventListener('mouseenter', () => this._linearPaused = true);
      this.linearViewport.addEventListener('mouseleave', () => this._linearPaused = false);
      this.linearViewport.addEventListener('touchstart', () => this._linearPaused = true, {passive:true});
      this.linearViewport.addEventListener('touchend', () => this._linearPaused = false);
    }

    // Soporte de arrastre con mouse/touch y scroll con rueda
    this.addLinearDragEvents();

    // Tooltips de nombre en hover sobre cada ítem
    const linearItems = this.container.querySelectorAll('.logoloop-linear__item');
    linearItems.forEach((el) => {
      el.addEventListener('mouseenter', (e) => {
        const name = el.getAttribute('data-tech-name') || el.getAttribute('title') || '';
        this.showLinearTooltip(name, e);
        this._linearPaused = true;
      });
      el.addEventListener('mousemove', (e) => this.positionLinearTooltipAtEvent(e));
      el.addEventListener('mouseleave', () => {
        this.hideLinearTooltip();
        this._linearPaused = false;
      });
      el.addEventListener('touchstart', (e) => {
        const name = el.getAttribute('data-tech-name') || el.getAttribute('title') || '';
        this.showLinearTooltip(name, e);
        setTimeout(() => this.hideLinearTooltip(), 900);
      }, { passive: true });
    });
  }

  init() {
    this.addStyles();
    if (this.options.mode === 'linear') {
      this.createStructureLinear();
      // auto-movimiento horizontal sin mostrar scrollbar
      this.startLinearAutoScroll();
    } else {
      this.createStructure();
      this.addDragEvents();
      this.startAnimation();
    }
  }
  
  createStructure() {
    this.container.innerHTML = `
      <div class="logoloop-circular ${this.options.scaleOnHover ? 'logoloop--scale-hover' : ''} ${this.options.className}">
        <div class="logoloop__circular-track">
          ${this.generateCircularLogos()}
        </div>
        <div class="logoloop__center-tooltip">
          <span class="logoloop__center-text">Tecnologías</span>
        </div>
      </div>
    `;
    
    this.track = this.container.querySelector('.logoloop__circular-track');
    this.centerTooltip = this.container.querySelector('.logoloop__center-tooltip');
    this.centerText = this.container.querySelector('.logoloop__center-text');
    this.angle = 0;
    // Cache all logo link nodes to apply counter-rotation (Ferris wheel effect)
    this.itemLinks = this.container.querySelectorAll('.logoloop__circular-link');
    
    this.addTooltipEvents();
    
    if (this.options.pauseOnHover) {
      this.container.addEventListener('mouseenter', () => this.isHovered = true);
      this.container.addEventListener('mouseleave', () => this.isHovered = false);
    }
  }
  
  // Mantiene el track rotando y los iconos verticales
  applyRotation() {
    if (this.track) {
      this.track.style.transform = `rotate(${this.angle}rad)`;
    }
    if (this.itemLinks && this.itemLinks.length) {
      const inv = `rotate(${-this.angle}rad)`;
      this.itemLinks.forEach(el => { el.style.transform = inv; });
    }
  }


  

  generateCircularLogos() {
    const logos = this.getLogos();
    //const radius = this.options.radius || 2200; // Radio aún más grande para más separación
    // Ajuste responsive del radio
let radius;
if (window.innerWidth <= 480) {
  radius = this.options.radius || 140; // móviles pequeños
} else if (window.innerWidth <= 768) {
  radius = this.options.radius || 190; // tablets
} else {
  radius = this.options.radius || 240; // escritorio
}

    const angleStep = (2 * Math.PI) / logos.length;
    
    return logos.map((logo, index) => {
      const angle = index * angleStep;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      return `
        <div class="logoloop__circular-item" 
             style="transform: translate(${x}px, ${y}px) translate(-50%, -50%);">
          ${this.renderCircularLogoItem(logo, index)}
        </div>
      `;
    }).join('');
  }
  
  getLogos() {
    const logos = [
      { node: '<iconify-icon icon="simple-icons:powerbi" width="44" height="44" style="color:#F2C811"></iconify-icon>', title: 'Power BI', href: 'https://powerbi.microsoft.com', priority: 2 },
      { node: '<iconify-icon icon="logos:java" width="44" height="44"></iconify-icon>', title: 'Java', href: 'https://www.java.com', priority: 3 },
      { node: '<iconify-icon icon="simple-icons:oracle" width="44" height="44" style="color:#F80000"></iconify-icon>', title: 'Oracle SQL', href: 'https://www.oracle.com/database/', priority: 2 },
      { node: '<iconify-icon icon="simple-icons:python" width="44" height="44" style="color:#3776AB"></iconify-icon>', title: 'Python', href: 'https://www.python.org', priority: 3 },
      { node: '<iconify-icon icon="simple-icons:html5" width="44" height="44" style="color:#E34F26"></iconify-icon>', title: 'HTML', href: 'https://developer.mozilla.org/en-US/docs/Web/HTML', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:git" width="44" height="44" style="color:#F05032"></iconify-icon>', title: 'Git', href: 'https://git-scm.com', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:jupyter" width="44" height="44" style="color:#F37626"></iconify-icon>', title: 'Jupyter', href: 'https://jupyter.org', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:mysql" width="44" height="44" style="color:#4479A1"></iconify-icon>', title: 'MySQL', href: 'https://www.mysql.com', priority: 2 },
      { node: '<iconify-icon icon="simple-icons:microsoftsqlserver" width="44" height="44" style="color:#CC2927"></iconify-icon>', title: 'SQL Server', href: 'https://www.microsoft.com/en-us/sql-server', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:javascript" width="44" height="44" style="color:#F7DF1E"></iconify-icon>', title: 'JavaScript', href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', priority: 3 },
      { node: '<iconify-icon icon="simple-icons:css3" width="44" height="44" style="color:#1572B6"></iconify-icon>', title: 'CSS', href: 'https://developer.mozilla.org/en-US/docs/Web/CSS', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:microsoftexcel" width="44" height="44" style="color:#217346"></iconify-icon>', title: 'Excel', href: 'https://www.microsoft.com/en-us/microsoft-365/excel', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:vercel" width="44" height="44" style="color:#FFFFFF"></iconify-icon>', title: 'Vercel', href: 'https://vercel.com', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:googleanalytics" width="44" height="44" style="color:#FF6D01"></iconify-icon>', title: 'Google Analytics', href: 'https://analytics.google.com', priority: 2 },
      { node: '<iconify-icon icon="simple-icons:nodedotjs" width="44" height="44" style="color:#339933"></iconify-icon>', title: 'Node.js', href: 'https://nodejs.org', priority: 3 },
      { node: '<iconify-icon icon="simple-icons:express" width="44" height="44" style="color:#FFFFFF"></iconify-icon>', title: 'Express.js', href: 'https://expressjs.com', priority: 2 },
      { node: '<iconify-icon icon="simple-icons:render" width="44" height="44" style="color:#46E3B7"></iconify-icon>', title: 'Render', href: 'https://render.com', priority: 1 },
      { node: '<iconify-icon icon="simple-icons:github" width="44" height="44" style="color:#FFFFFF"></iconify-icon>', title: 'GitHub', href: 'https://github.com/Alberto-Briones', priority: 2 },
      { node: '<iconify-icon icon="simple-icons:react" width="44" height="44" style="color:#61DAFB"></iconify-icon>', title: 'React', href: 'https://react.dev', priority: 3 },
      { node: '<iconify-icon icon="simple-icons:vite" width="44" height="44" style="color:#646CFF"></iconify-icon>', title: 'Vite', href: 'https://vitejs.dev', priority: 2 }
    ];

    // Ordenar por prioridad (desc) para mostrar primero lo más fuerte
    return logos.sort((a,b) => (b.priority||0) - (a.priority||0));
  }
  
  renderCircularLogoItem(item, key) {
    const isNodeItem = 'node' in item;
    let content;
    if (isNodeItem) {
      content = `<span class="logoloop__circular-node" aria-hidden="${!!item.href && !item.ariaLabel}">${item.node}</span>`;
    } else {
      const imgSrc = item.src;
      const fallbackSrc = imgSrc.replace(/\/[0-9A-Fa-f]{6}$/,'/FFFFFF');
      content = `<img src="${imgSrc}" alt="${item.alt || ''}" title="${item.title || ''}" loading="lazy" decoding="async" draggable="false" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null;this.src='${fallbackSrc}';" />`;
    }
    
    const itemAriaLabel = isNodeItem ? (item.ariaLabel || item.title) : (item.alt || item.title);
    
    // No redirección: siempre usar un DIV conservando clases y accesibilidad
    const itemContent = `<div class="logoloop__circular-link" role="img" aria-label="${itemAriaLabel || 'logo'}" data-tech-name="${item.title}">${content}</div>`;
    
    return itemContent;
  }
  
  addTooltipEvents() {
    const items = this.container.querySelectorAll('.logoloop__circular-item');
    
    items.forEach(item => {
      const link = item.querySelector('.logoloop__circular-link');
      if (link) {
        link.addEventListener('mouseenter', (e) => {
          const techName = e.currentTarget.getAttribute('data-tech-name');
          if (techName && this.centerText) {
            this.centerText.textContent = techName;
            this.centerTooltip.classList.add('active');
          }
        });
        
        link.addEventListener('mouseleave', () => {
          if (this.centerText) {
            this.centerText.textContent = 'Tecnologías';
            this.centerTooltip.classList.remove('active');
          }
        });
      }
    });
  }
  
  updateDimensions() {
    const containerWidth = this.container.clientWidth;
    const seqElement = this.container.querySelector('[data-seq]');
    const sequenceWidth = seqElement ? seqElement.getBoundingClientRect().width : 0;
    
    if (sequenceWidth > 0) {
      this.seqWidth = Math.ceil(sequenceWidth);
      const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + 2;
      this.copyCount = Math.max(2, copiesNeeded);
      
      // Regenerar las listas si es necesario
      if (this.copyCount > 2) {
        this.track.innerHTML = this.generateLogoLists();
      }
    }
  }
  
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .logoloop-circular {
        position: relative;
        width: 650px; /* ampliado para mayor separación */
        height: 650px; /* ampliado para mayor separación */
        margin: 0 auto;
        z-index: 10; /* traer el carrusel al frente */
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .logoloop__circular-track {
        position: relative;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
        will-change: transform;
        user-select: none;
        touch-action: none; /* permitir gesto personalizado */
      }
      
      .logoloop__circular-item {
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
      }
      
      .logoloop__circular-node {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        backdrop-filter: blur(15px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        font-size: 32px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .logoloop__circular-item img {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: contain;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .logoloop--scale-hover .logoloop__circular-item:hover .logoloop__circular-node,
      .logoloop--scale-hover .logoloop__circular-item:hover img {
        transform: scale(1.3);
        box-shadow: 0 0 0 3px rgba(168,85,247,.25), 0 0 22px rgba(168,85,247,.55), 0 8px 22px rgba(0,0,0,.35);
        background: rgba(255, 255, 255, 0.22);
      }
      
      .logoloop__circular-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        border-radius: 50%;
        transition: opacity 0.2s ease, filter .2s ease;
        cursor: pointer;
      }
      .logoloop__circular-track.grabbing { cursor: grabbing; }
      
      .logoloop__circular-link:hover {
        opacity: 0.95;
        filter: saturate(1.2);
      }
      
      .logoloop__circular-link:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      
      .logoloop__center-tooltip {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 700;
        pointer-events: none;
        z-index: 1000;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        text-align: center;
        min-width: 120px;
        opacity: 0.9;
      }
      
      .logoloop__center-tooltip.active {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.05);
        background: rgba(0, 0, 0, 0.9);
        border-color: rgba(255, 255, 255, 0.5);
      }
      
      .logoloop__center-text {
        display: block;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      /* Linear mode: aplicar mismas propiedades visuales que el carrusel circular */
      .logoloop-linear__item {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        backdrop-filter: blur(15px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }

      .logoloop--scale-hover .logoloop-linear__item:hover {
        transform: scale(1.3);
        box-shadow: 0 0 0 3px rgba(168,85,247,.25), 0 0 22px rgba(168,85,247,.55), 0 8px 22px rgba(0,0,0,.35);
        background: rgba(255, 255, 255, 0.22);
        filter: saturate(1.2);
      }

      /* Estado seleccionado/enfocado con contorno morado (igual al circular) */
      .logoloop-linear__item:focus,
      .logoloop-linear__item:focus-visible,
      .logoloop-linear__item:active {
        outline: none;
        border-color: rgba(168,85,247,.9);
        box-shadow: 0 0 0 3px rgba(168,85,247,.25), 0 0 22px rgba(168,85,247,.55), 0 8px 22px rgba(0,0,0,.35);
        background: rgba(255, 255, 255, 0.22);
      }

      /* Tooltip flotante en modo lineal (similar al tooltip central) */
      .logoloop-linear-tooltip {
        position: absolute;
        top: 0; left: 0;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 700;
        pointer-events: none;
        z-index: 1000;
        transition: opacity 0.2s ease, transform 0.2s ease;
        backdrop-filter: blur(12px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        white-space: nowrap;
      }

      /* Variante lineal (móvil) */
      .logoloop-linear { display:flex; align-items:center; gap:12px; overflow-x:auto; padding:6px 8px; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch; }
      .logoloop-linear__item { flex:0 0 auto; width:56px; height:56px; border-radius:12px; background:rgba(255,255,255,0.08); display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.18); box-shadow:0 6px 18px rgba(0,0,0,0.25); scroll-snap-align:center; }
      .logoloop-linear__item img, .logoloop-linear__item iconify-icon { max-width:36px; max-height:36px; }

      @media (max-width: 768px) { .logoloop-circular { width: 430px; height: 430px; } .logoloop__circular-node, .logoloop__circular-item img { width: 60px; height: 60px; font-size: 24px; } }
      @media (max-width: 576px) { .logoloop-circular { width: 360px; height: 360px; } .logoloop__circular-node, .logoloop__circular-item img { width: 48px; height: 48px; font-size: 20px; } }

      @media (prefers-reduced-motion: reduce) {
        .logoloop__circular-track {
          transform: rotate(0deg) !important;
        }
        
{{ ... }}
        .logoloop__circular-node,
        .logoloop__circular-item img {
          transition: none !important;
        }
      }
        @media (max-width: 768px) {
  .logoloop-circular { width: 360px; height: 360px; }
  .logoloop__circular-node,
  .logoloop__circular-item img {
    width: 55px;
    height: 55px;
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .logoloop-circular { width: 280px; height: 280px; }
  .logoloop__circular-node,
  .logoloop__circular-item img {
    width: 45px;
    height: 45px;
    font-size: 20px;
  }
}

    `;
    document.head.appendChild(style);
  }
  
  // Arrastre con inercia
  addDragEvents() {
    const getCenter = () => {
      const rect = this.container.getBoundingClientRect();
      return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    };

    const getAngleFromEvent = (e) => {
      const { cx, cy } = getCenter();
      const x = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX));
      const y = (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY));
      return Math.atan2(y - cy, x - cx);
    };

    const onDown = (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.inertia = 0;
      this.dragStartAngle = getAngleFromEvent(e);
      this.initialAngle = this.angle;
      this.lastDragAngle = this.dragStartAngle;
      this.lastDragTime = performance.now();
      this.track && this.track.classList.add('grabbing');
      this.isHovered = true; // pausar mientras se arrastra
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const a = getAngleFromEvent(e);
      let delta = a - this.dragStartAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      this.angle = this.initialAngle + delta;

      const now = performance.now();
      let d = a - this.lastDragAngle;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      const dt = Math.max(1, now - this.lastDragTime) / 1000;
      this.velocity = 0;
      this.applyRotation();
      this.lastDragAngle = a;
      this.lastDragTime = now;
      this._instantSpeed = d / dt; // rad/s
    };

    const onUp = () => {
      this.isDragging = false;
      this.track && this.track.classList.remove('grabbing');
      this.isHovered = false;
      const max = 2.5; // rad/s
      const s = Math.max(-max, Math.min(max, this._instantSpeed || 0));
      this.inertia = s;
      window.removeEventListener('pointermove', onMove);
    };

    this.container.addEventListener('pointerdown', onDown);
  }

  startAnimation() {
    const baseSpeed = this.options.speed / 200; // rad/s
    const direction = this.options.direction === 'left' ? 1 : -1;

    const animate = (timestamp) => {
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }
      
      const deltaTime = Math.max(0, timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;
      // decaimiento de inercia
      if (Math.abs(this.inertia) > 1e-4) {
        this.inertia *= Math.pow(0.92, deltaTime * 60);
        if (Math.abs(this.inertia) < 1e-4) this.inertia = 0;
      }

      const auto = this.options.pauseOnHover && this.isHovered ? 0 : baseSpeed * direction;
      const targetSpeed = this.isDragging ? 0 : (auto + this.inertia);

      const easingFactor = 1 - Math.exp(-deltaTime / 0.25);
      this.velocity += (targetSpeed - this.velocity) * easingFactor;
      
      this.angle += this.velocity * deltaTime;
      this.applyRotation();
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  // Movimiento continuo para modo lineal (sin mostrar scrollbar)
  startLinearAutoScroll() {
    if (!this.linearTrack) return;

    const track = this.linearTrack;
    const computeSetWidth = () => track.scrollWidth / 2; // duplicamos items
    let setWidth = computeSetWidth();

    const step = (ts) => {
      if (!this._linearLastTs) this._linearLastTs = ts;
      const dt = Math.max(0, ts - this._linearLastTs) / 1000; // segundos
      this._linearLastTs = ts;

      if (!this._linearPaused) {
        const speed = this.linearSpeed || 40; // px/seg
        this._linearX = (this._linearX || 0) - speed * dt;
        // wrap infinito al completar una tanda
        if (Math.abs(this._linearX) >= setWidth) {
          this._linearX = 0;
          setWidth = computeSetWidth();
        }
        track.style.transform = `translateX(${this._linearX}px)`;
      }

      this._linearRaf = requestAnimationFrame(step);
    };

    cancelAnimationFrame(this._linearRaf);
    this._linearRaf = requestAnimationFrame(step);
  }
  
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  destroy() {
    this.stopAnimation();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const skillsSection = entry.target;
        const logoContainer = skillsSection.querySelector('#logo-loop');
        
        if (logoContainer && !window.logoLoop) {
          const isPhone = window.matchMedia('(max-width: 576px)').matches;
          const isTablet = window.matchMedia('(min-width: 577px) and (max-width: 991px)').matches;
          const radius = isPhone ? 190 : (isTablet ? 240 : 301);
          window.logoLoop = new LogoLoop('logo-loop', {
            mode: isPhone ? 'linear' : 'circular',
            speed: 80,
            direction: 'left',
            radius,
            pauseOnHover: true,
            scaleOnHover: true
          });
        }
      }
    });
  }, { threshold: 0.3 });
  
  const skillsSection = document.getElementById('skills');
  if (skillsSection) {
    observer.observe(skillsSection);
  }
});

'use strict';

class SplashCursor {
  constructor(options = {}) {
    this.config = {
      SIM_RESOLUTION: options.SIM_RESOLUTION || 128,
      DYE_RESOLUTION: options.DYE_RESOLUTION || 1024,
      CAPTURE_RESOLUTION: options.CAPTURE_RESOLUTION || 512,
      DENSITY_DISSIPATION: options.DENSITY_DISSIPATION || 1.5,
      VELOCITY_DISSIPATION: options.VELOCITY_DISSIPATION || 1.0,
      PRESSURE: options.PRESSURE || 0.1,
      PRESSURE_ITERATIONS: options.PRESSURE_ITERATIONS || 20,
      CURL: options.CURL || 8,
      SPLAT_RADIUS: options.SPLAT_RADIUS || 0.25,
      SPLAT_FORCE: options.SPLAT_FORCE || 12000,
      SHADING: options.SHADING !== undefined ? options.SHADING : true,
      COLOR_UPDATE_SPEED: options.COLOR_UPDATE_SPEED || 6,
      AUTO_COLOR_CYCLE: options.AUTO_COLOR_CYCLE !== undefined ? options.AUTO_COLOR_CYCLE : true,
      PAUSED: false,
      BACK_COLOR: options.BACK_COLOR || { r: 0.0, g: 0.0, b: 0.0 },
      TRANSPARENT: options.TRANSPARENT !== undefined ? options.TRANSPARENT : true,
      // Nuevas opciones para controlar el estilo
      INITIAL_SPLASH: options.INITIAL_SPLASH !== undefined ? options.INITIAL_SPLASH : true,
      MULTI_SPLASH: options.MULTI_SPLASH !== undefined ? options.MULTI_SPLASH : true,
      COLOR_BOOST: options.COLOR_BOOST !== undefined ? options.COLOR_BOOST : 1.5,
      FULLSCREEN: options.FULLSCREEN !== undefined ? options.FULLSCREEN : false,
      REACT_PALETTE: options.REACT_PALETTE !== undefined ? options.REACT_PALETTE : false
    };

    this.canvas = null;
    this.gl = null;
    this.ext = null;
    this.pointers = [this.createPointer()];
    this.lastUpdateTime = Date.now();
    this.colorUpdateTimer = 0.0;
    this.animationId = null;
    
    this.init();
  }

  createPointer() {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: [0, 0, 0]
    };
  }

  init() {
    try {
      console.log('🎯 Step 1: Creating canvas...');
      this.createCanvas();
      
      console.log('🎯 Step 2: Setting up WebGL...');
      this.setupWebGL();
      
      console.log('🎯 Step 3: Compiling shaders...');
      this.setupShaders();
      
      console.log('🎯 Step 4: Creating framebuffers...');
      this.setupFramebuffers();
      
      console.log('🎯 Step 5: Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('🎯 Step 6: Starting animation...');
      this.startAnimation();
      
      console.log('✅ SplashCursor initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SplashCursor:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  createCanvas() {
    if (this.config.FULLSCREEN) {
      // Full-screen container attached to body
      const existing = document.getElementById('splash-container');
      if (existing) existing.remove();
      const container = document.createElement('div');
      container.id = 'splash-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        z-index: 50;
        pointer-events: none;
        width: 100%;
        height: 100%;
      `;
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'fluid';
      this.canvas.style.cssText = `
        width: 100vw;
        height: 100vh;
        display: block;
      `;
      container.appendChild(this.canvas);
      document.body.appendChild(container);
      console.log('✅ Fullscreen canvas created');
    } else {
      console.log('🔍 Looking for hero section...');
      const heroSection = document.getElementById('hero');
      if (!heroSection) {
        console.error('❌ Hero section not found');
        return;
      }
      // Si existe un canvas estático previo en el hero, ocultarlo para evitar duplicados
      const staticFluid = heroSection.querySelector('#fluid-canvas-webgl, #fluid-canvas');
      if (staticFluid) {
        staticFluid.style.display = 'none';
      }
      // Limpieza defensiva: si quedó algún contenedor global de pantalla completa, eliminarlo
      const globalContainer = document.getElementById('splash-container');
      if (globalContainer && globalContainer.parentElement === document.body) {
        console.log('🧹 Removing leftover global splash-container');
        globalContainer.remove();
      }
      console.log('✅ Hero section found:', heroSection);
      // Eliminar contenedor/canvas previos dentro del hero
      const existingHeroContainer = heroSection.querySelector('#splash-hero-container');
      if (existingHeroContainer) existingHeroContainer.remove();
      const existingCanvas = heroSection.querySelector('#fluid');
      if (existingCanvas) {
        console.log('🧹 Removing existing canvas...');
        existingCanvas.remove();
      }
      console.log('🎨 Creating canvas container...');
      const container = document.createElement('div');
      container.id = 'splash-hero-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0; /* por detrás del contenido del hero */
        pointer-events: none;
        width: 100%;
        height: 100%;
        opacity: 1;
      `;
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'fluid';
      this.canvas.style.cssText = `
        width: 100%;
        height: 100%;
        display: block;
        opacity: 1;
      `;
      container.appendChild(this.canvas);
      heroSection.appendChild(container);
      heroSection.style.position = 'relative';
      // Clip del contenido para que el efecto no se vea fuera del hero
      heroSection.style.overflow = 'hidden';
      // Forzar altura exacta de viewport para que el canvas no se extienda
      heroSection.style.height = '100vh';
      heroSection.style.maxHeight = '100vh';
      heroSection.style.minHeight = '100vh';
      // El template aplica padding al hero; lo quitamos para no exceder 100vh
      heroSection.style.padding = '0';
      
      // Pausar animación cuando #hero no esté a la vista
      try {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const visible = entry.isIntersecting && entry.intersectionRatio > 0;
            this.config.PAUSED = !visible;
            // Mostrar/ocultar completamente el contenedor fuera de vista
            const ctn = document.getElementById('splash-hero-container');
            if (ctn) {
              ctn.style.display = visible ? 'block' : 'none';
              ctn.style.opacity = visible ? '1' : '0';
            }
          });
        }, { threshold: [0, 0.2, 0.5, 0.8, 1] });
        io.observe(heroSection);
      } catch (e) {
        console.warn('IntersectionObserver not available:', e);
      }
      console.log(' Canvas created and added to hero section');
      console.log(' Canvas dimensions:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
    }
  }

  setupWebGL() {
    if (!this.canvas) {
      throw new Error('Canvas not created');
    }

    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false
    };

    this.gl = this.canvas.getContext('webgl2', params);
    const isWebGL2 = !!this.gl;
    if (!isWebGL2) {
      this.gl = this.canvas.getContext('webgl', params) || 
                this.canvas.getContext('experimental-webgl', params);
    }

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
      this.gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = this.gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = this.gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = this.gl.getExtension('OES_texture_half_float_linear');
    }

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? this.gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
    let formatRGBA, formatRG, formatR;

    if (isWebGL2) {
      formatRGBA = this.getSupportedFormat(this.gl, this.gl.RGBA16F, this.gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(this.gl, this.gl.RG16F, this.gl.RG, halfFloatTexType);
      formatR = this.getSupportedFormat(this.gl, this.gl.R16F, this.gl.RED, halfFloatTexType);
    } else {
      formatRGBA = this.getSupportedFormat(this.gl, this.gl.RGBA, this.gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(this.gl, this.gl.RGBA, this.gl.RGBA, halfFloatTexType);
      formatR = this.getSupportedFormat(this.gl, this.gl.RGBA, this.gl.RGBA, halfFloatTexType);
    }

    this.ext = {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering
    };

    if (!this.ext.supportLinearFiltering) {
      this.config.DYE_RESOLUTION = 256;
      this.config.SHADING = false;
    }

    console.log('WebGL setup completed');
  }

  getSupportedFormat(gl, internalFormat, format, type) {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return this.getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  setupShaders() {
    // Vertex shader
    const vertexShaderSource = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;

      void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment shaders
    const copyShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;

      void main () {
          gl_FragColor = texture2D(uTexture, vUv);
      }
    `;

    const clearShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;

      void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `;

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform sampler2D uDithering;
      uniform vec2 ditherScale;
      uniform vec2 texelSize;

      vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
      }

      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
              vec3 lc = texture2D(uTexture, vL).rgb;
              vec3 rc = texture2D(uTexture, vR).rgb;
              vec3 tc = texture2D(uTexture, vT).rgb;
              vec3 bc = texture2D(uTexture, vB).rgb;

              float dx = length(rc) - length(lc);
              float dy = length(tc) - length(bc);

              vec3 n = normalize(vec3(dx, dy, length(texelSize)));
              vec3 l = vec3(0.0, 0.0, 1.0);

              float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
              c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
      }
    `;

    const splatShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;

      void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const advectionShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;

      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);

          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }

      void main () {
          #ifdef MANUAL_FILTERING
              vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
              vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
              vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
              vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
      }
    `;

    const divergenceShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;

          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }

          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const curlShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `;

    const vorticityShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;

      void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;

          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;

          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity += force * dt;
          velocity = min(max(velocity, -1000.0), 1000.0);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const pressureShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;

      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float C = texture2D(uPressure, vUv).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    // Compile shaders
    this.baseVertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    this.copyShader = this.compileShader(this.gl.FRAGMENT_SHADER, copyShaderSource);
    this.clearShader = this.compileShader(this.gl.FRAGMENT_SHADER, clearShaderSource);
    this.displayShader = this.compileShader(this.gl.FRAGMENT_SHADER, displayShaderSource);
    this.splatShader = this.compileShader(this.gl.FRAGMENT_SHADER, splatShaderSource);
    this.advectionShader = this.compileShader(this.gl.FRAGMENT_SHADER, advectionShaderSource, 
      this.ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);
    this.divergenceShader = this.compileShader(this.gl.FRAGMENT_SHADER, divergenceShaderSource);
    this.curlShader = this.compileShader(this.gl.FRAGMENT_SHADER, curlShaderSource);
    this.vorticityShader = this.compileShader(this.gl.FRAGMENT_SHADER, vorticityShaderSource);
    this.pressureShader = this.compileShader(this.gl.FRAGMENT_SHADER, pressureShaderSource);
    this.gradientSubtractShader = this.compileShader(this.gl.FRAGMENT_SHADER, gradientSubtractShaderSource);

    // Create programs
    this.copyProgram = this.createProgram(this.baseVertexShader, this.copyShader);
    this.clearProgram = this.createProgram(this.baseVertexShader, this.clearShader);
    this.splatProgram = this.createProgram(this.baseVertexShader, this.splatShader);
    this.displayProgram = this.createProgram(this.baseVertexShader, this.displayShader);
    this.advectionProgram = this.createProgram(this.baseVertexShader, this.advectionShader);
    this.divergenceProgram = this.createProgram(this.baseVertexShader, this.divergenceShader);
    this.curlProgram = this.createProgram(this.baseVertexShader, this.curlShader);
    this.vorticityProgram = this.createProgram(this.baseVertexShader, this.vorticityShader);
    this.pressureProgram = this.createProgram(this.baseVertexShader, this.pressureShader);
    this.gradientSubtractProgram = this.createProgram(this.baseVertexShader, this.gradientSubtractShader);

    console.log('Shaders compiled successfully');
  }

  compileShader(type, source, keywords) {
    source = this.addKeywords(source, keywords);
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  addKeywords(source, keywords) {
    if (!keywords) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
      keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
  }

  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
    }
    return program;
  }

  getUniforms(program) {
    let uniforms = {};
    let uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = this.gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = this.gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  setupFramebuffers() {
    const simRes = this.getResolution(this.config.SIM_RESOLUTION);
    const dyeRes = this.getResolution(this.config.DYE_RESOLUTION);
    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST;
    
    this.gl.disable(this.gl.BLEND);

    if (!this.dye)
      this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else
      this.dye = this.resizeDoubleFBO(this.dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (!this.velocity)
      this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else
      this.velocity = this.resizeDoubleFBO(this.velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
    this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);

    console.log('Framebuffers created');
  }

  createFBO(w, h, internalFormat, format, type, param) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, param);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, param);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    this.gl.viewport(0, 0, w, h);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1.0 / w,
      texelSizeY: 1.0 / h,
      attach: (id) => {
        this.gl.activeTexture(this.gl.TEXTURE0 + id);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; },
      set read(value) { fbo1 = value; },
      get write() { return fbo2; },
      set write(value) { fbo2 = value; },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  resizeFBO(target, w, h, internalFormat, format, type, param) {
    let newFBO = this.createFBO(w, h, internalFormat, format, type, param);
    this.gl.useProgram(this.copyProgram);
    this.gl.uniform1i(this.gl.getUniformLocation(this.copyProgram, 'uTexture'), target.attach(0));
    this.blit(newFBO);
    return newFBO;
  }

  resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = this.createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  setupEventListeners() {
    if (this.config.FULLSCREEN) {
      // Eventos globales al estilo React Bits
      window.addEventListener('mousedown', (e) => {
        const pointer = this.pointers[0];
        const posX = this.scaleByPixelRatio(e.clientX);
        const posY = this.scaleByPixelRatio(e.clientY);
        this.updatePointerDownData(pointer, -1, posX, posY);
        this.clickSplat(pointer);
      });

      window.addEventListener('mousemove', (e) => {
        const pointer = this.pointers[0];
        const posX = this.scaleByPixelRatio(e.clientX);
        const posY = this.scaleByPixelRatio(e.clientY);
        const color = pointer.color;
        this.updatePointerMoveData(pointer, posX, posY, color);
      });

      window.addEventListener('touchstart', (e) => {
        const touches = e.targetTouches;
        const pointer = this.pointers[0];
        for (let i = 0; i < touches.length; i++) {
          const posX = this.scaleByPixelRatio(touches[i].clientX);
          const posY = this.scaleByPixelRatio(touches[i].clientY);
          this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
        }
      });

      window.addEventListener('touchmove', (e) => {
        const touches = e.targetTouches;
        const pointer = this.pointers[0];
        for (let i = 0; i < touches.length; i++) {
          const posX = this.scaleByPixelRatio(touches[i].clientX);
          const posY = this.scaleByPixelRatio(touches[i].clientY);
          this.updatePointerMoveData(pointer, posX, posY, pointer.color);
        }
      }, { passive: true });

      window.addEventListener('touchend', (e) => {
        const touches = e.changedTouches;
        const pointer = this.pointers[0];
        for (let i = 0; i < touches.length; i++) {
          this.updatePointerUpData(pointer);
        }
      });

      console.log('Event listeners attached to window (fullscreen)');
    } else {
      const heroSection = document.getElementById('hero');
      if (!heroSection) {
        console.error('Hero section not found for event listeners');
        return;
      }
      // Mouse events - only within hero section
      heroSection.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const rect = heroSection.getBoundingClientRect();
        let pointer = this.pointers[0];
        let posX = this.scaleByPixelRatio(e.clientX - rect.left);
        let posY = this.scaleByPixelRatio(e.clientY - rect.top);
        this.updatePointerDownData(pointer, -1, posX, posY);
        this.clickSplat(pointer);
      });
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        let pointer = this.pointers[0];
        let posX = this.scaleByPixelRatio(e.clientX - rect.left);
        let posY = this.scaleByPixelRatio(e.clientY - rect.top);
        let color = pointer.color;
        this.updatePointerMoveData(pointer, posX, posY, color);
      });
      heroSection.addEventListener('touchstart', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const touches = e.targetTouches;
        let pointer = this.pointers[0];
        for (let i = 0; i < touches.length; i++) {
          let posX = this.scaleByPixelRatio(touches[i].clientX - rect.left);
          let posY = this.scaleByPixelRatio(touches[i].clientY - rect.top);
          this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
        }
      });
      heroSection.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = heroSection.getBoundingClientRect();
        const touches = e.targetTouches;
        let pointer = this.pointers[0];
        for (let i = 0; i < touches.length; i++) {
          let posX = this.scaleByPixelRatio(touches[i].clientX - rect.left);
          let posY = this.scaleByPixelRatio(touches[i].clientY - rect.top);
          this.updatePointerMoveData(pointer, posX, posY, pointer.color);
        }
      });
      heroSection.addEventListener('touchend', (e) => {
        const touches = e.changedTouches;
        let pointer = this.pointers[0];
        for (let i = 0; i < touches.length; i++) {
          this.updatePointerUpData(pointer);
        }
      });
      console.log('Event listeners attached to hero section');
    }
  }

  updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = this.generateColor();
  }

  updatePointerMoveData(pointer, posX, posY, color) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.canvas.height;
    pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  updatePointerUpData(pointer) {
    pointer.down = false;
  }

  correctDeltaX(delta) {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  correctDeltaY(delta) {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  generateColor() {
    if (this.config.REACT_PALETTE) {
      // Paleta idéntica al ejemplo de React Bits
      let c = this.HSVtoRGB(Math.random(), 1.0, 1.0);
      c.r *= this.config.COLOR_BOOST;
      c.g *= this.config.COLOR_BOOST;
      c.b *= this.config.COLOR_BOOST;
      return c;
    }
    // Paletas variadas por defecto
    const colorThemes = [
      () => this.HSVtoRGB(Math.random(), 0.8, 1.0),
      () => this.generateNeonColor(),
      () => this.generatePastelColor(),
      () => this.generateFireColor(),
      () => this.generateOceanColor(),
      () => this.generateSunsetColor()
    ];
    const selectedTheme = colorThemes[Math.floor(Math.random() * colorThemes.length)];
    let c = selectedTheme();
    c.r *= this.config.COLOR_BOOST;
    c.g *= this.config.COLOR_BOOST;
    c.b *= this.config.COLOR_BOOST;
    return c;
  }

  generateNeonColor() {
    const neonColors = [
      { r: 1.0, g: 0.0, b: 1.0 }, // Magenta
      { r: 0.0, g: 1.0, b: 1.0 }, // Cyan
      { r: 1.0, g: 1.0, b: 0.0 }, // Yellow
      { r: 0.0, g: 1.0, b: 0.0 }, // Lime
      { r: 1.0, g: 0.0, b: 0.0 }, // Red
      { r: 0.0, g: 0.0, b: 1.0 }  // Blue
    ];
    return neonColors[Math.floor(Math.random() * neonColors.length)];
  }

  generatePastelColor() {
    const hue = Math.random();
    const saturation = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
    const value = 0.7 + Math.random() * 0.3; // 0.7 to 1.0
    return this.HSVtoRGB(hue, saturation, value);
  }

  generateFireColor() {
    const fireColors = [
      { r: 1.0, g: 0.2, b: 0.0 }, // Deep red
      { r: 1.0, g: 0.4, b: 0.0 }, // Orange-red
      { r: 1.0, g: 0.6, b: 0.0 }, // Orange
      { r: 1.0, g: 0.8, b: 0.2 }, // Yellow-orange
      { r: 1.0, g: 1.0, b: 0.4 }  // Yellow
    ];
    return fireColors[Math.floor(Math.random() * fireColors.length)];
  }

  generateOceanColor() {
    const oceanColors = [
      { r: 0.0, g: 0.4, b: 0.8 }, // Deep blue
      { r: 0.0, g: 0.6, b: 1.0 }, // Blue
      { r: 0.2, g: 0.8, b: 1.0 }, // Light blue
      { r: 0.4, g: 0.9, b: 1.0 }, // Sky blue
      { r: 0.0, g: 0.8, b: 0.6 }  // Teal
    ];
    return oceanColors[Math.floor(Math.random() * oceanColors.length)];
  }

  generateSunsetColor() {
    const sunsetColors = [
      { r: 1.0, g: 0.3, b: 0.0 }, // Deep orange
      { r: 1.0, g: 0.5, b: 0.2 }, // Orange
      { r: 1.0, g: 0.7, b: 0.4 }, // Light orange
      { r: 1.0, g: 0.2, b: 0.4 }, // Pink-orange
      { r: 0.8, g: 0.2, b: 0.6 }, // Purple-pink
      { r: 0.6, g: 0.0, b: 0.8 }  // Purple
    ];
    return sunsetColors[Math.floor(Math.random() * sunsetColors.length)];
  }

  HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r, g, b };
  }

  clickSplat(pointer) {
    if (!this.config.MULTI_SPLASH) {
      // Comportamiento equivalente al ejemplo de React Bits
      const color = this.generateColor();
      color.r *= 10.0;
      color.g *= 10.0;
      color.b *= 10.0;
      const dx = 10 * (Math.random() - 0.5);
      const dy = 30 * (Math.random() - 0.5);
      this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
      return;
    }

    // Modo multi-splash (estilo más dramático)
    const numSplashes = 3 + Math.floor(Math.random() * 3); // 3-5 splashes
    for (let i = 0; i < numSplashes; i++) {
      const color = this.generateColor();
      color.r *= 12.0 + Math.random() * 8.0;
      color.g *= 12.0 + Math.random() * 8.0;
      color.b *= 12.0 + Math.random() * 8.0;
      const angle = (Math.PI * 2 * i) / numSplashes + Math.random() * 0.5;
      const force = 15 + Math.random() * 15;
      let dx = Math.cos(angle) * force;
      let dy = Math.sin(angle) * force;
      const offsetX = (Math.random() - 0.5) * 0.1;
      const offsetY = (Math.random() - 0.5) * 0.1;
      this.splat(
        pointer.texcoordX + offsetX,
        pointer.texcoordY + offsetY,
        dx,
        dy,
        color
      );
    }
  }

  splat(x, y, dx, dy, color) {
    this.gl.useProgram(this.splatProgram);
    this.gl.uniform1i(this.gl.getUniformLocation(this.splatProgram, 'uTarget'), this.velocity.read.attach(0));
    this.gl.uniform1f(this.gl.getUniformLocation(this.splatProgram, 'aspectRatio'), this.canvas.width / this.canvas.height);
    this.gl.uniform2f(this.gl.getUniformLocation(this.splatProgram, 'point'), x, y);
    this.gl.uniform3f(this.gl.getUniformLocation(this.splatProgram, 'color'), dx, dy, 0.0);
    this.gl.uniform1f(this.gl.getUniformLocation(this.splatProgram, 'radius'), this.correctRadius(this.config.SPLAT_RADIUS / 100.0));
    this.blit(this.velocity.write);
    this.velocity.swap();

    this.gl.uniform1i(this.gl.getUniformLocation(this.splatProgram, 'uTarget'), this.dye.read.attach(0));
    this.gl.uniform3f(this.gl.getUniformLocation(this.splatProgram, 'color'), color.r, color.g, color.b);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  correctRadius(radius) {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  blit(target) {
    if (target == null) {
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    } else {
      this.gl.viewport(0, 0, target.width, target.height);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
    }
    
    // Asegurar que el buffer de elementos esté vinculado
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  }

  getResolution(resolution) {
    const aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) {
      return { width: max, height: min };
    } else {
      return { width: min, height: max };
    }
  }

  scaleByPixelRatio(input) {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  startAnimation() {
    // Setup vertex buffer
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), this.gl.STATIC_DRAW);
    
    this.elementBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), this.gl.STATIC_DRAW);
    
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(0);

    // Ráfaga inicial opcional
    if (this.config.INITIAL_SPLASH) {
      setTimeout(() => {
        const centerX = 0.5;
        const centerY = 0.5;
        const numInitialSplashes = 8;
        for (let i = 0; i < numInitialSplashes; i++) {
          const color = this.generateColor();
          color.r *= 15.0;
          color.g *= 15.0;
          color.b *= 15.0;
          const angle = (Math.PI * 2 * i) / numInitialSplashes;
          const radius = 0.1 + Math.random() * 0.05;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const force = 5 + Math.random() * 10;
          const dx = Math.cos(angle) * force;
          const dy = Math.sin(angle) * force;
          this.splat(x, y, dx, dy, color);
        }
      }, 500);
    }

    const animate = () => {
      this.updateFrame();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
    console.log('Animation started');
  }

  updateFrame() {
    try {
      const dt = this.calcDeltaTime();
      if (this.resizeCanvas()) {
        this.setupFramebuffers();
      }
      this.updateColors(dt);
      this.applyInputs();
      this.step(dt);
      this.render();
    } catch (error) {
      console.error('Error in updateFrame:', error);
    }
  }

  calcDeltaTime() {
    const now = Date.now();
    let dt = (now - this.lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    this.lastUpdateTime = now;
    return dt;
  }

  resizeCanvas() {
    const width = this.scaleByPixelRatio(this.canvas.clientWidth);
    const height = this.scaleByPixelRatio(this.canvas.clientHeight);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      console.log(`Canvas resized to: ${width}x${height}`);
      return true;
    }
    return false;
  }

  updateColors(dt) {
    if (!this.config.AUTO_COLOR_CYCLE) return;
    this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach(p => {
        p.color = this.generateColor();
      });
    }
  }

  applyInputs() {
    this.pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
  }

  step(dt) {
    this.gl.disable(this.gl.BLEND);
    this.gl.useProgram(this.curlProgram);
    this.gl.uniform2f(this.gl.getUniformLocation(this.curlProgram, 'texelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    this.gl.uniform1i(this.gl.getUniformLocation(this.curlProgram, 'uVelocity'), this.velocity.read.attach(0));
    this.blit(this.curl);

    this.gl.useProgram(this.vorticityProgram);
    this.gl.uniform2f(this.gl.getUniformLocation(this.vorticityProgram, 'texelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    this.gl.uniform1i(this.gl.getUniformLocation(this.vorticityProgram, 'uVelocity'), this.velocity.read.attach(0));
    this.gl.uniform1i(this.gl.getUniformLocation(this.vorticityProgram, 'uCurl'), this.curl.attach(1));
    this.gl.uniform1f(this.gl.getUniformLocation(this.vorticityProgram, 'curl'), this.config.CURL);
    this.gl.uniform1f(this.gl.getUniformLocation(this.vorticityProgram, 'dt'), dt);
    this.blit(this.velocity.write);
    this.velocity.swap();

    this.gl.useProgram(this.divergenceProgram);
    this.gl.uniform2f(this.gl.getUniformLocation(this.divergenceProgram, 'texelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    this.gl.uniform1i(this.gl.getUniformLocation(this.divergenceProgram, 'uVelocity'), this.velocity.read.attach(0));
    this.blit(this.divergence);

    this.gl.useProgram(this.clearProgram);
    this.gl.uniform1i(this.gl.getUniformLocation(this.clearProgram, 'uTexture'), this.pressure.read.attach(0));
    this.gl.uniform1f(this.gl.getUniformLocation(this.clearProgram, 'value'), this.config.PRESSURE);
    this.blit(this.pressure.write);
    this.pressure.swap();

    this.gl.useProgram(this.pressureProgram);
    this.gl.uniform2f(this.gl.getUniformLocation(this.pressureProgram, 'texelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    this.gl.uniform1i(this.gl.getUniformLocation(this.pressureProgram, 'uDivergence'), this.divergence.attach(0));
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      this.gl.uniform1i(this.gl.getUniformLocation(this.pressureProgram, 'uPressure'), this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    this.gl.useProgram(this.gradientSubtractProgram);
    this.gl.uniform2f(this.gl.getUniformLocation(this.gradientSubtractProgram, 'texelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    this.gl.uniform1i(this.gl.getUniformLocation(this.gradientSubtractProgram, 'uPressure'), this.pressure.read.attach(0));
    this.gl.uniform1i(this.gl.getUniformLocation(this.gradientSubtractProgram, 'uVelocity'), this.velocity.read.attach(1));
    this.blit(this.velocity.write);
    this.velocity.swap();

    this.gl.useProgram(this.advectionProgram);
    this.gl.uniform2f(this.gl.getUniformLocation(this.advectionProgram, 'texelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (!this.ext.supportLinearFiltering)
      this.gl.uniform2f(this.gl.getUniformLocation(this.advectionProgram, 'dyeTexelSize'), this.velocity.texelSizeX, this.velocity.texelSizeY);
    let velocityId = this.velocity.read.attach(0);
    this.gl.uniform1i(this.gl.getUniformLocation(this.advectionProgram, 'uVelocity'), velocityId);
    this.gl.uniform1i(this.gl.getUniformLocation(this.advectionProgram, 'uSource'), velocityId);
    this.gl.uniform1f(this.gl.getUniformLocation(this.advectionProgram, 'dt'), dt);
    this.gl.uniform1f(this.gl.getUniformLocation(this.advectionProgram, 'dissipation'), this.config.VELOCITY_DISSIPATION);
    this.blit(this.velocity.write);
    this.velocity.swap();

    if (!this.ext.supportLinearFiltering)
      this.gl.uniform2f(this.gl.getUniformLocation(this.advectionProgram, 'dyeTexelSize'), this.dye.texelSizeX, this.dye.texelSizeY);
    this.gl.uniform1i(this.gl.getUniformLocation(this.advectionProgram, 'uVelocity'), this.velocity.read.attach(0));
    this.gl.uniform1i(this.gl.getUniformLocation(this.advectionProgram, 'uSource'), this.dye.read.attach(1));
    this.gl.uniform1f(this.gl.getUniformLocation(this.advectionProgram, 'dissipation'), this.config.DENSITY_DISSIPATION);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  splatPointer(pointer) {
    const dx = pointer.deltaX * this.config.SPLAT_FORCE;
    const dy = pointer.deltaY * this.config.SPLAT_FORCE;
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  render(target) {
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.BLEND);
    this.drawDisplay(target);
  }

  drawDisplay(target) {
    let width = target == null ? this.gl.drawingBufferWidth : target.width;
    let height = target == null ? this.gl.drawingBufferHeight : target.height;
    this.gl.useProgram(this.displayProgram);
    if (this.config.SHADING) this.gl.uniform2f(this.gl.getUniformLocation(this.displayProgram, 'texelSize'), 1.0 / width, 1.0 / height);
    this.gl.uniform1i(this.gl.getUniformLocation(this.displayProgram, 'uTexture'), this.dye.read.attach(0));
    this.blit(target);
  }

  wrap(value, min, max) {
    const range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  }

  // Create a rainbow burst effect
  createRainbowBurst(x, y) {
    const colors = [
      { r: 1.0, g: 0.0, b: 0.0 }, // Red
      { r: 1.0, g: 0.5, b: 0.0 }, // Orange
      { r: 1.0, g: 1.0, b: 0.0 }, // Yellow
      { r: 0.0, g: 1.0, b: 0.0 }, // Green
      { r: 0.0, g: 0.0, b: 1.0 }, // Blue
      { r: 0.5, g: 0.0, b: 1.0 }, // Indigo
      { r: 1.0, g: 0.0, b: 1.0 }  // Violet
    ];
    
    colors.forEach((color, i) => {
      color.r *= 20.0;
      color.g *= 20.0;
      color.b *= 20.0;
      
      const angle = (Math.PI * 2 * i) / colors.length;
      const force = 25;
      const dx = Math.cos(angle) * force;
      const dy = Math.sin(angle) * force;
      
      this.splat(x, y, dx, dy, color);
    });
  }

  // Create a firework effect
  createFirework(x, y) {
    const numParticles = 12;
    const baseColor = this.generateFireColor();
    
    for (let i = 0; i < numParticles; i++) {
      const color = { ...baseColor };
      color.r *= 18.0 + Math.random() * 7.0;
      color.g *= 18.0 + Math.random() * 7.0;
      color.b *= 18.0 + Math.random() * 7.0;
      
      const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.3;
      const force = 20 + Math.random() * 15;
      const dx = Math.cos(angle) * force;
      const dy = Math.sin(angle) * force;
      
      this.splat(x, y, dx, dy, color);
    }
  }

  // Create a spiral effect
  createSpiral(x, y) {
    const numSpirals = 3;
    const particlesPerSpiral = 8;
    
    for (let spiral = 0; spiral < numSpirals; spiral++) {
      const color = this.generateColor();
      color.r *= 16.0;
      color.g *= 16.0;
      color.b *= 16.0;
      
      for (let i = 0; i < particlesPerSpiral; i++) {
        const angle = (Math.PI * 2 * i) / particlesPerSpiral + spiral * Math.PI / 3;
        const radius = 0.05 + (i / particlesPerSpiral) * 0.1;
        const spiralX = x + Math.cos(angle) * radius;
        const spiralY = y + Math.sin(angle) * radius;
        
        const force = 10 + i * 2;
        const dx = Math.cos(angle) * force;
        const dy = Math.sin(angle) * force;
        
        this.splat(spiralX, spiralY, dx, dy, color);
      }
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Eliminar cualquier contenedor/canvas asociado
    try {
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.remove();
      }
      // Remover contenedores residuales por seguridad
      const ids = ['splash-container', 'splash-hero-container'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      // Remover cualquier canvas con id 'fluid' fuera del hero
      const canvases = document.querySelectorAll('#fluid');
      canvases.forEach(cv => {
        const inHero = cv.closest('#hero');
        if (!inHero && cv.parentElement) cv.parentElement.remove();
      });
    } catch (e) {
      console.warn('Cleanup warning during destroy:', e);
    }
    if (this.gl) {
      this.gl = null;
    }
    console.log('SplashCursor destroyed');
  }

  // Método para reinicializar si algo falla
  reinitialize() {
    console.log('Reinitializing SplashCursor...');
    this.destroy();
    setTimeout(() => {
      this.init();
    }, 100);
  }

}

// Variable global para evitar múltiples inicializaciones
let splashInitialized = false;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, starting SplashCursor initialization...');
  
  // Limpiar cualquier cursor existente
  if (window.splashCursor) {
    console.log('🧹 Cleaning existing splash cursor...');
    window.splashCursor.destroy();
    window.splashCursor = null;
  }
  
  // Si existe el gestor de temas (cursor-config.js), delegamos la creación
  if (typeof window.setCursorTheme === 'function') {
    console.log('🎛️ Delegating initialization to setCursorTheme("reactbits")');
    try {
      // Limpieza agresiva previa para evitar residuos de instancias anteriores
      try {
        document.querySelectorAll('#splash-container, #splash-hero-container').forEach(n => n.remove());
        document.querySelectorAll('#fluid').forEach(cv => {
          if (!cv.closest('#hero')) cv.parentElement?.remove();
        });
        const hero = document.getElementById('hero');
        if (hero) {
          hero.style.position = 'relative';
          hero.style.overflow = 'hidden';
          hero.style.height = '100vh';
          hero.style.maxHeight = '100vh';
          hero.style.minHeight = '100vh';
        }
      } catch (e) {
        console.warn('Pre-init cleanup warning:', e);
      }
      window.setCursorTheme('reactbits');
      splashInitialized = true;
    } catch (err) {
      console.error('Failed to initialize via setCursorTheme, falling back to default:', err);
      window.splashCursor = new SplashCursor();
      splashInitialized = true;
    }
    console.log('✅ SplashCursor initialization completed (delegated)');
    return;
  }

  setTimeout(() => {
    try {
      console.log('🎨 Creating new SplashCursor instance...');
      // Fallback: crear con preset equivalente a React Bits (limitado a #hero)
      window.splashCursor = new SplashCursor({
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 1440,
        CAPTURE_RESOLUTION: 512,
        DENSITY_DISSIPATION: 3.5,
        VELOCITY_DISSIPATION: 2,
        PRESSURE: 0.1,
        PRESSURE_ITERATIONS: 20,
        CURL: 3,
        SPLAT_RADIUS: 0.2,
        SPLAT_FORCE: 6000,
        SHADING: true,
        COLOR_UPDATE_SPEED: 10,
        BACK_COLOR: { r: 0.5, g: 0, b: 0 },
        TRANSPARENT: true,
        INITIAL_SPLASH: false,
        MULTI_SPLASH: false,
        COLOR_BOOST: 0.15,
        FULLSCREEN: false,
        REACT_PALETTE: true
      });
      splashInitialized = true;
      
      // Función de test mejorada con múltiples efectos
      window.testSplash = () => {
        console.log('🧪 Testing splash effect...');
        if (window.splashCursor) {
          const color = window.splashCursor.generateColor();
          color.r *= 20.0;
          color.g *= 20.0;
          color.b *= 20.0;
          window.splashCursor.splat(0.5, 0.5, 0, 0, color);
          console.log('✅ Test splash created with color:', color);
        } else {
          console.error('❌ SplashCursor not available');
        }
      };

      // Función para crear efecto arcoíris
      window.testRainbow = () => {
        console.log('🌈 Creating rainbow burst...');
        if (window.splashCursor) {
          window.splashCursor.createRainbowBurst(0.5, 0.5);
          console.log('✅ Rainbow burst created');
        } else {
          console.error('❌ SplashCursor not available');
        }
      };

      // Función para crear efecto fuegos artificiales
      window.testFirework = () => {
        console.log('🎆 Creating firework...');
        if (window.splashCursor) {
          window.splashCursor.createFirework(0.5, 0.5);
          console.log('✅ Firework created');
        } else {
          console.error('❌ SplashCursor not available');
        }
      };

      // Función para crear efecto espiral
      window.testSpiral = () => {
        console.log('🌀 Creating spiral...');
        if (window.splashCursor) {
          window.splashCursor.createSpiral(0.5, 0.5);
          console.log('✅ Spiral created');
        } else {
          console.error('❌ SplashCursor not available');
        }
      };
      
      // Función para verificar estado
      window.checkSplash = () => {
        console.log('🔍 SplashCursor Status:');
        console.log('- Instance:', !!window.splashCursor);
        console.log('- Canvas:', window.splashCursor?.canvas);
        console.log('- WebGL:', !!window.splashCursor?.gl);
        console.log('- Animation ID:', window.splashCursor?.animationId);
        console.log('- Hero section:', document.getElementById('hero'));
      };
      
      // Función para reinicializar
      window.reinitSplash = () => {
        console.log('🔄 Reinitializing SplashCursor...');
        splashInitialized = false;
        if (window.splashCursor) {
          window.splashCursor.destroy();
          window.splashCursor = null;
        }
        setTimeout(() => {
          window.splashCursor = new SplashCursor();
          splashInitialized = true;
          console.log('✅ SplashCursor reinitialized');
        }, 100);
      };
      
      console.log('✅ SplashCursor initialization completed');
      console.log('💡 Available commands:');
      console.log('   - testSplash() - Basic splash test');
      console.log('   - testRainbow() - Rainbow burst effect');
      console.log('   - testFirework() - Firework effect');
      console.log('   - testSpiral() - Spiral effect');
      console.log('   - checkSplash() - Check status');
      console.log('   - reinitSplash() - Reinitialize');
      
    } catch (error) {
      console.error('❌ Failed to initialize SplashCursor:', error);
      console.error('Stack trace:', error.stack);
    }
  }, 300);
});
// Configuración personalizada para SplashCursor
// Puedes modificar estos valores para ajustar el comportamiento del cursor

const cursorConfig = {
  // Resolución de la simulación (mayor = más detalle, menor = mejor rendimiento)
  SIM_RESOLUTION: 128,
  
  // Resolución del color (mayor = colores más suaves)
  DYE_RESOLUTION: 1440,
  
  // Fuerza del splat (efecto al hacer clic)
  SPLAT_FORCE: 6000,
  
  // Radio del splat (tamaño del efecto)
  SPLAT_RADIUS: 0.2,
  
  // Velocidad de cambio de colores
  COLOR_UPDATE_SPEED: 10,
  
  // Habilitar sombreado (efectos 3D)
  SHADING: true,
  
  // Disipación de densidad (qué tan rápido desaparece el color)
  DENSITY_DISSIPATION: 3.5,
  
  // Disipación de velocidad (qué tan rápido se detiene el movimiento)
  VELOCITY_DISSIPATION: 2,
  
  // Presión (fuerza interna del fluido)
  PRESSURE: 0.1,
  
  // Iteraciones de presión (más = más realista)
  PRESSURE_ITERATIONS: 20,
  
  // Curl (rotación del fluido)
  CURL: 3,
  
  // Color de fondo
  BACK_COLOR: { r: 0.5, g: 0, b: 0 },
  
  // Transparencia
  TRANSPARENT: true
};

// Función para reinicializar el cursor con nueva configuración
function updateCursorConfig(newConfig) {
  if (window.splashCursor) {
    window.splashCursor.destroy();
  }
  
  const config = { ...cursorConfig, ...newConfig };
  window.splashCursor = new SplashCursor(config);
}

// Función para cambiar el tema del cursor
function setCursorTheme(theme) {
  const themes = {
    dark: {
      BACK_COLOR: { r: 0.1, g: 0.1, b: 0.1 },
      SPLAT_FORCE: 8000,
      COLOR_UPDATE_SPEED: 15
    },
    light: {
      BACK_COLOR: { r: 0.9, g: 0.9, b: 0.9 },
      SPLAT_FORCE: 4000,
      COLOR_UPDATE_SPEED: 8
    },
    vibrant: {
      BACK_COLOR: { r: 0.2, g: 0, b: 0.2 },
      SPLAT_FORCE: 10000,
      COLOR_UPDATE_SPEED: 20,
      SHADING: true
    },
    subtle: {
      BACK_COLOR: { r: 0.5, g: 0.5, b: 0.5 },
      SPLAT_FORCE: 3000,
      COLOR_UPDATE_SPEED: 5,
      SHADING: false
    }
  };
  
  if (themes[theme]) {
    updateCursorConfig(themes[theme]);
  }
}

// Función para pausar/reanudar el cursor
function toggleCursor() {
  if (window.splashCursor) {
    window.splashCursor.config.PAUSED = !window.splashCursor.config.PAUSED;
  }
}

// Función para cambiar la intensidad del cursor
function setCursorIntensity(intensity) {
  const intensityLevels = {
    low: { SPLAT_FORCE: 2000, COLOR_UPDATE_SPEED: 5 },
    medium: { SPLAT_FORCE: 6000, COLOR_UPDATE_SPEED: 10 },
    high: { SPLAT_FORCE: 10000, COLOR_UPDATE_SPEED: 20 }
  };
  
  if (intensityLevels[intensity]) {
    updateCursorConfig(intensityLevels[intensity]);
  }
}

// Auto-detect theme based on hero section class
function autoDetectTheme() {
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    if (heroSection.classList.contains('dark-background')) {
      setCursorTheme('dark');
    } else if (heroSection.classList.contains('light-background')) {
      setCursorTheme('light');
    } else {
      setCursorTheme('vibrant');
    }
  }
}

// Listen for theme changes on hero section
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      autoDetectTheme();
    }
  });
});

const heroSection = document.getElementById('hero');
if (heroSection) {
  observer.observe(heroSection, { attributes: true });
}

// Initialize with default theme
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(autoDetectTheme, 1000);
});

// Export functions for global use
window.cursorConfig = cursorConfig;
window.updateCursorConfig = updateCursorConfig;
window.setCursorTheme = setCursorTheme;
window.toggleCursor = toggleCursor;
window.setCursorIntensity = setCursorIntensity;

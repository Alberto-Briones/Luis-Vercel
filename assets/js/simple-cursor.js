// Simple Fluid Cursor Effect for Hero Section
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing simple fluid cursor...');
  
  const heroSection = document.getElementById('hero');
  if (!heroSection) {
    console.error('Hero section not found');
    return;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'fluid-canvas';
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: none;
    opacity: 0.8;
  `;

  // Make hero section relative
  heroSection.style.position = 'relative';
  heroSection.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouse = { x: 0, y: 0 };
  let isMouseDown = false;

  // Resize canvas
  function resizeCanvas() {
    const rect = heroSection.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  // Particle class
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.life = 1.0;
      this.decay = Math.random() * 0.02 + 0.005;
      this.size = Math.random() * 3 + 1;
      this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      this.vx *= 0.99;
      this.vy *= 0.99;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Create particles
  function createParticles(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push(new Particle(x, y));
    }
  }

  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.update();
      particle.draw();
      
      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Create trail particles
    if (isMouseDown) {
      createParticles(mouse.x, mouse.y);
    }

    requestAnimationFrame(animate);
  }

  // Mouse events
  heroSection.addEventListener('mousemove', function(e) {
    const rect = heroSection.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    
    // Create particles on mouse move
    if (Math.random() < 0.3) {
      createParticles(mouse.x, mouse.y);
    }
  });

  heroSection.addEventListener('mousedown', function(e) {
    isMouseDown = true;
    const rect = heroSection.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    createParticles(mouse.x, mouse.y);
  });

  heroSection.addEventListener('mouseup', function() {
    isMouseDown = false;
  });

  // Touch events
  heroSection.addEventListener('touchstart', function(e) {
    e.preventDefault();
    isMouseDown = true;
    const rect = heroSection.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    createParticles(mouse.x, mouse.y);
  });

  heroSection.addEventListener('touchmove', function(e) {
    e.preventDefault();
    const rect = heroSection.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    
    if (Math.random() < 0.5) {
      createParticles(mouse.x, mouse.y);
    }
  });

  heroSection.addEventListener('touchend', function() {
    isMouseDown = false;
  });

  // Initialize
  resizeCanvas();
  animate();

  // Handle resize
  window.addEventListener('resize', resizeCanvas);

  console.log('Simple fluid cursor initialized successfully');
});
















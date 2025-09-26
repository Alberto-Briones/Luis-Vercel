document.addEventListener('DOMContentLoaded', function () {
  try {
    if (window.emailjs && typeof emailjs.init === 'function') {
      emailjs.init('UtjUcRz2jx2Buifeu');
    }
  } catch (e) {
    console.warn('EmailJS no inicializado:', e);
  }
  const btn = document.getElementById('button');
  const form = document.getElementById('form');
  const icons = document.querySelectorAll('#social-links a');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    gtag('event', 'formulario_enviado', {
      'event_category': 'Formulario',
      'event_label': 'Formulario de contacto', 
      'value': 1
    });
    
    // Agregar clase de loading al botón
    btn.classList.add('loading');
    btn.querySelector('.btn-text').textContent = 'Enviando...';

    const serviceID = 'default_service';      // ID del servicio de envío de correo electrónico
    const templateID = 'template_m1s7vqb';    

    emailjs.sendForm(serviceID, templateID, this) 
      .then(() => {
        // Remover clase de loading
        btn.classList.remove('loading');
        btn.querySelector('.btn-text').textContent = 'Enviar Mensaje';
        
        // Mostrar mensaje de éxito con estilo moderno
        showNotification('¡Correo enviado con éxito!', 'success');
        form.reset();
      }, (err) => {
        // Remover clase de loading
        btn.classList.remove('loading');
        btn.querySelector('.btn-text').textContent = 'Enviar Mensaje';
        
        // Mostrar mensaje de error con estilo moderno
        showNotification('Error al enviar el mensaje. Inténtalo de nuevo.', 'error');
        console.error('Error al enviar:', err);
      });
  });

  // Función para mostrar notificaciones modernas
  function showNotification(message, type) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `modern-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Agregar estilos
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#0ea5e9' : '#dc3545'};
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 4 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 4000);
  }
});
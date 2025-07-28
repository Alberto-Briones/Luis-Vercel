document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('button');
  const form = document.getElementById('form');
  const icons = document.querySelectorAll('social-icons');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    gtag('event', 'formulario_enviado', {
      'event_category': 'Formulario',
      'event_label': 'Formulario de contacto', 
      'value': 1
    });
    
    btn.textContent = 'Cargando...';

    const serviceID = 'default_service';      // ID del servicio de envío de correo electrónico
    const templateID = 'template_m1s7vqb';    

    emailjs.sendForm(serviceID, templateID, this)
      .then(() => {
        btn.textContent = 'Send Email';
        alert('Correo enviado con éxito!');
        form.reset();
      }, (err) => {
        btn.textContent = 'Send Email';
        alert('Error al enviar: ' + JSON.stringify(err));
      });
  });

  socialLinks.forEach(link => {
    link.addEventListener('click', function () {
      const red = this.className.split(' ')[0]; // "facebook", "instagram", etc.
      gtag('event', 'redes_sociales', {
        event_category: 'Interacción',
        event_label: red,
        value: 1
      });
    });
  });

});

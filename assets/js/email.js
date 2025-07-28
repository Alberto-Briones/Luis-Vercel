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

  icons.forEach(icon => {
    icon.addEventListener('click', function () {
      const network = this.getAttribute('data-network');

      gtag('event', 'click_red_social', {
        'event_category': 'Redes Sociales',
        'event_label': network,
        'value': 1
      });
    });
  });

});

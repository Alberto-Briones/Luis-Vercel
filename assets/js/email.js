document.addEventListener('DOMContentLoaded', function () {
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


    links.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const href = link.getAttribute('href');

        let red = '';
        if (link.classList.contains('facebook')) red = 'Facebook';
        else if (link.classList.contains('instagram')) red = 'Instagram';
        else if (link.classList.contains('linkedin')) red = 'LinkedIn';
        else if (link.classList.contains('github')) red = 'GitHub';

        // Enviar evento a Google Analytics 4
        gtag('event', 'click_red_social', {
          event_category: 'Redes sociales',
          event_label: red,
          social_network: red
        });

        // Redirigir después de 200ms
        setTimeout(() => {
          window.open(href, '_blank');
        }, 200);
      });
    });
  
  });

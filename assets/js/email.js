document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('button');
  const form = document.getElementById('form');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    gtag('event', 'formulario_enviado', {
      'event_category': 'Formulario',
      'event_label': 'Formulario de contacto',
      'value': 1
    });

    btn.textContent = 'Cargando...';

    const serviceID = 'default_service';      // Reemplaza si usas otro servicio
    const templateID = 'template_m1s7vqb';    // Reemplaza con tu ID de plantilla

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
});

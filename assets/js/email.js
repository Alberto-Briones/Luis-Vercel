document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('button');
  const form = document.getElementById('form');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    btn.textContent = 'Sending...';

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

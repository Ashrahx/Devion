const contactForm = document.getElementById("contact-form");
if (contactForm) {
    contactForm.addEventListener("submit", function(e) {
        e.preventDefault();
    
    var form = this;
    
    fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            // Mostrar el toast
            const toast = document.getElementById('success-toast');
            const successIcon = toast.querySelector('.success-icon');
            const errorIcon = toast.querySelector('.error-icon');
            const messageText = toast.querySelector('.message-text');
            
            // Mostrar icono de éxito, ocultar icono de error
            successIcon.style.display = 'inline-block';
            errorIcon.style.display = 'none';
            messageText.textContent = 'Message sent successfully!';

            toast.style.display = 'block';
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);

            // Ocultar el toast después de 3 segundos
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 300);
            }, 3000);

            // Limpiar el formulario
            form.reset();
        }
    })
    .catch(error => {
        console.error("Error:", error);
        const toast = document.getElementById('success-toast');
        const successIcon = toast.querySelector('.success-icon');
        const errorIcon = toast.querySelector('.error-icon');
        const messageText = toast.querySelector('.message-text');
        
        // Mostrar icono de error, ocultar icono de éxito
        successIcon.style.display = 'none';
        errorIcon.style.display = 'inline-block';
        messageText.textContent = 'There was an error sending the message. Please try again.';
        toast.querySelector('.toast-icon').classList.remove('ri-checkbox-circle-fill');
        toast.querySelector('.toast-icon').classList.add('ri-error-warning-fill');
        toast.querySelector('.toast-icon').style.color = '#dc3545';
        
        toast.style.display = 'block';
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.style.display = 'none';
                // Restore original icon and message
                const messageIcon = toast.querySelector('.message-icon');
                const messageText = toast.querySelector('.message-text');
                messageIcon.classList.remove('ri-error-warning-fill');
                messageIcon.classList.add('ri-mail-send-fill');
                messageText.textContent = 'Message sent successfully!';
                toast.querySelector('.toast-icon').classList.remove('ri-error-warning-fill');
                toast.querySelector('.toast-icon').classList.add('ri-checkbox-circle-fill');
                toast.querySelector('.toast-icon').style.color = '#0066FF';
            }, 300);
        }, 3000);
    });
    });
}
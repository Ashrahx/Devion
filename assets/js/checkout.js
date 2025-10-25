// Checkout functionality
class Checkout {
    constructor() {
        this.checkoutData = this.loadCheckoutData();
        this.init();
    }

    init() {
        if (!this.checkoutData) {
            this.redirectToShop();
            return;
        }

        this.renderOrderSummary();
        this.setupEventListeners();
        this.initializePayPal();
        this.initializeMercadoPago();
    }

    loadCheckoutData() {
        try {
            const data = localStorage.getItem('checkoutData');
            if (!data) return null;

            const checkoutData = JSON.parse(data);
            
            // Verificar si los datos son recientes (menos de 1 hora)
            const now = new Date().getTime();
            if (now - checkoutData.timestamp > 3600000) { // 1 hora en milisegundos
                localStorage.removeItem('checkoutData');
                return null;
            }

            return checkoutData;
        } catch (error) {
            console.error('Error loading checkout data:', error);
            return null;
        }
    }

    redirectToShop() {
        alert('No checkout data found. Redirecting to shop...');
        window.location.href = 'shop.html';
    }

    renderOrderSummary() {
        const orderList = document.querySelector('.optech-checkuot-sidebar ul');
        if (!orderList) return;

        // Limpiar lista existente (excepto el header)
        const headerItem = orderList.querySelector('li:first-child');
        orderList.innerHTML = '';
        if (headerItem) {
            orderList.appendChild(headerItem);
        }

        // Agregar productos
        this.checkoutData.cart.forEach(item => {
            const listItem = document.createElement('li');
            const displayName = item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name;
            
            listItem.innerHTML = `
                ${displayName} x${item.quantity}<span>$${(item.price * item.quantity).toFixed(2)}</span>
            `;
            orderList.appendChild(listItem);
        });

        // Agregar totales
        const subtotalItem = document.createElement('li');
        subtotalItem.innerHTML = `Subtotal<span>$${this.checkoutData.subtotal.toFixed(2)}</span>`;
        orderList.appendChild(subtotalItem);

        if (this.checkoutData.discount > 0) {
            const discountItem = document.createElement('li');
            discountItem.innerHTML = `Discount<span class="text-success">-$${this.checkoutData.discount.toFixed(2)}</span>`;
            orderList.appendChild(discountItem);
        }

        const shippingItem = document.createElement('li');
        shippingItem.innerHTML = `Shipping<span>$${this.checkoutData.shipping.toFixed(2)}</span>`;
        orderList.appendChild(shippingItem);

        const totalItem = document.createElement('li');
        totalItem.innerHTML = `Total<span class="total-amount">$${this.checkoutData.total.toFixed(2)}</span>`;
        orderList.appendChild(totalItem);
    }

    setupEventListeners() {
        // Event listener para el formulario de checkout
        const checkoutForm = document.querySelector('.optech-checkout-form form');
        const placeOrderBtn = document.querySelector('.shop-order-btn');

        if (checkoutForm && placeOrderBtn) {
            placeOrderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePlaceOrder();
            });
        }

        // Event listener para cupones
        const couponLink = document.querySelector('.optech-checkout-header a');
        if (couponLink) {
            couponLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCouponSection();
            });
        }

        this.setupPaymentMethods();
    }

    setupPaymentMethods() {
        const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
        const cardForm = document.getElementById('card-form');
        const paypalButton = document.getElementById('paypal-button-container');
        const mercadopagoButton = document.getElementById('mercadopago-button-container');

        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                this.handlePaymentMethodChange(e.target.value);
            });
        });

        // Event listener para el botón de Mercado Pago
        const mercadopagoBtn = document.querySelector('.mercadopago-btn');
        if (mercadopagoBtn) {
            mercadopagoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleMercadoPagoPayment();
            });
        }

        // Formateo automático para inputs de tarjeta
        this.setupCardInputFormatting();
    }

    // Inicializar PayPal Buttons
    initializePayPal() {
        if (typeof paypal === 'undefined') {
            console.log('PayPal SDK not loaded, retrying...');
            setTimeout(() => this.initializePayPal(), 1000);
            return;
        }

        console.log('Initializing PayPal buttons...');

        // Limpiar contenedor 
        const container = document.getElementById('paypal-button-container');
        if (container) {
            container.innerHTML = '';
        } else {
            console.error('PayPal container not found');
            return;
        }

        try {
            paypal.Buttons({
                style: {
                    layout: 'vertical',
                    color: 'blue',
                    shape: 'rect',
                    label: 'paypal'
                },
                createOrder: (data, actions) => {
                    if (!this.validateCheckoutForm()) {
                        throw new Error('Please complete all required fields.');
                    }
                    
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: this.checkoutData.total.toFixed(2),
                                currency_code: 'MXN'
                            },
                            description: `Devion Purchase - ${this.checkoutData.cart.length} items`
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    try {
                        const details = await actions.order.capture();
                        const payerName = details.payer.name.given_name;
                        const transactionId = details.purchase_units[0]?.payments?.captures[0]?.id || data.orderID;
                        this.processPayPalSuccess(details, data.orderID, payerName, transactionId);
                    } catch (error) {
                        console.error('Error capturing PayPal order:', error);
                        this.showPaymentError('Error processing your payment. Please try again.');
                    }
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                    if (err.message.includes('blocked')) {
                        this.showPaymentError('Please disable your ad blocker to use PayPal.');
                    } else {
                        this.showPaymentError('There was an error with PayPal. Please try again.');
                    }
                },
                onCancel: () => {
                    console.log('PayPal payment cancelled by user');
                    this.showPaymentMessage('Payment cancelled. You can try again or choose another payment method.');
                }
            }).render('#paypal-button-container')
            .catch(error => {
                console.error('Error rendering PayPal buttons:', error);
                this.handlePayPalError(error);
            });

        } catch (error) {
            console.error('Exception in PayPal initialization:', error);
            this.handlePayPalError(error);
        }
    }

    // Método auxiliar para intentar reinicializar PayPal si es necesario
    retryPayPalRender() {
        const container = document.getElementById('paypal-button-container');
        if (container) {
            container.innerHTML = '';
            this.initializePayPal();
        }
    }

    // Procesar pago exitoso de PayPal
    processPayPalSuccess(details, orderID, payerName, transactionId) {
        // Limpiar carrito y datos de checkout
        localStorage.removeItem('cart');
        localStorage.removeItem('checkoutData');
        
        // Mostrar mensaje de éxito
        const successMessage = `¡Pago exitoso! Gracias por tu compra ${payerName}.\n\nID de transacción: ${transactionId}\nTotal: $${this.checkoutData.total.toFixed(2)} MXN`;
        
        // Redirigir a página de confirmación
        window.location.href = 'pago-exitoso.html?paymentId=' + transactionId + 
                              '&payerName=' + encodeURIComponent(payerName) + 
                              '&amount=' + this.checkoutData.total.toFixed(2) +
                              '&currency=MXN';
    }

    // Cargar SDK de PayPal dinámicamente
    loadPayPalSDK() {
        const script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=AfakkHFq6TNiB8DjicBPqaBt6dTtPZQssNpcp3-UxbWl6XuFkeYpoxCPJLmrwxS_Ip-Vd1Ln15uhW2IF&currency=MXN';
        script.onload = () => {
            console.log('PayPal SDK loaded');
            this.initializePayPal();
        };
        script.onerror = () => {
            console.error('Failed to load PayPal SDK');
        };
        document.head.appendChild(script);
    }

    // Manejar cambio de método de pago
    handlePaymentMethodChange(method) {
        const cardForm = document.getElementById('card-form');
        const paypalButton = document.getElementById('paypal-button-container');
        const mercadopagoButton = document.getElementById('mercadopago-button-container');
        const oxxoInfo = document.getElementById('oxxo-info');

        // Ocultar todos primero
        [cardForm, paypalButton, mercadopagoButton, oxxoInfo].forEach(el => {
            if (el) {
                el.style.display = 'none';
                // Asegurarse de que PayPal no esté oculto con position absolute
                if (el === paypalButton) {
                    el.style.position = '';
                    el.style.left = '';
                }
            }
        });

        // Mostrar según el método seleccionado
        switch (method) {
            case 'card':
                if (cardForm) {
                    cardForm.style.display = 'block';
                }
                break;
            case 'paypal':
                if (paypalButton) {
                    paypalButton.style.display = 'block';
                    // Reinicializar PayPal si es necesario
                    if (typeof paypal === 'undefined' || !paypalButton.children.length) {
                        this.initializePayPal();
                    }
                }
                break;
            case 'mercadopago':
                if (mercadopagoButton) {
                    mercadopagoButton.style.display = 'block';
                    // Reinicializar Mercado Pago
                    this.initializeMercadoPago();
                }
                break;
            case 'oxxo':
                if (oxxoInfo) {
                    oxxoInfo.style.display = 'block';
                }
                break;
        }
    }

    initializeMercadoPago() {
        if (typeof MercadoPago === 'undefined') {
            console.log('MercadoPago SDK not loaded, retrying...');
            setTimeout(() => this.initializeMercadoPago(), 1000);
            return;
        }

        try {
            const mp = new MercadoPago('TEST-b2c7f068-6614-4f9b-be30-7cc82aecaa6e');
            
            // Simular una preferencia (en producción esto vendría de tu backend)
            const preferenceId = 'TEST-12345678-1234-1234-1234-123456789012';
            
            const bricksBuilder = mp.bricks();
            bricksBuilder.create("wallet", "wallet_container", {
                initialization: {
                    preferenceId: preferenceId,
                    redirectMode: "modal"
                },
                callbacks: {
                    onReady: () => {
                        console.log('Brick ready');
                    },
                    onSubmit: () => {
                        console.log('Payment submitted');
                    },
                    onError: (error) => {
                        console.error('Brick error:', error);
                    }
                },
                customization: {
                    visual: {
                        buttonBackground: 'default',
                        borderRadius: '6px'
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing MercadoPago:', error);
        }
    }
    
    handleMercadoPagoPayment() {
        // Validar formulario primero
        if (!this.validateCheckoutForm()) {
            alert('Please fill in all required fields before proceeding with Mercado Pago.');
            return;
        }

        try {
            // Reinicializar el contenedor de Mercado Pago
            const container = document.getElementById('wallet_container');
            if (container) {
                container.innerHTML = '';
                this.initializeMercadoPago();
            } else {
                throw new Error('Mercado Pago container not found');
            }
        } catch (error) {
            console.error('Error with Mercado Pago payment:', error);
            alert('There was an error initializing Mercado Pago. Please try again.');
        }
    }

    // Manejar pago con PayPal (para el botón alternativo)
    handlePayPalPayment() {
        // Validar formulario primero
        if (!this.validateCheckoutForm()) {
            alert('Please fill in all required fields before proceeding with PayPal.');
            return;
        }

        // Simular redirección a PayPal
        const placeOrderBtn = document.querySelector('.shop-order-btn');
        const originalText = placeOrderBtn.querySelector('.btn-wraper').textContent;
        placeOrderBtn.querySelector('.btn-wraper').textContent = 'Redirecting to PayPal...';
        placeOrderBtn.disabled = true;

        // Simular proceso de PayPal
        setTimeout(() => {
            alert('You would now be redirected to PayPal for payment processing.');
            // En un caso real, aquí iría la redirección a PayPal
            // window.location.href = 'paypal-payment-url';
            
            // Restaurar botón
            placeOrderBtn.querySelector('.btn-wraper').textContent = originalText;
            placeOrderBtn.disabled = false;
        }, 1500);
    }

    // Formateo automático para inputs de tarjeta
    setupCardInputFormatting() {
        const cardNumberInput = document.querySelector('#card-form input[placeholder*="Card Number"]');
        const expiryInput = document.querySelector('#card-form input[placeholder*="MM/YY"]');
        const cvvInput = document.querySelector('#card-form input[placeholder*="CVV"]');

        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = '';
                
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }
                
                e.target.value = formattedValue.substring(0, 19);
            });
        }

        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length >= 2) {
                    e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
            });
        }

        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 3);
            });
        }
    }

    // Función de validación mejorada
    validateCheckoutForm() {
        const form = document.querySelector('.optech-checkout-form form');
        if (!form) return true; // Si no hay formulario, considerar válido para PayPal

        const requiredFields = form.querySelectorAll('input[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#dc3545';
                
                // Scroll al primer campo con error
                if (isValid === false) {
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    isValid = true; // Solo scroll una vez
                }
            } else {
                field.style.borderColor = '';
            }
        });

        // Validar email
        const emailField = document.getElementById('email');
        if (emailField && emailField.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value)) {
                isValid = false;
                emailField.style.borderColor = '#dc3545';
                alert('Please enter a valid email address.');
            }
        }

        return isValid;
    }

    handlePlaceOrder() {
        // Validar formulario y método de pago
        if (!this.validateCheckoutForm()) {
            alert('Please fill in all required fields and select a payment method.');
            return;
        }

        const selectedPayment = document.querySelector('input[name="payment-method"]:checked');
        if (!selectedPayment) {
            alert('Please select a payment method.');
            return;
        }

        const paymentMethod = selectedPayment.value;
        
        // Procesar según el método de pago
        switch (paymentMethod) {
            case 'paypal':
                // PayPal se maneja automáticamente con los botones
                this.showPaymentMessage('Please complete the payment using the PayPal button above.');
                break;
            case 'card':
                this.processCardPayment();
                break;
            case 'mercadopago':
                this.handleMercadoPagoPayment();
                break;
            case 'oxxo':
                this.processOxxoPayment();
                break;
        }
    }

    processOxxoPayment() {
        // Validar formulario
        if (!this.validateCheckoutForm()) {
            alert('Please fill in all required fields.');
            return;
        }

        // Simular generación de referencia Oxxo
        const placeOrderBtn = document.querySelector('.shop-order-btn');
        const originalText = placeOrderBtn.querySelector('.btn-wraper').textContent;
        placeOrderBtn.querySelector('.btn-wraper').textContent = 'Generating Oxxo Reference...';
        placeOrderBtn.disabled = true;

        setTimeout(() => {
            // Generar número de referencia simulado
            const referenceNumber = 'OX' + Math.random().toString(36).substr(2, 8).toUpperCase();
            
            // Limpiar carrito y datos de checkout
            localStorage.removeItem('cart');
            localStorage.removeItem('checkoutData');
            
            // Mostrar mensaje con referencia
            alert(`Oxxo Pay Reference: ${referenceNumber}\n\nPlease take this reference to any Oxxo store and pay within 24 hours.\n\nA confirmation email has been sent to you.`);
            
            // Redirigir a página de confirmación o home
            window.location.href = 'index.html';
        }, 2000);
    }

    // Nuevas funciones para diferentes métodos de pago
    processCardPayment() {
        // Validar detalles de tarjeta
        const cardNumber = document.querySelector('#card-form input[placeholder*="Card Number"]');
        const expiry = document.querySelector('#card-form input[placeholder*="MM/YY"]');
        const cvv = document.querySelector('#card-form input[placeholder*="CVV"]');
        const cardholder = document.querySelector('#card-form input[placeholder*="Cardholder Name"]');

        if (!cardNumber || !cardNumber.value || 
            !expiry || !expiry.value || 
            !cvv || !cvv.value || 
            !cardholder || !cardholder.value) {
            alert('Please fill in all card details.');
            return;
        }

        // Simular procesamiento de tarjeta
        this.processOrder('Credit Card');
    }

    processOrder(paymentMethod, reference = '') {
        const placeOrderBtn = document.querySelector('.shop-order-btn');
        const originalText = placeOrderBtn.querySelector('.btn-wraper').textContent;
        placeOrderBtn.querySelector('.btn-wraper').textContent = 'Processing...';
        placeOrderBtn.disabled = true;

        setTimeout(() => {
            // Limpiar carrito y datos de checkout
            localStorage.removeItem('cart');
            localStorage.removeItem('checkoutData');
            
            // Mensaje personalizado según el método
            let message = `Order placed successfully with ${paymentMethod}! Thank you for your purchase.`;
            if (reference) {
                message = `Order placed successfully!\n\nYour ${paymentMethod} reference: ${reference}\n\nPlease complete your payment within 24 hours.`;
            }
            
            alert(message);
            
            // Redirigir a página de confirmación o home
            window.location.href = 'index.html';
        }, 2000);
    }

    showCouponSection() {
        // Verificar si ya existe una sección de cupón
        const existingCouponSection = document.querySelector('.checkout-coupon-section');
        if (existingCouponSection) {
            // Si ya existe, quitarla y salir (toggle behavior)
            existingCouponSection.remove();
            return;
        }

        // Crear sección de cupón dinámicamente
        const couponSection = document.createElement('div');
        couponSection.className = 'checkout-coupon-section mt-4 mb-4 p-3 bg-light rounded';
        couponSection.innerHTML = `
            <h6 class="mb-3">Apply Coupon</h6>
            <div class="input-group">
                <input type="text" class="form-control" placeholder="Enter coupon code" id="checkout-coupon">
                <button class="btn btn-primary" type="button" onclick="checkout.applyCoupon()">Apply</button>
            </div>
            <div id="checkout-coupon-message" class="mt-2 small"></div>
        `;

        const checkoutHeader = document.querySelector('.optech-checkout-header');
        checkoutHeader.parentNode.insertBefore(couponSection, checkoutHeader.nextSibling);

        // Enfocar el input automáticamente
        setTimeout(() => {
            const couponInput = document.getElementById('checkout-coupon');
            if (couponInput) {
                couponInput.focus();
            }
        }, 100);
    }

    applyCoupon() {
        const couponInput = document.getElementById('checkout-coupon');
        const messageDiv = document.getElementById('checkout-coupon-message');

        if (!couponInput || !this.checkoutData) return;

        const couponCode = couponInput.value.trim();
        
        if (!couponCode) {
            messageDiv.textContent = 'Please enter a coupon code';
            messageDiv.className = 'mt-2 small text-danger';
            return;
        }

        const result = this.validateCoupon(couponCode.toUpperCase());

        if (result.success) {
            this.checkoutData.discount = result.discount;
            this.checkoutData.total = this.checkoutData.subtotal - this.checkoutData.discount + this.checkoutData.shipping;
            this.saveCheckoutData();
            this.renderOrderSummary();
            
            messageDiv.textContent = result.message;
            messageDiv.className = 'mt-2 small text-success';
            
            // Ocultar la sección de cupón después de aplicar exitosamente
            setTimeout(() => {
                const couponSection = document.querySelector('.checkout-coupon-section');
                if (couponSection) {
                    couponSection.remove();
                }
            }, 2000);
            
        } else {
            messageDiv.textContent = result.message;
            messageDiv.className = 'mt-2 small text-danger';
            
            // Resaltar el input en error
            couponInput.style.borderColor = '#dc3545';
            setTimeout(() => {
                couponInput.style.borderColor = '';
            }, 2000);
        }
    }

    validateCoupon(couponCode) {
        const coupons = {
            'WELCOME10': 10,
            'SAVE20': 20,
            'FREESHIP': this.checkoutData.shipping
        };

        if (coupons[couponCode]) {
            return {
                success: true,
                discount: coupons[couponCode],
                message: `Coupon applied! Discount: $${coupons[couponCode]}`
            };
        } else {
            return {
                success: false,
                message: 'Invalid coupon code'
            };
        }
    }

    saveCheckoutData() {
        this.checkoutData.timestamp = new Date().getTime();
        localStorage.setItem('checkoutData', JSON.stringify(this.checkoutData));
    }

    // Mostrar mensajes de pago
    showPaymentMessage(message) {
        alert(message);
    }

    showPaymentError(message) {
        alert('Error: ' + message);
    }

    handlePayPalError(error) {
        console.error('PayPal Error:', error);
        
        // Mostrar un mensaje más amigable al usuario
        let userMessage = 'Ha ocurrido un error con PayPal. ';
        
        if (error.message && error.message.includes('container element removed')) {
            userMessage += 'Por favor, no cambie de método de pago mientras se procesa la transacción.';
        } else if (error.message && error.message.includes('blocked')) {
            userMessage += 'Por favor, desactive su bloqueador de anuncios para continuar con el pago por PayPal.';
        } else {
            userMessage += 'Por favor, intente nuevamente o use otro método de pago.';
        }
        
        this.showPaymentError(userMessage);
        
        // Si el error es por bloqueo, mostrar un mensaje específico
        if (window.location.href.includes('ERR_BLOCKED_BY_CLIENT')) {
            const paypalContainer = document.getElementById('paypal-button-custom');
            if (paypalContainer) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'alert alert-warning mt-3';
                warningDiv.innerHTML = `
                    <i class="ri-error-warning-line"></i>
                    Se detectó un bloqueador de anuncios. Para usar PayPal, por favor:
                    <ul class="mt-2">
                        <li>Desactive el bloqueador de anuncios para este sitio</li>
                        <li>Recargue la página</li>
                        <li>O elija otro método de pago</li>
                    </ul>
                `;
                paypalContainer.parentNode.insertBefore(warningDiv, paypalContainer.nextSibling);
            }
        }
    }
}

// Inicializar checkout cuando el DOM esté listo
let checkout;
document.addEventListener('DOMContentLoaded', function() {
    checkout = new Checkout();
});
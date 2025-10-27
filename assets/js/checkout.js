// Checkout functionality
class Checkout {
  constructor() {
    this.setupToast();
    this.checkoutData = this.loadCheckoutData();
    this.paypalLoaded = false;
    this.paypalInitializing = false;
    this.paypalInitialized = false;
    this.mercadoPagoInitialized = false;
    this.init();
  }

  init() {
    if (!this.checkoutData) {
      this.redirectToShop();
      return;
    }

    this.renderOrderSummary();
    this.setupEventListeners();
    this.loadPayPalSDK();
    this.loadMercadoPagoSDK();
    this.setupCountryStates();
    this.setupZipCodeAutocomplete();
  }

  setupToast() {
    // Crear elemento toast si no existe
    if (!document.getElementById("checkout-toast")) {
      const toast = document.createElement("div");
      toast.id = "checkout-toast";
      toast.className = "checkout-toast";
      toast.innerHTML = `
                <div class="checkout-toast-content">
                    <div class="checkout-toast-icon">
                        <i class="ri-checkbox-circle-fill"></i>
                    </div>
                    <div class="checkout-toast-message"></div>
                    <button class="checkout-toast-close">&times;</button>
                </div>
            `;
      document.body.appendChild(toast);

      // Estilos para el toast
      const style = document.createElement("style");
      style.textContent = `
                .checkout-toast {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 16px;
                    min-width: 300px;
                    max-width: 400px;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    z-index: 10000;
                    border-left: 4px solid #007bff;
                }

                .checkout-toast.show {
                    transform: translateX(0);
                }

                .checkout-toast.success {
                    border-left-color: #28a745;
                }

                .checkout-toast.error {
                    border-left-color: #dc3545;
                }

                .checkout-toast.warning {
                    border-left-color: #ffc107;
                }

                .checkout-toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .checkout-toast-icon {
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    font-weight: bold;
                }

                .checkout-toast.success .checkout-toast-icon {
                    color: #28a745;
                }

                .checkout-toast.error .checkout-toast-icon {
                    color: #dc3545;
                }

                .checkout-toast.warning .checkout-toast-icon {
                    color: #ffc107;
                }

                .checkout-toast .checkout-toast-icon {
                    color: #007bff;
                }

                .checkout-toast.success {
                    border-left-color: #28a745;
                }

                .checkout-toast.error {
                    border-left-color: #dc3545;
                }

                .checkout-toast.warning {
                    border-left-color: #ffc107;
                }

                .checkout-toast {
                    border-left-color: #007bff;
                }

                .checkout-toast-message {
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #333;
                }

                .checkout-toast-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #6c757d;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .checkout-toast-close:hover {
                    color: #333;
                }
            `;
      document.head.appendChild(style);

      // Event listener para cerrar toast
      toast
        .querySelector(".checkout-toast-close")
        .addEventListener("click", () => {
          this.hideToast();
        });
    }
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("checkout-toast");
    const messageEl = toast.querySelector(".checkout-toast-message");
    const iconEl = toast.querySelector(".checkout-toast-icon");

    // Configurar tipo de toast
    toast.className = `checkout-toast ${type}`;
    messageEl.textContent = message;

    // Configurar icono según el tipo
    switch (type) {
      case "success":
        iconEl.innerHTML = '<i class="ri-checkbox-circle-fill"></i>';
        break;
      case "error":
        iconEl.innerHTML = '<i class="ri-error-warning-fill"></i>';
        break;
      case "warning":
        iconEl.innerHTML = '<i class="ri-alert-fill"></i>';
        break;
      default:
        iconEl.innerHTML = '<i class="ri-information-fill"></i>';
    }

    // Mostrar toast
    toast.classList.add("show");

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast() {
    const toast = document.getElementById("checkout-toast");
    if (toast) {
      toast.classList.remove("show");
    }
  }

  setupZipCodeAutocomplete() {
    const zipcodeInput = document.getElementById("zipcode");
    const cityInput = document.getElementById("city");
    const stateSelect = document.getElementById("state");
    const countrySelect = document.getElementById("country");
    const loadingElement = document.getElementById("zipcode-loading");

    if (!zipcodeInput) return;

    let zipcodeTimeout;

    zipcodeInput.addEventListener("input", (e) => {
      clearTimeout(zipcodeTimeout);
      const zipcode = e.target.value.trim();

      if (zipcode.length < 3) {
        this.clearLocationFields();
        return;
      }

      zipcodeTimeout = setTimeout(() => {
        this.lookupZipCode(zipcode, countrySelect.value);
      }, 800);
    });

    // También buscar cuando cambia el país
    if (countrySelect) {
      countrySelect.addEventListener("change", () => {
        const zipcode = zipcodeInput.value.trim();
        if (zipcode.length >= 3) {
          this.lookupZipCode(zipcode, countrySelect.value);
        }
      });
    }
  }

  async lookupZipCode(zipcode, countryCode) {
    const cityInput = document.getElementById("city");
    const stateSelect = document.getElementById("state");
    const loadingElement = document.getElementById("zipcode-loading");

    if (!cityInput || !stateSelect) return;

    // Mostrar loading
    if (loadingElement) loadingElement.style.display = "block";
    cityInput.disabled = true;
    stateSelect.disabled = true;

    try {
      const response = await fetch(
        `https://api.zippopotam.us/${countryCode}/${zipcode}`
      );

      if (!response.ok) {
        throw new Error("Zip code not found");
      }

      const data = await response.json();
      this.populateLocationFields(data);
    } catch (error) {
      console.log("Zip code not found or error:", error);
      // No mostrar toast para errores de zipcode
      this.enableLocationFields();
    } finally {
      if (loadingElement) loadingElement.style.display = "none";
    }
  }

  populateLocationFields(data) {
    const cityInput = document.getElementById("city");
    const stateSelect = document.getElementById("state");

    if (!data.places || data.places.length === 0) return;

    const place = data.places[0];

    // Llenar ciudad
    if (cityInput && place["place name"]) {
      cityInput.value = place["place name"];
    }

    // Llenar estado
    if (stateSelect && place["state"]) {
      // Buscar si el estado ya existe en las opciones
      let stateExists = false;
      for (let option of stateSelect.options) {
        if (
          option.text === place["state"] ||
          option.value === place["state abbreviation"]
        ) {
          option.selected = true;
          stateExists = true;
          break;
        }
      }

      // Si no existe, agregarlo
      if (!stateExists) {
        const newOption = new Option(
          place["state"],
          place["state abbreviation"] || place["state"]
        );
        stateSelect.appendChild(newOption);
        newOption.selected = true;
      }
    }

    this.enableLocationFields();
  }

  setupCountryStates() {
    const countrySelect = document.getElementById('country');
    const stateSelect = document.getElementById('state');
    
    if (!countrySelect || !stateSelect) return;

    // Mapeo de países y sus estados
    const countryStates = {
        'MX': [
            { code: 'AGS', name: 'Aguascalientes' },
            { code: 'BC', name: 'Baja California' },
            { code: 'BCS', name: 'Baja California Sur' },
            { code: 'CAMP', name: 'Campeche' },
            { code: 'CHIS', name: 'Chiapas' },
            { code: 'CHIH', name: 'Chihuahua' },
            { code: 'CDMX', name: 'Ciudad de México' },
            { code: 'COAH', name: 'Coahuila' },
            { code: 'COL', name: 'Colima' },
            { code: 'DGO', name: 'Durango' },
            { code: 'GTO', name: 'Guanajuato' },
            { code: 'GRO', name: 'Guerrero' },
            { code: 'HGO', name: 'Hidalgo' },
            { code: 'JAL', name: 'Jalisco' },
            { code: 'MEX', name: 'Estado de México' },
            { code: 'MICH', name: 'Michoacán' },
            { code: 'MOR', name: 'Morelos' },
            { code: 'NAY', name: 'Nayarit' },
            { code: 'NL', name: 'Nuevo León' },
            { code: 'OAX', name: 'Oaxaca' },
            { code: 'PUE', name: 'Puebla' },
            { code: 'QRO', name: 'Querétaro' },
            { code: 'QROO', name: 'Quintana Roo' },
            { code: 'SLP', name: 'San Luis Potosí' },
            { code: 'SIN', name: 'Sinaloa' },
            { code: 'SON', name: 'Sonora' },
            { code: 'TAB', name: 'Tabasco' },
            { code: 'TAMS', name: 'Tamaulipas' },
            { code: 'TLAX', name: 'Tlaxcala' },
            { code: 'VER', name: 'Veracruz' },
            { code: 'YUC', name: 'Yucatán' },
            { code: 'ZAC', name: 'Zacatecas' }
        ],
        'US': [
            { code: 'AL', name: 'Alabama' },
            { code: 'AK', name: 'Alaska' },
            { code: 'AZ', name: 'Arizona' },
            { code: 'AR', name: 'Arkansas' },
            { code: 'CA', name: 'California' },
            { code: 'CO', name: 'Colorado' },
            { code: 'CT', name: 'Connecticut' },
            { code: 'DE', name: 'Delaware' },
            { code: 'FL', name: 'Florida' },
            { code: 'GA', name: 'Georgia' },
            { code: 'HI', name: 'Hawaii' },
            { code: 'ID', name: 'Idaho' },
            { code: 'IL', name: 'Illinois' },
            { code: 'IN', name: 'Indiana' },
            { code: 'IA', name: 'Iowa' },
            { code: 'KS', name: 'Kansas' },
            { code: 'KY', name: 'Kentucky' },
            { code: 'LA', name: 'Louisiana' },
            { code: 'ME', name: 'Maine' },
            { code: 'MD', name: 'Maryland' },
            { code: 'MA', name: 'Massachusetts' },
            { code: 'MI', name: 'Michigan' },
            { code: 'MN', name: 'Minnesota' },
            { code: 'MS', name: 'Mississippi' },
            { code: 'MO', name: 'Missouri' },
            { code: 'MT', name: 'Montana' },
            { code: 'NE', name: 'Nebraska' },
            { code: 'NV', name: 'Nevada' },
            { code: 'NH', name: 'New Hampshire' },
            { code: 'NJ', name: 'New Jersey' },
            { code: 'NM', name: 'New Mexico' },
            { code: 'NY', name: 'New York' },
            { code: 'NC', name: 'North Carolina' },
            { code: 'ND', name: 'North Dakota' },
            { code: 'OH', name: 'Ohio' },
            { code: 'OK', name: 'Oklahoma' },
            { code: 'OR', name: 'Oregon' },
            { code: 'PA', name: 'Pennsylvania' },
            { code: 'RI', name: 'Rhode Island' },
            { code: 'SC', name: 'South Carolina' },
            { code: 'SD', name: 'South Dakota' },
            { code: 'TN', name: 'Tennessee' },
            { code: 'TX', name: 'Texas' },
            { code: 'UT', name: 'Utah' },
            { code: 'VT', name: 'Vermont' },
            { code: 'VA', name: 'Virginia' },
            { code: 'WA', name: 'Washington' },
            { code: 'WV', name: 'West Virginia' },
            { code: 'WI', name: 'Wisconsin' },
            { code: 'WY', name: 'Wyoming' }
        ],
        'CA': [
            { code: 'AB', name: 'Alberta' },
            { code: 'BC', name: 'British Columbia' },
            { code: 'MB', name: 'Manitoba' },
            { code: 'NB', name: 'New Brunswick' },
            { code: 'NL', name: 'Newfoundland and Labrador' },
            { code: 'NS', name: 'Nova Scotia' },
            { code: 'ON', name: 'Ontario' },
            { code: 'PE', name: 'Prince Edward Island' },
            { code: 'QC', name: 'Quebec' },
            { code: 'SK', name: 'Saskatchewan' },
            { code: 'NT', name: 'Northwest Territories' },
            { code: 'NU', name: 'Nunavut' },
            { code: 'YT', name: 'Yukon' }
        ],
        'CL': [
            { code: 'AN', name: 'Antofagasta' },
            { code: 'AR', name: 'Arica y Parinacota' },
            { code: 'AT', name: 'Atacama' },
            { code: 'AI', name: 'Aisén del General Carlos Ibáñez del Campo' },
            { code: 'BI', name: 'Biobío' },
            { code: 'CO', name: 'Coquimbo' },
            { code: 'LI', name: 'Libertador General Bernardo O\'Higgins' },
            { code: 'LL', name: 'Los Lagos' },
            { code: 'LR', name: 'Los Ríos' },
            { code: 'MA', name: 'Magallanes y de la Antártica Chilena' },
            { code: 'ML', name: 'Maule' },
            { code: 'NB', name: 'Ñuble' },
            { code: 'RM', name: 'Región Metropolitana de Santiago' },
            { code: 'TA', name: 'Tarapacá' },
            { code: 'VA', name: 'Valparaíso' }
        ]
    };

    countrySelect.addEventListener('change', (e) => {
        const countryCode = e.target.value;
        this.updateStatesDropdown(countryCode, countryStates, stateSelect);
        
        // Limpiar campos de ubicación cuando cambia el país
        this.clearLocationFields();
    });

    // Inicializar estados con el país seleccionado por defecto
    const defaultCountry = countrySelect.value;
    this.updateStatesDropdown(defaultCountry, countryStates, stateSelect);
}

updateStatesDropdown(countryCode, countryStates, stateSelect) {
    // Limpiar dropdown actual
    stateSelect.innerHTML = '<option value="">Select a state...</option>';
    
    if (countryCode && countryStates[countryCode]) {
        // Habilitar dropdown
        stateSelect.disabled = false;
        
        // Agregar estados del país
        countryStates[countryCode].forEach(state => {
            const option = document.createElement('option');
            option.value = state.code;
            option.textContent = state.name;
            stateSelect.appendChild(option);
        });
    } else {
        // Deshabilitar si no hay estados para ese país
        stateSelect.disabled = true;
    }
}

  enableLocationFields() {
    const cityInput = document.getElementById("city");
    const stateSelect = document.getElementById("state");

    if (cityInput) cityInput.disabled = false;
    if (stateSelect) stateSelect.disabled = false;
  }

  clearLocationFields() {
    const cityInput = document.getElementById("city");
    const zipcodeInput = document.getElementById('zipcode');

    if (cityInput) {
      cityInput.value = "";
      cityInput.disabled = false;
    }

    if (stateSelect) {
      stateSelect.value = "";
    }
  }

  loadCheckoutData() {
    try {
      const data = localStorage.getItem("checkoutData");
      if (!data) return null;

      const checkoutData = JSON.parse(data);

      const now = new Date().getTime();
      if (now - checkoutData.timestamp > 3600000) {
        localStorage.removeItem("checkoutData");
        return null;
      }

      return checkoutData;
    } catch (error) {
      console.error("Error loading checkout data:", error);
      return null;
    }
  }

  redirectToShop() {
    this.showToast("No checkout data found. Redirecting to shop...", "warning");
    setTimeout(() => {
      window.location.href = "shop.html";
    }, 2000);
  }

  renderOrderSummary() {
    const orderList = document.querySelector(".optech-checkuot-sidebar ul");
    if (!orderList) return;

    const headerItem = orderList.querySelector("li:first-child");
    orderList.innerHTML = "";
    if (headerItem) {
      orderList.appendChild(headerItem);
    }

    this.checkoutData.cart.forEach((item) => {
      const listItem = document.createElement("li");
      const displayName =
        item.name.length > 30 ? item.name.substring(0, 30) + "..." : item.name;

      listItem.innerHTML = `
                ${displayName} x${item.quantity}<span>$${(
        item.price * item.quantity
      ).toFixed(2)}</span>
            `;
      orderList.appendChild(listItem);
    });

    const subtotalItem = document.createElement("li");
    subtotalItem.innerHTML = `Subtotal<span>$${this.checkoutData.subtotal.toFixed(
      2
    )}</span>`;
    orderList.appendChild(subtotalItem);

    if (this.checkoutData.discount > 0) {
      const discountItem = document.createElement("li");
      discountItem.innerHTML = `Discount<span class="text-success">-$${this.checkoutData.discount.toFixed(
        2
      )}</span>`;
      orderList.appendChild(discountItem);
    }

    const shippingItem = document.createElement("li");
    shippingItem.innerHTML = `Shipping<span>$${this.checkoutData.shipping.toFixed(
      2
    )}</span>`;
    orderList.appendChild(shippingItem);

    const totalItem = document.createElement("li");
    totalItem.innerHTML = `Total<span class="total-amount">$${this.checkoutData.total.toFixed(
      2
    )}</span>`;
    orderList.appendChild(totalItem);
  }

  setupEventListeners() {
    const checkoutForm = document.querySelector(".optech-checkout-form form");
    const placeOrderBtn = document.querySelector(".shop-order-btn");

    if (checkoutForm && placeOrderBtn) {
      placeOrderBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handlePlaceOrder();
      });
    }

    const couponLink = document.querySelector(".optech-checkout-header a");
    if (couponLink) {
      couponLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showCouponSection();
      });
    }

    this.setupPaymentMethods();
  }

  setupPaymentMethods() {
    const paymentMethods = document.querySelectorAll(
      'input[name="payment-method"]'
    );
    const cardForm = document.getElementById("card-form");
    const paypalButton = document.getElementById("paypal-button-container");
    const mercadopagoButton = document.getElementById("mercadopago-button-container");
    const cardPaymentButton = document.getElementById("card-payment-button");

    paymentMethods.forEach((method) => {
      method.addEventListener("change", (e) => {
        if (!this.validateCheckoutForm()) {
          e.preventDefault();
          this.showToast(
            "Please complete all required fields before selecting a payment method.",
            "warning"
          );
          method.checked = false;
          return;
        }
        this.handlePaymentMethodChange(e.target.value);
      });
    });

    const processCardBtn = document.getElementById("process-card-payment");
    if (processCardBtn) {
      processCardBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.processCardPayment();
      });
    }

    this.setupCardInputFormatting();
  }

  initializePayPal() {
    // Prevenir múltiples inicializaciones
    if (this.paypalInitializing || this.paypalInitialized) {
      return;
    }

    if (typeof paypal === "undefined") {
      console.log("PayPal SDK not loaded, retrying...");
      setTimeout(() => this.initializePayPal(), 1000);
      return;
    }

    const container = document.getElementById("paypal-button-container");
    if (!container) {
      console.error("PayPal container not found");
      return;
    }

    // Limpiar contenedor solo si no hay botones ya renderizados
    if (!container.querySelector('.paypal-buttons')) {
      container.innerHTML = "";
    }

    this.paypalInitializing = true;

    try {
      paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "paypal",
          },
          createOrder: (data, actions) => {
            if (!this.validateCheckoutForm()) {
              throw new Error("Please complete all required fields.");
            }

            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: this.checkoutData.total.toFixed(2),
                    currency_code: "USD",
                  },
                  description: `Devion Purchase - ${this.checkoutData.cart.length} items`,
                },
              ],
            });
          },
          onApprove: async (data, actions) => {
            try {
              const details = await actions.order.capture();
              const payerName = details.payer.name.given_name;
              const transactionId =
                details.purchase_units[0]?.payments?.captures[0]?.id ||
                data.orderID;
              this.processPayPalSuccess(
                details,
                data.orderID,
                payerName,
                transactionId
              );
            } catch (error) {
              console.error("Error capturing PayPal order:", error);
              this.showToast(
                "Error processing your payment. Please try again.",
                "error"
              );
            }
          },
          onError: (err) => {
            console.error("PayPal Error:", err);
            // No mostrar toast para errores internos de PayPal
            if (err.message && err.message.includes("blocked")) {
              this.showToast(
                "Please disable your ad blocker to use PayPal.",
                "error"
              );
            }
          },
          onCancel: () => {
            console.log("PayPal payment cancelled by user");
            this.showToast(
              "Payment cancelled. You can try again or choose another payment method.",
              "warning"
            );
          },
        })
        .render("#paypal-button-container")
        .then(() => {
          this.paypalInitializing = false;
          this.paypalInitialized = true;
          console.log("PayPal buttons rendered successfully");
        })
        .catch((error) => {
          this.paypalInitializing = false;
          console.error("Error rendering PayPal buttons:", error);
          // No mostrar toast para errores de renderizado
        });
    } catch (error) {
      this.paypalInitializing = false;
      console.error("Exception in PayPal initialization:", error);
      // No mostrar toast para excepciones
    }
  }

  initializeMercadoPago() {
    if (this.mercadoPagoInitialized) {
      return;
    }

    if (typeof MercadoPago === "undefined") {
      console.log("MercadoPago SDK not loaded, retrying...");
      setTimeout(() => this.initializeMercadoPago(), 1000);
      return;
    }

    const container = document.getElementById("mercadopago-button-container");
    if (!container) {
      console.error("MercadoPago container not found");
      return;
    }

    // Limpiar contenedor
    container.innerHTML = "";

    try {
      // Inicializar Mercado Pago con clave pública de sandbox
      const mp = new MercadoPago("TEST-64d68a5d-0e4e-41b9-875d-9c4098e8660f", {
        locale: "es-MX",
      });

      // Crear los datos de la preferencia
      const preferenceData = {
        items: this.checkoutData.cart.map(item => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          title: item.name,
          description: item.description || `Product: ${item.name}`,
          quantity: item.quantity,
          unit_price: parseFloat(item.price),
          currency_id: "USD",
        })),
        payer: {
          name: document.getElementById("firstname")?.value || "Test",
          surname: document.getElementById("lastname")?.value || "User",
          email: document.getElementById("email")?.value || "test@user.com",
        },
        back_urls: {
          success: window.location.origin + "/pago-exitoso.html",
          failure: window.location.origin + "/pago-fallido.html",
          pending: window.location.origin + "/pago-pendiente.html",
        },
        auto_return: "approved",
        notification_url: window.location.origin + "/webhook-mercadopago.html",
        statement_descriptor: "DEVION STORE",
        external_reference: "devion_" + Date.now(),
      };

      // Crear preferencia
      mp.checkout({
        preference: preferenceData,
        render: {
          container: "#mercadopago-button-container",
          label: "Pagar con Mercado Pago",
          type: "wallet", // Usar wallet para mejor experiencia
        },
      });

      this.mercadoPagoInitialized = true;
      console.log("MercadoPago initialized successfully");

    } catch (error) {
      console.error("Error initializing MercadoPago:", error);
      this.showToast(
        "Error initializing Mercado Pago. Please try again.",
        "error"
      );
    }
  }

  processPayPalSuccess(details, orderID, payerName, transactionId) {
    localStorage.removeItem("cart");
    localStorage.removeItem("checkoutData");

    this.showToast(
      `¡Pago exitoso! Gracias por tu compra ${payerName}. ID de transacción: ${transactionId}`,
      "success"
    );

    setTimeout(() => {
      window.location.href =
        "pago-exitoso.html?paymentId=" +
        transactionId +
        "&payerName=" +
        encodeURIComponent(payerName) +
        "&amount=" +
        this.checkoutData.total.toFixed(2) +
        "&currency=USD";
    }, 2000);
  }

  loadPayPalSDK() {
    // Verificar si el SDK ya está cargado
    if (document.querySelector('script[src*="paypal.com/sdk/js"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=AS1Z8oiTYrJz4otR9AKuh44YsHW99lIVCPOrwVlEnUK48o6MAmgIQLixgcteIZY5YS0M5F7RuRg6LCOW&currency=USD&intent=capture&components=buttons&disable-funding=venmo,paylater,card";
    script.onload = () => {
      console.log("PayPal SDK loaded");
      // No inicializar automáticamente, esperar a que se seleccione el método
    };
    script.onerror = () => {
      console.error("Failed to load PayPal SDK");
    };
    document.head.appendChild(script);
  }

  loadMercadoPagoSDK() {
    // Verificar si el SDK ya está cargado
    if (document.querySelector('script[src*="mercadolibre.com/mptools"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = () => {
      console.log("MercadoPago SDK loaded");
      // No inicializar automáticamente, esperar a que se seleccione el método
    };
    script.onerror = () => {
      console.error("Failed to load MercadoPago SDK");
    };
    document.head.appendChild(script);
  }

  handlePaymentMethodChange(method) {
    const cardForm = document.getElementById("card-form");
    const paypalButton = document.getElementById("paypal-button-container");
    const mercadopagoButton = document.getElementById("mercadopago-button-container");
    const oxxoInfo = document.getElementById("oxxo-info");
    const cardPaymentButton = document.getElementById("card-payment-button");

    [
      cardForm,
      paypalButton,
      mercadopagoButton,
      oxxoInfo,
      cardPaymentButton,
    ].forEach((el) => {
      if (el) {
        el.style.display = "none";
        if (el === paypalButton) {
          el.style.position = "";
          el.style.left = "";
        }
      }
    });

    switch (method) {
      case "card":
        if (cardForm) {
          cardForm.style.display = "block";
        }
        if (cardPaymentButton) {
          cardPaymentButton.style.display = "block";
        }
        break;
      case "paypal":
        if (paypalButton) {
          paypalButton.style.display = "block";
          // Inicializar PayPal solo cuando se selecciona el método
          if (typeof paypal !== "undefined") {
            setTimeout(() => this.initializePayPal(), 100);
          }
        }
        break;
      case "mercadopago":
        if (mercadopagoButton) {
          mercadopagoButton.style.display = "block";
          // Inicializar Mercado Pago solo cuando se selecciona el método
          if (typeof MercadoPago !== "undefined") {
            setTimeout(() => this.initializeMercadoPago(), 100);
          } else {
            this.loadMercadoPagoSDK();
            setTimeout(() => this.initializeMercadoPago(), 1000);
          }
        }
        break;
      case 'oxxo':
          if (oxxoInfo) {
              oxxoInfo.style.display = 'block';
          }
          break;
    }
  }

  setupCardInputFormatting() {
    const cardNumberInput = document.querySelector(
      '#card-form input[placeholder*="Card Number"]'
    );
    const expiryInput = document.querySelector(
      '#card-form input[placeholder*="MM/YY"]'
    );
    const cvvInput = document.querySelector(
      '#card-form input[placeholder*="CVV"]'
    );

    if (cardNumberInput) {
      cardNumberInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        let formattedValue = "";

        for (let i = 0; i < value.length; i++) {
          if (i > 0 && i % 4 === 0) {
            formattedValue += " ";
          }
          formattedValue += value[i];
        }

        e.target.value = formattedValue.substring(0, 19);
      });
    }

    if (expiryInput) {
      expiryInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/[^0-9]/g, "");
        if (value.length >= 2) {
          e.target.value = value.substring(0, 2) + "/" + value.substring(2, 4);
        }
      });
    }

    if (cvvInput) {
      cvvInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "").substring(0, 3);
      });
    }
  }

  validateCheckoutForm() {
    const form = document.querySelector(".optech-checkout-form form");
    if (!form) return false;

    const requiredFields = form.querySelectorAll(
      "input[required], select[required]"
    );
    let isValid = true;
    let firstErrorField = null;

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        isValid = false;
        field.style.borderColor = "#dc3545";

        if (!firstErrorField) {
          firstErrorField = field;
        }
      } else {
        field.style.borderColor = "";
      }
    });

    const emailField = document.getElementById("email");
    if (emailField && emailField.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailField.value)) {
        isValid = false;
        emailField.style.borderColor = "#dc3545";
        if (!firstErrorField) {
          firstErrorField = emailField;
        }
      }
    }

    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstErrorField.focus();
    }

    return isValid;
  }

  handlePlaceOrder() {
    if (!this.validateCheckoutForm()) {
      this.showToast(
        "Please fill in all required fields and select a payment method.",
        "warning"
      );
      return;
    }

    const selectedPayment = document.querySelector(
      'input[name="payment-method"]:checked'
    );
    if (!selectedPayment) {
      this.showToast("Please select a payment method.", "warning");
      return;
    }

    const paymentMethod = selectedPayment.value;

    switch (paymentMethod) {
      case "paypal":
        this.showToast(
          "Please complete the payment using the PayPal button above.",
          "info"
        );
        break;
      case "card":
        this.processCardPayment();
        break;
      case "mercadopago":
        this.showToast(
          "Please complete the payment using the Mercado Pago button above.",
          "info"
        );
        break;
      case 'oxxo':
          this.processOxxoPayment();
          break;
    }
  }

  processOxxoPayment() {
    if (!this.validateCheckoutForm()) {
      this.showToast("Please fill in all required fields.", "warning");
      return;
    }

    const placeOrderBtn = document.querySelector(".shop-order-btn");
    const originalText = placeOrderBtn.querySelector(".btn-wraper").textContent;
    placeOrderBtn.querySelector(".btn-wraper").textContent =
      "Generating Oxxo Reference...";
    placeOrderBtn.disabled = true;

    setTimeout(() => {
      const referenceNumber =
        "OX" + Math.random().toString(36).substr(2, 8).toUpperCase();

      localStorage.removeItem("cart");
      localStorage.removeItem("checkoutData");

      this.showToast(
        `Oxxo Pay Reference: ${referenceNumber}. Please take this reference to any Oxxo store and pay within 24 hours.`,
        "success"
      );

      setTimeout(() => {
        window.location.href = "index.html";
      }, 3000);
    }, 2000);
  }

  processCardPayment() {
    const cardNumber = document.querySelector(
      '#card-form input[placeholder*="Card Number"]'
    );
    const expiry = document.querySelector(
      '#card-form input[placeholder*="MM/YY"]'
    );
    const cvv = document.querySelector('#card-form input[placeholder*="CVV"]');
    const cardholder = document.querySelector(
      '#card-form input[placeholder*="Cardholder Name"]'
    );

    if (
      !cardNumber ||
      !cardNumber.value ||
      !expiry ||
      !expiry.value ||
      !cvv ||
      !cvv.value ||
      !cardholder ||
      !cardholder.value
    ) {
      this.showToast("Please fill in all card details.", "warning");
      return;
    }

    const cardNumberValue = cardNumber.value.replace(/\s/g, "");
    if (cardNumberValue.length < 15 || cardNumberValue.length > 16) {
      this.showToast("Please enter a valid card number.", "warning");
      cardNumber.focus();
      return;
    }

    const expiryValue = expiry.value.split("/");
    if (
      expiryValue.length !== 2 ||
      expiryValue[0].length !== 2 ||
      expiryValue[1].length !== 2
    ) {
      this.showToast(
        "Please enter a valid expiry date in MM/YY format.",
        "warning"
      );
      expiry.focus();
      return;
    }

    if (cvv.value.length < 3) {
      this.showToast("Please enter a valid CVV.", "warning");
      cvv.focus();
      return;
    }

    this.processOrder("Credit Card");
  }

  processOrder(paymentMethod, reference = "") {
    const placeOrderBtn = document.querySelector(".shop-order-btn");
    const originalText = placeOrderBtn.querySelector(".btn-wraper").textContent;
    placeOrderBtn.querySelector(".btn-wraper").textContent = "Processing...";
    placeOrderBtn.disabled = true;

    setTimeout(() => {
      localStorage.removeItem("cart");
      localStorage.removeItem("checkoutData");

      let message = `Order placed successfully with ${paymentMethod}! Thank you for your purchase.`;
      if (reference) {
        message = `Order placed successfully! Your ${paymentMethod} reference: ${reference}. Please complete your payment within 24 hours.`;
      }

      this.showToast(message, "success");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 3000);
    }, 2000);
  }

  showCouponSection() {
    const existingCouponSection = document.querySelector(
      ".checkout-coupon-section"
    );
    if (existingCouponSection) {
      existingCouponSection.remove();
      return;
    }

    const couponSection = document.createElement("div");
    couponSection.className =
      "checkout-coupon-section mt-4 mb-4 p-3 bg-light rounded";
    couponSection.innerHTML = `
            <h6 class="mb-3">Apply Coupon</h6>
            <div class="input-group">
                <input type="text" class="form-control" placeholder="Enter coupon code" id="checkout-coupon">
                <button class="btn btn-primary" type="button" onclick="checkout.applyCoupon()">Apply</button>
            </div>
            <div id="checkout-coupon-message" class="mt-2 small"></div>
        `;

    const checkoutHeader = document.querySelector(".optech-checkout-header");
    checkoutHeader.parentNode.insertBefore(
      couponSection,
      checkoutHeader.nextSibling
    );

    setTimeout(() => {
      const couponInput = document.getElementById("checkout-coupon");
      if (couponInput) {
        couponInput.focus();
      }
    }, 100);
  }

  applyCoupon() {
    const couponInput = document.getElementById("checkout-coupon");
    const messageDiv = document.getElementById("checkout-coupon-message");

    if (!couponInput || !messageDiv) return;

    const couponCode = couponInput.value.trim().toUpperCase();

    if (!couponCode) {
      messageDiv.innerHTML =
        '<span class="text-danger">Please enter a coupon code.</span>';
      return;
    }

    const validCoupons = {
      WELCOME10: 10,
      SAVE15: 15,
      FREESHIP: "free_shipping",
    };

    if (validCoupons[couponCode]) {
      const discount = validCoupons[couponCode];
      let discountAmount = 0;

      if (typeof discount === "number") {
        discountAmount = (this.checkoutData.subtotal * discount) / 100;
      } else if (discount === "free_shipping") {
        discountAmount = this.checkoutData.shipping;
      }

      this.checkoutData.discount = discountAmount;
      this.checkoutData.total =
        this.checkoutData.subtotal +
        this.checkoutData.shipping -
        discountAmount;
      this.checkoutData.coupon = couponCode;

      localStorage.setItem("checkoutData", JSON.stringify(this.checkoutData));
      this.renderOrderSummary();

      messageDiv.innerHTML = `<span class="text-success">Coupon "${couponCode}" applied successfully!</span>`;
      couponInput.disabled = true;
    } else {
      messageDiv.innerHTML =
        '<span class="text-danger">Invalid coupon code. Please try another one.</span>';
    }
  }
}

// Inicializar checkout cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  window.checkout = new Checkout();
});
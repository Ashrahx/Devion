// Carrito functionality
class Cart {
  constructor() {
    this.cart = this.loadCart();
    this.discount = 0;
    this.shipping = 4.99; // Shipping fee fijo
    this.init();
  }

  init() {
    this.updateCartUI();
    this.setupEventListeners();
    this.setupAddToCartButtons();
  }

  loadCart() {
    try {
      const cart = localStorage.getItem("cart");
      return cart ? JSON.parse(cart) : [];
    } catch (error) {
      console.error("Error loading cart:", error);
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem("cart", JSON.stringify(this.cart));
      this.updateCartUI();
    } catch (error) {
      console.error("Error saving cart:", error);
    }
  }

  addItem(product) {
    const existingItem = this.cart.find((item) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += product.quantity || 1;
    } else {
      this.cart.push({
        ...product,
        quantity: product.quantity || 1,
      });
    }

    this.saveCart();
    this.showAddToCartMessage(product.name);
  }

  removeItem(productId) {
    this.cart = this.cart.filter((item) => item.id !== productId);
    this.saveCart();
  }

  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.cart.find((item) => item.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveCart();
    }
  }

  getTotalItems() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal() {
    return this.cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  getDiscount() {
    return this.discount;
  }

  getShipping() {
    return this.shipping;
  }

  getTotal() {
    return this.getSubtotal() - this.getDiscount() + this.getShipping();
  }

  applyCoupon(couponCode) {
    // Lógica simple de cupones
    const coupons = {
      WELCOME10: 10,
      SAVE20: 20,
      FREESHIP: this.shipping,
    };

    if (coupons[couponCode]) {
      this.discount = coupons[couponCode];
      this.saveCart();
      return {
        success: true,
        message: `Coupon applied! Discount: $${this.discount}`,
      };
    } else {
      return { success: false, message: "Invalid coupon code" };
    }
  }

  updateCartUI() {
    this.updateCartCount();
    this.updateCartModal();
  }

  updateCartCount() {
    const cartCounts = document.querySelectorAll(".cart-count");
    const totalItems = this.getTotalItems();

    cartCounts.forEach((count) => {
      count.textContent = totalItems;
      count.style.display = totalItems > 0 ? "inline-block" : "none";
    });
  }

  updateCartModal() {
    const cartEmpty = document.getElementById('cart-empty');
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const cartItemsList = document.getElementById('cart-items-list');
    
    if (this.cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartItems.style.display = 'none';
        cartFooter.style.display = 'none';
        return;
    }

    cartEmpty.style.display = 'none';
    cartItems.style.display = 'block';
    cartFooter.style.display = 'flex';

    // Renderizar items del carrito
    cartItemsList.innerHTML = this.cart.map(item => {
        // Truncar nombre largo
        const displayName = item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name;
        
        // Obtener descripción según el tipo de producto
        const productDescription = this.getProductDescription(item.id, item.name);
        
        return `
        <div class="cart-item p-3 border-bottom">
            <div class="d-flex align-items-start gap-2">
                <img src="${item.image}" alt="${item.name}" 
                     class="cart-item-image">
                <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <h6 class="cart-item-title mb-0">${displayName}</h6>
                        <span class="cart-item-price fw-bold">$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <p class="text-muted small mb-2">${productDescription}</p>
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="quantity-controls d-flex align-items-center">
                            <button class="btn btn-outline-secondary btn-xs quantity-btn" 
                                    onclick="window.cart.updateQuantity('${item.id}', ${item.quantity - 1})">
                                <i class="ri-subtract-line"></i>
                            </button>
                            <span class="quantity-display mx-2">${item.quantity}</span>
                            <button class="btn btn-outline-secondary btn-xs quantity-btn" 
                                    onclick="window.cart.updateQuantity('${item.id}', ${item.quantity + 1})">
                                <i class="ri-add-line"></i>
                            </button>
                        </div>
                        <button class="btn btn-link text-danger p-0 remove-btn small" 
                                onclick="window.cart.removeItem('${item.id}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Actualizar totales
    document.getElementById('cart-subtotal').textContent = `$${this.getSubtotal().toFixed(2)}`;
    document.getElementById('cart-discount').textContent = `-$${this.getDiscount().toFixed(2)}`;
    document.getElementById('cart-shipping').textContent = `$${this.getShipping().toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${this.getTotal().toFixed(2)}`;
}

// Función para obtener descripción del producto
getProductDescription(productId, productName) {
    const descriptions = {
        // Audífonos
        'black-headphone': 'Noise Cancelling • Wireless',
        'wireless-buds': 'True Wireless • 8H Battery',
        
        // Realidad Virtual
        'vr-headset': '4K Resolution • 120Hz',
        
        // Smart Watches
        'smart-watch': 'Heart Rate Monitor • GPS',
        'smart-watch-2': 'Water Resistant • Sleep Tracking',
        
        // Proyectores
        'projector': '1080p HD • Portable Design',
        
        // Controladores
        'controller': 'Wireless • Ergonomic Design',
        
        // Cargadores
        'usb-charger': '20W Fast Charging • PD 3.0',
        'lightning-cable': '1m Length • MFi Certified',
        'magsafe-charger': 'Magnetic • 15W Fast Charge',
        
        // Ratones
        'logitech-mouse': 'Wireless • Optical Sensor',
        
        // Micrófonos
        'microphone': 'Cardioid Pattern • USB-C'
    };

    // Buscar por ID primero, luego por palabras clave en el nombre
    if (descriptions[productId]) {
        return descriptions[productId];
    }

    // Búsqueda por palabras clave en el nombre
    const name = productName.toLowerCase();
    
    if (name.includes('headphone') || name.includes('headphones')) {
        return 'Noise Cancelling • Wireless';
    } else if (name.includes('buds') || name.includes('earbuds')) {
        return 'True Wireless • 8H Battery';
    } else if (name.includes('watch')) {
        return 'Heart Rate Monitor • GPS';
    } else if (name.includes('vr') || name.includes('virtual')) {
        return '4K Resolution • 120Hz';
    } else if (name.includes('projector')) {
        return '1080p HD • Portable Design';
    } else if (name.includes('controller')) {
        return 'Wireless • Ergonomic Design';
    } else if (name.includes('charger')) {
        return 'Fast Charging • PD 3.0';
    } else if (name.includes('cable')) {
        return 'Durable • Fast Transfer';
    } else if (name.includes('mouse')) {
        return 'Wireless • Optical Sensor';
    } else if (name.includes('microphone') || name.includes('mic')) {
        return 'Cardioid Pattern • USB-C';
    } else if (name.includes('keyboard')) {
        return 'Mechanical • RGB Lighting';
    } else if (name.includes('monitor') || name.includes('display')) {
        return 'IPS Panel • 144Hz';
    } else if (name.includes('laptop')) {
        return 'Portable • High Performance';
    } else if (name.includes('tablet')) {
        return 'Touch Screen • Long Battery';
    } else if (name.includes('camera')) {
        return '4K Video • Auto Focus';
    } else if (name.includes('speaker')) {
        return '360° Sound • Bluetooth 5.0';
    }

    // Descripción por defecto para productos tecnológicos
    return 'Premium Quality • 1 Year Warranty';
}

// Función global para obtener descripción de producto
getProductFeatures(productId, productName) {
    const features = {
        'black-headphone': ['Noise Cancelling', 'Wireless', '30H Battery'],
        'vr-headset': ['4K Resolution', '120Hz Refresh', 'Wireless'],
        'smart-watch': ['Heart Rate Monitor', 'GPS', 'Water Resistant'],
        'projector': ['1080p HD', 'Portable', 'Android TV'],
        'controller': ['Wireless', 'Ergonomic', 'Vibration Feedback'],
        'wireless-buds': ['True Wireless', '8H Battery', 'Noise Cancelling'],
        'usb-charger': ['20W Fast Charging', 'PD 3.0', 'Compact'],
        'logitech-mouse': ['Wireless', 'Optical Sensor', 'Programmable'],
        'microphone': ['Cardioid Pattern', 'USB-C', 'Studio Quality'],
        'magsafe-charger': ['Magnetic', '15W Fast Charge', 'Apple Certified']
    };

    if (features[productId]) {
        return features[productId].slice(0, 2).join(' • ');
    }

    // Lógica de respaldo igual que antes
    const name = productName.toLowerCase();
    if (name.includes('headphone')) return 'Noise Cancelling • Wireless';
    if (name.includes('watch')) return 'Heart Rate Monitor • GPS';
    if (name.includes('vr')) return '4K Resolution • 120Hz';
    if (name.includes('projector')) return '1080p HD • Portable';
    if (name.includes('controller')) return 'Wireless • Ergonomic';
    if (name.includes('charger')) return 'Fast Charging • Compact';
    if (name.includes('mouse')) return 'Wireless • Precision';
    if (name.includes('microphone')) return 'Studio Quality • USB-C';
    
    return 'Premium Quality • 1 Year Warranty';
}

  setupEventListeners() {
    // Event listener para el modal del carrito
    const cartModal = document.getElementById("cartModal");
    if (cartModal) {
      cartModal.addEventListener("show.bs.modal", () => {
        this.updateCartModal();
      });
    }

    // Event listener para input de cupón
    const couponInput = document.getElementById("coupon-input");
    if (couponInput) {
      couponInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          applyCoupon();
        }
      });
    }
  }

  setupAddToCartButtons() {
    // Configurar event listeners para todos los botones "Add to Cart"
    document.addEventListener("click", (e) => {
      const button = e.target.closest("[data-add-to-cart]");
      if (button) {
        e.preventDefault();
        const product = {
          id: button.dataset.productId,
          name: button.dataset.productName,
          price: parseFloat(button.dataset.productPrice),
          image: button.dataset.productImage,
          quantity: 1,
        };
        this.addItem(product);
      }
    });
  }

  showAddToCartMessage(productName) {
    // Mostrar notificación
    const toast = document.getElementById("success-toast");
    if (toast) {
      const messageText = toast.querySelector(".message-text");
      if (messageText) {
        messageText.textContent = `${productName} added to cart!`;
      }
      toast.style.display = "block";
      setTimeout(() => {
        toast.style.display = "none";
      }, 3000);
    }
  }

  clearCart() {
    this.cart = [];
    this.discount = 0;
    this.saveCart();
  }
}

// Función para aplicar cupón
function applyCoupon() {
  const couponInput = document.getElementById("coupon-input");
  const couponMessage = document.getElementById("coupon-message");

  if (!couponInput || !window.cart) return;

  const couponCode = couponInput.value.trim().toUpperCase();
  if (!couponCode) {
    couponMessage.textContent = "Please enter a coupon code";
    couponMessage.className = "mt-2 small text-danger";
    return;
  }

  const result = window.cart.applyCoupon(couponCode);
  couponMessage.textContent = result.message;
  couponMessage.className = `mt-2 small ${
    result.success ? "text-success" : "text-danger"
  }`;

  if (result.success) {
    couponInput.value = "";
  }
}

// Función global para agregar al carrito
function addToCart(productId, productName, productPrice, productImage) {
  if (window.cart) {
    const product = {
      id: productId,
      name: productName,
      price: parseFloat(productPrice),
      image: productImage,
      quantity: 1,
    };
    window.cart.addItem(product);
  }
  return false;
}

// Función para proceder al pago
// Función para proceder al pago
function proceedToCheckout() {
    if (!window.cart || window.cart.getTotalItems() === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Guardar el carrito actual en localStorage para usarlo en checkout.html
    const checkoutData = {
        cart: window.cart.cart,
        subtotal: window.cart.getSubtotal(),
        discount: window.cart.getDiscount(),
        shipping: window.cart.getShipping(),
        total: window.cart.getTotal(),
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    
    // Redirigir a checkout.html
    window.location.href = 'checkout.html';
}

// Inicializar carrito cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  window.cart = new Cart();
});

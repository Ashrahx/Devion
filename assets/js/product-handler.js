// Función para obtener parámetros de la URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        product: params.get('product'),
        name: params.get('name'),
        price: params.get('price'),
        image: params.get('image')
    };
}

// Función para actualizar el contenido de single-shop.html
function updateProductDetails() {
    const params = getUrlParams();
    
    if (params.product) {
        // Actualizar el título de la página
        document.title = `Devion - ${decodeURIComponent(params.name)}`;
        
        // Actualizar el breadcrumb
        const breadcrumbTitle = document.querySelector('.post__title');
        const breadcrumbCurrent = document.querySelector('.breadcrumbs li[aria-current="page"]');
        if (breadcrumbTitle) breadcrumbTitle.textContent = decodeURIComponent(params.name);
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = decodeURIComponent(params.name);
        
        // Actualizar imágenes del producto
        const mainImages = document.querySelectorAll('.optech-tab-slider img');
        const thumbImages = document.querySelectorAll('.optech-tabs-menu img');
        
        mainImages.forEach(img => {
            img.src = `assets/images/shop/${params.image}`;
            img.alt = decodeURIComponent(params.name);
        });
        
        thumbImages.forEach(img => {
            img.src = `assets/images/shop/${params.image}`;
            img.alt = decodeURIComponent(params.name);
        });
        
        // Actualizar detalles del producto
        const productTitle = document.querySelector('.optech-details-content h2');
        const productPrice = document.querySelector('.optech-details-content h6');
        const productDescription = document.querySelector('.optech-details-content p');
        
        if (productTitle) productTitle.textContent = decodeURIComponent(params.name);
        if (productPrice) productPrice.textContent = `$${params.price}`;
        
        // Actualizar información rápida
        const categoryLink = document.querySelector('.optech-product-info a');
        if (categoryLink) categoryLink.textContent = decodeURIComponent(params.name);
        
        // Actualizar botón Add to Cart
        const addToCartBtn = document.querySelector('.optech-product-btn');
        if (addToCartBtn) {
            addToCartBtn.setAttribute('onclick', `addToCart('${params.product}', '${decodeURIComponent(params.name)}', ${params.price}, 'assets/images/shop/${params.image}')`);
        }
    }
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    updateProductDetails();
});
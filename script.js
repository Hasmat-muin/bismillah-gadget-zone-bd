const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; 
const imgbbAPIKey = "1e10b476d984d3447b7259386a75ee5d"; 

let cart = [];
let allProductsData = {}; 
let selectedVariantsGlobal = {}; 
let activeCategories = ["Smart Watch", "Earbuds", "Power Bank", "Adapter"]; 

function toggleCart() {
    const sidebarIndex = document.getElementById('cart-sidebar');
    const sidebarProduct = document.getElementById('cartSidebar');
    if (sidebarIndex) sidebarIndex.classList.toggle('open');
    if (sidebarProduct) sidebarProduct.classList.toggle('open');
}

function addToCart(id, name, price) {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    cart.push({ id, name, price: cleanPrice, variant });
    alert(`🛒 "${name} (${variant})" কার্টে যোগ করা হয়েছে!`);
    updateCartUI();
}

function buyNow(id, name, price) {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    cart = [{ id, name, price: cleanPrice, variant }];
    updateCartUI();
    openOrderModal();
}

function updateCartUI() {
    const countIndex = document.getElementById('cart-count');
    const countProduct = document.getElementById('cartCount');
    if (countIndex) countIndex.innerText = cart.length;
    if (countProduct) countProduct.innerText = cart.length;

    let total = 0;
    let itemsHTML = "";

    cart.forEach((item, index) => {
        total += item.price;
        itemsHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9;">
                <div>
                    <strong style="font-size:12px; color:#0f2635;">${item.name}</strong><br>
                    <small style="color:#c5a059;">(${item.variant})</small><br>
                    <span style="font-weight:600; font-size:13px;">৳${item.price}</span>
                </div>
                <span class="remove-item" onclick="removeCartItem(${index})" style="color:#ef4444; cursor:pointer; font-weight:bold; font-size:16px;">&times;</span>
            </div>
        `;
    });

    const listIndex = document.getElementById('cart-items-container');
    const totalIndex = document.getElementById('cart-total-price');
    if (listIndex) listIndex.innerHTML = itemsHTML || "<p style='text-align:center; color:#64748b; font-size:13px;'>কার্ট খালি!</p>";
    if (totalIndex) totalIndex.innerText = total;

    const listProduct = document.getElementById('cartItemsList');
    const totalProduct = document.getElementById('cartTotalAmount');
    if (listProduct) listProduct.innerHTML = itemsHTML || "<p style='text-align:center; color:#64748b; font-size:13px;'>কার্ট খালি!</p>";
    if (totalProduct) totalProduct.innerText = total;
}

function removeCartItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function openOrderModal() {
    if (cart.length === 0) { alert("আপনার কার্টটি খালি!"); return; }
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.display = 'flex'; // Triggers display center flex overlay
        let summary = "📋 আপনার অর্ডারসমূহ:\n";
        cart.forEach(item => { summary += `- ${item.name} (${item.variant}) - ৳${item.price}\n`; });
        const summaryDiv = document.getElementById('selected-products-summary');
        if (summaryDiv) summaryDiv.innerText = summary;
    }
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.style.display = 'none';
}

function sendOrderToWhatsApp() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();

    if (!name || !phone || !address) { alert("দয়া করে সম্পূর্ণ তথ্য পূরণ করুন!"); return; }

    let message = `*নতুন অর্ডার (Bismillah Gadget Zone BD)*\n\n`;
    message += `👤 *নাম:* ${name}\n`;
    message += `📞 *মোবাইল:* ${phone}\n`;
    message += `🏠 *ঠিকানা:* ${address}\n\n`;
    message += `🛍️ *প্রোডাক্টসমূহ:*\n`;

    let total = 0;
    cart.forEach(item => {
        message += `- ${item.name} (ভ্যারিয়েন্ট: ${item.variant}) -> ৳${item.price}\n`;
        total += item.price;
    });
    message += `\n💰 *সর্বমোট মূল্য:* ৳${total}`;

    const whatsappNumber = "8801922790663"; 
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    cart = [];
    updateCartUI();
    closeOrderModal();
    window.open(whatsappURL, '_blank');
}

async function fetchProducts() {
    try {
        const catRes = await fetch(catURL);
        const catData = await catRes.json();
        if(catData) {
            activeCategories = ["Smart Watch", "Earbuds", "Power Bank", "Adapter"]; 
            Object.keys(catData).forEach(k => {
                if(!activeCategories.includes(catData[k].name)) { activeCategories.push(catData[k].name); }
            });
        }
        const res = await fetch(dbURL);
        allProductsData = await res.json() || {}; 
        renderCategoryWiseColumns(); 
    } catch (err) {
        console.error("ডাটা লোড করতে সমস্যা:", err);
    }
}

function renderCategoryWiseColumns() {
    const mainGrid = document.getElementById('products-container'); 
    if (!mainGrid) return;
    mainGrid.innerHTML = ""; 

    activeCategories.forEach(category => {
        let hasProduct = false;
        let categoryHTML = `
            <div class="category-section" id="sec-${category.replace(/\s+/g, '-')}">
                <div class="category-title" style="font-size: 16px; font-weight: 700; color: #0f2635; margin: 20px 15px 10px 15px; border-left: 4px solid #c5a059; padding-left: 8px;">${category}</div>
                <div class="products-grid">
        `;

        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category !== category) return;
            hasProduct = true;

            let colorKeys = prod.variants ? Object.keys(prod.variants) : [];
            let defaultPrice = prod.price;
            let defaultImage = prod.mainImage;

            if (colorKeys.length > 0) {
                defaultPrice = prod.variants[colorKeys[0]].price;
                defaultImage = prod.variants[colorKeys[0]].image;
                if(!selectedVariantsGlobal[key]) selectedVariantsGlobal[key] = colorKeys[0];
            } else {
                selectedVariantsGlobal[key] = "Standard";
            }

            let variantHTML = "";
            if (colorKeys.length > 0) {
                variantHTML = `<div class="variant-dots">`;
                colorKeys.forEach(color => {
                    const vPrice = prod.variants[color].price;
                    const vImg = prod.variants[color].image;
                    variantHTML += `
                        <button onclick="changeCustomerVariant('${key}', '${color}', '${vImg}', ${vPrice}); event.stopPropagation();" 
                            style="background: ${color.toLowerCase()};" title="${color}">
                        </button>`;
                });
                variantHTML += `</div>`;
            } else {
                variantHTML = `<div class="variant-dots" style="height:14px;"></div>`;
            }

            categoryHTML += `
                <div class="product-card" onclick="window.open('product.html?id=${key}', '_blank')">
                    <div class="image-wrapper">
                        <img id="cust-img-${key}" src="${defaultImage}">
                    </div>
                    <div class="info-wrapper">
                        <h3 class="product-title">${prod.name}</h3>
                        <p class="price" id="cust-price-${key}">৳ ${defaultPrice}</p>
                        ${variantHTML}
                        <div class="btn-group">
                            <button class="add-to-cart-btn" onclick="addToCart('${key}', '${prod.name}', document.getElementById('cust-price-${key}').innerText); event.stopPropagation();">Add to Cart</button>
                            <button class="buy-now-btn" onclick="buyNow('${key}', '${prod.name}', document.getElementById('cust-price-${key}').innerText); event.stopPropagation();">Buy Now</button>
                        </div>
                    </div>
                </div>`;
        });

        categoryHTML += `</div></div>`;
        if (hasProduct) mainGrid.innerHTML += categoryHTML;
    });
}

function switchCategory(categoryName, element) {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(element) element.classList.add('active');
    
    if(categoryName === 'All') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const targetSec = document.getElementById(`sec-${categoryName.replace(/\s+/g, '-')}`);
        if(targetSec) targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function changeCustomerVariant(id, colorName, imgUrl, price) {
    selectedVariantsGlobal[id] = colorName;
    const imgElement = document.getElementById(`cust-img-${id}`);
    const priceElement = document.getElementById(`cust-price-${id}`);
    if (imgElement) imgElement.src = imgUrl;
    if (priceElement) priceElement.innerText = `৳ ${price}`;
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('products-container')) { fetchProducts(); }
});

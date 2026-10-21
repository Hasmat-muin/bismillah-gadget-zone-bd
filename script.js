// --- ✨ PAGE LOAD CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    restoreCheckoutDetails();
    if (document.getElementById('products-container')) { fetchProducts(); }
    enableBannerExpandedView();
    enableDelayedSideMenuGame();
    fetchAndRenderBillboards();
});

const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; 
const orderURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categoryOrder.json";
const billboardDataURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/billboards.json";
const ordersDB_URL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/orders.json"; 

let cart = JSON.parse(localStorage.getItem('bg_cart')) || [];
let allProductsData = {}; 
let productsByCategory = new Map();
let wishlist = loadWishlist();
let selectedVariantsGlobal = {}; 
let selectedSizesGlobal = {};
let activeCategories = []; 
let billboardAutoSlideInterval = null;
let isUserInteracting = false;
let visibleCategoryCount = 7;
let endActiveDrag = null;

window.addEventListener('mouseup', () => {
    if (endActiveDrag) {
        endActiveDrag();
        endActiveDrag = null;
    }
});

// --- 📱 SIDE MENU TOGGLE (Hamburger) ---
function toggleSideMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function enableDelayedSideMenuGame() {
    const game = document.getElementById('side-menu-game');
    const flowers = document.getElementById('side-menu-game-flowers');
    const previous = document.getElementById('side-menu-message-previous');
    const next = document.getElementById('side-menu-message-next');
    const message = document.getElementById('side-menu-game-message');
    const status = document.getElementById('side-menu-game-status');
    const counter = document.getElementById('side-menu-message-count');
    if (!game || !flowers || !previous || !next || !message || !status || !counter) return;

    let messages = [];
    let currentMessageIndex = 0;
    const messageURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/sideMenuGameMessage.json";

    const showerFlowers = () => {
        const bloomTypes = [
            { symbol: '✿', color: 'red' },
            { symbol: '❀', color: 'white' },
            { symbol: '✿', color: 'yellow' }
        ];
        const fragment = document.createDocumentFragment();

        for (let index = 0; index < 24; index += 1) {
            const bloom = bloomTypes[Math.floor(Math.random() * bloomTypes.length)];
            const flower = document.createElement('span');
            flower.className = `side-menu-falling-flower is-${bloom.color}`;
            flower.textContent = bloom.symbol;
            flower.style.left = `${Math.random() * 100}%`;
            flower.style.setProperty('--flower-drift', `${Math.round((Math.random() - 0.5) * 100)}px`);
            flower.style.setProperty('--flower-duration', `${2.2 + Math.random() * 1.8}s`);
            flower.style.setProperty('--flower-delay', `${Math.random() * 0.65}s`);
            fragment.appendChild(flower);
        }

        flowers.appendChild(fragment);
    };

    const showMessage = index => {
        if (!messages.length) {
            status.textContent = 'Admin message is not set yet.';
            showerFlowers();
            return;
        }
        currentMessageIndex = (index + messages.length) % messages.length;
        message.textContent = messages[currentMessageIndex];
        message.hidden = false;
        message.classList.remove('is-revealed');
        void message.offsetWidth;
        message.classList.add('is-revealed');
        counter.textContent = `${currentMessageIndex + 1} / ${messages.length}`;
        status.textContent = '';
        showerFlowers();
    };

    previous.addEventListener('click', () => showMessage(currentMessageIndex - 1));
    next.addEventListener('click', () => showMessage(currentMessageIndex + 1));
    flowers.addEventListener('animationend', event => {
        if (event.target instanceof HTMLElement && event.target.classList.contains('side-menu-falling-flower')) {
            event.target.remove();
        }
    });

    setTimeout(async () => {
        game.hidden = false;
        try {
            const response = await fetch(messageURL);
            if (!response.ok) throw new Error(`Side-menu message request failed: ${response.status}`);
            const data = await response.json();
            const legacyMessage = typeof data === 'string' ? data : data?.text;
            const savedMessages = Array.isArray(data?.messages) ? data.messages : (legacyMessage ? [legacyMessage] : []);
            messages = savedMessages.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
            if (messages.length) {
                currentMessageIndex = 0;
                message.textContent = messages[0];
                message.hidden = false;
                counter.textContent = `1 / ${messages.length}`;
            } else {
                status.textContent = 'Admin message is not set yet.';
            }
        } catch (error) {
            console.error('Side-menu message could not be loaded:', error);
            status.textContent = 'Message could not be loaded. Please try again later.';
        }
    }, 10000);
}

function scrollToCategories() {
    const catSection = document.querySelector('.category-scroll-container');
    if (catSection) {
        window.scrollTo({ top: catSection.offsetTop - 70, behavior: 'smooth' });
    }
}

// --- 🛒 CART LOGIC ---
function saveCartToStorage() {
    localStorage.setItem('bg_cart', JSON.stringify(cart));
}

function loadWishlist() {
    try {
        const savedWishlist = JSON.parse(localStorage.getItem('bg_wishlist') || '[]');
        return Array.isArray(savedWishlist) ? savedWishlist.filter(id => typeof id === 'string') : [];
    } catch (error) {
        console.warn('Wishlist লোড করা যায়নি:', error);
        return [];
    }
}

function saveWishlist() {
    localStorage.setItem('bg_wishlist', JSON.stringify(wishlist));
}

function toggleWishlist(id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const productId = String(id);
    wishlist = wishlist.includes(productId)
        ? wishlist.filter(savedId => savedId !== productId)
        : [...wishlist, productId];
    saveWishlist();
    updateWishlistButtons();

    if (document.querySelector('.cat-icon-item.active')?.dataset.category === 'wishlist') {
        renderWishlistProducts();
    }
}

function updateWishlistButtons() {
    document.querySelectorAll('.wishlist-toggle').forEach(button => {
        const isSaved = wishlist.includes(button.dataset.productId);
        button.classList.toggle('saved', isSaved);
        button.setAttribute('aria-pressed', String(isSaved));
        button.setAttribute('aria-label', isSaved ? 'Remove from wishlist' : 'Add to wishlist');
        button.innerHTML = `<i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>`;
    });
    document.querySelectorAll('.wishlist-count').forEach(badge => {
        badge.textContent = String(wishlist.length);
    });
}

function restoreCheckoutDetails() {
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const addressInput = document.getElementById('customer-address');
    if (!nameInput || !phoneInput || !addressInput) return;

    try {
        const details = JSON.parse(localStorage.getItem('bg_customer_details') || '{}');
        nameInput.value = details.name || '';
        phoneInput.value = details.phone || '';
        addressInput.value = details.address || '';
    } catch (error) {
        console.warn('চেকআউটের সংরক্ষিত তথ্য লোড করা যায়নি:', error);
    }
}

function toggleCart() {
    const sidebarIndex = document.getElementById('cart-sidebar');
    const sidebarProduct = document.getElementById('cartSidebar');
    if (sidebarIndex) sidebarIndex.classList.toggle('open');
    if (sidebarProduct) sidebarProduct.classList.toggle('open');
}

function goBackPage() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'shop.html';
}

function goForwardPage() { window.history.forward(); }

function addToCart(id, name, price, image = "") {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    let size = selectedSizesGlobal[id] || "";
    
    if (!image && allProductsData[id]) {
        image = allProductsData[id].mainImage || "";
    }
    
    cart.push({ id, name, price: cleanPrice, variant, size, image });
    saveCartToStorage();
    alert(`🛒 "${name}" কার্টে যোগ করা হয়েছে!`);
    updateCartUI();
}

function buyNow(id, name, price, image = "") {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    let size = selectedSizesGlobal[id] || "";
    
    if (!image && allProductsData[id]) {
        image = allProductsData[id].mainImage || "";
    }
    
    cart = [{ id, name, price: cleanPrice, variant, size, image }];
    saveCartToStorage();
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
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:8px;">
                    ${item.image ? `<img src="${item.image}" style="width:38px; height:38px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1;">` : ''}
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>৳${item.price} ${item.variant && item.variant !== 'Standard' ? '| Color: '+item.variant : ''} ${item.size ? '| Size: '+item.size : ''}</small>
                    </div>
                </div>
                <span onclick="removeCartItem(${index})" style="color:red; cursor:pointer; font-weight:bold; font-size:18px;">×</span>
            </div>
        `;
    });

    const listIndex = document.getElementById('cart-items-container');
    const totalIndex = document.getElementById('cart-total-price');
    if (listIndex) listIndex.innerHTML = itemsHTML || "<p style='text-align:center;'>কার্ট খালি!</p>";
    if (totalIndex) totalIndex.innerText = total;

    const listProduct = document.getElementById('cartItemsList');
    const totalProduct = document.getElementById('cartTotalAmount');
    if (listProduct) listProduct.innerHTML = itemsHTML || "<p style='text-align:center;'>কার্ট খালি!</p>";
    if (totalProduct) totalProduct.innerText = total;
}

function removeCartItem(index) {
    cart.splice(index, 1);
    saveCartToStorage();
    updateCartUI();
}

function openOrderModal() {
    if (cart.length === 0) { alert("আপনার কার্টটি খালি!"); return; }
    const modalIndex = document.getElementById('order-modal');
    if (modalIndex) modalIndex.style.display = 'flex';
    restoreCheckoutDetails();
    calculateOrderTotal();
}

function calculateOrderTotal() {
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price);

    const deliveryCharge = parseFloat(document.getElementById('delivery-charge-select')?.value || 80);
    const finalTotal = subtotal + deliveryCharge;

    if(document.getElementById('modal-subtotal')) document.getElementById('modal-subtotal').innerText = subtotal;
    if(document.getElementById('modal-delivery')) document.getElementById('modal-delivery').innerText = deliveryCharge;
    if(document.getElementById('modal-final-total')) document.getElementById('modal-final-total').innerText = finalTotal;
    const summary = document.getElementById('checkout-order-summary');
    if (summary) {
        summary.innerHTML = cart.map(item => `
            <div class="checkout-summary-item">
                <span>${escapeHTML(item.name)}${item.variant && item.variant !== 'Standard' ? ` · ${escapeHTML(item.variant)}` : ''}${item.size ? ` · ${escapeHTML(item.size)}` : ''}</span>
                <strong>৳${Number(item.price).toLocaleString('en-BD')}</strong>
            </div>
        `).join('');
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function closeOrderModal() {
    const modalIndex = document.getElementById('order-modal');
    if (modalIndex) modalIndex.style.display = 'none';
}

// --- 📦 CHECKOUT & FIREBASE SAVING ---
async function sendOrderToWhatsApp() {
    const name = document.getElementById('customer-name')?.value.trim();
    const phoneInput = document.getElementById('customer-phone');
    const rawPhone = phoneInput?.value.trim() || '';
    const address = document.getElementById('customer-address')?.value.trim();
    const deliveryCharge = parseFloat(document.getElementById('delivery-charge-select')?.value || 80);
    const errorMessage = document.getElementById('checkout-error-message');
    const submitButton = document.querySelector('.submit-order-btn');
    const showError = message => {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.hidden = false;
        } else {
            alert(message);
        }
    };

    if (errorMessage) errorMessage.hidden = true;
    if (!name || !rawPhone || !address) {
        showError("আপনার নাম, মোবাইল নম্বর ও পূর্ণাঙ্গ ঠিকানা দিন।");
        return;
    }

    const phoneDigits = rawPhone.replace(/[০-৯]/g, digit => String('০১২৩৪৫৬৭৮৯'.indexOf(digit))).replace(/\D/g, '');
    const normalizedPhone = phoneDigits.startsWith('880') && phoneDigits.length === 13
        ? `0${phoneDigits.slice(3)}`
        : phoneDigits;
    if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
        showError("সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন।");
        phoneInput?.focus();
        return;
    }
    if (phoneInput) phoneInput.value = normalizedPhone;

    try {
        localStorage.setItem('bg_customer_details', JSON.stringify({ name, phone: normalizedPhone, address }));
    } catch (error) {
        console.warn('চেকআউটের তথ্য সংরক্ষণ করা যায়নি:', error);
    }

    const orderId = "BGZ" + Math.floor(10000 + Math.random() * 90000);
    const orderDate = new Date().toLocaleDateString('en-GB');
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price);

    const orderData = {
        orderId, name, phone: normalizedPhone, address, items: cart,
        subtotal, deliveryCharge, grandTotal: subtotal + deliveryCharge,
        status: "Processing", trackingLink: "", 
        date: orderDate, timestamp: Date.now()
    };

    const deliveryText = (deliveryCharge === 80) ? "ঢাকার ভেতরে" : "ঢাকার বাইরে";
    let message = `*📦 নতুন অর্ডার (${orderId})*\n👤 *নাম:* ${name}\n📞 *মোবাইল:* ${normalizedPhone}\n🏠 *ঠিকানা:* ${address}\n🚚 *ডেলিভারি:* ${deliveryText}\n\n🛍️ *অর্ডারকৃত প্রোডাক্টসমূহ:*\n`;
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}${item.variant && item.variant !== 'Standard' ? ` (${item.variant})` : ''}${item.size ? ` (${item.size})` : ''} - ৳${item.price}\n`;
    });
    message += `\n💰 *সর্বমোট বিল:* ৳${subtotal + deliveryCharge}`;
    const whatsappUrl = `https://wa.me/8801922790663?text=${encodeURIComponent(message)}`;
    const whatsappWindow = window.open('about:blank', '_blank');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'অর্ডার নিশ্চিত হচ্ছে...';
    }

    let orderReference = '';
    try {
        const res = await fetch(ordersDB_URL, { method: 'POST', body: JSON.stringify(orderData) });
        if (!res.ok) throw new Error(`Order request failed (${res.status})`);
        const data = await res.json();
        if (!data || typeof data.name !== 'string') throw new Error('অর্ডার রেফারেন্স পাওয়া যায়নি।');
        orderReference = data.name;
    } catch(error) {
        console.error("Order save error:", error);
        if (whatsappWindow) whatsappWindow.close();
        showError("অর্ডারটি সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
        return;
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Order on WhatsApp 🚀';
        }
    }

    let orderTrackingSaved = true;
    try {
        const savedOrders = JSON.parse(localStorage.getItem('bg_my_orders') || '[]');
        const myOrders = Array.isArray(savedOrders) ? savedOrders : [];
        myOrders.push(orderReference);
        localStorage.setItem('bg_my_orders', JSON.stringify(myOrders));
    } catch (error) {
        orderTrackingSaved = false;
        console.warn('অর্ডার সংরক্ষিত হয়েছে, তবে এই ডিভাইসে ট্র্যাকিং রেফারেন্স রাখা যায়নি:', error);
    }

    if (!orderTrackingSaved) {
        alert('অর্ডার সংরক্ষিত হয়েছে, তবে এই ডিভাইসের My Orders তালিকায় দেখা নাও যেতে পারে।');
    }
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    else window.location.href = whatsappUrl;
    
    cart = []; saveCartToStorage(); updateCartUI(); closeOrderModal();
}

// --- 📦 CUSTOMER ORDERS PANEL ---
function openCustomerOrders() {
    const sidebar = document.getElementById('orders-sidebar');
    if(sidebar) {
        sidebar.classList.add('open');
        loadCustomerOrders();
    }
}

function closeCustomerOrders() {
    const sidebar = document.getElementById('orders-sidebar');
    if(sidebar) sidebar.classList.remove('open');
}

async function loadCustomerOrders() {
    const list = document.getElementById('customer-orders-list');
    let myOrders = JSON.parse(localStorage.getItem('bg_my_orders')) || [];
    
    if(myOrders.length === 0) {
        list.innerHTML = `<p style="text-align:center; font-size:13px; color:#64748b; margin-top:20px;">আপনার কোনো রানিং অর্ডার নেই।</p>`;
        return;
    }

    list.innerHTML = `<p style="text-align:center; font-size:13px; color:#64748b;">অর্ডার লোড হচ্ছে...</p>`;
    
    try {
        const res = await fetch(ordersDB_URL);
        const allOrders = await res.json();
        list.innerHTML = "";

        myOrders.reverse().forEach(key => {
            if(allOrders && allOrders[key]) {
                const order = allOrders[key];
                let statusClass = order.status === 'Delivered' ? 'status-delivered' : (order.status === 'Shipped' ? 'status-shipped' : 'status-processing');
                
                let trackBtn = "";
                if(order.status === 'Shipped' && order.trackingLink) {
                    trackBtn = `<a href="${order.trackingLink}" target="_blank" style="display:block; text-align:center; background:#0f2635; color:#c5a059; padding:6px; border-radius:6px; font-size:11px; font-weight:bold; text-decoration:none; margin-top:10px;">📍 Track Parcel</a>`;
                }

                list.innerHTML += `
                    <div class="customer-order-card">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-weight:bold; font-size:12px;">ID: #${order.orderId}</span>
                            <span class="order-status-badge ${statusClass}">${order.status}</span>
                        </div>
                        <div style="font-size:11px; color:#475569; margin-bottom:6px;">📅 Date: ${order.date} | 💰 Total: ৳${order.grandTotal}</div>
                        <div style="font-size:11px; color:#0f2635; font-weight:600;">Items: ${order.items.length} Product(s)</div>
                        ${trackBtn}
                    </div>
                `;
            }
        });
    } catch(e) { list.innerHTML = `<p style="color:red; text-align:center;">সমস্যা হয়েছে!</p>`; }
}

// --- 🏷️ CATEGORY & PRODUCTS DISPLAY ---
function getCategoryIcon(catName) {
    const name = catName.toLowerCase();
    if (name.includes('earbud') || name.includes('tws') || name.includes('headphone')) return 'fas fa-headphones-alt';
    if (name.includes('watch')) return 'fas fa-clock';
    if (name.includes('laptop') || name.includes('pc') || name.includes('computer')) return 'fas fa-laptop';
    if (name.includes('audio') || name.includes('sound') || name.includes('speaker')) return 'fas fa-headphones';
    if (name.includes('shoe') || name.includes('sneaker')) return 'fas fa-shoe-prints';
    if (name.includes('bag') || name.includes('backpack')) return 'fas fa-shopping-bag';
    if (name.includes('cable') || name.includes('charger') || name.includes('accessori')) return 'fas fa-plug';
    if (name.includes('camera')) return 'fas fa-camera';
    return 'fas fa-tag';
}

function renderDynamicCategoryTabs() {
    const swipeContainer = document.getElementById('swipeCategoryBar');
    if (!swipeContainer) return;

    let html = `
        <div class="cat-icon-item active" data-category="allproducts" onclick="switchCategory('AllProducts', this)">
            <i class="fas fa-boxes-stacked"></i>
            <span>Products</span>
        </div>
        <div class="cat-icon-item" data-category="wishlist" onclick="switchCategory('Wishlist', this)">
            <i class="far fa-heart"></i>
            <span>Wishlist <b class="wishlist-count">${wishlist.length}</b></span>
        </div>
        <div class="cat-icon-item" data-category="all" onclick="switchCategory('All', this)">
            <i class="fas fa-bolt"></i>
            <span>All Category</span>
        </div>
    `;

    activeCategories.forEach(category => {
        const safeCat = category.replace(/'/g, "\\'");
        const iconClass = getCategoryIcon(category);
        html += `
            <div class="cat-icon-item" data-category="${category.toLowerCase()}" onclick="switchCategory('${safeCat}', this)">
                <i class="${iconClass}"></i>
                <span>${category}</span>
            </div>
        `;
    });

    swipeContainer.innerHTML = html;
    if (typeof updateCategoryScrollArrows === 'function') updateCategoryScrollArrows();
}

function cacheReelProducts(products) {
    try {
        const reelProducts = Object.entries(products).reduce((result, [key, product]) => {
            if (!(product.youtubeVideo || product.video)) return result;
            const thumbnail = product.mainImage || '';
            result.push({
                key,
                name: product.name,
                price: product.price,
                youtubeVideo: product.youtubeVideo || '',
                video: product.video || '',
                mainImage: thumbnail.startsWith('data:') ? '' : thumbnail
            });
            return result;
        }, []);
        sessionStorage.setItem('bgz_reel_products_v1', JSON.stringify({ savedAt: Date.now(), products: reelProducts }));
    } catch (error) {
        console.warn('রিলস ক্যাশ করা যায়নি:', error);
    }
}

async function fetchProducts() {
    try {
        const [prodRes, orderRes] = await Promise.all([fetch(dbURL), fetch(orderURL)]);
        allProductsData = await prodRes.json() || {}; 
        cacheReelProducts(allProductsData);
        const savedOrder = await orderRes.json() || [];
        productsByCategory = new Map();
        Object.keys(allProductsData).forEach(key => {
            const product = { key, ...allProductsData[key] };
            if (!productsByCategory.has(product.category)) productsByCategory.set(product.category, []);
            productsByCategory.get(product.category).push(product);
        });
        productsByCategory.forEach(products => {
            products.sort((a, b) => {
                const posA = a.position !== undefined ? a.position : 9999;
                const posB = b.position !== undefined ? b.position : 9999;
                return posA - posB;
            });
        });

        let foundCategories = [];
        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category && !foundCategories.includes(prod.category)) {
                foundCategories.push(prod.category);
            }
        });

        activeCategories = [];
        if (Array.isArray(savedOrder) && savedOrder.length > 0) {
            savedOrder.forEach(pCat => {
                if (foundCategories.includes(pCat)) activeCategories.push(pCat);
            });
        }
        foundCategories.forEach(fCat => {
            if (!activeCategories.includes(fCat)) activeCategories.push(fCat);
        });

        renderDynamicCategoryTabs();
        renderHomeSections();
    } catch (err) { console.error("ডাটা লোড সমস্যা:", err); }
}

function getProductPricing(product) {
    const price = parseFloat(product.price) || 0;
    const regularPrice = parseFloat(product.regularPrice) || price;
    const rawEnd = product.offerEndsAt;
    const offerEndsAt = rawEnd
        ? (Number.isFinite(Number(rawEnd)) ? Number(rawEnd) : Date.parse(rawEnd))
        : 0;
    const hasOffer = regularPrice > price;
    const offerExpired = hasOffer && offerEndsAt > 0 && offerEndsAt <= Date.now();

    return {
        price: offerExpired ? regularPrice : price,
        regularPrice,
        hasOffer: hasOffer && !offerExpired,
        offerEndsAt: hasOffer && !offerExpired ? offerEndsAt : 0,
        offerExpired
    };
}

function renderProductCard(prod, category) {
    const key = prod.key;
    const pricing = getProductPricing(prod);
    const salePrice = pricing.price;
    const regPrice = pricing.regularPrice;

    const isOutOfStock = (prod.stockStatus === 'Out of Stock' || (prod.stockQty !== undefined && parseInt(prod.stockQty) <= 0));
    const stockQty = Number.parseInt(prod.stockQty, 10);
    const hasLowStock = !isOutOfStock && Number.isFinite(stockQty) && stockQty > 0 && stockQty <= 5;
    let discountBadge = "";
    let priceCutHTML = `<span class="price">৳ ${salePrice}</span>`;

    if (pricing.hasOffer) {
        const discountPercent = Math.round(((regPrice - salePrice) / regPrice) * 100);
        discountBadge = `<div class="card-badges-top"><span class="badge-discount">-${discountPercent}% OFF</span></div>`;
        priceCutHTML = `
            <div class="price-box">
                <span class="price">৳ ${salePrice}</span>
                <span class="old-price">৳ ${regPrice}</span>
            </div>
        `;
    }

    const offerExpiryHTML = pricing.offerEndsAt
        ? `<span class="offer-expiry">Offer ends ${new Date(pricing.offerEndsAt).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}</span>`
        : '';
    const stockBadgeHTML = isOutOfStock ?
        `<span class="badge-stock out-stock">Out of Stock</span>` :
        hasLowStock
            ? `<span class="badge-stock low-stock">Only ${stockQty} left</span>`
            : `<span class="badge-stock in-stock">In Stock</span>`;
    const categoryName = String(category || '');
    const isSaved = wishlist.includes(String(key));

    return `
        <div class="product-card" data-name="${prod.name.toLowerCase()}" data-category="${categoryName.toLowerCase()}" onclick="window.location.href='product.html?id=${key}'">
            ${discountBadge}
            ${prod.featured ? `<span class="product-featured-badge">Popular</span>` : ''}
            <button class="wishlist-toggle ${isSaved ? 'saved' : ''}" type="button" data-product-id="${key}" aria-label="${isSaved ? 'Remove from wishlist' : 'Add to wishlist'}" aria-pressed="${isSaved}" onclick="toggleWishlist('${key}', event)">
                <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <div class="image-wrapper">
                <img src="${prod.mainImage || 'logo.JPG'}" loading="lazy" decoding="async" fetchpriority="low" alt="${prod.name}">
            </div>
            <div class="info-wrapper">
                <h3 class="product-title">${prod.name}</h3>
                <div class="card-footer-row">
                    ${priceCutHTML}
                    ${stockBadgeHTML}
                </div>
                ${offerExpiryHTML}
            </div>
        </div>`;
}

function getOrderedProducts() {
    const categoryOrder = new Map(activeCategories.map((category, index) => [category, index]));
    return Object.keys(allProductsData)
        .map(key => ({ key, ...allProductsData[key] }))
        .sort((a, b) => {
            const categoryA = categoryOrder.has(a.category) ? categoryOrder.get(a.category) : activeCategories.length;
            const categoryB = categoryOrder.has(b.category) ? categoryOrder.get(b.category) : activeCategories.length;
            if (categoryA !== categoryB) return categoryA - categoryB;
            return (a.position ?? 9999) - (b.position ?? 9999);
        });
}

function renderProductSection(title, products, sectionClass = '') {
    if (!products.length) return '';
    return `
    <section class="category-section storefront-section ${sectionClass}">
        <div class="category-header">
            <div class="category-title">${title}</div>
        </div>
        <div class="products-grid all-products-view">
            ${products.map(prod => renderProductCard(prod, prod.category)).join('')}
        </div>
    </section>`;
}

function renderAllProducts() {
    const mainGrid = document.getElementById('products-container');
    if (!mainGrid) return;
    const products = getOrderedProducts();
    mainGrid.innerHTML = `
        ${renderProductSection('Products', products, 'all-products-section')}
    `;
    enableDesktopDragScroll();
}

function renderHomeSections() {
    const mainGrid = document.getElementById('products-container');
    if (!mainGrid) return;
    const products = getOrderedProducts();
    const newestProducts = [...products]
        .sort((a, b) => {
            const createdAtDifference = (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
            return createdAtDifference || String(b.key).localeCompare(String(a.key));
        })
        .slice(0, 5);
    const popularProducts = products.filter(product => product.featured === true).slice(0, 5);
    const offerProducts = products.filter(product => getProductPricing(product).hasOffer).slice(0, 5);
    const allProductsSection = renderProductSection('Products', products, 'all-products-section');

    mainGrid.innerHTML = [
        renderProductSection('New Arrivals', newestProducts, 'new-arrivals-section'),
        renderProductSection('Popular Products', popularProducts, 'popular-products-section'),
        renderProductSection('Special Offers', offerProducts, 'special-offers-section'),
        allProductsSection
    ].join('');
    enableDesktopDragScroll();
}

function renderWishlistProducts() {
    const mainGrid = document.getElementById('products-container');
    if (!mainGrid) return;
    const savedProducts = wishlist
            .map(id => allProductsData[id] ? { key: id, ...allProductsData[id] } : null)
            .filter(Boolean);
    mainGrid.innerHTML = savedProducts.length
            ? renderProductSection('Wishlist', savedProducts, 'wishlist-section')
            : `<section class="category-section wishlist-empty"><i class="far fa-heart"></i><h2>Your wishlist is empty</h2><p>পছন্দের পণ্যের হার্ট আইকনে চাপ দিলে এখানে দেখতে পাবেন।</p><button type="button" onclick="switchCategory('AllProducts', document.querySelector('[data-category=&quot;allproducts&quot;]'))">Products দেখুন</button></section>`;
    enableDesktopDragScroll();
}

function renderCategoryWiseColumns() {
    const mainGrid = document.getElementById('products-container'); 
    if (!mainGrid) return;
    const renderedHTML = [];

    const categoriesToRender = activeCategories.slice(0, visibleCategoryCount);

    categoriesToRender.forEach((category) => {
        let categoryProductsCount = 0;
        const safeId = category.replace(/[^a-zA-Z0-9]/g, '-');
        const safeCategoryArg = category.replace(/'/g, "\\'");

        let categoryHTML = `
            <div class="category-section" id="sec-${safeId}" data-cat-name="${category.toLowerCase()}">
                <div class="category-header">
                    <div class="category-title">${category}</div>
                    <div>
                        <span class="see-more-link" onclick="viewFullCategory('${safeCategoryArg}')">আরও দেখুন ➜</span>
                    </div>
                </div>
                <div class="products-grid" id="grid-${safeId}">`;

        const productsInCategory = productsByCategory.get(category) || [];

        productsInCategory.forEach(prod => {
            categoryProductsCount++;
            categoryHTML += renderProductCard(prod, category);
        });

        categoryHTML += `</div></div>`;
        if (categoryProductsCount > 0) renderedHTML.push(categoryHTML);
    });

    if (visibleCategoryCount < activeCategories.length) {
        renderedHTML.push(`
            <div id="load-more-btn-wrap">
                <button class="neumorphic-load-btn" onclick="loadMoreCategories()">
                    <span>Load More :</span> 
                    <span class="bangla-text">আরও দেখুন</span> 
                    <i class="fas fa-chevron-down" style="font-size:12px; margin-left:2px;"></i>
                </button>
            </div>
        `);
    }

    mainGrid.innerHTML = renderedHTML.join("");
    enableDesktopDragScroll();
}

function loadMoreCategories() {
    visibleCategoryCount += 7;
    renderCategoryWiseColumns();
}

function switchCategory(categoryName, element, updateHistory = true) {
    if (updateHistory && history.state?.shopCategory !== categoryName) {
        const currentState = history.state && typeof history.state === 'object' ? history.state : {};
        history.pushState({ ...currentState, shopCategory: categoryName }, '', location.href);
    }

    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';

    document.querySelectorAll('.cat-icon-item, .header-nav-links a').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    if (categoryName === 'AllProducts') {
        renderAllProducts();
        return;
    }

    if (categoryName === 'Wishlist') {
        renderWishlistProducts();
        return;
    }

    if (categoryName === 'All') {
        visibleCategoryCount = 7;
        renderCategoryWiseColumns();
        document.querySelectorAll('.category-section').forEach(sec => sec.style.display = 'block');
        return;
    }

    visibleCategoryCount = activeCategories.length;
    renderCategoryWiseColumns();

    const targetQuery = categoryName.toLowerCase().trim();
    let foundSection = null;

    document.querySelectorAll('.category-section').forEach(sec => {
        const catName = sec.getAttribute('data-cat-name') || '';
        if (catName.includes(targetQuery) || targetQuery.includes(catName)) {
            sec.style.display = 'block';
            if (!foundSection) foundSection = sec;
        } else {
            sec.style.display = 'none';
        }
    });

    if (foundSection) {
        foundSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

window.addEventListener('popstate', event => {
    const categoryName = typeof event.state?.shopCategory === 'string' ? event.state.shopCategory : 'AllProducts';
    const categoryTab = Array.from(document.querySelectorAll('.cat-icon-item')).find(tab =>
        tab.getAttribute('data-category') === categoryName.toLowerCase()
    );
    switchCategory(categoryName, categoryTab, false);
});

window.addEventListener('storage', event => {
    if (event.key !== 'bg_wishlist') return;
    wishlist = loadWishlist();
    updateWishlistButtons();
    if (document.querySelector('.cat-icon-item.active')?.dataset.category === 'wishlist') {
        renderWishlistProducts();
    }
});

function viewFullCategory(categoryName) {
    const safeId = categoryName.replace(/[^a-zA-Z0-9]/g, '-');
    
    document.querySelectorAll('.category-section').forEach(sec => {
        sec.style.display = (sec.id === `sec-${safeId}`) ? 'block' : 'none';
    });

    const targetGrid = document.getElementById(`grid-${safeId}`);
    if (targetGrid) {
        targetGrid.classList.add('full-view');
    }

    const loadMoreBtn = document.getElementById('load-more-btn-wrap');
    if(loadMoreBtn) loadMoreBtn.style.display = 'none';

    const backWrap = document.getElementById('back-to-all-wrap');
    const headingText = document.getElementById('full-view-heading-text');
    if (backWrap) backWrap.style.display = 'flex';
    if (headingText) headingText.innerText = `📂 ${categoryName} (সকল প্রোডাক্ট)`;

    window.scrollTo({ top: 180, behavior: 'smooth' });
}

function exitFullCategoryView() {
    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';
    
    visibleCategoryCount = 7;
    renderCategoryWiseColumns();

    const allTab = document.querySelector('.cat-icon-item[data-category="all"]');
    if (allTab) switchCategory('All', allTab);
}

function searchProducts(query) {
    query = query.trim().toLowerCase();
    renderAllProducts();

    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';

    const allTab = document.querySelector('.cat-icon-item[data-category="allproducts"]');
    document.querySelectorAll('.cat-icon-item, .header-nav-links a').forEach(el => el.classList.remove('active'));
    if (allTab) allTab.classList.add('active');

    document.querySelectorAll('#products-container .product-card').forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const category = card.getAttribute('data-category') || '';
        card.style.display = query === '' || name.includes(query) || category.includes(query) ? '' : 'none';
    });
}

// --- 🎡 BILLBOARD ---
function enableBannerExpandedView() {
    const header = document.querySelector('header.premium-header');
    const toggle = header?.querySelector('.banner-view-toggle');
    if (!header || !toggle) return;

    const setView = (expanded, controlsHidden) => {
        header.classList.toggle('is-banner-expanded', expanded);
        header.classList.toggle('is-controls-hidden', expanded && controlsHidden);
        toggle.setAttribute('aria-expanded', String(expanded && !controlsHidden));
        const label = expanded
            ? (controlsHidden ? 'Restore header layout' : 'Hide header controls')
            : 'Show full banner';
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        const icon = expanded
            ? (controlsHidden ? 'fa-bars' : 'fa-eye-slash')
            : 'fa-expand-alt';
        toggle.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i>`;
    };

    toggle.addEventListener('click', () => {
        const expanded = header.classList.contains('is-banner-expanded');
        const controlsHidden = header.classList.contains('is-controls-hidden');
        if (!expanded) {
            setView(true, true);
        } else {
            setView(controlsHidden ? false : true, false);
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && header.classList.contains('is-banner-expanded')) {
            setView(false, false);
            toggle.focus();
        }
    });
}

async function fetchAndRenderBillboards() {
    const container = document.getElementById('billboard-container');
    const track = document.getElementById('billboard-track');
    const dotsContainer = document.getElementById('billboard-dots');
    if (!track) return;

    try {
        const res = await fetch(billboardDataURL);
        const data = await res.json();
        if (!data) { container.style.display = 'none'; return; }

        container.style.display = 'block';
        track.innerHTML = "";
        if (dotsContainer) dotsContainer.innerHTML = "";

        const sortedKeys = Object.keys(data).sort((a, b) => {
            return (data[b].createdAt || 0) - (data[a].createdAt || 0);
        });

        sortedKeys.forEach((key, index) => {
            const item = data[key];
            const srcUrl = item.mediaUrl || item.imageUrl || "";
            const isVideo = item.mediaType === "video" || srcUrl.includes('video') || srcUrl.includes('data:video');
            
            let mediaHTML = isVideo ? 
                `<video class="billboard-media" data-src="${srcUrl}" loop muted playsinline preload="none"></video>` : 
                `<img class="billboard-media" data-src="${srcUrl}" alt="${item.category || 'Bismillah Gadget Zone banner'}" decoding="async">`;

            track.innerHTML += `<div class="billboard-slide">${mediaHTML}</div>`;
            if (dotsContainer) {
                dotsContainer.innerHTML += `<span class="billboard-dot ${index === 0 ? 'active' : ''}"></span>`;
            }
        });

        const slides = track.querySelectorAll('.billboard-slide');
        let currentActiveIndex = -1;
        const activateSlide = activeIndex => {
            if (activeIndex === currentActiveIndex) return;
            currentActiveIndex = activeIndex;
            slides.forEach((slide, index) => {
                slide.classList.toggle('is-active', index === activeIndex);
                const image = slide.querySelector('img');
                const isNextSlide = index === (activeIndex + 1) % slides.length;
                if (image && (index === activeIndex || isNextSlide) && image.dataset.src) {
                    image.src = image.dataset.src;
                    image.removeAttribute('data-src');
                }

                const video = slide.querySelector('video');
                if (!video) return;
                if (index === activeIndex) {
                    if (video.dataset.src) {
                        video.src = video.dataset.src;
                        video.removeAttribute('data-src');
                        video.load();
                    }
                    const playRequest = video.play();
                    if (playRequest) playRequest.catch(() => {});
                } else {
                    video.pause();
                }
            });
        };
        activateSlide(0);
        slides.forEach((slide, index) => {
            const categoryName = String(data[sortedKeys[index]]?.category || '').trim();
            if (!categoryName) return;

            slide.classList.add('is-clickable');
            slide.tabIndex = 0;
            slide.setAttribute('role', 'button');
            slide.setAttribute('aria-label', `${categoryName} পণ্যের ক্যাটাগরি দেখুন`);

            const showCategory = () => {
                const categoryTab = Array.from(document.querySelectorAll('.cat-icon-item')).find(tab =>
                    tab.querySelector('span')?.textContent.trim().toLowerCase() === categoryName.toLowerCase()
                );
                switchCategory(categoryName, categoryTab);
            };

            slide.addEventListener('click', showCategory);
            slide.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    showCategory();
                }
            });
        });

        track.addEventListener('scroll', () => {
            const scrollLeft = track.scrollLeft;
            const slideWidth = track.querySelector('.billboard-slide')?.offsetWidth || track.offsetWidth;
            const activeIndex = Math.min(Math.round(scrollLeft / slideWidth), slides.length - 1);

            activateSlide(activeIndex);

            if (dotsContainer) {
                const dots = dotsContainer.querySelectorAll('.billboard-dot');
                dots.forEach((dot, idx) => {
                    if (idx === activeIndex) dot.classList.add('active');
                    else dot.classList.remove('active');
                });
            }
        });

        makeDragScrollable(track);
        if (sortedKeys.length > 1) {
            startBillboardAutoSlide(track);
        }
    } catch (err) { console.error(err); }
}

function startBillboardAutoSlide(track) {
    if (billboardAutoSlideInterval) clearInterval(billboardAutoSlideInterval);

    const originalScrollSnapType = track.style.scrollSnapType;
    let scrollAnimationFrame = null;

    const stopAutoScrollAnimation = () => {
        if (scrollAnimationFrame === null) return;
        cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
        track.style.scrollSnapType = originalScrollSnapType;
    };

    const animateTo = (target, duration = 10000) => {
        stopAutoScrollAnimation();
        const start = track.scrollLeft;
        const distance = target - start;
        const startTime = performance.now();
        track.style.scrollSnapType = 'none';

        const animate = now => {
            const progress = Math.min((now - startTime) / duration, 1);
            const easedProgress = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            track.scrollLeft = start + distance * easedProgress;

            if (progress < 1) {
                scrollAnimationFrame = requestAnimationFrame(animate);
            } else {
                scrollAnimationFrame = null;
                track.style.scrollSnapType = originalScrollSnapType;
            }
        };

        scrollAnimationFrame = requestAnimationFrame(animate);
    };

    const slideNext = () => {
        if (isUserInteracting) return;
        const slideWidth = track.querySelector('.billboard-slide')?.offsetWidth || track.offsetWidth;
        const gap = 12;
        const currentScroll = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;

        if (currentScroll >= maxScroll - 5) {
            animateTo(0);
        } else {
            animateTo(Math.min(currentScroll + slideWidth + gap, maxScroll));
        }
    };

    billboardAutoSlideInterval = setInterval(slideNext, 18000);

    track.addEventListener('mouseenter', () => { isUserInteracting = true; });
    track.addEventListener('mouseleave', () => { isUserInteracting = false; });
    track.addEventListener('mousedown', () => {
        stopAutoScrollAnimation();
        isUserInteracting = true;
    });
    track.addEventListener('touchstart', () => {
        stopAutoScrollAnimation();
        isUserInteracting = true;
    }, { passive: true });
    track.addEventListener('touchend', () => {
        setTimeout(() => { isUserInteracting = false; }, 2000);
    }, { passive: true });
}

function makeDragScrollable(slider) {
    if (!slider) return;
    let isDown = false;
    let startX;
    let initialScrollLeft;

    slider.querySelectorAll('img, video').forEach(media => {
        media.addEventListener('dragstart', (e) => e.preventDefault());
    });

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        isUserInteracting = true;
        startX = e.pageX - slider.offsetLeft;
        initialScrollLeft = slider.scrollLeft;
        endActiveDrag = () => {
            isDown = false;
            setTimeout(() => { isUserInteracting = false; }, 1500);
        };
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5;
        slider.scrollLeft = initialScrollLeft - walk;
    });

}

function enableDesktopDragScroll() {
    const productGrids = document.querySelectorAll('.products-grid:not(.all-products-view)');
    productGrids.forEach(grid => makeDragScrollable(grid));
}
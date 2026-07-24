const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; 
const orderURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categoryOrder.json";
const billboardDataURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/billboards.json";
const couponDataURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/coupons.json";

let cart = JSON.parse(localStorage.getItem('bg_cart')) || [];
let allProductsData = {}; 
let selectedVariantsGlobal = {}; 
let selectedSizesGlobal = {};
let activeCategories = []; 
let billboardAutoSlideInterval = null;
let isUserInteracting = false;
let visibleCategoryCount = 7;

function saveCartToStorage() {
    localStorage.setItem('bg_cart', JSON.stringify(cart));
}

function toggleCart() {
    const sidebarIndex = document.getElementById('cart-sidebar');
    const sidebarProduct = document.getElementById('cartSidebar');
    if (sidebarIndex) sidebarIndex.classList.toggle('open');
    if (sidebarProduct) sidebarProduct.classList.toggle('open');
}

function goBackPage() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'index.html';
}

function goForwardPage() { window.history.forward(); }

function addToCart(id, name, price) {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    let size = selectedSizesGlobal[id] || "";
    
    cart.push({ id, name, price: cleanPrice, variant, size });
    saveCartToStorage();
    alert(`🛒 "${name}" কার্টে যোগ করা হয়েছে!`);
    updateCartUI();
}

function buyNow(id, name, price) {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    let size = selectedSizesGlobal[id] || "";
    
    cart = [{ id, name, price: cleanPrice, variant, size }];
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
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>৳${item.price} ${item.size ? '| Size: '+item.size : ''}</small>
                </div>
                <span onclick="removeCartItem(${index})" style="color:red; cursor:pointer; font-weight:bold;">×</span>
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
}

function closeOrderModal() {
    const modalIndex = document.getElementById('order-modal');
    if (modalIndex) modalIndex.style.display = 'none';
}

function sendOrderToWhatsApp() {
    const name = document.getElementById('customer-name')?.value;
    const phone = document.getElementById('customer-phone')?.value;
    const address = document.getElementById('customer-address')?.value;
    const deliveryCharge = parseFloat(document.getElementById('delivery-charge-select')?.value || 80);
    const deliveryText = (deliveryCharge === 80) ? "ঢাকার ভেতরে (৳৮০)" : "ঢাকার বাইরে (৳১৫০)";

    if (!name || !phone || !address) { alert("সম্পূর্ণ তথ্য দিন!"); return; }

    let subtotal = 0;
    let message = `*নতুন অর্ডার (Bismillah Gadget Zone BD)*\n👤 *নাম:* ${name}\n📞 *মোবাইল:* ${phone}\n🏠 *ঠিকানা:* ${address}\n🚚 *ডেলিভারি:* ${deliveryText}\n\n🛍️ *প্রোডাক্টসমূহ:*\n`;
    
    cart.forEach(item => {
        message += `- ${item.name} (Size: ${item.size || 'N/A'}) -> ৳${item.price}\n`;
        subtotal += item.price;
    });

    const grandTotal = subtotal + deliveryCharge;
    message += `\n💰 *সর্বমোট বিল:* ৳${grandTotal}`;

    window.open(`https://wa.me/8801922790663?text=${encodeURIComponent(message)}`, '_blank');
    cart = [];
    saveCartToStorage();
    updateCartUI();
    closeOrderModal();
}

function renderDynamicCategoryTabs() {
    const tabContainer = document.getElementById('dynamic-category-tabs');
    if (!tabContainer) return;
    tabContainer.innerHTML = `<button class="tab-item active" onclick="switchCategory('All', this)">⚡ All Items</button>`;
    activeCategories.forEach(category => {
        const safeCat = category.replace(/'/g, "\\'");
        tabContainer.innerHTML += `<button class="tab-item" onclick="switchCategory('${safeCat}', this)">${category}</button>`;
    });
}

async function fetchProducts() {
    try {
        const [prodRes, orderRes] = await Promise.all([fetch(dbURL), fetch(orderURL)]);
        allProductsData = await prodRes.json() || {}; 
        const savedOrder = await orderRes.json() || [];

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
        renderCategoryWiseColumns(); 
    } catch (err) { console.error("ডাটা লোড সমস্যা:", err); }
}

function renderCategoryWiseColumns() {
    const mainGrid = document.getElementById('products-container'); 
    if (!mainGrid) return;
    mainGrid.innerHTML = ""; 

    const categoriesToRender = activeCategories.slice(0, visibleCategoryCount);

    categoriesToRender.forEach((category) => {
        let categoryProductsCount = 0;
        const safeId = category.replace(/[^a-zA-Z0-9]/g, '-');
        const safeCategoryArg = category.replace(/'/g, "\\'");

        let categoryHTML = `
            <div class="category-section" id="sec-${safeId}">
                <div class="category-header">
                    <div class="category-title">${category}</div>
                    <div>
                        <span class="see-more-link" onclick="viewFullCategory('${safeCategoryArg}')">আরও দেখুন ➜</span>
                    </div>
                </div>
                <div class="products-grid" id="grid-${safeId}">`;

        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category !== category) return;
            categoryProductsCount++;

            const regPrice = parseFloat(prod.regularPrice) || parseFloat(prod.price);
            const salePrice = parseFloat(prod.price);
            let discountBadge = "";
            let priceCutHTML = `<span class="price">৳ ${salePrice}</span>`;

            if (regPrice > salePrice) {
                const discountPercent = Math.round(((regPrice - salePrice) / regPrice) * 100);
                discountBadge = `<div class="card-badges-top"><span class="badge-discount">-${discountPercent}% OFF</span></div>`;
                priceCutHTML = `
                    <div class="price-box">
                        <span class="price">৳ ${salePrice}</span>
                        <span class="old-price">৳ ${regPrice}</span>
                    </div>
                `;
            }

            const isOutOfStock = (prod.stockStatus === 'Out of Stock' || (prod.stockQty !== undefined && parseInt(prod.stockQty) <= 0));
            const stockBadgeHTML = isOutOfStock ? 
                `<span class="badge-stock out-stock">Out of Stock</span>` : 
                `<span class="badge-stock in-stock">In Stock</span>`;

            categoryHTML += `
                <div class="product-card" data-name="${prod.name.toLowerCase()}" data-category="${category.toLowerCase()}" onclick="window.open('product.html?id=${key}', '_blank')">
                    ${discountBadge}
                    <div class="image-wrapper">
                        <img src="${prod.mainImage || 'logo.JPG'}" loading="lazy">
                    </div>
                    <div class="info-wrapper">
                        <h3 class="product-title">${prod.name}</h3>
                        <div class="card-footer-row">
                            ${priceCutHTML}
                            ${stockBadgeHTML}
                        </div>
                    </div>
                </div>`;
        });

        categoryHTML += `</div></div>`;
        if (categoryProductsCount > 0) mainGrid.innerHTML += categoryHTML;
    });

    if (visibleCategoryCount < activeCategories.length) {
        mainGrid.innerHTML += `
            <div id="load-more-btn-wrap" style="text-align: center; margin: 30px 0 10px 0;">
                <button onclick="loadMoreCategories()" style="background: var(--primary); color: var(--accent); border: 2px solid var(--accent); padding: 12px 28px; border-radius: 30px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(15,38,53,0.15);">
                    Load More Categories 🔽 (আরও ক্যাটাগরি দেখুন)
                </button>
            </div>
        `;
    }

    enableDesktopDragScroll();
}

function loadMoreCategories() {
    visibleCategoryCount += 7;
    renderCategoryWiseColumns();
}

function switchCategory(categoryName, element) {
    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';

    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(element) element.classList.add('active');
    
    if (categoryName !== 'All') {
        visibleCategoryCount = activeCategories.length;
        renderCategoryWiseColumns();
    }

    const targetSafeId = categoryName.replace(/[^a-zA-Z0-9]/g, '-');
    document.querySelectorAll('.category-section').forEach(sec => {
        if(categoryName === 'All' || sec.id === `sec-${targetSafeId}`) sec.style.display = 'block';
        else sec.style.display = 'none';
    });
}

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

    const allTab = document.querySelector('.tab-item');
    if (allTab) switchCategory('All', allTab);
}

function searchProducts(query) {
    query = query.trim().toLowerCase();
    
    if (query === "") {
        visibleCategoryCount = 7;
        renderCategoryWiseColumns();
        return;
    }

    visibleCategoryCount = activeCategories.length;
    renderCategoryWiseColumns();

    document.querySelectorAll('.category-section').forEach(sec => {
        let matchingProductsInSec = 0;
        
        sec.querySelectorAll('.product-card').forEach(card => {
            const name = card.getAttribute('data-name') || '';
            const category = card.getAttribute('data-category') || '';
            if (name.includes(query) || category.includes(query)) {
                card.style.display = '';
                matchingProductsInSec++;
            } else {
                card.style.display = 'none';
            }
        });

        if (matchingProductsInSec > 0) {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
        }
    });

    const loadMoreBtn = document.getElementById('load-more-btn-wrap');
    if(loadMoreBtn) loadMoreBtn.style.display = 'none';
}

// 🎡 হিরো ব্যানার এবং ডট মুভমেন্ট ফিক্সড রেন্ডারিং
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

        const sortedKeys = Object.keys(data);
        sortedKeys.forEach((key, index) => {
            const item = data[key];
            const srcUrl = item.mediaUrl || item.imageUrl || "";
            const isVideo = item.mediaType === "video" || srcUrl.includes('video') || srcUrl.includes('data:video');
            
            let mediaHTML = isVideo ? 
                `<video src="${srcUrl}" autoplay loop muted playsinline></video>` : 
                `<img src="${srcUrl}">`;

            track.innerHTML += `<div class="billboard-slide">${mediaHTML}</div>`;
            if (dotsContainer) {
                dotsContainer.innerHTML += `<span class="billboard-dot ${index === 0 ? 'active' : ''}"></span>`;
            }
        });

        // 🎯 স্ক্রোল করার সময় অ্যাক্টিভ ডট অটোমেটিক আপডেট হওয়ার লিসেনার
        track.addEventListener('scroll', () => {
            const scrollLeft = track.scrollLeft;
            const slideWidth = track.querySelector('.billboard-slide')?.offsetWidth || track.offsetWidth;
            const activeIndex = Math.round(scrollLeft / slideWidth);

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

    const slideNext = () => {
        if (isUserInteracting) return;
        const slideWidth = track.querySelector('.billboard-slide')?.offsetWidth || track.offsetWidth;
        const gap = 12;
        const currentScroll = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;

        if (currentScroll >= maxScroll - 5) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: slideWidth + gap, behavior: 'smooth' });
        }
    };

    billboardAutoSlideInterval = setInterval(slideNext, 3500);

    track.addEventListener('mouseenter', () => { isUserInteracting = true; });
    track.addEventListener('mouseleave', () => { isUserInteracting = false; });
    track.addEventListener('touchstart', () => { isUserInteracting = true; }, { passive: true });
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
    });

    window.addEventListener('mouseup', () => { 
        if (isDown) {
            isDown = false; 
            setTimeout(() => { isUserInteracting = false; }, 1500);
        }
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
    const productGrids = document.querySelectorAll('.products-grid');
    productGrids.forEach(grid => makeDragScrollable(grid));
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartUI();
    if (document.getElementById('products-container')) { fetchProducts(); }
    fetchAndRenderBillboards();
});
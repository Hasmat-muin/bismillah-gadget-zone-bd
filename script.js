const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; 
const imgbbAPIKey = "1e10b476d984d3447b7259386a75ee5d"; 

let cart = JSON.parse(localStorage.getItem('bg_cart')) || [];
let allProductsData = {}; 
let selectedVariantsGlobal = {}; 
let selectedSizesGlobal = {};
let activeCategories = []; 

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
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

function goForwardPage() {
    window.history.forward();
}

function addToCart(id, name, price) {
    let cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : parseFloat(price);
    let variant = selectedVariantsGlobal[id] || "Standard";
    let size = selectedSizesGlobal[id] || "";
    
    cart.push({ id, name, price: cleanPrice, variant, size });
    saveCartToStorage();
    
    let infoStr = variant !== "Standard" ? variant : "";
    if (size) infoStr += (infoStr ? `, Size: ${size}` : `Size: ${size}`);
    let details = infoStr ? ` (${infoStr})` : "";
    
    alert(`🛒 "${name}${details}" কার্টে যোগ করা হয়েছে!`);
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
        let detailsText = item.variant !== "Standard" ? item.variant : "";
        if (item.size) detailsText += (detailsText ? `, Size: ${item.size}` : `Size: ${item.size}`);

        itemsHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9;">
                <div>
                    <strong style="font-size:12px; color:#0f2635;">${item.name}</strong><br>
                    ${detailsText ? `<small style="color:#c5a059;">(${detailsText})</small><br>` : ''}
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
    saveCartToStorage();
    updateCartUI();
}

function openOrderModal() {
    if (cart.length === 0) { alert("আপনার কার্টটি খালি!"); return; }
    const modalIndex = document.getElementById('order-modal');
    const modalProduct = document.getElementById('orderModal');
    if (modalIndex) modalIndex.style.display = 'flex';
    if (modalProduct) modalProduct.style.display = 'flex';

    let summary = "📋 আপনার অর্ডারসমূহ:\n";
    cart.forEach(item => { 
        let itemDetail = item.variant !== "Standard" ? item.variant : "";
        if (item.size) itemDetail += (itemDetail ? `, Size: ${item.size}` : `Size: ${item.size}`);
        summary += `- ${item.name}${itemDetail ? ` (${itemDetail})` : ''} - ৳${item.price}\n`; 
    });
    const summaryDivIndex = document.getElementById('selected-products-summary');
    if (summaryDivIndex) summaryDivIndex.innerText = summary;
}

function closeOrderModal() {
    const modalIndex = document.getElementById('order-modal');
    const modalProduct = document.getElementById('orderModal');
    if (modalIndex) modalIndex.style.display = 'none';
    if (modalProduct) modalProduct.style.display = 'none';
}

function sendOrderToWhatsApp() {
    const nameFieldIndex = document.getElementById('customer-name');
    const nameFieldProduct = document.getElementById('name');

    let name, phone, address;

    if (nameFieldIndex) {
        name = nameFieldIndex.value.trim();
        phone = document.getElementById('customer-phone').value.trim();
        address = document.getElementById('customer-address').value.trim();
    } else if (nameFieldProduct) {
        name = nameFieldProduct.value.trim();
        phone = document.getElementById('phone').value.trim();
        const zilla = document.getElementById('zilla').value.trim();
        const upazila = document.getElementById('upazila').value.trim();
        const fullAddress = document.getElementById('address').value.trim();
        address = `${fullAddress}, ${upazila}, ${zilla}`;
    }

    if (!name || !phone || !address) { alert("দয়া করে সম্পূর্ণ তথ্য পূরণ করুন!"); return; }

    let message = `*নতুন অর্ডার (Bismillah Gadget Zone BD)*\n\n👤 *নাম:* ${name}\n📞 *মোবাইল:* ${phone}\n🏠 *ঠিকানা:* ${address}\n\n🛍️ *প্রোডাক্টসমূহ:*\n`;
    let total = 0;
    cart.forEach(item => {
        let details = [];
        if(item.variant && item.variant !== "Standard") details.push(`ভ্যারিয়েন্ট: ${item.variant}`);
        if(item.size) details.push(`সাইজ: ${item.size}`);
        let detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';

        message += `- ${item.name}${detailsStr} -> ৳${item.price}\n`;
        total += item.price;
    });
    message += `\n💰 *সর্বমোট মূল্য:* ৳${total}`;

    const whatsappNumber = "8801922790663"; 
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
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
        const res = await fetch(dbURL);
        allProductsData = await res.json() || {}; 
        activeCategories = [];
        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category && !activeCategories.includes(prod.category)) {
                activeCategories.push(prod.category);
            }
        });
        renderDynamicCategoryTabs();
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
        const safeId = category.replace(/[^a-zA-Z0-9]/g, '-');
        const safeCategoryArg = category.replace(/'/g, "\\'");

        let categoryHTML = `
            <div class="category-section" id="sec-${safeId}">
                <div class="category-header">
                    <div class="category-title" style="font-size: 16px; font-weight: 700; color: #0f2635; border-left: 4px solid #c5a059; padding-left: 8px; margin: 0;">${category}</div>
                    <span class="see-more-link" onclick="viewFullCategory('${safeCategoryArg}')">আরও দেখুন ➜</span>
                </div>
                <div class="products-grid" id="grid-${safeId}">`;

        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category !== category) return;
            hasProduct = true;

            let colorKeys = prod.variants ? Object.keys(prod.variants) : [];
            let defaultPrice = prod.price;
            let defaultImage = prod.mainImage || (colorKeys.length > 0 ? prod.variants[colorKeys[0]].image : "");

            if (colorKeys.length > 0) {
                if(!selectedVariantsGlobal[key]) selectedVariantsGlobal[key] = colorKeys[0];
            } else {
                selectedVariantsGlobal[key] = "Standard";
            }

            categoryHTML += `
                <div class="product-card" data-name="${prod.name.toLowerCase()}" data-category="${category.toLowerCase()}" onclick="window.open('product.html?id=${key}', '_blank')">
                    <div class="card-body">
                        <div class="image-wrapper">
                            <img id="cust-img-${key}" src="${defaultImage}">
                        </div>
                        <div class="info-wrapper">
                            <h3 class="product-title">${prod.name}</h3>
                            <p class="price" id="cust-price-${key}">৳ ${defaultPrice}</p>
                        </div>
                    </div>
                </div>`;
        });

        categoryHTML += `</div></div>`;
        if (hasProduct) mainGrid.innerHTML += categoryHTML;
    });

    initScrollRollEffect();
    initJellyOnStopEffect();
}

function switchCategory(categoryName, element) {
    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';

    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(element) element.classList.add('active');
    
    const targetSafeId = categoryName.replace(/[^a-zA-Z0-9]/g, '-');

    document.querySelectorAll('.category-section').forEach(sec => {
        if(categoryName === 'All' || sec.id === `sec-${targetSafeId}`) {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
        }
    });

    const searchInput = document.getElementById('product-search-input');
    if (searchInput && searchInput.value) {
        searchInput.value = "";
        removeNoResultsMsg();
    }
}

function viewFullCategory(categoryName) {
    const safeId = categoryName.replace(/[^a-zA-Z0-9]/g, '-');

    document.querySelectorAll('.category-section').forEach(sec => {
        sec.style.display = (sec.id === `sec-${safeId}`) ? 'block' : 'none';
    });

    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    const targetGrid = document.getElementById(`grid-${safeId}`);
    if (targetGrid) targetGrid.classList.add('full-view');

    const tabsBar = document.getElementById('dynamic-category-tabs');
    if (tabsBar) tabsBar.style.display = 'none';

    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'flex';

    const headingText = document.getElementById('full-view-heading-text');
    if (headingText) headingText.innerText = `${categoryName} - সকল প্রোডাক্ট`;

    const searchInput = document.getElementById('product-search-input');
    if (searchInput && searchInput.value) {
        searchInput.value = "";
        removeNoResultsMsg();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitFullCategoryView() {
    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    document.querySelectorAll('.category-section').forEach(sec => sec.style.display = 'block');

    const tabsBar = document.getElementById('dynamic-category-tabs');
    if (tabsBar) tabsBar.style.display = 'flex';

    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';

    const allTab = document.querySelector('.tab-item');
    if (allTab) {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        allTab.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function searchProducts(query) {
    query = query.trim().toLowerCase();
    const mainGrid = document.getElementById('products-container');
    if (!mainGrid) return;

    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap && backWrap.style.display !== 'none') {
        document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
        backWrap.style.display = 'none';
        const tabsBar = document.getElementById('dynamic-category-tabs');
        if (tabsBar) tabsBar.style.display = 'flex';
    }

    if (query === "") {
        const activeTab = document.querySelector('.tab-item.active');
        const activeCategoryText = activeTab ? activeTab.innerText.replace('⚡ ', '') : 'All';
        const targetSafeId = activeCategoryText.replace(/[^a-zA-Z0-9]/g, '-');

        document.querySelectorAll('.product-card').forEach(card => card.style.display = '');
        document.querySelectorAll('.category-section').forEach(sec => {
            if (activeCategoryText === 'All' || sec.id === `sec-${targetSafeId}`) {
                sec.style.display = 'block';
            } else {
                sec.style.display = 'none';
            }
        });
        removeNoResultsMsg();
        return;
    }

    let totalMatches = 0;
    document.querySelectorAll('.category-section').forEach(sec => {
        let sectionHasMatch = false;
        sec.querySelectorAll('.product-card').forEach(card => {
            const name = card.getAttribute('data-name') || '';
            const category = card.getAttribute('data-category') || '';
            if (name.includes(query) || category.includes(query)) {
                card.style.display = '';
                sectionHasMatch = true;
                totalMatches++;
            } else {
                card.style.display = 'none';
            }
        });
        sec.style.display = sectionHasMatch ? 'block' : 'none';
    });

    if (totalMatches === 0) {
        showNoResultsMsg(query);
    } else {
        removeNoResultsMsg();
    }
}

function showNoResultsMsg(query) {
    removeNoResultsMsg();
    const mainGrid = document.getElementById('products-container');
    const msg = document.createElement('div');
    msg.className = 'no-results-msg';
    msg.id = 'no-results-msg';
    msg.innerHTML = `
        😕 "${query}" এর সাথে মিলে এমন কোনো প্রোডাক্ট পাওয়া যায়নি।
        <br>
        <button class="home-btn" onclick="goToHomeView()">🏠 হোমে ফিরে যান</button>
    `;
    mainGrid.appendChild(msg);
}

function removeNoResultsMsg() {
    const existing = document.getElementById('no-results-msg');
    if (existing) existing.remove();
}

function goToHomeView() {
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) searchInput.value = "";

    removeNoResultsMsg();
    document.querySelectorAll('.product-card').forEach(card => card.style.display = '');

    const allTab = document.querySelector('.tab-item');
    switchCategory('All', allTab);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initScrollRollEffect() {
    const sections = document.querySelectorAll('.category-section');
    if (!sections.length) return;

    const rollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('roll-in');
            } else {
                entry.target.classList.remove('roll-in');
            }
        });
    }, { threshold: 0.12 });

    sections.forEach(section => {
        section.classList.add('scroll-roll');
        rollObserver.observe(section);
    });
}

function initJellyOnStopEffect() {
    const playJelly = (card) => {
        if (!card) return;
        card.classList.remove('jelly-shake');
        void card.offsetWidth; 
        card.classList.add('jelly-shake');
    };

    const jellyVisibleCards = (container) => {
        const cards = container.querySelectorAll('.product-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const inView = rect.right > 0 && rect.left < (window.innerWidth || document.documentElement.clientWidth);
            if (inView) {
                playJelly(card);
            }
        });
    };

    let windowScrollTimer = null;
    window.addEventListener('scroll', () => {
        if (windowScrollTimer) clearTimeout(windowScrollTimer);
        windowScrollTimer = setTimeout(() => {
            jellyVisibleCards(document);
        }, 140);
    }, { passive: true });

    document.querySelectorAll('.products-grid, .products-horizontal-grid').forEach(row => {
        let rowScrollTimer = null;
        row.addEventListener('scroll', () => {
            if (rowScrollTimer) clearTimeout(rowScrollTimer);
            rowScrollTimer = setTimeout(() => {
                jellyVisibleCards(row);
            }, 140);
        }, { passive: true });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartUI();
    if (document.getElementById('products-container')) { fetchProducts(); }
});
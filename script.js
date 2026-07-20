const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; 
const orderURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categoryOrder.json";
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
    const modalProduct = document.getElementById('orderModal');
    if (modalIndex) modalIndex.style.display = 'flex';
    if (modalProduct) modalProduct.style.display = 'flex';
}

function closeOrderModal() {
    const modalIndex = document.getElementById('order-modal');
    const modalProduct = document.getElementById('orderModal');
    if (modalIndex) modalIndex.style.display = 'none';
    if (modalProduct) modalProduct.style.display = 'none';
}

function sendOrderToWhatsApp() {
    const name = document.getElementById('customer-name')?.value || document.getElementById('name')?.value;
    const phone = document.getElementById('customer-phone')?.value || document.getElementById('phone')?.value;
    const address = document.getElementById('customer-address')?.value || document.getElementById('address')?.value;

    if (!name || !phone || !address) { alert("সম্পূর্ণ তথ্য দিন!"); return; }

    let message = `*নতুন অর্ডার (Bismillah Gadget Zone BD)*\n👤 *নাম:* ${name}\n📞 *মোবাইল:* ${phone}\n🏠 *ঠিকানা:* ${address}\n\n🛍️ *প্রোডাক্টসমূহ:*\n`;
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.name} (Size: ${item.size || 'N/A'}) -> ৳${item.price}\n`;
        total += item.price;
    });
    message += `\n💰 *সর্বমোট:* ৳${total}`;

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

// 🔄 DYNAMIC DATA + CUSTOM ORDER FETCH
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
    } catch (err) {
        console.error("ডাটা লোড সমস্যা:", err);
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
                    <div class="category-title" style="font-size: 16px; font-weight: 700; color: #0f2635; border-left: 4px solid #c5a059; padding-left: 8px;">${category}</div>
                    <span class="see-more-link" onclick="viewFullCategory('${safeCategoryArg}')">আরও দেখুন ➜</span>
                </div>
                <div class="products-grid" id="grid-${safeId}">`;

        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category !== category) return;
            hasProduct = true;

            categoryHTML += `
                <div class="product-card" data-name="${prod.name.toLowerCase()}" data-category="${category.toLowerCase()}" onclick="window.open('product.html?id=${key}', '_blank')">
                    <div class="card-body">
                        <div class="image-wrapper">
                            <img src="${prod.mainImage || 'logo.JPG'}">
                        </div>
                        <div class="info-wrapper">
                            <h3 class="product-title">${prod.name}</h3>
                            <p class="price">৳ ${prod.price}</p>
                        </div>
                    </div>
                </div>`;
        });

        categoryHTML += `</div></div>`;
        if (hasProduct) mainGrid.innerHTML += categoryHTML;
    });
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
        if(categoryName === 'All' || sec.id === `sec-${targetSafeId}`) sec.style.display = 'block';
        else sec.style.display = 'none';
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
    const targetGrid = document.getElementById(`grid-${safeId}`);
    if (targetGrid) targetGrid.classList.add('full-view');
}

// 🔍 LIVE SEARCH FUNCTIONALITY (পুনরায় যোগ করা হলো)
function searchProducts(query) {
    query = query.trim().toLowerCase();
    const mainGrid = document.getElementById('products-container');
    if (!mainGrid) return;

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
    msg.style.cssText = "text-align:center; padding:40px; color:#64748b;";
    msg.innerHTML = `
        😕 "${query}" এর সাথে মিলে এমন কোনো প্রোডাক্ট পাওয়া যায়নি।
        <br>
        <button onclick="goToHomeView()" style="margin-top:10px; background:#0f2635; color:#c5a059; border:none; padding:8px 16px; border-radius:20px; cursor:pointer; font-weight:bold;">🏠 হোমে ফিরে যান</button>
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
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartUI();
    if (document.getElementById('products-container')) { fetchProducts(); }
});
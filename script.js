const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; 
const orderURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categoryOrder.json";
const billboardDataURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/billboards.json";
const imgbbAPIKey = "1e10b476d984d3447b7259386a75ee5d"; 

let cart = JSON.parse(localStorage.getItem('bg_cart')) || [];
let allProductsData = {}; 
let selectedVariantsGlobal = {}; 
let selectedSizesGlobal = {};
let activeCategories = []; 
let billboardAutoSlideInterval = null;
let isUserInteracting = false;

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
        triggerSwipeGuide();
    } catch (err) {
        console.error("ডাটা লোড সমস্যা:", err);
    }
}

function renderCategoryWiseColumns() {
    const mainGrid = document.getElementById('products-container'); 
    if (!mainGrid) return;
    mainGrid.innerHTML = ""; 

    activeCategories.forEach((category, index) => {
        let categoryProductsCount = 0;
        const safeId = category.replace(/[^a-zA-Z0-9]/g, '-');
        const safeCategoryArg = category.replace(/'/g, "\\'");

        const guideHTML = (index === 0) ? `
            <div class="see-more-guide-box" id="seeMoreGuideBox">
                <span>সকল প্রোডাক্ট দেখতে 'আরও দেখুন'-এ ক্লিক করুন</span>
                <span class="click-hand-icon">👇</span>
            </div>` : '';

        let categoryHTML = `
            <div class="category-section" id="sec-${safeId}">
                <div class="category-header">
                    <div class="category-title" style="font-size: 16px; font-weight: 700; color: #0f2635; border-left: 4px solid #c5a059; padding-left: 8px;">${category}</div>
                    <div style="position: relative;">
                        ${guideHTML}
                        <span class="see-more-link" onclick="viewFullCategory('${safeCategoryArg}')">আরও দেখুন ➜</span>
                    </div>
                </div>
                <div class="products-grid" id="grid-${safeId}">`;

        Object.keys(allProductsData).forEach(key => {
            const prod = allProductsData[key];
            if (prod.category !== category) return;
            categoryProductsCount++;

            categoryHTML += `
                <div class="product-card" data-name="${prod.name.toLowerCase()}" data-category="${category.toLowerCase()}" onclick="window.open('product.html?id=${key}', '_blank')">
                    <div class="card-body">
                        <div class="image-wrapper">
                            <img src="${prod.mainImage || 'logo.JPG'}" loading="lazy">
                        </div>
                        <div class="info-wrapper">
                            <h3 class="product-title">${prod.name}</h3>
                            <p class="price">৳ ${prod.price}</p>
                        </div>
                    </div>
                </div>`;
        });

        categoryHTML += `</div>`;

        if (categoryProductsCount > 1) {
            categoryHTML += `<div class="carousel-dots-wrapper" id="dots-${safeId}">`;
            for (let i = 0; i < categoryProductsCount; i++) {
                categoryHTML += `<span class="carousel-dot ${i === 0 ? 'active' : ''}"></span>`;
            }
            categoryHTML += `</div>`;
        }

        categoryHTML += `</div>`;
        if (categoryProductsCount > 0) mainGrid.innerHTML += categoryHTML;
    });

    initCarouselDotsScrollListener();
    enableDesktopDragScroll();
}

function initCarouselDotsScrollListener() {
    activeCategories.forEach(category => {
        const safeId = category.replace(/[^a-zA-Z0-9]/g, '-');
        const grid = document.getElementById(`grid-${safeId}`);
        const dotsContainer = document.getElementById(`dots-${safeId}`);

        if (grid && dotsContainer) {
            grid.addEventListener('scroll', () => {
                const scrollLeft = grid.scrollLeft;
                const cardWidth = grid.querySelector('.product-card')?.offsetWidth || 200;
                const gap = 12;
                const activeIndex = Math.round(scrollLeft / (cardWidth + gap));

                const dots = dotsContainer.querySelectorAll('.carousel-dot');
                dots.forEach((dot, idx) => {
                    if (idx === activeIndex) dot.classList.add('active');
                    else dot.classList.remove('active');
                });
            });
        }
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
    if (targetGrid) {
        targetGrid.classList.add('full-view');
    }

    const backWrap = document.getElementById('back-to-all-wrap');
    const headingText = document.getElementById('full-view-heading-text');
    if (backWrap) backWrap.style.display = 'block';
    if (headingText) headingText.innerText = `📂 ${categoryName} (সকল প্রোডাক্ট)`;

    window.scrollTo({ top: 150, behavior: 'smooth' });
}

function exitFullCategoryView() {
    document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('full-view'));
    const backWrap = document.getElementById('back-to-all-wrap');
    if (backWrap) backWrap.style.display = 'none';

    document.querySelectorAll('.category-section').forEach(sec => sec.style.display = 'block');
    const allTab = document.querySelector('.tab-item');
    if (allTab) switchCategory('All', allTab);
}

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

function triggerSwipeGuide() {
    if (!localStorage.getItem('hasSeenSwipeGuide')) {
        setTimeout(() => {
            const overlay = document.getElementById('swipe-guide-overlay');
            if (overlay) overlay.classList.add('show');
        }, 1200);
    }
}

function closeSwipeGuide() {
    const overlay = document.getElementById('swipe-guide-overlay');
    if (overlay) overlay.classList.remove('show');
    localStorage.setItem('hasSeenSwipeGuide', 'true');
}

function startSeeMoreGuideTimer() {
    function showGuideTemporarily() {
        const box = document.getElementById('seeMoreGuideBox');
        if (box) {
            box.style.display = 'flex';
            setTimeout(() => {
                box.style.display = 'none';
            }, 10000);
        }
    }

    setTimeout(showGuideTemporarily, 3000);
    setInterval(showGuideTemporarily, 5 * 60 * 1000);
}

// 🎯 সেভ করা সময়ক্রম (createdAt) অনুযায়ী সোর্ট করে বিলবোর্ড রেন্ডার করা (Speed Optimized)
async function fetchAndRenderBillboards() {
    const container = document.getElementById('billboard-container');
    const track = document.getElementById('billboard-track');
    const dotsContainer = document.getElementById('billboard-dots');
    
    if (!track) return;

    try {
        const res = await fetch(billboardDataURL);
        const data = await res.json();
        
        if (!data || Object.keys(data).length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        track.innerHTML = "";
        dotsContainer.innerHTML = "";

        const sortedItems = Object.keys(data)
            .map(key => ({ key, ...data[key] }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        sortedItems.forEach((item, index) => {
            const targetCat = item.category ? item.category.replace(/'/g, "\\'") : "";
            const srcUrl = item.mediaUrl || item.imageUrl || "";
            
            const isVideo = item.mediaType === "video" || 
                            srcUrl.includes('.mp4') || 
                            srcUrl.includes('catbox.moe') || 
                            srcUrl.includes('video') ||
                            srcUrl.includes('data:video');
            
            let mediaHTML = isVideo ? 
                `<video src="${srcUrl}" autoplay loop muted playsinline webkit-playsinline preload="metadata"></video>` : 
                `<img src="${srcUrl}" alt="Billboard Banner" loading="lazy">`;

            track.innerHTML += `
                <div class="billboard-slide" ${targetCat ? `onclick="goToBillboardCategory('${targetCat}')" style="cursor:pointer;"` : ''}>
                    ${mediaHTML}
                </div>
            `;

            dotsContainer.innerHTML += `
                <span class="billboard-dot ${index === 0 ? 'active' : ''}"></span>
            `;
        });

        track.addEventListener('scroll', () => {
            const scrollLeft = track.scrollLeft;
            const slideWidth = track.querySelector('.billboard-slide')?.offsetWidth || track.offsetWidth;
            const activeIndex = Math.round(scrollLeft / slideWidth);

            const dots = dotsContainer.querySelectorAll('.billboard-dot');
            dots.forEach((dot, idx) => {
                if (idx === activeIndex) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        });

        makeDragScrollable(track);
        
        if (sortedItems.length > 1) {
            startBillboardAutoSlide(track, sortedItems.length);
        }

    } catch (err) {
        console.error("Billboard Fetch Error:", err);
    }
}

function startBillboardAutoSlide(track, totalSlides) {
    if (billboardAutoSlideInterval) clearInterval(billboardAutoSlideInterval);

    const slideNext = () => {
        if (isUserInteracting) return;

        const slideWidth = track.querySelector('.billboard-slide')?.offsetWidth || track.offsetWidth;
        const currentScroll = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;

        if (currentScroll >= maxScroll - 5) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: slideWidth, behavior: 'smooth' });
        }
    };

    billboardAutoSlideInterval = setInterval(slideNext, 4000);

    track.addEventListener('mouseenter', () => { isUserInteracting = true; });
    track.addEventListener('mouseleave', () => { isUserInteracting = false; });
    track.addEventListener('touchstart', () => { isUserInteracting = true; }, { passive: true });
    track.addEventListener('touchend', () => {
        setTimeout(() => { isUserInteracting = false; }, 2000);
    }, { passive: true });
}

function goToBillboardCategory(categoryName) {
    if (!categoryName) return;
    
    viewFullCategory(categoryName);

    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        if (tab.innerText.trim().includes(categoryName)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// ⚡ হাই-সেনসিটিভ ও ফার্স্ট রেসপন্সিভ ড্র্যাগিং লজিক
function makeDragScrollable(slider) {
    if (!slider) return;
    let isDown = false;
    let startX;
    let initialScrollLeft;
    let totalMovedX = 0;
    let hasDragged = false;

    // ব্রাউজারের নেটিভ ইমেজ/ভিডিও ড্র্যাগ বন্ধ রাখা
    slider.querySelectorAll('img, video').forEach(media => {
        media.addEventListener('dragstart', (e) => e.preventDefault());
    });

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        hasDragged = false;
        totalMovedX = 0;
        isUserInteracting = true;
        slider.style.cursor = 'grabbing';
        slider.style.scrollSnapType = 'none'; // 🚀 ড্র্যাগ করার সময় সেনসিটিভিটি বাড়ানোর জন্য স্ন্যাপ সাময়িক অফ
        startX = e.pageX - slider.offsetLeft;
        initialScrollLeft = slider.scrollLeft;
    });

    const stopDragging = () => {
        if (!isDown) return;
        isDown = false;
        slider.style.cursor = 'grab';
        slider.style.scrollSnapType = 'x mandatory'; // 🚀 মাউস ছাড়লেই আবার স্ন্যাপ চালু হবে

        // 🎯 স্মার্ট থ্রেশহোল্ড: মাউস মাত্র ৪০ পিক্সেল সরালেই পরের/আগের ব্যানারে নিয়ে যাবে
        const slideWidth = slider.querySelector('.billboard-slide')?.offsetWidth || slider.offsetWidth;
        const currentActiveIndex = Math.round(initialScrollLeft / slideWidth);

        if (totalMovedX < -40) {
            // ডানে টান দেওয়া হয়েছে -> পরের ব্যানার
            slider.scrollTo({ left: (currentActiveIndex + 1) * slideWidth, behavior: 'smooth' });
        } else if (totalMovedX > 40) {
            // বামে টান দেওয়া হয়েছে -> আগের ব্যানার
            slider.scrollTo({ left: (currentActiveIndex - 1) * slideWidth, behavior: 'smooth' });
        } else {
            // সামান্য একটু মাউস নড়ে উঠলে জায়গায় ফিরে যাবে
            snapToNearestSlide(slider);
        }

        setTimeout(() => { isUserInteracting = false; }, 1000);
    };

    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('mouseleave', stopDragging);

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        totalMovedX = x - startX;
        
        if (Math.abs(totalMovedX) > 5) {
            hasDragged = true;
        }

        // 🚀 ২ গুণ গতিতে স্ক্রোল হবে, ফলে বেশি টান দিতে হবে না
        slider.scrollLeft = initialScrollLeft - (totalMovedX * 2);
    });

    slider.addEventListener('click', (e) => {
        if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

function snapToNearestSlide(slider) {
    const slideWidth = slider.querySelector('.billboard-slide')?.offsetWidth || slider.offsetWidth;
    const activeIndex = Math.round(slider.scrollLeft / slideWidth);
    slider.scrollTo({
        left: activeIndex * slideWidth,
        behavior: 'smooth'
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
    setTimeout(startSeeMoreGuideTimer, 1000);
});
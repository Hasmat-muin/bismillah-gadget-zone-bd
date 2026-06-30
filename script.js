const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const imgbbAPIKey = "1e10b476d984d3447b7259386a75ee5d"; 

let cart = [];
let allProductsData = {}; // ডাটাবেজের সব প্রোডাক্ট এখানে জমা থাকবে
let selectedVariantsGlobal = {}; 
let isBuyNowMode = false; 
let buyNowItem = null; 

// 🔑 ডাটাবেজ থেকে সিকিউরড লগইন করার ফাংশন
async function handleAdminLogin(e) {
    e.preventDefault();
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.innerText = "Checking...";
    loginBtn.disabled = true;

    const inputUser = document.getElementById('adminUser').value;
    const inputPass = document.getElementById('adminPass').value;

    try {
        const res = await fetch(authURL);
        let credentials = await res.json();

        // প্রথমবার যদি ডাটাবেজে কোনো পাসওয়ার্ড না থাকে, তবে ডিফল্ট সেট হবে
        if (!credentials) {
            credentials = { user: "admin", pass: "bismillah123" };
            await fetch(authURL, { method: "PUT", body: JSON.stringify(credentials) });
        }

        if (inputUser === credentials.user && inputPass === credentials.pass) {
            sessionStorage.setItem("adminLoggedIn", "true");
            showAdminPanel();
            alert("🔓 লগইন সফল হয়েছে!");
        } else {
            alert("❌ ভুল ইউজারনেম বা পাসওয়ার্ড!");
            loginBtn.innerText = "Login";
            loginBtn.disabled = false;
        }
    } catch (err) {
        alert("নেটওয়ার্ক বা ডাটাবেজ সমস্যা!");
        loginBtn.innerText = "Login";
        loginBtn.disabled = false;
    }
}

// 🔄 প্যানেলের ভেতর থেকে ইউজারনেম ও পাসওয়ার্ড পরিবর্তনের মূল ফাংশন
async function handleCredentialChange(e) {
    e.preventDefault();
    const currentInputPass = document.getElementById('currentPass').value;
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const res = await fetch(authURL);
        const credentials = await res.json();

        // ১. কারেন্ট পাসওয়ার্ড চেক
        if (currentInputPass !== credentials.pass) {
            alert("❌ বর্তমান পাসওয়ার্ডটি ভুল! আবার চেষ্টা করুন।");
            return;
        }

        // ২. ডাটাবেজে নতুন ইউজারনেম ও পাসওয়ার্ড আপডেট (PUT)
        const updatedCreds = { user: newUsername, pass: newPassword };
        const updateRes = await fetch(authURL, {
            method: "PUT",
            body: JSON.stringify(updatedCreds),
            headers: { "Content-Type": "application/json" }
        });

        if (updateRes.ok) {
            alert("🎉 ইউজারনেম এবং পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! দয়া করে নতুন পাসওয়ার্ড দিয়ে আবার লগইন করুন।");
            sessionStorage.removeItem("adminLoggedIn"); // লগআউট করে দেওয়া হলো
            window.location.reload();
        } else {
            alert("আপডেট করতে সমস্যা হয়েছে।");
        }

    } catch (err) {
        alert("ডাটাবেজ কানেকশন সমস্যা!");
    }
}

// 📸 ImgBB-তে ছবি আপলোড ফাংশন
async function uploadToImgBB(fileElement) {
    if (!fileElement || !fileElement.files[0]) return null;
    const formData = new FormData();
    formData.append("image", fileElement.files[0]);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (result.success) return result.data.url;
        return null;
    } catch (err) {
        return null;
    }
}

// 📤 নতুন প্রোডাক্ট আপলোড ফাংশন (ক্যাটাগরি সহ)
async function uploadProductWithImages() {
    const name = document.getElementById('prodName').value;
    const price = parseInt(document.getElementById('prodPrice').value);
    const category = document.getElementById('prodCategory').value; // ক্যাটাগরি ভ্যালু রিড
    const video = document.getElementById('prodVideo').value;
    const details = document.getElementById('prodDetails').value;
    
    const mainImgFile = document.getElementById('prodMainImageFile');
    const mainImageUrl = await uploadToImgBB(mainImgFile);
    
    if(!mainImageUrl) {
        alert("মেইন ছবিটি আপলোড করতে সমস্যা হয়েছে!");
        document.getElementById('submitBtn').innerText = "Save & Upload Product";
        document.getElementById('submitBtn').disabled = false;
        return;
    }

    const variantRows = document.querySelectorAll('#variantContainer .variant-row');
    let variantsData = {};

    for (let row of variantRows) {
        const colorName = row.querySelector('.v-name').value;
        const colorPrice = parseInt(row.querySelector('.v-price').value);
        const colorFileElement = row.querySelector('.v-file');
        
        if(colorName && colorPrice && colorFileElement.files[0]) {
            row.style.background = "#fef08a";
            const uploadedUrl = await uploadToImgBB(colorFileElement);
            if(uploadedUrl) {
                variantsData[colorName] = {
                    image: uploadedUrl,
                    price: colorPrice
                };
                row.style.background = "#dcfce7";
            }
        }
    }

    const newProduct = {
        name: name,
        price: price,
        category: category, // ফায়ারবেস ডাটাবেজে ক্যাটাগরি সেভ করা হচ্ছে
        mainImage: mainImageUrl,
        video: video,
        details: details,
        variants: Object.keys(variantsData).length > 0 ? variantsData : null
    };

    fetch(dbURL, {
        method: "POST",
        body: JSON.stringify(newProduct),
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(() => {
        alert("🎉 প্রোডাক্টটি সফলভাবে ক্যাটাগরিসহ আপলোড হয়েছে!");
        window.location.reload();
    })
    .catch(err => alert("ডাটাবেজে সেভ করতে সমস্যা হয়েছে।"));
}

// 📥 ডাটাবেজ থেকে ডাটা আনার মূল ফাংশন
function fetchProducts() {
    fetch(dbURL)
    .then(res => res.json())
    .then(data => {
        allProductsData = data || {}; // গ্লোবাল ভেরিয়েবলে ডাটা সেভ রাখা হলো
        renderFilteredProducts('all'); // প্রথমে সবগুলো প্রোডাক্ট শো করবে
        renderAdminGrid(); // অ্যাডমিন গ্রিড রেন্ডার
    });
}

// 🔍 ক্যাটাগরি ফিল্টার এবং রেন্ডার করার ফাংশন
function filterCategory(categoryName, element) {
    // অ্যাক্টিভ ক্লাসের রঙ পরিবর্তন (UI highlights)
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(element) element.classList.add('active');

    renderFilteredProducts(categoryName);
}

// 📦 প্রোডাক্ট কার্ড স্ক্রিনে দেখানোর লজিক (২-কলাম মোবাইল সুইপ সাপোর্ট সহ)
function renderFilteredProducts(categoryFilter) {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;

    if (Object.keys(allProductsData).length === 0) {
        grid.innerHTML = "<p style='text-align:center; width:100%; color:#64748b; font-weight:bold; margin-top:40px;'>আপাতত কোনো প্রোডাক্ট নেই।</p>";
        return;
    }

    grid.innerHTML = "";
    let column1HTML = `<div class="product-column" id="col-1">`;
    let column2HTML = `<div class="product-column" id="col-2">`;
    let index = 0;

    Object.keys(allProductsData).forEach(key => {
        const prod = allProductsData[key];

        // ফিল্টারিং কন্ডিশন: যদি 'all' না হয় এবং প্রোডাক্টের ক্যাটাগরি ফিল্টারের সাথে না মেলে তবে তা স্কিপ করবে
        if (categoryFilter !== 'all' && prod.category !== categoryFilter) {
            return; 
        }

        let colorKeys = prod.variants ? Object.keys(prod.variants) : [];
        if (colorKeys.length > 0 && !selectedVariantsGlobal[key]) {
            selectedVariantsGlobal[key] = colorKeys[0];
        } else if (colorKeys.length === 0) {
            selectedVariantsGlobal[key] = "Standard";
        }

        let colorHTML = "";
        let displayPrice = prod.price;

        if (colorKeys.length > 0) {
            displayPrice = prod.variants[colorKeys[0]].price;
            colorHTML = `<div class="color-variants-wrapper" style="display:flex; gap:5px; margin: 5px 0; overflow-x:auto;">`;
            colorKeys.forEach((color) => {
                let bgStyle = color.toLowerCase();
                const isActive = selectedVariantsGlobal[key] === color ? 'active' : '';
                const vImage = prod.variants[color].image;
                const vPrice = prod.variants[color].price;
                colorHTML += `
                    <div style="text-align:center; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                        <div class="color-dot ${isActive}" style="background: ${bgStyle}; width:15px; height:15px; border-radius:50%; border:1px solid #ccc; cursor:pointer;" onclick="selectColor('${key}', '${color}', '${vImage}', ${vPrice}, this); event.stopPropagation();"></div>
                        <span class="color-label" style="font-size: 9px; color: #64748b;">${color}</span>
                    </div>`;
            });
            colorHTML += `</div>`;
        }

        const card = `
            <div class="product-card">
                <div class="image-wrapper" style="cursor:pointer;" onclick="window.open('product.html?id=${key}', '_blank')">
                    <img id="main-img-${key}" src="${colorKeys.length > 0 ? prod.variants[colorKeys[0]].image : prod.mainImage}" alt="${prod.name}" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
                </div>
                <div class="info-wrapper" style="display:flex; flex-direction:column; flex-grow:1;">
                    <h3 class="product-title" style="cursor:pointer;" onclick="window.open('product.html?id=${key}', '_blank')">${prod.name}</h3>
                    <p class="price" id="price-display-${key}">৳ ${displayPrice}</p>
                    ${colorHTML}
                    <div class="details-section" style="margin-top: auto; padding-top: 5px;">
                        ${prod.video ? `<a href="${prod.video}" target="_blank" style="color:#c5a059; text-decoration:none; font-weight:bold; display:block; margin-bottom:10px; text-align:center; font-size: 11px;">📺 Watch Video</a>` : ''}
                    </div>
                    <div class="btn-group">
                        <button class="add-to-cart-btn" onclick="let currentP = parseInt(document.getElementById('price-display-${key}').innerText.replace('৳ ', '')); addToCart('${key}', '${prod.name}', currentP); event.stopPropagation();">Cart</button>
                        <button class="buy-now-btn" onclick="let currentP = parseInt(document.getElementById('price-display-${key}').innerText.replace('৳ ', '')); buyNow('${key}', '${prod.name}', currentP); event.stopPropagation();">Buy Now</button>
                    </div>
                </div>
            </div>
        `;

        if (index % 2 === 0) { column1HTML += card; } else { column2HTML += card; }
        index++;
    });

    column1HTML += `</div>`;
    column2HTML += `</div>`;

    if(index === 0) {
        grid.innerHTML = "<p style='text-align:center; width:100%; color:#64748b; font-weight:bold; margin-top:40px;'>এই ক্যাটাগরিতে কোনো প্রোডাক্ট পাওয়া যায়নি।</p>";
    } else {
        grid.innerHTML = column1HTML + column2HTML;
    }
}

// 📋 অ্যাডমিন গ্রিড রেন্ডার করার ফাংশন 
function renderAdminGrid() {
    const adminGrid = document.getElementById('adminProductsGrid');
    if (!adminGrid) return;
    adminGrid.innerHTML = "";
    Object.keys(allProductsData).forEach(key => {
        const prod = allProductsData[key];
        adminGrid.innerHTML += `
            <div class="admin-prod-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ddd; background: #fff; margin-bottom: 8px; border-radius: 6px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${prod.mainImage}" style="width:50px; height:50px; object-fit:cover; border-radius: 4px;">
                    <div>
                        <h4 style="margin:0; font-size:14px; text-align: left;">${prod.name} <span style="font-size:11px; color:#888;">(${prod.category || 'No Category'})</span></h4>
                        <p style="margin:0; color:#b59449; font-weight:bold; text-align: left;">৳ ${prod.price}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="openEditModal('${key}')" style="background:#0f2635; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px;">✏️ Edit</button>
                    <button onclick="deleteProduct('${key}')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px;">❌ Delete</button>
                </div>
            </div>`;
    });
}

// 🛠️ প্রোডাক্ট ডিলিট করার ফাংশন
function deleteProduct(productId) {
    if (confirm("আপনি কি নিশ্চিত যে এই প্রোডাক্টটি চিরতরে ডিলিট করতে চান?")) {
        const deleteURL = `https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products/${productId}.json`;
        fetch(deleteURL, { method: "DELETE" })
        .then(res => {
            if(res.ok) {
                alert("🗑️ প্রোডাক্টটি সফলভাবে ডিলিট করা হয়েছে!");
                window.location.reload();
            }
        });
    }
}

// 🛠️ ডাটাবেজ থেকে ডাটা এনে এডিট ফর্মের ফিল্ডগুলো ফিলাপ করার ফাংশন
async function openEditModal(productId) {
    try {
        const res = await fetch(`https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products/${productId}.json`);
        const product = await res.json();
        
        if (!product) return alert("Product data not found!");

        // মডাল ফিল্ডগুলোতে পুরাতন ভ্যালু পুশ করা
        document.getElementById('editProductId').value = productId;
        document.getElementById('editProdName').value = product.name || '';
        document.getElementById('editProdPrice').value = product.price || 0;
        if(document.getElementById('editProdCategory')) {
            document.getElementById('editProdCategory').value = product.category || 'unassigned';
        }
        document.getElementById('editProdVideo').value = product.video || '';
        document.getElementById('editProdDetails').value = product.details || '';
        
        // ভ্যারিয়েন্ট কন্টেইনার খালি করে ডাটা রেন্ডার করা
        const editContainer = document.getElementById('editVariantContainer');
        editContainer.innerHTML = '';
        
        if (product.variants) {
            Object.keys(product.variants).forEach(colorName => {
                let variantData = product.variants[colorName];
                if (typeof variantData === 'object' && variantData !== null) {
                    addEditVariantRow(colorName, variantData.price, variantData.image);
                } else {
                    addEditVariantRow(colorName, product.price, variantData); 
                }
            });
        }

        // মডালটি স্ক্রিনে ওপেন করা
        document.getElementById('editModal').style.display = 'flex';
    } catch (err) {
        console.error("Error opening edit form: ", err);
        alert("Failed to load product data for editing.");
    }
}

// 🛠️ ইমেজ আপলোড সহ সম্পূর্ণ প্রোডাক্ট আপডেট করার প্রধান ফাংশন
async function updateProductComplete() {
    const productId = document.getElementById('editProductId').value;
    const name = document.getElementById('editProdName').value;
    const price = parseInt(document.getElementById('editProdPrice').value);
    const category = document.getElementById('editProdCategory') ? document.getElementById('editProdCategory').value : 'unassigned';
    const video = document.getElementById('editProdVideo').value;
    const details = document.getElementById('editProdDetails').value;

    const variantRows = document.querySelectorAll('#editVariantContainer .variant-row');
    let updatedVariants = {};

    try {
        // প্রতিটি ভ্যারিয়েন্ট রো লুপ করে ইমেজ চেক এবং ডাটা স্ট্রাকচার রেডি করা
        for (let row of variantRows) {
            const vName = row.querySelector('.edit-v-name').value;
            const vPrice = parseInt(row.querySelector('.edit-v-price').value) || price;
            const fileInput = row.querySelector('.edit-v-file');
            const oldImgUrl = row.querySelector('.edit-v-old-img').value;
            let finalImgUrl = oldImgUrl;

            // যদি নতুন ছবি সিলেক্ট করা হয় তবে ImgBB তে আপলোড হবে
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append("image", fileInput.files[0]);
                const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, {
                    method: "POST",
                    body: formData
                });
                const imgbbData = await imgbbRes.json();
                if(imgbbData.success) {
                    finalImgUrl = imgbbData.data.url;
                }
            }

            if (vName) {
                updatedVariants[vName] = {
                    image: finalImgUrl,
                    price: vPrice
                };
            }
        }

        // Firebase-এ ডেটা আপডেট করার বডি অবজেক্ট
        const updateURL = `https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products/${productId}.json`;
        
        // প্রথমে কারেন্ট ডাটা থেকে মেইন ইমেজটি রিড করে অবজেক্ট ঠিক রাখা
        const currentRes = await fetch(updateURL);
        const currentProduct = await currentRes.json();

        const finalUpdatedData = {
            ...currentProduct,
            name: name,
            price: price,
            category: category,
            video: video,
            details: details,
            variants: Object.keys(updatedVariants).length > 0 ? updatedVariants : null
        };

        const putRes = await fetch(updateURL, {
            method: "PUT",
            body: JSON.stringify(finalUpdatedData)
        });

        if (putRes.ok) {
            alert("প্রোডাক্টের বিবরণ ও ভ্যারিয়েন্ট সফলভাবে আপডেট হয়েছে! 🎉");
            window.location.reload();
        } else {
            alert("আপডেট করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
        }

    } catch (error) {
        console.error("Update error: ", error);
        alert("Something went wrong while updating product.");
    } finally {
        const saveBtn = document.getElementById('editSubmitBtn');
        if(saveBtn) {
            saveBtn.innerText = "Update Product Info";
            saveBtn.disabled = false;
        }
    }
}

// কালার সিলেক্ট ও লাইভ দাম পরিবর্তন হ্যান্ডেলার
function selectColor(productId, colorName, imageUrl, vPrice, element) {
    document.getElementById(`main-img-${productId}`).src = imageUrl;
    document.getElementById(`price-display-${productId}`).innerText = `৳ ${vPrice}`; 
    selectedVariantsGlobal[productId] = colorName;
    const parent = element.parentElement.parentElement;
    parent.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
    element.classList.add('active');
}

function addToCart(id, name, price) {
    const selectedColor = selectedVariantsGlobal[id];
    const existingIndex = cart.findIndex(item => item.id === id && item.color === selectedColor);
    if(existingIndex > -1) { cart[existingIndex].qty += 1; } else { cart.push({ id, name, price, color: selectedColor, qty: 1 }); }
    updateCartUI();
    alert(`"${name} (${selectedColor})" কার্টে যোগ করা হয়েছে!`);
}

function buyNow(id, name, price) {
    const selectedColor = selectedVariantsGlobal[id];
    buyNowItem = { id, name, price, color: selectedColor, qty: 1 };
    isBuyNowMode = true; 
    openCheckoutModal(true);
}

function toggleCart() { 
    const sidebar = document.getElementById('cartSidebar');
    if(sidebar) sidebar.classList.toggle('open'); 
}

function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const countSpan = document.getElementById('cartCount');
    const totalSpan = document.getElementById('cartTotalAmount');
    if(!list) return; list.innerHTML = ""; let total = 0; let itemCount = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty; itemCount += item.qty;
        list.innerHTML += `<div class="cart-item"><div><strong>${item.name}</strong><br><small>Color: ${item.color} | Qty: ${item.qty}</small></div><div><span>৳${item.price * item.qty}</span><span class="remove-item" onclick="removeFromCart(${index})" style="margin-left:10px; cursor:pointer;">×</span></div></div>`;
    });
    if(countSpan) countSpan.innerText = itemCount;
    if(totalSpan) totalSpan.innerText = total;
}

function removeFromCart(index) { cart.splice(index, 1); updateCartUI(); }

function openCheckoutModal(fromBuyNow) {
    if(!fromBuyNow && cart.length === 0) { alert("আপনার কার্ট খালি!"); return; }
    const modalTitle = document.getElementById('modalTitle');
    if(fromBuyNow) { 
        if(modalTitle) modalTitle.innerText = `Buy Now: ${buyNowItem.name} (${buyNowItem.color})`; 
    } else { 
        if(modalTitle) modalTitle.innerText = "Checkout Details (অর্ডার ফর্ম)"; 
        isBuyNowMode = false; 
    }
    const orderModal = document.getElementById('orderModal');
    if(orderModal) orderModal.style.display = 'flex';
}

function closeCheckoutModal() { 
    const orderModal = document.getElementById('orderModal');
    if(orderModal) orderModal.style.display = 'none'; 
}

function handleOrderSubmit(event) {
    event.preventDefault();
    const clientName = document.getElementById('name').value;
    const clientPhone = document.getElementById('phone').value;
    const clientZilla = document.getElementById('zilla').value;
    const clientUpazila = document.getElementById('upazila').value;
    const clientAddress = document.getElementById('address').value;
    const targetNumber = "8801922790663";
    let productDetailsText = "";
    let totalCartPrice = 0;
    
    if(isBuyNowMode && buyNowItem) {
        productDetailsText += `1. ${buyNowItem.name}%0A   Color: ${buyNowItem.color}%0A   Qty: 1 x ৳${buyNowItem.price} = ৳${buyNowItem.price}%0A%0A`;
        totalCartPrice = buyNowItem.price;
    } else {
        cart.forEach((item, i) => {
            productDetailsText += `${i+1}. ${item.name}%0A   Color: ${item.color}%0A   Qty: ${item.qty} x ৳${item.price} = ৳${item.price * item.qty}%0A%0A`;
            totalCartPrice += item.price * item.qty;
        });
    }
    const textMessage = `*New Order Received - Bismillah Gadget Zone BD*%0A%0A*--- Ordered Products ---*%0A${productDetailsText}*Total Bill:* ৳ ${totalCartPrice}%0A*Method:* Cash on Delivery%0A%0A*--- Customer Data ---*%0A*Name:* ${clientName}%0A*Phone:* ${clientPhone}%0A*District:* ${clientZilla}%0A*Upazila:* ${clientUpazila}%0A*Address:* ${clientAddress}`;
    window.open(`https://api.whatsapp.com/send?phone=${targetNumber}&text=${textMessage}`, '_blank');
    if(!isBuyNowMode) { cart = []; updateCartUI(); }
    closeCheckoutModal(); 
    if(!isBuyNowMode) toggleCart();
}

window.onload = fetchProducts;

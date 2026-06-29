const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const imgbbAPIKey = "1e10b476d984d3447b7259386a75ee5d"; 

let cart = [];
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

// 📤 নতুন প্রোডাক্ট আপলোড ফাংশন
async function uploadProductWithImages() {
    const name = document.getElementById('prodName').value;
    const price = parseInt(document.getElementById('prodPrice').value);
    const video = document.getElementById('prodVideo').value;
    const details = document.getElementById('prodDetails').value;
    
    const mainImgFile = document.getElementById('prodMainImageFile');
    const mainImageUrl = await uploadToImgBB(mainImgFile);
    
    if(!mainImageUrl) {
        alert("মেইন ছবিটি আপলোড করতে সমস্যা হয়েছে!");
        document.getElementById('submitBtn').innerText = "Save & Upload Product";
        document.getElementById('submitBtn').disabled = false;
        return;
    }

    const variantRows = document.querySelectorAll('.variant-row');
    let variantsData = {};

    for (let row of variantRows) {
        const colorName = row.querySelector('.v-name').value;
        const colorFileElement = row.querySelector('.v-file');
        
        if(colorName && colorFileElement.files[0]) {
            row.style.background = "#fef08a";
            const uploadedUrl = await uploadToImgBB(colorFileElement);
            if(uploadedUrl) {
                variantsData[colorName] = uploadedUrl;
                row.style.background = "#dcfce7";
            }
        }
    }

    const newProduct = {
        name: name,
        price: price,
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
    .then(data => {
        alert("🎉 প্রোডাক্টটি সফলভাবে ছবিসহ আপলোড এবং সেভ হয়েছে!");
        window.location.reload();
    })
    .catch(err => alert("ডাটাবেজে সেভ করতে সমস্যা হয়েছে।"));
}

// 📥 প্রোডাক্ট দেখানোর মূল ফাংশন (কাস্টমার ও অ্যাডমিন)
function fetchProducts() {
    const grid = document.querySelector('.products-grid');
    const adminGrid = document.getElementById('adminProductsGrid');
    
    fetch(dbURL)
    .then(res => res.json())
    .then(data => {
        if (grid) {
            if(!data || Object.keys(data).length === 0) {
                grid.innerHTML = "<p style='text-align:center; width:100%; color:#64748b; font-weight:bold; margin-top:40px;'>আপাতত কোনো প্রোডাক্ট নেই।</p>";
                return;
            }
            grid.innerHTML = ""; 
            Object.keys(data).forEach(key => {
                const prod = data[key];
                let colorKeys = prod.variants ? Object.keys(prod.variants) : [];
                if(colorKeys.length > 0 && !selectedVariantsGlobal[key]) {
                    selectedVariantsGlobal[key] = colorKeys[0];
                } else if (colorKeys.length === 0) {
                    selectedVariantsGlobal[key] = "Standard";
                }

                let colorHTML = "";
                if(colorKeys.length > 0) {
                    colorHTML = `<div class="color-variants-wrapper">`;
                    colorKeys.forEach((color) => {
                        let bgStyle = color.toLowerCase();
                        const isActive = selectedVariantsGlobal[key] === color ? 'active' : '';
                        colorHTML += `
                            <div style="text-align:center;">
                                <div class="color-dot ${isActive}" style="background: ${bgStyle};" onclick="selectColor('${key}', '${color}', '${prod.variants[color]}', this); event.stopPropagation();"></div>
                                <span class="color-label">${color}</span>
                            </div>`;
                    });
                    colorHTML += `</div>`;
                }

                const card = `
                    <div class="product-card">
                        <div class="image-wrapper" style="cursor:pointer;" onclick="window.open('product.html?id=${key}', '_blank')">
                            <img id="main-img-${key}" src="${colorKeys.length > 0 ? prod.variants[colorKeys[0]] : prod.mainImage}" alt="${prod.name}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                        </div>
                        <div class="info-wrapper" style="display:flex; flex-direction:column; flex-grow:1;">
                            <h3 class="product-title" style="cursor:pointer;" onclick="window.open('product.html?id=${key}', '_blank')">${prod.name}</h3>
                            <p class="price">৳ ${prod.price}</p>
                            ${colorHTML} 
                            <div class="details-section" style="margin-top: auto; padding-top: 10px;">
                                ${prod.video ? `<a href="${prod.video}" target="_blank" style="color:#c5a059; text-decoration:none; font-weight:bold; display:block; margin-bottom:10px; text-align:center;">📺 Watch Video</a>` : ''}
                            </div>
                            <div class="btn-group">
                                <button class="add-to-cart-btn" onclick="addToCart('${key}', '${prod.name}', ${prod.price}); event.stopPropagation();">Add to Cart</button>
                                <button class="buy-now-btn" onclick="buyNow('${key}', '${prod.name}', ${prod.price}); event.stopPropagation();">Buy Now</button>
                            </div>
                        </div>
                    </div>
                `;
                grid.innerHTML += card;
            });
        }

        if (adminGrid) {
            if(!data || Object.keys(data).length === 0) {
                adminGrid.innerHTML = "<p style='text-align:center; color:#64748b; font-weight:bold;'>কোনো প্রোডাক্ট আপলোড করা নেই।</p>";
                return;
            }
            adminGrid.innerHTML = ""; 
            Object.keys(data).forEach(key => {
                const prod = data[key];
                const adminCard = `
                    <div class="admin-prod-card">
                        <div class="admin-prod-info">
                            <img src="${prod.mainImage}" class="admin-prod-img">
                            <div>
                                <h4 style="margin: 0 0 5px 0; color: #0f2635; font-size: 14px; text-align: left;">${prod.name}</h4>
                                <p style="margin: 0; color: #c5a059; font-weight: bold; font-size: 13px; text-align: left;">৳ ${prod.price}</p>
                            </div>
                        </div>
                        <div class="admin-btn-group">
                            <button onclick="editProduct('${key}', '${prod.name}', ${prod.price})" class="btn-edit">✏️ Edit</button>
                            <button onclick="deleteProduct('${key}')" class="btn-delete">❌ Delete</button>
                        </div>
                    </div>
                `;
                adminGrid.innerHTML += adminCard;
            });
        }
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

// 🛠️ প্রোডাক্ট এডিট করার ফাংশন
function editProduct(productId, currentName, currentPrice) {
    const newName = prompt("প্রোডাক্টের নতুন নাম লিখুন:", currentName);
    if (newName === null) return; 
    const newPrice = prompt("প্রোডাক্টের নতুন দাম (৳) লিখুন:", currentPrice);
    if (newPrice === null) return;

    const updateURL = `https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products/${productId}.json`;
    fetch(updateURL, {
        method: "PATCH",
        body: JSON.stringify({ name: newName, price: parseInt(newPrice) }),
        headers: { "Content-Type": "application/json" }
    })
    .then(res => { if(res.ok) { alert("✏️ আপডেট সফল হয়েছে!"); window.location.reload(); } });
}

// কার্ট ও অন্যান্য ফাংশন আগের মতোই থাকবে
function selectColor(productId, colorName, imageUrl, element) {
    document.getElementById(`main-img-${productId}`).src = imageUrl;
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
    alert(`"${name} (${selectedColor})" কার্টে যোগ করা হয়েছে!`);
}
function buyNow(id, name, price) {
    const selectedColor = selectedVariantsGlobal[id];
    buyNowItem = { id, name, price, color: selectedColor, qty: 1 };
    isBuyNowMode = true; 
    openCheckoutModal(true);
}
function toggleCart() { document.getElementById('cartSidebar').classList.toggle('open'); }
function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const countSpan = document.getElementById('cartCount');
    const totalSpan = document.getElementById('cartTotalAmount');
    if(!list) return; list.innerHTML = ""; let total = 0; let itemCount = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty; itemCount += item.qty;
        list.innerHTML += `<div class="cart-item"><div><strong>${item.name}</strong><br><small>Color: ${item.color} | Qty: ${item.qty}</small></div><div><span>৳${item.price * item.qty}</span><span class="remove-item" onclick="removeFromCart(${index})" style="margin-left:10px;">×</span></div></div>`;
    });
    if(countSpan) countSpan.innerText = itemCount;
    if(totalSpan) totalSpan.innerText = total;
}
function removeFromCart(index) { cart.splice(index, 1); updateCartUI(); }
function openCheckoutModal(fromBuyNow) {
    if(!fromBuyNow && cart.length === 0) { alert("আপনার কার্ট খালি!"); return; }
    if(fromBuyNow) { document.getElementById('modalTitle').innerText = `Buy Now: ${buyNowItem.name} (${buyNowItem.color})`; } 
    else { document.getElementById('modalTitle').innerText = "Checkout Details (অর্ডার ফর্ম)"; isBuyNowMode = false; }
    document.getElementById('orderModal').style.display = 'flex';
}
function closeCheckoutModal() { document.getElementById('orderModal').style.display = 'none'; }
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
    closeCheckoutModal(); if(!isBuyNowMode) toggleCart();
}

window.onload = fetchProducts;
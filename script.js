const dbURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products.json";
const authURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/adminSettings.json";
const catURL = "https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/categories.json"; // 📁 ক্যাটাগরি ডাটাবেজ লিঙ্ক
const imgbbAPIKey = "1e10b476d984d3447b7259386a75ee5d"; 

let cart = [];
let allProductsData = {}; 
let selectedVariantsGlobal = {}; 
let activeCategories = ["Smart Watch", "Earbuds", "Power Bank", "Adapter"]; // ডিফল্ট ক্যাটাগরি

// 🔑 ডাটাবেজ থেকে সিকিউরড লগইন
async function handleAdminLogin(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn) { loginBtn.innerText = "Checking..."; loginBtn.disabled = true; }
    const inputUser = document.getElementById('adminUser').value;
    const inputPass = document.getElementById('adminPass').value;

    try {
        const res = await fetch(authURL);
        let credentials = await res.json();
        if (!credentials) {
            credentials = { user: "admin", pass: "bismillah123" };
            await fetch(authURL, { method: "PUT", body: JSON.stringify(credentials) });
        }
        if (inputUser === credentials.user && inputPass === credentials.pass) {
            sessionStorage.setItem("adminLoggedIn", "true");
            if (typeof showAdminPanel === 'function') { showAdminPanel(); }
            alert("🔓 লগইন সফল হয়েছে!");
        } else {
            alert("❌ ভুল ইউজারনেম বা পাসওয়ার্ড!");
            if(loginBtn) { loginBtn.innerText = "Login"; loginBtn.disabled = false; }
        }
    } catch (err) {
        alert("নেটওয়ার্ক বা ডাটাবেজ সমস্যা!");
        if(loginBtn) { loginBtn.innerText = "Login"; loginBtn.disabled = false; }
    }
}

// 📁 ডাইনামিক নতুন ক্যাটাগরি তৈরি এবং ডাটাবেজে সংরক্ষণ
async function createNewCategory(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const catInput = document.getElementById('newCategoryName');
    const catName = catInput.value.trim();
    if(!catName) return;

    try {
        await fetch(catURL, {
            method: "POST",
            body: JSON.stringify({ name: catName }),
            headers: { "Content-Type": "application/json" }
        });
        alert(`🎉 "${catName}" ক্যাটাগরি সফলভাবে যোগ হয়েছে!`);
        catInput.value = "";
        window.location.reload();
    } catch(err) {
        alert("ক্যাটাগরি সেভ করতে সমস্যা হয়েছে।");
    }
}

// 📥 ডাটাবেজ থেকে ক্যাটাগরি ও প্রোডাক্ট রিড করা
async function fetchProducts() {
    try {
        // প্রথমে ডাটাবেজ থেকে কাস্টম ক্যাটাগরি লোড করা
        const catRes = await fetch(catURL);
        const catData = await catRes.json();
        if(catData) {
            activeCategories = ["Smart Watch", "Earbuds", "Power Bank", "Adapter"]; // রিসেট
            Object.keys(catData).forEach(k => {
                if(!activeCategories.includes(catData[k].name)) {
                    activeCategories.push(catData[k].name);
                }
            });
        }
        
        // প্রোডাক্ট লোড করা
        const res = await fetch(dbURL);
        const data = await res.json();
        allProductsData = data || {}; 
        
        renderCategoryWiseColumns(); // নতুন কলাম ভিত্তিক রেন্ডারার কল
        renderAdminGrid(); 
        updateCategoryDropdowns(); // ফর্মের ড্রপডাউন আপডেট
    } catch (err) {
        console.error("ডাটা লোড করতে সমস্যা:", err);
    }
}

// 🔄 প্রোডাক্ট আপলোড ও এডিট ফর্মের ক্যাটাগরি ড্রপডাউন ডাইনামিক করা
function updateCategoryDropdowns() {
    const prodCat = document.getElementById('prodCategory');
    const editProdCat = document.getElementById('editProdCategory');
    
    if(prodCat) {
        prodCat.innerHTML = activeCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    if(editProdCat) {
        editProdCat.innerHTML = activeCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

// 📦 কাস্টমার পেজে ক্যাটাগরি ভিত্তিক কলাম/সেকশন রেন্ডার করা (শুধু প্রোডাক্ট সোয়াইপ হবে)
function renderCategoryWiseColumns() {
    const mainGrid = document.getElementById('products-container'); 
    if (!mainGrid) return;
    mainGrid.innerHTML = ""; // আগের কন্টেন্ট ক্লিয়ার

    // প্রতিটি ক্যাটাগরির জন্য আলাদা আলাদা সেকশন তৈরি
    activeCategories.forEach(category => {
        let categoryHTML = `
            <div class="category-section" id="sec-${category.replace(/\s+/g, '-')}">
                <div class="category-title">${category}</div>
                <div class="products-horizontal-grid" id="grid-${category.replace(/\s+/g, '-')}">
        `;
        
        let hasProduct = false;

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
                variantHTML = `<div class="variant-dots" style="display:flex; gap:6px; margin: 10px 0; justify-content: flex-start;">`;
                colorKeys.forEach(color => {
                    const vPrice = prod.variants[color].price;
                    const vImg = prod.variants[color].image;
                    variantHTML += `
                        <button onclick="changeCustomerVariant('${key}', '${color}', '${vImg}', ${vPrice}); event.stopPropagation();" 
                            style="background: ${color.toLowerCase()}; width:18px; height:18px; border-radius:50%; border:2px solid #e2e8f0; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" title="${color}">
                        </button>`;
                });
                variantHTML += `</div>`;
            }

            categoryHTML += `
                <div class="product-card" style="border:1px solid #e2e8f0; padding:15px; border-radius:12px; background:#fff; cursor:pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s;" onclick="window.open('product.html?id=${key}', '_blank')">
                    <div style="width:100%; height:180px; overflow:hidden; border-radius:8px; background: #f8fafc;">
                        <img id="cust-img-${key}" src="${defaultImage}" style="width:100%; height:100%; object-fit:contain;">
                    </div>
                    <h3 style="font-size:15px; margin:10px 0 5px 0; color:#1e293b; text-align: left; font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prod.name}</h3>
                    <p style="font-weight:700; color:#c5a059; font-size:16px; margin:0; text-align: left;" id="cust-price-${key}">৳ ${defaultPrice}</p>
                    ${variantHTML}
                    <button onclick="addToCart('${key}', '${prod.name}', document.getElementById('cust-price-${key}').innerText); event.stopPropagation();" style="width:100%; background:#0f2635; color:#c5a059; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:700; margin-top:10px;">Add to Cart</button>
                </div>`;
        });

        categoryHTML += `
                </div>
            </div>
        `;

        // যদি ক্যাটাগরিতে প্রোডাক্ট থাকে তবেই কেবল স্ক্রিনে কলামটি দেখাবে
        if (hasProduct) {
            mainGrid.innerHTML += categoryHTML;
        }
    });
}

// 🔄 ট্যাব ক্লিকে নির্দিষ্ট ক্যাটাগরি সেকশনে স্ক্রল করে নিয়ে যাওয়ার ফাংশন
function switchCategory(categoryName, element) {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(element) element.classList.add('active');
    
    if(categoryName === 'All') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const targetSec = document.getElementById(`sec-${categoryName.replace(/\s+/g, '-')}`);
        if(targetSec) {
            targetSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// 🔄 ভ্যারিয়েন্ট ক্লিকে ইমেজ ও প্রাইস পরিবর্তনের ফাংশন
function changeCustomerVariant(id, colorName, imgUrl, price) {
    selectedVariantsGlobal[id] = colorName;
    const imgElement = document.getElementById(`cust-img-${id}`);
    const priceElement = document.getElementById(`cust-price-${id}`);
    if (imgElement) imgElement.src = imgUrl;
    if (priceElement) priceElement.innerText = `৳ ${price}`;
}

// ➕ ভ্যারিয়েন্ট রো এবং অ্যাডমিন ম্যানেজমেন্টের বাকি ফাংশনগুলো অপরিবর্তিত থাকবে...
function addVariantRow() {
    const container = document.getElementById('variantContainer');
    const div = document.createElement('div');
    div.className = 'variant-row';
    div.innerHTML = `
        <input type="text" class="v-name" placeholder="Color Name" style="flex:1;" required>
        <input type="number" class="v-price" placeholder="Price (৳)" style="width:80px;" required>
        <input type="file" class="v-file" accept="image/*" style="width:150px;" required>
        <button type="button" onclick="this.parentElement.remove()" style="background:red; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">X</button>
    `;
    container.appendChild(div);
}

function addEditVariantRow(color = '', price = '', oldImg = '') {
    const container = document.getElementById('editVariantContainer');
    const div = document.createElement('div');
    div.className = 'variant-row';
    div.innerHTML = `
        <input type="text" class="edit-v-name" value="${color}" placeholder="Color" style="flex:1;" required>
        <input type="number" class="edit-v-price" value="${price}" placeholder="Price" style="width:80px;" required>
        <input type="hidden" class="edit-v-old-img" value="${oldImg}">
        <input type="file" class="edit-v-file" accept="image/*" style="width:130px;">
        ${oldImg ? `<img src="${oldImg}" style="width:30px; height:30px; object-fit:cover; border-radius:4px;">` : ''}
        <button type="button" onclick="this.parentElement.remove()" style="background:red; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">X</button>
    `;
    container.appendChild(div);
}

async function uploadToImgBB(fileInput) {
    if (!fileInput || !fileInput.files[0]) return null;
    const formData = new FormData();
    formData.append("image", fileInput.files[0]);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`, { method: "POST", body: formData });
        const result = await response.json();
        if (result.success) return result.data.url;
        return null;
    } catch (err) { return null; }
}

async function uploadProductWithImages() {
    const name = document.getElementById('prodName').value;
    const price = parseInt(document.getElementById('prodPrice').value);
    const category = document.getElementById('prodCategory').value;
    const video = document.getElementById('prodVideo').value;
    const details = document.getElementById('prodDetails').value;
    const mainImgFile = document.getElementById('prodMainImageFile');

    if (!name || !price || !mainImgFile.files[0]) {
        alert("দয়া করে নাম, বেস প্রাইস এবং মেইন ছবি সিলেক্ট করুন!");
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    if(submitBtn) { submitBtn.innerText = "Uploading Please Wait..."; submitBtn.disabled = true; }
    const mainImageUrl = await uploadToImgBB(mainImgFile);
    
    if(!mainImageUrl) {
        alert("মেইন ছবি আপলোড ফেইল হয়েছে!");
        if(submitBtn) { submitBtn.innerText = "Save & Upload Product"; submitBtn.disabled = false; }
        return;
    }

    const variantRows = document.querySelectorAll('#variantContainer .variant-row');
    let variantsData = {};
    for (let row of variantRows) {
        const colorName = row.querySelector('.v-name').value;
        const colorPrice = parseInt(row.querySelector('.v-price').value);
        const colorFile = row.querySelector('.v-file');
        if (colorName && colorPrice && colorFile.files[0]) {
            const uploadedUrl = await uploadToImgBB(colorFile);
            if (uploadedUrl) variantsData[colorName] = { image: uploadedUrl, price: colorPrice };
        }
    }

    const newProduct = { name, price, category, mainImage: mainImageUrl, video, details, variants: Object.keys(variantsData).length > 0 ? variantsData : null };

    fetch(dbURL, { method: "POST", body: JSON.stringify(newProduct), headers: { "Content-Type": "application/json" } })
    .then(() => { alert("🎉 প্রোডাক্ট সফলভাবে আপলোড হয়েছে!"); window.location.reload(); });
}

function renderAdminGrid() {
    const adminGrid = document.getElementById('adminProductsGrid');
    if (!adminGrid) return;
    adminGrid.innerHTML = "";
    Object.keys(allProductsData).forEach(key => {
        const prod = allProductsData[key];
        adminGrid.innerHTML += `
            <div class="admin-prod-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ddd; background: #fff; margin-bottom: 8px; border-radius: 6px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${prod.mainImage}" style="width:45px; height:45px; object-fit:cover; border-radius: 4px;">
                    <div><h4 style="margin:0; font-size:13px;">${prod.name}</h4><p style="margin:0; color:#b59449; font-weight:bold; font-size:12px;">৳ ${prod.price}</p></div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="openEditModal('${key}')" style="background:#0f2635; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px;">✏️ Edit</button>
                    <button onclick="deleteProduct('${key}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px;">❌ Delete</button>
                </div>
            </div>`;
    });
}

async function openEditModal(productId) {
    const prod = allProductsData[productId];
    if (!prod) return;
    document.getElementById('editProductId').value = productId;
    document.getElementById('editProdName').value = prod.name || '';
    document.getElementById('editProdPrice').value = prod.price || 0;
    document.getElementById('editProdCategory').value = prod.category || '';
    document.getElementById('editProdVideo').value = prod.video || '';
    document.getElementById('editProdDetails').value = prod.details || '';
    const editContainer = document.getElementById('editVariantContainer');
    editContainer.innerHTML = '';
    if (prod.variants) {
        Object.keys(prod.variants).forEach(color => { addEditVariantRow(color, prod.variants[color].price, prod.variants[color].image); });
    }
    document.getElementById('editModal').style.display = 'flex';
}

async function updateProductComplete() {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editProdName').value;
    const price = parseInt(document.getElementById('editProdPrice').value);
    const category = document.getElementById('editProdCategory').value;
    const video = document.getElementById('editProdVideo').value;
    const details = document.getElementById('editProdDetails').value;
    const rows = document.querySelectorAll('#editVariantContainer .variant-row');
    let updatedVariants = {};

    for (let row of rows) {
        const vName = row.querySelector('.edit-v-name').value;
        const vPrice = parseInt(row.querySelector('.edit-v-price').value) || price;
        const fileInput = row.querySelector('.edit-v-file');
        const oldImg = row.querySelector('.edit-v-old-img').value;
        let finalImg = oldImg;
        if (fileInput.files.length > 0) {
            const newImgUrl = await uploadToImgBB(fileInput);
            if (newImgUrl) finalImg = newImgUrl;
        }
        if (vName) updatedVariants[vName] = { image: finalImg, price: vPrice };
    }

    const finalData = { ...allProductsData[id], name, price, category, video, details, variants: Object.keys(updatedVariants).length > 0 ? updatedVariants : null };
    fetch(`https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products/${id}.json`, { method: "PUT", body: JSON.stringify(finalData) })
    .then(() => { alert("🎉 আপডেট সফল হয়েছে!"); window.location.reload(); });
}

function deleteProduct(productId) {
    if (confirm("আপনি কি নিশ্চিত যে ডিলিট করতে চান?")) {
        fetch(`https://bismillah-gadget-zone-bd-default-rtdb.firebaseio.com/products/${productId}.json`, { method: "DELETE" })
        .then(() => { alert("🗑️ ডিলিট করা হয়েছে!"); window.location.reload(); });
    }
}

// প্রোফাইল পরিবর্তন
async function handleCredentialChange(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const currentInputPass = document.getElementById('currentPass').value;
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    try {
        const res = await fetch(authURL);
        const credentials = await res.json();
        if (currentInputPass !== credentials.pass) { alert("❌ বর্তমান পাসওয়ার্ডটি ভুল!"); return; }
        await fetch(authURL, { method: "PUT", body: JSON.stringify({ user: newUsername, pass: newPassword }), headers: { "Content-Type": "application/json" } });
        alert("🎉 সফলভাবে পরিবর্তিত হয়েছে! আবার লগইন করুন।");
        sessionStorage.removeItem("adminLoggedIn");
        window.location.reload();
    } catch (err) { alert("ডাটাবেজ কানেকশন সমস্যা!"); }
}

// রান টাইম ইনিশিয়েট
fetchProducts();

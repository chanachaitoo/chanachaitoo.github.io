const API_URL = "https://script.google.com/macros/s/AKfycbwkamDi4BSVjWb562p6iX2BiIPCm_K_ZoUEbnGNp8L_HnAP2X61df607Qx7GwkMrrtC/exec";

// Global scope wrapper to prevent conflict
(function() {
    // ตัวแปรหลัก
    let allProducts = [];
    let allGameTags = []; 
    let gameTagsMap = {}; 
    let activeTagIds = new Set(); 
    let filteredAndSortedProducts = [];
    let currentFilter = 'all';
    let isDraggingCategory = false;
    
    // ตัวแปรสำหรับ Auto Update
    let updateInterval = null;
    const UPDATE_DELAY_MS = 10000; // อัพเดททุก 10 วินาที
    
    // DOM Elements
    const grid = document.getElementById('product-grid');
    const searchInput = document.getElementById('home-search-input');
    const searchClearBtn = document.getElementById('home-search-clear-btn');
    const hideOutOfStockCheckbox = document.getElementById('hide-out-of-stock-checkbox');
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    const categoryFilterContainer = document.getElementById('category-filter-container');
    const searchContainerBox = document.getElementById('home-search-container-box');
    
    // --- Helper Functions ---

    function formatQuantityToK(quantity) {
        const num = Number(quantity);
        if (num < 1000) return num.toLocaleString('th-TH');
        const valueInK = num / 1000;
        return valueInK.toFixed(1).replace(/\.0$/, '') + 'K';
    }

    function getOptimizedImageUrl(url) {
        if (!url) return 'https://placehold.co/400x400/F1F3F4/5F6368?text=No+Image';
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            let id = '';
            const parts = url.split('/');
            const dIndex = parts.indexOf('d');
            if (dIndex !== -1 && parts[dIndex + 1]) {
                id = parts[dIndex + 1];
            } else {
                try {
                    const urlObj = new URL(url);
                    id = urlObj.searchParams.get('id');
                } catch(e) {
                    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
                    if (match) id = match[1];
                }
            }
            if (id) {
                return `https://wsrv.nl/?url=${encodeURIComponent(`https://drive.google.com/uc?id=${id}`)}&w=400&q=80&output=webp`;
            }
        }
        if (!url.startsWith('http')) return url;
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&q=80&output=webp`;
    }

    function renderSkeletonLoading() {
        if(!grid) return;
        let skeletonHTML = '';
        for (let i = 0; i < 8; i++) {
            skeletonHTML += `
                <div class="product-card skeleton-card">
                    <div class="product-image-container skeleton-shimmer"></div>
                    <div class="product-info">
                        <div class="skeleton-text skeleton-title skeleton-shimmer"></div>
                        <div class="price-and-tags-row">
                            <div class="skeleton-text skeleton-price skeleton-shimmer"></div>
                            <div class="skeleton-text skeleton-tag skeleton-shimmer"></div>
                        </div>
                        <div class="skeleton-text skeleton-footer skeleton-shimmer"></div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = skeletonHTML;
    }

    // --- Core Logic ---

    function filterAndSortProducts() {
        if(!searchInput) return;
        
        const rawSearchTerm = searchInput.value.toLowerCase().trim();
        const selectedCategoryCustomId = currentFilter;
        const hideOutOfStock = hideOutOfStockCheckbox ? hideOutOfStockCheckbox.checked : false;

        const searchTerms = rawSearchTerm.split(',').map(s => s.trim()).filter(s => s.length > 0);

        let result = allProducts.filter(product => {
            // 1. กรองสินค้าหมด
            if (hideOutOfStock && Number(product.quantity) <= 0) return false;

            // 2. กรองตามคำค้นหา
            if (searchTerms.length > 0) {
                const productName = product.name.toLowerCase();
                const match = searchTerms.some(term => productName.includes(term));
                if (!match) return false;
            }

            // 3. กรองตามหมวดหมู่
            if (selectedCategoryCustomId !== 'all') {
                const productTags = parseTags(product.tags);
                const categoryName = selectedCategoryCustomId; 
                if (!productTags.includes(categoryName)) {
                    return false;
                }
            }
            return true;
        });

        filteredAndSortedProducts = result.sort((a, b) => Number(a.price) - Number(b.price));
    }

    function updateDisplay() {
        if (!searchInput) return;

        if (searchInput.value.trim().length > 0) {
            if(searchClearBtn) searchClearBtn.classList.remove('hidden');
        } else {
            if(searchClearBtn) searchClearBtn.classList.add('hidden');
        }

        filterAndSortProducts();
        
        if(!grid) return;
        
        if (filteredAndSortedProducts.length === 0) {
            grid.innerHTML = `
                <div id="message-container">
                    <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <div class="empty-state-title">ไม่พบสินค้า</div>
                    <div class="empty-state-subtitle">ลองค้นหาด้วยคำอื่น หรือเปลี่ยนหมวดหมู่</div>
                </div>
            `;
            return;
        }

        const displayProducts = filteredAndSortedProducts;
        grid.innerHTML = '';
        renderProducts(displayProducts);
    }

    function renderProducts(products) {
        products.forEach((product) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // เพิ่ม ID ให้กับการ์ดเพื่อให้อัพเดทเฉพาะจุดได้
            card.dataset.productId = product.customId; 
            
            const isOutOfStock = Number(product.quantity) <= 0;
            if (isOutOfStock) card.classList.add('out-of-stock');
            
            const formattedPrice = Number(product.price).toLocaleString('th-TH');
            const displayQty = isOutOfStock ? 0 : Number(product.quantity);
            
            const tagNames = parseTags(product.tags);

            let tagsHtml = '';
            if (tagNames.length > 0) {
                tagsHtml = '<div class="product-tags-container">';
                const visibleTags = tagNames.slice(0, 1);
                visibleTags.forEach(name => tagsHtml += `<span class="product-tag">${name}</span>`);
                if (tagNames.length > 1) {
                    tagsHtml += `<button class="more-tags-btn" data-product-name="${product.name}" data-all-tags='${JSON.stringify(tagNames)}'>+</button>`;
                }
                tagsHtml += '</div>';
            }

            const outOfStockOverlay = isOutOfStock ? 
                `<div class="out-of-stock-overlay"><div class="out-of-stock-text">สินค้าหมด</div></div>` : '';

            card.innerHTML = `
                <div class="product-image-container skeleton-shimmer">
                    <img src="${getOptimizedImageUrl(product.imageUrl)}" 
                        class="product-image" 
                        alt="${product.name}" 
                        loading="lazy"
                        onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-shimmer');"
                        onerror="this.parentElement.classList.remove('skeleton-shimmer'); this.src='https://placehold.co/400x400/F1F3F4/5F6368?text=No+Image'; this.classList.add('loaded');">
                    ${outOfStockOverlay}
                </div>
                <div class="product-info">
                    <h2 class="product-name">${product.name}</h2>
                    <div class="price-and-tags-row">
                        <div class="product-price">฿${formattedPrice}</div>
                        ${tagsHtml}
                    </div>
                    <div class="product-details">
                        <span class="product-quantity">คงเหลือ : 
                            <span class="quantity-full">${displayQty.toLocaleString('th-TH')}</span>
                            <span class="quantity-k">${formatQuantityToK(displayQty)}</span>
                        </span>
                        <span>${product.unit}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // --- Real-time Update Logic ---

    function startAutoUpdate() {
        if (updateInterval) clearInterval(updateInterval);
        // เรียก loadData แบบ Background Update ทุกๆ 10 วินาที
        updateInterval = setInterval(() => {
            loadData(true);
        }, UPDATE_DELAY_MS);
    }

    // ฟังก์ชันสำหรับอัพเดทเฉพาะตัวเลขบนหน้าจอ (ไม่รีเฟรชทั้ง Grid)
    function updateVisibleStocks() {
        allProducts.forEach(product => {
            // หาการ์ดที่มี ID ตรงกันในหน้าจอ
            const card = document.querySelector(`.product-card[data-product-id="${product.customId}"]`);
            
            if (card) {
                const newQty = Number(product.quantity);
                const isOutOfStock = newQty <= 0;
                
                // 1. อัพเดทสถานะสินค้าหมด (Class & Overlay)
                const imgContainer = card.querySelector('.product-image-container');
                const existingOverlay = card.querySelector('.out-of-stock-overlay');

                if (isOutOfStock) {
                    card.classList.add('out-of-stock');
                    if (!existingOverlay && imgContainer) {
                        const overlay = document.createElement('div');
                        overlay.className = 'out-of-stock-overlay';
                        overlay.innerHTML = '<div class="out-of-stock-text">สินค้าหมด</div>';
                        imgContainer.appendChild(overlay);
                    }
                } else {
                    card.classList.remove('out-of-stock');
                    if (existingOverlay) existingOverlay.remove();
                }

                // 2. อัพเดทตัวเลขจำนวน
                const qtyFullEl = card.querySelector('.quantity-full');
                const qtyKEl = card.querySelector('.quantity-k');
                const displayQty = isOutOfStock ? 0 : newQty;

                if (qtyFullEl) qtyFullEl.innerText = displayQty.toLocaleString('th-TH');
                if (qtyKEl) qtyKEl.innerText = formatQuantityToK(displayQty);
            }
        });
        
        // ถ้ามีการติ๊ก "ซ่อนสินค้าหมด" ไว้ ให้เรียก filter ใหม่เพื่อให้สินค้าที่เพิ่งหมดหายไป
        if (hideOutOfStockCheckbox && hideOutOfStockCheckbox.checked) {
            // เช็คว่ามีสินค้าที่เพิ่งหมดแล้วต้องซ่อนหรือไม่ ถ้ามีค่อยรีเฟรช Grid
            // แต่เพื่อ UX ที่ดี การรีเฟรช Grid เงียบๆ อาจจะดีกว่า
            // filterAndSortProducts(); // เรียกสิ่งนี้อาจทำให้ลำดับกระตุกถ้าไม่จำเป็น
        }
    }

    function parseTags(tagsString) {
        if (!tagsString) return [];
        if (Array.isArray(tagsString)) return tagsString;
        return String(tagsString).split(',').map(t => t.trim()).filter(Boolean);
    }

    function calculateActiveTags() {
        activeTagIds.clear();
        allProducts.forEach(p => {
            const ids = parseTags(p.tags); 
            ids.forEach(id => activeTagIds.add(id));
        });
        
        allGameTags = Array.from(activeTagIds).map(tag => ({
            customId: tag,
            tagName: tag
        })).sort((a, b) => a.tagName.localeCompare(b.tagName, 'th'));
        
        renderCategoryChips();
    }

    function renderCategoryChips() {
        if(!categoryFilterContainer) return;
        categoryFilterContainer.innerHTML = '';
        
        const allBtn = document.createElement('button');
        allBtn.className = 'category-chip active';
        if (currentFilter !== 'all') allBtn.classList.remove('active');
        
        allBtn.textContent = 'ทั้งหมด';
        allBtn.dataset.value = 'all';
        allBtn.onclick = () => selectCategory(allBtn);
        categoryFilterContainer.appendChild(allBtn);

        allGameTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'category-chip';
            if (currentFilter === tag.customId) btn.classList.add('active');
            
            btn.textContent = tag.tagName; 
            btn.dataset.value = tag.customId; 
            btn.onclick = () => selectCategory(btn);
            categoryFilterContainer.appendChild(btn);
        });
    }

    function selectCategory(btnElement) {
        if (isDraggingCategory) return;

        document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');

        currentFilter = btnElement.dataset.value;
        updateDisplay(); 
    }

    function onInitialDataLoaded() {
        if(searchContainerBox) searchContainerBox.classList.remove('skeleton-shimmer');
        if(searchInput) {
            searchInput.disabled = false;
            searchInput.placeholder = "ค้นหาชื่อสินค้า (คั่นด้วย , เพื่อหาหลายคำ)";
        
            if (!searchInput.dataset.ready) {
                searchInput.addEventListener('input', () => updateDisplay()); 
                if(searchClearBtn) {
                    searchClearBtn.addEventListener('click', () => {
                        searchInput.value = '';
                        searchInput.focus();
                        updateDisplay();
                    });
                }
                if(hideOutOfStockCheckbox) hideOutOfStockCheckbox.addEventListener('change', () => updateDisplay());
                setupTagsPopup();
                setupScrollToTopButton();
                setupCategoryScrolling();
                
                window.addEventListener('resize', () => {});

                searchInput.dataset.ready = "true";
            }
        }
        updateDisplay();
        
        // เริ่มระบบ Auto Update หลังจากโหลดครั้งแรกเสร็จ
        startAutoUpdate();
    }

    // เพิ่ม Parameter isBackgroundUpdate เพื่อแยกว่าเป็นการโหลดครั้งแรก หรือโหลดเพื่ออัพเดท
    async function loadData(isBackgroundUpdate = false) {
        if (!isBackgroundUpdate) renderSkeletonLoading();

        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            
            let items = [];
            if (Array.isArray(data)) {
                items = data;
            } else if (data.data && Array.isArray(data.data)) {
                items = data.data;
            }

            // แปลงข้อมูลใหม่
            const newProducts = items.map((d, index) => {
                return {
                    id: d.id || `prod_${index}`,
                    customId: d.customId || d.id || `prod_${index}`,
                    name: d.name || d.productName || 'ไม่มีชื่อ',
                    price: d.price || 0,
                    quantity: d.stock || d.quantity || 0,
                    imageUrl: d.imageUrl || d.imgUrl || d.img || d.image || '',
                    tags: d.tags || '', 
                    unit: d.unit || 'ชิ้น',
                    type: d.type || 'ไอเทม'
                };
            }).filter(p => p.type === 'ไอเทม');

            // อัพเดทข้อมูลในตัวแปรหลัก
            allProducts = newProducts;

            if (!isBackgroundUpdate) {
                // ถ้าเป็นการโหลดครั้งแรก ให้ทำกระบวนการปกติ
                calculateActiveTags();
                onInitialDataLoaded();
            } else {
                // ถ้าเป็นการอัพเดทเบื้องหลัง ให้เรียกฟังก์ชันอัพเดทเฉพาะจุด
                updateVisibleStocks();
            }

        } catch (error) {
            console.error("Error loading products:", error);
            if (!isBackgroundUpdate && grid) {
                grid.innerHTML = `<div id="message-container">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
            }
        }
    }

    // --- UI Utilities ---

    function setupTagsPopup() {
        const overlay = document.getElementById('tags-popup-overlay');
        const contentList = document.getElementById('tags-popup-list');
        const nameLabel = document.getElementById('popup-product-name');

        if(!grid) return;

        grid.addEventListener('click', e => {
            const btn = e.target.closest('.more-tags-btn');
            if (btn) {
                const name = btn.dataset.productName;
                const tags = JSON.parse(btn.dataset.allTags);
                
                nameLabel.textContent = name;
                contentList.innerHTML = '';
                tags.forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'product-tag';
                    span.textContent = t;
                    contentList.appendChild(span);
                });
                overlay.classList.add('show');
                document.body.classList.add('no-scroll');
            }
        });

        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('show');
                document.body.classList.remove('no-scroll');
            }
        });
    }

    function setupScrollToTopButton() {
        if(!scrollToTopBtn) return;
        window.addEventListener('scroll', () => {
            scrollToTopBtn.style.display = (window.scrollY > 100) ? 'flex' : 'none';
        });
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    function setupCategoryScrolling() {
        const slider = categoryFilterContainer;
        if(!slider) return;
        
        let isDown = false;
        let startX, scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            isDraggingCategory = false;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
            setTimeout(() => isDraggingCategory = false, 0);
        });
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
            if (Math.abs(walk) > 5) isDraggingCategory = true;
        });
    }

    // Start App
    loadData();

})();
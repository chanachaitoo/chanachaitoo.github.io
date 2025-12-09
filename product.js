const API_URL = "https://script.google.com/macros/s/AKfycbwkamDi4BSVjWb562p6iX2BiIPCm_K_ZoUEbnGNp8L_HnAP2X61df607Qx7GwkMrrtC/exec";
const STORAGE_KEY = 'site_product_cache_v1';

(function() {
    let allProducts = [];
    let allGameTags = []; 
    let activeTagIds = new Set(); 
    let filteredAndSortedProducts = [];
    let currentFilter = 'all';
    let isDraggingCategory = false;
    
    let updateInterval = null;
    const UPDATE_DELAY_MS = 10000;
    
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
            if (hideOutOfStock && Number(product.quantity) <= 0) return false;

            if (searchTerms.length > 0) {
                const productName = product.name.toLowerCase();
                const match = searchTerms.some(term => productName.includes(term));
                if (!match) return false;
            }

            if (selectedCategoryCustomId !== 'all') {
                const productTags = parseTags(product.tags);
                if (!productTags.includes(selectedCategoryCustomId)) {
                    return false;
                }
            }
            return true;
        });

        filteredAndSortedProducts = result.sort((a, b) => Number(a.price) - Number(b.price));
    }

    // --- NEW: Smart Rendering Function (หัวใจหลักที่แก้ภาพกระพริบ) ---
    function updateDisplay() {
        if (!searchInput) return;

        // Toggle Clear Button
        if (searchInput.value.trim().length > 0) {
            if(searchClearBtn) searchClearBtn.classList.remove('hidden');
        } else {
            if(searchClearBtn) searchClearBtn.classList.add('hidden');
        }

        filterAndSortProducts();
        
        if(!grid) return;
        
        const displayProducts = filteredAndSortedProducts;

        // กรณีไม่พบสินค้า
        if (displayProducts.length === 0) {
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

        // ลบข้อความ "ไม่พบสินค้า" ถ้ามีอยู่
        const msgContainer = grid.querySelector('#message-container');
        if (msgContainer) msgContainer.remove();

        // 1. เก็บรายการการ์ดที่มีอยู่เดิมบนหน้าจอลง Map เพื่อค้นหาเร็วๆ
        const existingCards = Array.from(grid.querySelectorAll('.product-card'));
        const existingCardMap = new Map();
        existingCards.forEach(card => {
            if(card.dataset.productId) {
                existingCardMap.set(card.dataset.productId, card);
            } else {
                card.remove(); // ลบการ์ดขยะที่ไม่มี ID (เช่น skeleton)
            }
        });

        // 2. วนลูปสินค้าที่จะแสดง และจัดการ DOM
        displayProducts.forEach(product => {
            let card = existingCardMap.get(product.customId);

            if (card) {
                // A. มีการ์ดนี้อยู่แล้ว: ย้ายตำแหน่งไปท้ายสุด (ซึ่งจะเรียงลำดับใหม่ตาม Loop)
                // การ appendChild element ที่มีอยู่แล้ว จะเป็นการ "ย้าย" ไม่ใช่สร้างใหม่ (รูปไม่กระพริบ)
                grid.appendChild(card);
                
                // อัพเดทข้อมูลภายในการ์ด (เผื่อมีการเปลี่ยนแปลง Realtime)
                updateCardContent(card, product);
                
                // ลบออกจาก Map เพื่อให้รู้ว่าตัวนี้ถูกใช้ไปแล้ว
                existingCardMap.delete(product.customId);
            } else {
                // B. ยังไม่มีการ์ดนี้: สร้างใหม่
                card = createProductCard(product);
                grid.appendChild(card);
            }
        });

        // 3. ลบการ์ดที่เหลือใน Map ทิ้ง (คือการ์ดที่ไม่อยู่ในผลการค้นหาแล้ว)
        existingCardMap.forEach(card => card.remove());
    }

    // สร้าง Element การ์ดสินค้าใหม่
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.customId;
        
        // Render เนื้อหาภายในครั้งแรก
        // (โครงสร้างเหมือนเดิม แต่แยกฟังก์ชันออกมาเพื่อให้เรียกใช้ซ้ำได้)
        renderCardInnerHtml(card, product);
        
        return card;
    }

    // ฟังก์ชันสร้าง/อัพเดท HTML ภายในการ์ด
    function renderCardInnerHtml(card, product) {
        const isOutOfStock = Number(product.quantity) <= 0;
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

        // เช็คว่าเคยมีรูปภาพอยู่แล้วไหม (เพื่อกันรูปกระพริบถ้าเราแค่จะอัพเดท text)
        const existingImg = card.querySelector('.product-image');
        const imgUrl = getOptimizedImageUrl(product.imageUrl);
        let imgHtml = '';
        
        if (existingImg && existingImg.src === imgUrl) {
            // ถ้ารูปเดิม URL เดิม ให้ใช้ HTML เดิม (แต่ต้องระวังเรื่อง skeleton)
            imgHtml = card.querySelector('.product-image-container').innerHTML;
        } else {
            imgHtml = `
                <img src="${imgUrl}" 
                    class="product-image" 
                    alt="${product.name}" 
                    loading="lazy"
                    onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-shimmer');"
                    onerror="this.parentElement.classList.remove('skeleton-shimmer'); this.src='https://placehold.co/400x400/F1F3F4/5F6368?text=No+Image'; this.classList.add('loaded');">
                ${outOfStockOverlay}
            `;
        }

        card.innerHTML = `
            <div class="product-image-container ${existingImg ? '' : 'skeleton-shimmer'}">
                ${imgHtml}
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
        
        // Update Class Status
        if (isOutOfStock) card.classList.add('out-of-stock');
        else card.classList.remove('out-of-stock');
    }

    // ฟังก์ชันอัพเดทเฉพาะข้อมูล (Text/Number) โดยไม่แตะต้องรูปภาพหากไม่จำเป็น
    function updateCardContent(card, product) {
        const newQty = Number(product.quantity);
        const isOutOfStock = newQty <= 0;
        
        // 1. Update Stock Class & Overlay
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

        // 2. Update Text Fields
        const qtyFullEl = card.querySelector('.quantity-full');
        const qtyKEl = card.querySelector('.quantity-k');
        const displayQty = isOutOfStock ? 0 : newQty;

        if (qtyFullEl && qtyFullEl.innerText !== displayQty.toLocaleString('th-TH')) {
            qtyFullEl.innerText = displayQty.toLocaleString('th-TH');
        }
        if (qtyKEl) {
            const kVal = formatQuantityToK(displayQty);
            if(qtyKEl.innerText !== kVal) qtyKEl.innerText = kVal;
        }

        const priceEl = card.querySelector('.product-price');
        const newFormattedPrice = `฿${Number(product.price).toLocaleString('th-TH')}`;
        if (priceEl && priceEl.innerText !== newFormattedPrice) {
            priceEl.innerText = newFormattedPrice;
        }

        const nameEl = card.querySelector('.product-name');
        if (nameEl && nameEl.innerText !== product.name) {
            nameEl.innerText = product.name;
        }
    }

    // --- Real-time Logic ---

    function startAutoUpdate() {
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            loadData(true);
        }, UPDATE_DELAY_MS);
    }

    function handleRealtimeUpdate() {
        // ใช้ updateDisplay ตัวใหม่ซึ่งจัดการ Diffing ให้แล้ว
        // ดังนั้นเมื่อเรียก updateDisplay ระบบจะอัพเดทเฉพาะส่วนที่เปลี่ยนให้อัตโนมัติ
        updateDisplay();
    }

    // --- Standard Utils ---

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
        const previousSelection = currentFilter;

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
        startAutoUpdate();
    }

    function processRawData(items) {
        return items.map((d, index) => {
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
    }

    async function loadData(isBackgroundUpdate = false) {
        if (!isBackgroundUpdate) {
            const cachedData = localStorage.getItem(STORAGE_KEY);
            if (cachedData) {
                try {
                    allProducts = processRawData(JSON.parse(cachedData));
                    calculateActiveTags();
                    onInitialDataLoaded();
                } catch (e) {
                    renderSkeletonLoading();
                }
            } else {
                renderSkeletonLoading();
            }
        }

        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            
            let items = [];
            if (Array.isArray(data)) items = data;
            else if (data.data && Array.isArray(data.data)) items = data.data;

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            } catch (e) {}

            allProducts = processRawData(items);

            if (!isBackgroundUpdate) {
                calculateActiveTags();
                onInitialDataLoaded();
            } else {
                handleRealtimeUpdate();
            }

        } catch (error) {
            if (!isBackgroundUpdate && allProducts.length === 0 && grid) {
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

    loadData();

})();
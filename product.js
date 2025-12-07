const API_URL = "https://script.google.com/macros/s/AKfycbwkamDi4BSVjWb562p6iX2BiIPCm_K_ZoUEbnGNp8L_HnAP2X61df607Qx7GwkMrrtC/exec";

// Global scope wrapper to prevent conflict
(function() {
    // ตัวแปรหลัก
    let allProducts = [];
    let allGameTags = []; // สร้างจากสินค้าโดยตรง
    let gameTagsMap = {}; // Map: customId -> tagName
    let activeTagIds = new Set(); // เก็บ ID ของ tag ที่มีสินค้าใช้อยู่จริง
    let filteredAndSortedProducts = [];
    let currentFilter = 'all';
    let isDraggingCategory = false;
    
    // Pagination / "Show More" variables
    let currentLimit = 0; // จำนวนสินค้าที่แสดงอยู่ในปัจจุบัน

    // DOM Elements
    const grid = document.getElementById('product-grid');
    const searchInput = document.getElementById('home-search-input');
    const searchClearBtn = document.getElementById('home-search-clear-btn');
    const hideOutOfStockCheckbox = document.getElementById('hide-out-of-stock-checkbox');
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    const categoryFilterContainer = document.getElementById('category-filter-container');
    const searchContainerBox = document.getElementById('home-search-container-box');
    
    // Elements for "View More"
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    // --- Helper Functions ---

    function formatQuantityToK(quantity) {
        const num = Number(quantity);
        if (num < 1000) return num.toLocaleString('th-TH');
        const valueInK = num / 1000;
        return valueInK.toFixed(1).replace(/\.0$/, '') + 'K';
    }

    function getOptimizedImageUrl(url) {
        if (!url) return 'https://placehold.co/400x400/F1F3F4/5F6368?text=No+Image';
        // Check if it's a Google Drive link
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

    function getGridColumnCount() {
        if (!grid) return 2; 
        const gridStyle = window.getComputedStyle(grid);
        const gridTemplate = gridStyle.getPropertyValue('grid-template-columns');
        return gridTemplate.split(' ').length || 1;
    }

    function calculateTwoRowsLimit() {
        const columnCount = getGridColumnCount();
        return columnCount * 2; 
    }

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

            // 3. กรองตามหมวดหมู่ (Tags)
            if (selectedCategoryCustomId !== 'all') {
                const productTags = parseTags(product.tags);
                // ในกรณีนี้ customId คือชื่อ tag เลยเพราะเราเจนมาเอง
                const categoryName = selectedCategoryCustomId; 
                
                if (!productTags.includes(categoryName)) {
                    return false;
                }
            }

            return true;
        });

        // เรียงลำดับตามราคา (น้อยไปมาก)
        filteredAndSortedProducts = result.sort((a, b) => Number(a.price) - Number(b.price));
    }

    function updateDisplay(resetLimit = true) {
        if (!searchInput) return;

        // Show/Hide Clear Button
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
            if(loadMoreContainer) loadMoreContainer.classList.add('hidden');
            return;
        }

        if (resetLimit) {
            currentLimit = calculateTwoRowsLimit();
        }

        const displayProducts = filteredAndSortedProducts.slice(0, currentLimit);
        
        grid.innerHTML = '';
        renderProducts(displayProducts);

        if (loadMoreContainer) {
            if (filteredAndSortedProducts.length <= currentLimit) {
                loadMoreContainer.classList.add('hidden');
            } else {
                loadMoreContainer.classList.remove('hidden');
                const remaining = filteredAndSortedProducts.length - currentLimit;
                loadMoreBtn.innerHTML = `ดูเพิ่มเติม (${remaining}) <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>`;
            }
        }
    }

    function renderProducts(products) {
        products.forEach((product) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
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
        
        // สร้าง allGameTags จากสินค้าที่โหลดมาโดยตรง
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
        updateDisplay(true); // Reset limit when category changes
    }

    function setupLoadMoreButton() {
        if (loadMoreBtn) {
            // ลบ Event Listener เก่า (ถ้ามี) เพื่อป้องกันการกดเบิ้ล
            const newBtn = loadMoreBtn.cloneNode(true);
            loadMoreBtn.parentNode.replaceChild(newBtn, loadMoreBtn);
            
            newBtn.addEventListener('click', () => {
                const addedRowsLimit = calculateTwoRowsLimit();
                currentLimit += addedRowsLimit;
                updateDisplay(false); 
            });
        }
    }

    function onInitialDataLoaded() {
        if(searchContainerBox) searchContainerBox.classList.remove('skeleton-shimmer');
        if(searchInput) {
            searchInput.disabled = false;
            searchInput.placeholder = "ค้นหาชื่อสินค้า (คั่นด้วย , เพื่อหาหลายคำ)";
        
            if (!searchInput.dataset.ready) {
                searchInput.addEventListener('input', () => updateDisplay(true)); 
                if(searchClearBtn) {
                    searchClearBtn.addEventListener('click', () => {
                        searchInput.value = '';
                        searchInput.focus();
                        updateDisplay(true);
                    });
                }
                if(hideOutOfStockCheckbox) hideOutOfStockCheckbox.addEventListener('change', () => updateDisplay(true));
                setupTagsPopup();
                setupScrollToTopButton();
                setupCategoryScrolling();
                
                window.addEventListener('resize', () => {
                    // Resize logic if needed
                });

                searchInput.dataset.ready = "true";
            }
        }
        // Setup load more btn every time data is ready
        setupLoadMoreButton();
        updateDisplay(true);
    }

    async function loadData() {
        renderSkeletonLoading();

        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            
            // รองรับทั้งแบบ array ตรงๆ และแบบ { data: [...] }
            let items = [];
            if (Array.isArray(data)) {
                items = data;
            } else if (data.data && Array.isArray(data.data)) {
                items = data.data;
            }

            allProducts = items.map((d, index) => {
                // Map API fields to internal structure
                return {
                    id: d.id || `prod_${index}`,
                    customId: d.customId || d.id || `prod_${index}`,
                    name: d.name || d.productName || 'ไม่มีชื่อ',
                    price: d.price || 0,
                    quantity: d.stock || d.quantity || 0,
                    // แก้ไข: เพิ่ม d.imageUrl (จาก GAS) เข้าไปในเงื่อนไขการดึงรูป
                    imageUrl: d.imageUrl || d.imgUrl || d.img || d.image || '',
                    tags: d.tags || '', 
                    unit: d.unit || 'ชิ้น',
                    type: d.type || 'ไอเทม'
                };
            }).filter(p => p.type === 'ไอเทม'); // กรองเอาเฉพาะสินค้า

            calculateActiveTags();
            onInitialDataLoaded();

        } catch (error) {
            console.error("Error loading products:", error);
            if(grid) grid.innerHTML = `<div id="message-container">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
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
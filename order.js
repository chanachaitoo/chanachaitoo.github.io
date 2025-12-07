// Global scope wrapper
(function() {
    // API URL
    const API_URL = 'https://script.google.com/macros/s/AKfycbwygcJWfjcLXn3IB7QV4fmD0xSMSqfICob-TfkkEDcZlawkq1Z1qWqvGGiMIjOxL7jv/exec';

    // Config: รายชื่อเกมและรูปภาพ
    const GAME_CONFIG = {
        "Game-1": {
            name: "Chibi Planet",
            icon: "https://scontent.fnak3-1.fna.fbcdn.net/v/t39.30808-6/454034457_888216613326832_350146185151871213_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=a5f93a&_nc_ohc=-QZS6K6G9i8Q7kNvwHfmIs3&_nc_oc=Adl6JUj_wt11h7SZ1kGKCyUa_cBB0wqkol_pnN7R15gYLIHF07KQn9BmhLXwNwKFMC8&_nc_zt=23&_nc_ht=scontent.fnak3-1.fna&_nc_gid=vL6mkNrhNa8MtAsxOj2HYg&oh=00_Afkp5yWdXXIM7iYWTahLiO9CSvwyYVgEPVcYpCugOs4JaA&oe=693AB87F"
        },
        "Game-2": {
            name: "Zabb World",
            icon: "https://scontent.fnak3-1.fna.fbcdn.net/v/t39.30808-6/481112265_1236524098476464_4209232438207953182_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=a5f93a&_nc_ohc=YXYrU0b1ZH8Q7kNvwHQt-z1&_nc_oc=Adk9pw9BEczYuUxKpw5nLegl50q-Of-oBKrgQNjDlOWKiPu84MIzzY0FM8stcZc8HYU&_nc_zt=23&_nc_ht=scontent.fnak3-1.fna&_nc_gid=Pui9Ws2bxrqMx1X-0Qq5EQ&oh=00_AfnJpaH6y-dGNRrZO3CpgGOkjpWT7yIh8mbCq2VGGdMcfA&oe=693AC49C"
        }
    };

    // Variables
    let allOrders = [];
    let filteredOrdersList = []; 
    let completedOrdersList = []; 
    
    // สถานะการโหลด
    let isDataLoaded = false;
    let isLoading = false;
    
    // Auto Update Variables
    let updateInterval = null;
    const UPDATE_DELAY_MS = 10000; // อัพเดททุก 10 วินาที

    let currentPage = 1;
    const itemsPerPage = 5;

    // Elements
    const searchContainerBox = document.getElementById('order-search-container-box');
    const searchInput = document.getElementById('order-search-input');
    const clearSearchBtn = document.getElementById('order-clear-search-btn');
    const pendingList = document.getElementById('pending-list');
    const completedList = document.getElementById('completed-list');

    // Expose refresh function
    window.refreshOrderData = function() {
        if (!isDataLoaded && !isLoading) {
            loadData(); 
        }
    };

    function translatePaymentStatus(status) {
        const s = (status || '').toLowerCase();
        if (s === 'paid') return 'ชำระเงินเรียบร้อย';
        if (s === 'pending') return 'รอชำระ';
        return status || '-';
    }

    function translateWorkStatus(status) {
        const s = (status || '').toLowerCase();
        const map = {
            'inbound': 'รับเข้า',
            'queue': 'รอคิว',
            'started': 'เริ่มงาน',
            'shipping': 'รอส่ง',
            'completed': 'เรียบร้อย'
        };
        return map[s] || status || 'รับเข้า';
    }
    
    // --- Skeleton ---
    function createOrderSkeleton() {
        return `
            <div class="order-card skeleton-order-card">
                <div class="order-card-header">
                    <div style="width: 100%;">
                        <div class="skeleton-text skeleton-shimmer" style="width: 30%; height: 12px; margin-bottom: 4px;"></div>
                        <div class="skeleton-text skeleton-shimmer" style="width: 60%; height: 20px;"></div>
                    </div>
                    <div class="skeleton-status-dot skeleton-shimmer"></div>
                </div>
                <div class="game-info">
                    <div class="skeleton-game-logo skeleton-shimmer"></div>
                    <div class="skeleton-text skeleton-shimmer" style="width: 40%; height: 16px; margin: 0;"></div>
                </div>
                <div class="card-footer">
                    <div class="skeleton-text skeleton-shimmer" style="width: 60px; height: 20px; border-radius: 12px; margin-bottom: 0;"></div>
                    <div class="skeleton-text skeleton-shimmer" style="width: 80px; height: 20px; margin-bottom: 0;"></div>
                </div>
            </div>
        `;
    }
    
    function renderSkeletonLoadingOrder() {
        const totalOrdersEl = document.getElementById('total-orders');
        const totalProductsEl = document.getElementById('total-products');
        
        if(totalOrdersEl) totalOrdersEl.innerHTML = '<div class="skeleton-stat-val-box skeleton-shimmer-light"></div>';
        if(totalProductsEl) totalProductsEl.innerHTML = '<div class="skeleton-stat-val-box skeleton-shimmer-light"></div>';

        let skeletonHtml = '';
        for (let i = 0; i < itemsPerPage; i++) {
            skeletonHtml += createOrderSkeleton();
        }
        if(pendingList) pendingList.innerHTML = skeletonHtml;
        if(completedList) completedList.innerHTML = skeletonHtml;
        
        if(searchContainerBox) searchContainerBox.classList.add('skeleton-shimmer');
        if(searchInput) searchInput.disabled = true;
    }

    function removeSkeletonLoadingOrder() {
        if(searchContainerBox) searchContainerBox.classList.remove('skeleton-shimmer');
        if(searchInput) searchInput.disabled = false;
    }

    // --- Real-time Logic ---
    function startAutoUpdate() {
        if (updateInterval) clearInterval(updateInterval);
        // เรียก loadData แบบ Background Update (true) ทุกๆ 10 วินาที
        updateInterval = setInterval(() => {
            loadData(true);
        }, UPDATE_DELAY_MS);
    }

    // --- Data Loading via API ---
    // เพิ่ม parameter isBackgroundUpdate เพื่อแยกว่าเป็นการโหลดครั้งแรกหรืออัพเดทเบื้องหลัง
    async function loadData(isBackgroundUpdate = false) {
        if (isLoading) return;
        isLoading = true;

        // ถ้าไม่ใช่ Background Update ให้โชว์ Skeleton
        if (!isBackgroundUpdate) renderSkeletonLoadingOrder();
        
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            
            let rawOrders = [];
            if (Array.isArray(data)) {
                rawOrders = data;
            } else if (data.data && Array.isArray(data.data)) {
                rawOrders = data.data;
            }

            allOrders = rawOrders.map(item => {
                const itemsList = item.items || [];
                
                let isCompleted = false;
                if (typeof item.is_completed !== 'undefined') {
                    isCompleted = item.is_completed;
                } else if (itemsList.length > 0) {
                    isCompleted = itemsList.every(i => (i.process_status === 'เรียบร้อยแล้ว'));
                }

                // Date Parsing
                let orderDate = null;
                if (item.order_date && item.order_date !== "") {
                    orderDate = new Date(item.order_date);
                }

                // Game Info Parsing
                const rawGameId = item.game_id || "";
                let gameName = rawGameId || '-';
                let gameIcon = null;

                if (GAME_CONFIG[rawGameId]) {
                    gameName = GAME_CONFIG[rawGameId].name;
                    gameIcon = GAME_CONFIG[rawGameId].icon;
                }

                return {
                    id: item.order_id,          
                    order_id: item.order_id,
                    order_date: orderDate,
                    
                    game_display_name: gameName,
                    game_display_icon: gameIcon,
                    
                    customer_display_id: item.customer_account_id || 'ไม่ระบุ',
                    
                    payment_status: translatePaymentStatus(item.payment_status),
                    net_price: item.net_price || 0,
                    
                    items: itemsList.map(i => ({
                        product_name: i.product_name || 'สินค้า',
                        product_type: i.product_type_name || 'ไม่ระบุ',
                        char_display_id: i.customer_game_id || 'ไม่ระบุ',
                        qty: i.quantity_total || 1,
                        done_qty: i.quantity_done || 0,
                        work_status: translateWorkStatus(i.process_status),
                        product_img: i.image_link || ''
                    })),
                    
                    is_completed: isCompleted
                };
            });

            // Sort by date desc
            allOrders.sort((a, b) => {
                const dateA = a.order_date ? a.order_date.getTime() : 0;
                const dateB = b.order_date ? b.order_date.getTime() : 0;
                return dateB - dateA;
            });

            isDataLoaded = true;
            processOrders(); // Refresh UI with new data
            
            if (!isBackgroundUpdate) removeSkeletonLoadingOrder();

        } catch (error) {
            console.error("Error loading orders from API:", error);
            if (!isBackgroundUpdate && pendingList) {
                pendingList.innerHTML = `<div class="error-msg">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
            }
            removeSkeletonLoadingOrder();
        } finally {
            isLoading = false;
        }
    }

    function processOrders(filterText = '') {
        // ใช้ค่าจากช่องค้นหาปัจจุบัน (เผื่อ user พิมพ์ค้างไว้ตอน auto update ทำงาน)
        const currentSearch = searchInput ? searchInput.value : '';
        const searchText = (filterText || currentSearch).toLowerCase().trim();
        
        // Filter
        if (!searchText) {
            filteredOrdersList = [...allOrders];
        } else {
            filteredOrdersList = allOrders.filter(order => {
                const oId = String(order.order_id).toLowerCase();
                const cId = String(order.customer_display_id).toLowerCase();
                return oId.includes(searchText) || cId.includes(searchText);
            });
        }

        renderDashboard();
    }

    function formatDate(dateObj) {
        if (!dateObj) return ""; 
        if (Object.prototype.toString.call(dateObj) === "[object Date]") {
             if (isNaN(dateObj.getTime())) return "";
        } else {
            const d = new Date(dateObj);
            if (isNaN(d.getTime())) return "";
            dateObj = d;
        }

        const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const day = dateObj.getDate();
        const month = months[dateObj.getMonth()];
        let year = dateObj.getFullYear();
        if (year < 2400) year += 543;
        
        const hoursVal = dateObj.getHours();
        const minutesVal = dateObj.getMinutes();
        
        if (hoursVal === 0 && minutesVal === 0) {
            return `${day} ${month} ${year}`;
        }

        const hours = String(hoursVal).padStart(2, '0');
        const minutes = String(minutesVal).padStart(2, '0');
        
        return `${day} ${month} ${year} ${hours}:${minutes}`;
    }

    function formatNumber(num) {
        const val = parseFloat(num);
        if (isNaN(val)) return "0";
        if (Number.isInteger(val)) {
            return val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
        return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getDriveDirectLink(url) {
        if (!url) return '';
        let id = '';
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
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
        }
        if (id) {
            return `https://wsrv.nl/?url=${encodeURIComponent(`https://drive.google.com/uc?id=${id}`)}&w=200&h=200&fit=cover&output=webp&q=75`;
        }
        return url;
    }

    // --- Render ---
    function renderDashboard() {
        if(!pendingList || !completedList) return;
        
        pendingList.innerHTML = '';
        completedList.innerHTML = '';

        let totalProducts = 0;
        let pendingOrders = [];
        completedOrdersList = []; 

        if (filteredOrdersList.length === 0) {
            const emptyMsg = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <div class="empty-text">ไม่พบข้อมูลที่ค้นหา</div>
                    <div class="empty-sub">ลองตรวจสอบคำสะกด หรือค้นหาด้วยคีย์เวิร์ดอื่น</div>
                </div>
            `;
            pendingList.innerHTML = emptyMsg;
            completedList.innerHTML = emptyMsg;
        }

        filteredOrdersList.forEach(order => {
            totalProducts += order.items ? order.items.length : 0;
            if (order.is_completed) {
                completedOrdersList.push(order);
            } else {
                pendingOrders.push(order);
            }
        });

        const totalOrdersEl = document.getElementById('total-orders');
        const totalProductsEl = document.getElementById('total-products');
        if(totalOrdersEl) totalOrdersEl.innerText = formatNumber(filteredOrdersList.length).split('.')[0];
        if(totalProductsEl) totalProductsEl.innerText = formatNumber(totalProducts).split('.')[0];

        const pendingBadge = document.getElementById('pending-count-badge');
        if (pendingBadge) {
            if (pendingOrders.length > 0) {
                pendingBadge.innerText = pendingOrders.length;
                pendingBadge.classList.remove('hidden');
            } else {
                pendingBadge.classList.add('hidden');
            }
        }

        if (pendingOrders.length === 0 && filteredOrdersList.length > 0) {
            pendingList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" style="color: #fdba74; background: #fff7ed;">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div class="empty-text">ไม่มีรายการที่กำลังดำเนินการ</div>
                </div>
            `;
        } else {
            pendingOrders.forEach(order => {
                const card = createCard(order);
                pendingList.appendChild(card);
            });
        }

        renderCompletedOrdersPage();
    }

    function renderCompletedOrdersPage() {
        if(!completedList) return;

        if (filteredOrdersList.length === 0) {
                togglePagination(false);
                return;
        }
        completedList.innerHTML = '';

        if (completedOrdersList.length === 0) {
            if (filteredOrdersList.length > 0) {
                    completedList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon" style="color: #86efac; background: #f0fdf4;">
                            <i class="fas fa-box-open"></i>
                        </div>
                        <div class="empty-text">ไม่มีรายการที่สำเร็จแล้ว</div>
                    </div>
                    `;
            }
            togglePagination(false);
            return;
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = completedOrdersList.slice(startIndex, endIndex);

        pageItems.forEach(order => {
            const card = createCard(order);
            completedList.appendChild(card);
        });

        updatePaginationControls();
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(completedOrdersList.length / itemsPerPage);
        const controls = document.getElementById('pagination-controls');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const pageInfo = document.getElementById('page-info');

        if(!controls) return;

        if (totalPages <= 1) {
            controls.classList.add('hidden');
        } else {
            controls.classList.remove('hidden');
            if(pageInfo) pageInfo.innerText = `${currentPage} / ${totalPages}`;
            if(prevBtn) prevBtn.disabled = currentPage === 1;
            if(nextBtn) nextBtn.disabled = currentPage === totalPages;
        }
    }

    function togglePagination(show) {
        const controls = document.getElementById('pagination-controls');
        if(!controls) return;
        if (show) controls.classList.remove('hidden');
        else controls.classList.add('hidden');
    }

    function createCard(order) {
        const card = document.createElement('div');
        card.className = "order-card";
        card.addEventListener('click', () => openModal(order));

        const isPending = !order.is_completed;
        const statusDotClass = isPending ? 'status-dot bg-pending' : 'status-dot bg-success';
        
        const priceDisplay = order.net_price ? formatNumber(order.net_price) : '0';
        const itemCount = order.items ? order.items.length : 0;

        const logoUrl = order.game_display_icon;
        const gameLogoHtml = logoUrl 
            ? `<img src="${logoUrl}" class="game-logo-small" alt="${order.game_display_name}">`
            : `<i class="fas fa-gamepad" style="color:#9ca3af; font-size:18px;"></i>`;

        card.innerHTML = `
            <div class="order-card-header">
                <div>
                    <span class="order-date">${formatDate(order.order_date)}</span>
                    <div class="order-id">${order.order_id}</div>
                </div>
                <div class="${statusDotClass}"></div>
            </div>
            <div class="game-info">
                ${gameLogoHtml}
                <span style="font-weight: 500;">${order.game_display_name}</span>
            </div>
            <div class="card-footer">
                <span class="item-count">${itemCount} รายการ</span>
                <span class="price-text">${priceDisplay} บาท</span>
            </div>
        `;
        return card;
    }

    if(document.getElementById('prev-btn')) {
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCompletedOrdersPage();
            }
        });
    }

    if(document.getElementById('next-btn')) {
        document.getElementById('next-btn').addEventListener('click', () => {
            const totalPages = Math.ceil(completedOrdersList.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderCompletedOrdersPage();
            }
        });
    }

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length > 0) {
                if(clearSearchBtn) clearSearchBtn.classList.remove('hidden');
            } else {
                if(clearSearchBtn) clearSearchBtn.classList.add('hidden');
            }
            currentPage = 1; 
            processOrders(val);
        });
    }

    if(clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if(searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            clearSearchBtn.classList.add('hidden');
            currentPage = 1;
            processOrders('');
        });
    }

    function getStatusClass(status) {
        const s = (status || "").trim();
        if (s === "รับเข้า") return "status-badge badge-received"; 
        if (s === "รอคิว") return "status-badge badge-queue"; 
        if (s === "เริ่มงาน") return "status-badge badge-working"; 
        if (s === "รอส่ง") return "status-badge badge-waiting"; 
        if (s === "เรียบร้อย") return "status-badge badge-done"; 
        if (s.includes("เรียบร้อย")) return "status-badge badge-done";
        return "status-badge badge-received"; 
    }

    const modal = document.getElementById('order-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    function openModal(order) {
        if(!modal) return;
        document.body.classList.add('no-scroll');
        
        document.getElementById('m-order-id').innerText = order.order_id;
        document.getElementById('m-order-date').innerText = formatDate(order.order_date);
        
        document.getElementById('m-game-id').innerText = order.game_display_name;
        const logoContainer = document.getElementById('m-game-logo');
        const logoUrl = order.game_display_icon;
        
        if (logoUrl) {
            logoContainer.innerHTML = `<img src="${logoUrl}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
                logoContainer.innerHTML = `<i class="fas fa-gamepad" style="color:#ccc;"></i>`;
        }

        document.getElementById('m-customer-id').innerText = order.customer_display_id;
        
        const payEl = document.getElementById('m-payment');
        payEl.innerText = order.payment_status;
        
        payEl.className = 'info-val';
        if (order.payment_status.includes('รอชำระ') || order.payment_status === 'pending') {
            payEl.classList.add('text-payment-pending');
        } else if (order.payment_status.includes('ชำระ') || order.payment_status === 'paid') {
            payEl.classList.add('text-payment-success');
        } else {
            payEl.style.color = '#6b7280';
        }
        
        document.getElementById('m-price').innerText = formatNumber(order.net_price) + ' บาท';

        const productList = document.getElementById('m-product-list');
        productList.innerHTML = '';
        
        if (order.items && order.items.length > 0) {
            // Sort items: not done first
            const sortedItems = [...order.items].sort((a, b) => {
                const isDoneA = (a.work_status === 'เรียบร้อย' || a.work_status === 'เรียบร้อยแล้ว');
                const isDoneB = (b.work_status === 'เรียบร้อย' || b.work_status === 'เรียบร้อยแล้ว');
                return (isDoneA === isDoneB) ? 0 : isDoneA ? 1 : -1;
            });

            sortedItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = "item-row";
                
                const itemStatus = item.work_status;
                const statusClass = getStatusClass(itemStatus);
                
                const rawImgUrl = item.product_img || '';
                const displayImgUrl = getDriveDirectLink(rawImgUrl);

                const imgHtml = displayImgUrl 
                    ? `<div class="item-img-box">
                            <img src="${displayImgUrl}" class="item-img" loading="lazy" 
                            onerror="this.src='https://via.placeholder.com/64?text=No+Img';"
                            >
                        </div>`
                    : `<div class="item-img-box" style="display:flex; align-items:center; justify-content:center; color:#ccc;">
                            <i class="fas fa-image" style="font-size:24px;"></i>
                        </div>`;
                
                itemDiv.innerHTML = `
                    ${imgHtml}
                    <div style="flex:1; min-width:0;">
                        <h5 style="font-weight:bold; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0;">${item.product_name}</h5>
                        <div style="font-size:12px; color:#6b7280; margin-top:4px; display:flex; flex-direction:column; gap:2px;">
                            <p style="margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">ประเภท : ${item.product_type}</p>
                            <p style="margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">ไอดี : ${item.char_display_id}</p>
                            <p style="margin:0;">จำนวน : <span style="color:black; font-weight:500;">${item.done_qty}/${item.qty}</span></p>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <span class="${statusClass}">
                            ${itemStatus}
                        </span>
                    </div>
                `;
                productList.appendChild(itemDiv);
            });
        } else {
            productList.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:14px; padding:20px;">ไม่มีรายการสินค้า</div>';
        }

        modal.classList.add('active');
        const modalBody = document.getElementById('modal-body');
        if(modalBody) modalBody.scrollTop = 0;
    }

    function closeModal() {
        if(!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            document.body.classList.remove('no-scroll');
        }, 300);
    }

    if(modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    // Start
    loadData();
    startAutoUpdate(); // เริ่มต้น Auto Update

})();
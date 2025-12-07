document.addEventListener("DOMContentLoaded", function() {
    
    // ---------------------------------------------------------
    // 1. ส่วนตั้งค่า Browser (Title & Favicon)
    // ---------------------------------------------------------
    
    document.title = "Black Hannah";

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    // ใช้ไฟล์รูปในเครื่อง (โฟเดอร์เดียวกัน)
    link.href = "Black_Hannah.png";


    // ---------------------------------------------------------
    // 2. ส่วนของ CSS (Style) สำหรับเมนู
    // ---------------------------------------------------------
    const menuStyles = `
    /* --- Navbar Styles --- */
    .navbar {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 1000;
        display: flex;
        justify-content: center;
        background-color: var(--background-color, #ffffff);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .navbar-inner {
        width: 100%;
        max-width: 1400px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        box-sizing: border-box;
    }

    .navbar-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-color, #333);
        text-decoration: none;
        user-select: none;
        cursor: pointer;
    }

    /* ปรับขนาดรูปโลโก้ให้เล็กและเหมาะสม */
    .navbar-icon {
        width: 32px;
        height: 32px;
        object-fit: contain; 
    }

    /* Menu Right Side */
    .navbar-menu {
        display: flex;
        gap: 10px;
    }

    .menu-item {
        display: flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
        color: var(--subtle-text-color, #666);
        font-weight: 500;
        padding: 8px 16px;
        border-radius: 50px;
        transition: all 0.2s;
        font-size: 0.95rem;
        cursor: pointer;
    }

    .menu-item svg {
        width: 20px;
        height: 20px;
    }

    .menu-item:hover {
        background-color: #f1f3f4;
        color: var(--primary-color, #000);
    }

    .menu-item.active {
        background-color: #e8f0fe;
        color: var(--primary-color, #000);
        font-weight: 700;
    }

    #app-container {
        padding-top: 80px;
    }

    /* Mobile Responsiveness */
    @media (max-width: 600px) {
        .navbar-brand {
            display: none;
        }
        
        .navbar-inner {
            justify-content: center;
        }

        .navbar-menu {
            gap: 40px;
        }
        
        .menu-item {
            padding: 10px 20px;
            border-radius: 50px; 
        }
        
        .menu-item svg {
            width: 24px;
            height: 24px;
        }
    }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = menuStyles;
    document.head.appendChild(styleSheet);


    // ---------------------------------------------------------
    // 3. ฟังก์ชัน SPA Navigation
    // ---------------------------------------------------------
    const logoUrl = "Black_Hannah.png";
    
    // HTML ของ Navbar
    const menuHTML = `
    <nav class="navbar">
        <div class="navbar-inner">
            <div class="navbar-brand" onclick="window.spaNavigate('home')">
                <img class="navbar-icon" src="${logoUrl}" alt="Black Hannah Logo" width="32" height="32">
                <span>Black Hannah</span>
            </div>

            <div class="navbar-menu">
                <a href="#" class="menu-item active" id="nav-btn-home" onclick="window.spaNavigate('home'); return false;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
                    </svg>
                    <span class="menu-text">สินค้า</span>
                </a>
                <a href="#" class="menu-item" id="nav-btn-order" onclick="window.spaNavigate('order'); return false;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clip-rule="evenodd" />
                    </svg>
                    <span class="menu-text">ออเดอร์</span>
                </a>
            </div>
        </div>
    </nav>
    `;

    // Inject Navbar
    const placeholder = document.getElementById('navbar-placeholder');
    if (placeholder) {
        placeholder.innerHTML = menuHTML;
    } else {
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.insertAdjacentHTML('afterbegin', menuHTML);
    }

    // ---------------------------------------------------------
    // 4. Global Function สำหรับเปลี่ยนหน้า (SPA Switcher)
    // ---------------------------------------------------------
    window.spaNavigate = function(viewName) {
        const homeView = document.getElementById('view-home');
        const orderView = document.getElementById('view-order');
        const navHome = document.getElementById('nav-btn-home');
        const navOrder = document.getElementById('nav-btn-order');

        if (viewName === 'home') {
            // Show Home, Hide Order
            if(homeView) homeView.classList.remove('hidden');
            if(orderView) orderView.classList.add('hidden');
            
            // Update Menu Active State
            if(navHome) navHome.classList.add('active');
            if(navOrder) navOrder.classList.remove('active');

            // Scroll to top
            window.scrollTo(0, 0);

        } else if (viewName === 'order') {
            // Show Order, Hide Home
            if(homeView) homeView.classList.add('hidden');
            if(orderView) orderView.classList.remove('hidden');
            
            // Update Menu Active State
            if(navHome) navHome.classList.remove('active');
            if(navOrder) navOrder.classList.add('active');

            // Scroll to top
            window.scrollTo(0, 0);
            
            // Optional: Trigger Data Refresh for Order Page if needed
            if(window.refreshOrderData) {
                window.refreshOrderData();
            }
        }
    };
});
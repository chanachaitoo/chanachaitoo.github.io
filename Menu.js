document.addEventListener("DOMContentLoaded", function() {
    // 1. ตรวจสอบชื่อไฟล์ปัจจุบันเพื่อระบุ Active State
    const path = window.location.pathname;
    const page = path.split("/").pop(); // ดึงชื่อไฟล์ เช่น index.html หรือ Order.html

    // 2. ข้อมูลเมนู
    const menuItems = [
        {
            name: "สินค้า",
            link: "index.html",
            icon: "fas fa-store", 
            isActive: page === "index.html" || page === "" 
        },
        {
            name: "ออเดอร์",
            link: "Order.html",
            icon: "fas fa-clipboard-list",
            isActive: page === "Order.html"
        }
    ];

    // 3. สร้าง CSS สำหรับเมนู
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');

        /* --- FIX: ป้องกันหน้าขยับไปมา --- */
        html {
            overflow-y: scroll; /* บังคับให้มี Scrollbar เสมอ เพื่อไม่ให้ความกว้างหน้าจอเปลี่ยนเมื่อเปลี่ยนหน้า */
        }

        body {
            padding-bottom: 80px !important; 
        }
        
        @media (min-width: 768px) {
            body {
                padding-bottom: 24px !important;
                padding-top: 70px !important; 
            }
        }

        /* Container ของเมนู */
        .app-navbar {
            position: fixed;
            z-index: 9999; /* Z-Index ของเมนู */
            background: #ffffff;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
        }

        /* === MOBILE STYLE (Bottom Bar) === */
        @media (max-width: 767px) {
            .app-navbar {
                bottom: 0;
                left: 0;
                width: 100%;
                height: 65px;
                display: flex;
                justify-content: space-around;
                align-items: center;
                border-top-left-radius: 16px;
                border-top-right-radius: 16px;
                padding-bottom: env(safe-area-inset-bottom);
            }

            .nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                color: #94a3b8;
                font-family: 'Noto Sans Thai', sans-serif;
                font-size: 12px;
                width: 100%;
                height: 100%;
                transition: color 0.2s;
            }

            .nav-item i {
                font-size: 20px;
                margin-bottom: 4px;
                transition: transform 0.2s;
            }

            .nav-item.active {
                color: #2563eb;
                font-weight: 600;
            }

            .nav-item.active i {
                transform: translateY(-2px);
            }
            
            .nav-item:active {
                transform: scale(0.95);
            }
        }

        /* === DESKTOP STYLE (Top Bar) === */
        @media (min-width: 768px) {
            .app-navbar {
                top: 0;
                left: 0;
                width: 100%;
                height: 60px;
                display: flex;
                justify-content: center;
                align-items: center;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid #e5e7eb;
            }

            .nav-container-desktop {
                width: 100%;
                max-width: 1200px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 24px;
            }

            .nav-logo {
                font-weight: bold;
                font-size: 1.2rem;
                color: #2563eb;
                text-decoration: none;
                font-family: 'Noto Sans Thai', sans-serif;
            }

            .nav-links-desktop {
                display: flex;
                gap: 30px;
            }

            .nav-item {
                text-decoration: none;
                color: #4b5563;
                font-family: 'Noto Sans Thai', sans-serif;
                font-size: 16px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 8px;
                transition: all 0.2s;
            }

            .nav-item:hover {
                background-color: #f3f4f6;
                color: #2563eb;
            }

            .nav-item.active {
                background-color: #eff6ff;
                color: #2563eb;
                font-weight: 600;
            }
        }
    `;
    document.head.appendChild(style);

    const navBar = document.createElement('div');
    navBar.className = 'app-navbar';

    const desktopContainer = document.createElement('div');
    desktopContainer.className = 'nav-container-desktop';
    
    const logo = document.createElement('a');
    logo.href = 'index.html';
    logo.className = 'nav-logo';
    logo.innerHTML = '<i class="fas fa-gamepad"></i> Black Hannah';
    
    const linksWrapper = document.createElement('div');
    linksWrapper.className = 'nav-links-desktop';

    menuItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.link;
        link.className = `nav-item ${item.isActive ? 'active' : ''}`;
        
        link.innerHTML = `
            <i class="${item.icon}"></i>
            <span>${item.name}</span>
        `;
        
        if (window.innerWidth < 768) {
             navBar.appendChild(link);
        } else {
             linksWrapper.appendChild(link);
        }
    });

    if (window.innerWidth >= 768) {
        desktopContainer.appendChild(logo);
        desktopContainer.appendChild(linksWrapper);
        navBar.appendChild(desktopContainer);
    }

    document.body.appendChild(navBar);
});

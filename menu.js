document.addEventListener("DOMContentLoaded", function() {

    // ตรวจสอบชื่อไฟล์ปัจจุบันเพื่อระบุ Active State
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html"; 

    // ตั้งค่า Title (ชื่อแท็บ Browser)
    document.title = "Black Hannah";

    // ตั้งค่า Favicon (รูปไอคอน)
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = 'Black_Hannah.png';

    // ข้อมูลเมนู
    const menuItems = [
        {
            name: "สินค้า",
            link: "index.html",
            icon: "fas fa-store", 
            isActive: page === "index.html" || page === "" 
        },
        {
            name: "ออเดอร์",
            link: "order.html",
            icon: "fas fa-clipboard-list",
            isActive: page === "order.html"
        }
    ];

    // 3. สร้าง CSS
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600&display=swap');

        /* --- Basic Reset --- */
        body {
            margin: 0;
            font-family: 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            padding-top: 60px; /* เว้นที่สำหรับปุ่มเมนูบนมือถือ */
            transition: all 0.3s;
        }

        /* --- Overlay (ฉากหลังมืดตอนเปิดเมนู) --- */
        .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 998;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            backdrop-filter: blur(2px);
        }
        .menu-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        /* --- Navigation Container --- */
        .app-navbar {
            /* Desktop: เป็น Top Bar ปกติ */
            /* Mobile: จะถูกแปลงเป็น Sidebar ด้วย CSS ด้านล่าง */
            background: #ffffff;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* --- Hamburger Button (Mobile Only) --- */
        .hamburger-btn {
            display: none; /* ซ่อนใน PC */
            position: fixed;
            top: 15px;
            left: 20px;
            z-index: 1000;
            background: #ffffff;
            border: none;
            color: #1e293b;
            font-size: 20px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: none; /* เอาเงาออกแล้ว */
            transition: opacity 0.3s ease; /* เพิ่ม Transition เพื่อให้ซ่อนแบบนุ่มนวล */
        }
        
        /* เพิ่ม Class สำหรับซ่อนปุ่มเมนู */
        .hamburger-btn.hidden {
            opacity: 0;
            pointer-events: none;
        }

        /* =========================================
           MOBILE STYLE (< 768px) -> SIDEBAR MODE
        ========================================= */
        @media (max-width: 767px) {
            .hamburger-btn {
                display: block; /* แสดงปุ่ม */
            }

            .app-navbar {
                position: fixed;
                top: 0;
                left: -280px; /* ซ่อนไว้ทางซ้าย */
                width: 260px;
                height: 100%;
                z-index: 999;
                padding-top: 80px; /* เว้นที่ด้านบนไม่ให้ทับ Logo หรือปุ่มปิด */
                box-shadow: 4px 0 15px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            /* Class สำหรับเปิดเมนู */
            .app-navbar.active {
                left: 0;
            }

            .nav-container {
                display: flex;
                flex-direction: column;
                width: 100%;
                padding: 0;
            }

            /* Logo ใน Sidebar */
            .nav-logo {
                position: absolute;
                top: 20px;
                left: 24px;
                font-size: 1.2rem;
                font-weight: 700;
                color: #2563eb;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .nav-links-wrapper {
                display: flex;
                flex-direction: column;
                width: 100%;
                padding: 0 16px;
                box-sizing: border-box;
            }

            .nav-item {
                display: flex;
                align-items: center;
                justify-content: flex-start; /* ชิดซ้าย */
                text-decoration: none;
                color: #64748b;
                padding: 14px 16px;
                border-radius: 12px;
                margin-bottom: 8px;
                transition: all 0.2s;
                width: 100%;
                box-sizing: border-box;
            }

            .nav-item i {
                font-size: 20px;
                margin-right: 16px;
                width: 24px;
                text-align: center;
            }

            .nav-item span {
                font-size: 16px;
                font-weight: 500;
            }

            .nav-item.active {
                background-color: #eff6ff;
                color: #2563eb;
            }
            
            .nav-item:hover {
                 background-color: #f1f5f9;
            }
        }

        /* =========================================
           TABLET & DESKTOP STYLE (>= 768px) -> TOP BAR
        ========================================= */
        @media (min-width: 768px) {
            body {
                padding-top: 80px; 
            }

            .app-navbar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 70px;
                border-bottom: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                display: flex;
                justify-content: center; 
                z-index: 1000;
            }

            .nav-container {
                max-width: 1100px; 
                width: 100%;
                padding: 0 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .nav-logo {
                display: flex; 
                font-weight: 700;
                font-size: 1.5rem;
                color: #2563eb;
                text-decoration: none;
                align-items: center;
                gap: 10px;
            }

            .nav-links-wrapper {
                display: flex;
                gap: 16px;
                justify-content: flex-end;
            }

            .nav-item {
                display: flex;
                flex-direction: row; 
                align-items: center;
                text-decoration: none;
                color: #64748b;
                padding: 10px 20px;
                border-radius: 12px;
                transition: all 0.2s;
            }

            .nav-item i {
                font-size: 18px;
                margin-right: 8px;
            }

            .nav-item span {
                font-size: 16px;
                font-weight: 500;
            }

            .nav-item.active {
                background-color: #eff6ff;
                color: #2563eb;
                font-weight: 600;
            }

            .nav-item:hover {
                color: #2563eb;
                background-color: rgba(37, 99, 235, 0.05);
            }
        }
    `;
    document.head.appendChild(style);

    // 4. สร้าง Elements
    
    // 4.1 Overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    // 4.2 Hamburger Button
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-btn';
    hamburger.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.appendChild(hamburger);

    // 4.3 Navbar (Sidebar Container)
    const navBar = document.createElement('nav');
    navBar.className = 'app-navbar';

    const container = document.createElement('div');
    container.className = 'nav-container';

    // Logo
    const logoLink = document.createElement('a');
    logoLink.href = 'index.html';
    logoLink.className = 'nav-logo';
    logoLink.innerHTML = '<i class="fas fa-gamepad"></i> <span>Black Hannah</span>';

    // Links Wrapper
    const linksWrapper = document.createElement('div');
    linksWrapper.className = 'nav-links-wrapper';

    menuItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.link;
        link.className = `nav-item ${item.isActive ? 'active' : ''}`;
        
        link.innerHTML = `
            <i class="${item.icon}"></i>
            <span>${item.name}</span>
        `;
        
        // เมื่อคลิกลิงก์ในมือถือ ให้ปิดเมนูด้วย
        link.addEventListener('click', () => {
             toggleMenu(false);
        });

        linksWrapper.appendChild(link);
    });

    container.appendChild(logoLink);
    container.appendChild(linksWrapper);
    navBar.appendChild(container);

    document.body.appendChild(navBar);

    // 5. Function & Events สำหรับเปิด/ปิดเมนู
    function toggleMenu(forceOpen) {
        const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !navBar.classList.contains('active');
        
        if (isOpen) {
            navBar.classList.add('active');
            overlay.classList.add('active');
            hamburger.classList.add('hidden'); // ซ่อนปุ่มเมื่อเมนูเปิด
            // hamburger.innerHTML = '<i class="fas fa-times"></i>'; // เอาออกตามคำขอ
        } else {
            navBar.classList.remove('active');
            overlay.classList.remove('active');
            hamburger.classList.remove('hidden'); // แสดงปุ่มเมื่อเมนูปิด
            // hamburger.innerHTML = '<i class="fas fa-bars"></i>'; // เอาออกตามคำขอ
        }
    }

    hamburger.addEventListener('click', () => toggleMenu());
    overlay.addEventListener('click', () => toggleMenu(false));
    
});

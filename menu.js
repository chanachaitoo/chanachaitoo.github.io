document.addEventListener("DOMContentLoaded", function() {
    // 1. ตรวจสอบชื่อไฟล์ปัจจุบันเพื่อระบุ Active State
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html"; 

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

        /* --- Basic Reset & Setup --- */
        body {
            margin: 0;
            font-family: 'Noto Sans Thai', sans-serif;
            /* ปรับ Default ให้เผื่อที่ด้านบนสำหรับเมนู (ทั้งมือถือและ PC) */
            padding-top: 80px; 
            padding-bottom: 0;
            transition: padding 0.3s ease;
        }

        /* --- Navbar Container --- */
        .app-navbar {
            position: fixed;
            top: 0; /* ย้ายไปอยู่ด้านบนเสมอ */
            left: 0;
            z-index: 1000;
            background: #ffffff;
            width: 100%;
            transition: all 0.3s ease;
        }

        .nav-container {
            display: flex;
            align-items: center;
            width: 100%;
            height: 100%;
        }

        /* Logo */
        .nav-logo {
            display: none; 
            font-weight: 700;
            font-size: 1.5rem;
            color: #2563eb;
            text-decoration: none;
            margin-right: auto;
            align-items: center;
            gap: 10px;
        }

        .nav-links-wrapper {
            display: flex;
            width: 100%;
            justify-content: space-around; 
        }

        /* --- Link Items Styles --- */
        .nav-item {
            display: flex;
            flex-direction: column; 
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: #94a3b8;
            transition: all 0.2s ease;
            position: relative;
            padding: 8px;
            border-radius: 12px;
            flex: 1; 
        }

        .nav-item i {
            font-size: 20px;
            margin-bottom: 4px;
            transition: transform 0.2s;
        }

        .nav-item span {
            font-size: 12px;
            font-weight: 500;
        }

        /* Active State */
        .nav-item.active {
            color: #2563eb;
        }
        
        .nav-item.active i {
            transform: translateY(-2px);
        }

        .nav-item:hover {
            color: #2563eb;
            background-color: rgba(37, 99, 235, 0.05);
        }

        /* =========================================
           MOBILE STYLE (< 768px)
           - เมนูอยู่ด้านบน (แก้ไขแล้ว)
        ========================================= */
        @media (max-width: 767px) {
            body {
                 padding-top: 65px; /* เว้นที่ว่างด้านบนให้พอดีกับความสูงเมนู */
            }

            .app-navbar {
                height: 65px;
                /* เปลี่ยนเงาให้ลงด้านล่าง */
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                /* เปลี่ยนมุมโค้งเป็นด้านล่างแทน */
                border-bottom-left-radius: 16px;
                border-bottom-right-radius: 16px;
            }
            
            .nav-container {
                padding: 0 10px;
            }
        }

        /* =========================================
           TABLET & DESKTOP STYLE (>= 768px)
        ========================================= */
        @media (min-width: 768px) {
            body {
                padding-top: 80px; 
            }

            .app-navbar {
                height: 70px;
                border-bottom: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                display: flex;
                justify-content: center; 
                border-radius: 0; 
            }

            .nav-container {
                max-width: 1100px; 
                padding: 0 24px;
                justify-content: space-between;
            }

            .nav-logo {
                display: flex; 
            }

            .nav-links-wrapper {
                width: auto; 
                gap: 16px;
                justify-content: flex-end;
            }

            .nav-item {
                flex-direction: row; 
                gap: 8px;
                flex: none; 
                padding: 10px 20px;
                height: auto;
            }

            .nav-item i {
                font-size: 18px;
                margin-bottom: 0; 
            }

            .nav-item span {
                font-size: 16px;
            }

            .nav-item.active {
                background-color: #eff6ff;
                color: #2563eb;
                font-weight: 600;
            }
        }
    `;
    document.head.appendChild(style);

    // 4. สร้าง Elements
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
        linksWrapper.appendChild(link);
    });

    container.appendChild(logoLink);
    container.appendChild(linksWrapper);
    navBar.appendChild(container);

    document.body.appendChild(navBar);
});

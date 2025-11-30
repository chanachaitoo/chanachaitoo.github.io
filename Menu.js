document.addEventListener("DOMContentLoaded", function() {
    // 1. ตรวจสอบชื่อไฟล์ปัจจุบันเพื่อระบุ Active State
    // ใช้ try-catch หรือ fallback กรณี path แปลกๆ เพื่อความชัวร์
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html"; // ถ้าว่างให้เป็น index.html

    // 2. ข้อมูลเมนู (สามารถเพิ่มเมนูได้ที่นี่)
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

    // 3. สร้าง CSS (ใช้ CSS Media Queries จัดการ Responsive แทน JS)
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600&display=swap');

        /* --- Basic Reset & Setup --- */
        body {
            margin: 0;
            font-family: 'Noto Sans Thai', sans-serif;
            /* Default สำหรับ Mobile (เผื่อที่ด้านล่างให้เมนู) */
            padding-bottom: 80px; 
            padding-top: 0;
            transition: padding 0.3s ease;
        }

        /* --- Navbar Container --- */
        .app-navbar {
            position: fixed;
            z-index: 1000;
            background: #ffffff;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            width: 100%;
            transition: all 0.3s ease;
        }

        .nav-container {
            display: flex;
            align-items: center;
            width: 100%;
            height: 100%;
        }

        /* Logo (ซ่อนในมือถือ, แสดงในคอม) */
        .nav-logo {
            display: none; /* Mobile ซ่อน */
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
            justify-content: space-around; /* Mobile กระจายเต็ม */
        }

        /* --- Link Items Styles --- */
        .nav-item {
            display: flex;
            flex-direction: column; /* Mobile เรียงแนวตั้ง (Icon บน Text ล่าง) */
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: #94a3b8;
            transition: all 0.2s ease;
            position: relative;
            padding: 8px;
            border-radius: 12px;
            flex: 1; /* Mobile ให้ยืดเต็ม */
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
           - เมนูอยู่ด้านล่าง
           - ไม่มี Logo
        ========================================= */
        @media (max-width: 767px) {
            .app-navbar {
                bottom: 0;
                left: 0;
                height: 65px;
                border-top-left-radius: 16px;
                border-top-right-radius: 16px;
                /* รองรับ iPhone รุ่นใหม่ที่มีขีดล่าง */
                padding-bottom: env(safe-area-inset-bottom); 
            }
            
            .nav-container {
                padding: 0 10px;
            }
        }

        /* =========================================
           TABLET & DESKTOP STYLE (>= 768px)
           - เมนูอยู่ด้านบน
           - มี Logo
           - เรียงแนวนอน
        ========================================= */
        @media (min-width: 768px) {
            /* ปรับ Body ให้มีที่ว่างด้านบนแทนด้านล่าง */
            body {
                padding-bottom: 0;
                padding-top: 80px; 
            }

            .app-navbar {
                top: 0;
                left: 0;
                height: 70px;
                border-bottom: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                display: flex;
                justify-content: center; /* จัดกลาง Container */
                border-radius: 0; /* ลบความโค้งมุมทิ้ง */
            }

            .nav-container {
                max-width: 1100px; /* จำกัดความกว้างเนื้อหา */
                padding: 0 24px;
                justify-content: space-between;
            }

            /* แสดง Logo */
            .nav-logo {
                display: flex; 
            }

            /* ปรับ Wrapper ของ Links */
            .nav-links-wrapper {
                width: auto; /* ไม่ต้องเต็มจอ */
                gap: 16px;
                justify-content: flex-end;
            }

            /* ปรับสไตล์ปุ่มเมนูสำหรับ Desktop */
            .nav-item {
                flex-direction: row; /* เรียงแนวนอน (Icon ซ้าย Text ขวา) */
                gap: 8px;
                flex: none; /* ไม่ต้องยืด */
                padding: 10px 20px;
                height: auto;
            }

            .nav-item i {
                font-size: 18px;
                margin-bottom: 0; /* ลบ margin ล่างออก */
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

    // 4. สร้าง Elements (โครงสร้างเดียว ใช้ CSS ปรับรูปร่าง)
    const navBar = document.createElement('nav');
    navBar.className = 'app-navbar';

    const container = document.createElement('div');
    container.className = 'nav-container';

    // --- ส่วน Logo (จะแสดงแค่ใน Desktop ผ่าน CSS) ---
    const logoLink = document.createElement('a');
    logoLink.href = 'index.html';
    logoLink.className = 'nav-logo';
    logoLink.innerHTML = '<i class="fas fa-gamepad"></i> <span>Black Hannah</span>';

    // --- ส่วน Links Wrapper ---
    const linksWrapper = document.createElement('div');
    linksWrapper.className = 'nav-links-wrapper';

    // วนลูปสร้างเมนู
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

    // ประกอบร่าง
    container.appendChild(logoLink);      // ใส่ Logo
    container.appendChild(linksWrapper);  // ใส่เมนู
    navBar.appendChild(container);        // ใส่ Container เข้า Navbar

    document.body.appendChild(navBar);    // ใส่ Navbar เข้า Body
});

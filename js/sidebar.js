// ==========================
// SIDEBAR LOADER
// ==========================

async function loadSidebar(){

    const sidebar = document.getElementById("sidebar-container");

    if(!sidebar) return;

    const response = await fetch("components/sidebar.html");

    sidebar.innerHTML = await response.text();

    setActiveMenu();

}

// ==========================
// ACTIVE MENU
// ==========================

function setActiveMenu(){

    const page = window.location.pathname.split("/").pop();

    const links = document.querySelectorAll(".ai-sidebar a");

    links.forEach(link=>{

        const href = link.getAttribute("href");

        if(href===page){

            link.parentElement.classList.add("active");

        }

    });

}

loadSidebar();
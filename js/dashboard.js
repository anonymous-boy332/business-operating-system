// Load Dashboard Components

async function loadComponent(id, file){

    const container = document.getElementById(id);

    if(!container) return;


    const response = await fetch(file);

    const html = await response.text();

    container.innerHTML = html;

}


// Quick Actions Component

loadComponent(
    "quick-actions-container",
    "components/quick-actions.html"
);

// Activity Feed Component

loadComponent(
    "analytics-overview-container",
    "components/analytics-overview.html"
);

loadComponent(
    "activity-feed-container",
    "components/activity-feed.html"
);

loadComponent(
    "stats-cards-container",
    "components/stats-cards.html"
);


// ==========================
// AI CHAT
// ==========================


const chatInput = document.querySelector(".chat-input input");
const sendButton = document.querySelector(".chat-input button");
const chatWindow = document.querySelector(".chat-window");

function addMessage(text, type) {
    const msg = document.createElement("div");
    msg.className = type === "user" ? "user-message" : "ai-message";
    msg.innerText = text;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {

    const message = chatInput.value.trim();

    if (!message) return;

    addMessage(message, "user");

    chatInput.value = "";

    addMessage("🤖 Synvora AI is thinking...", "ai");

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })

        });

        const data = await response.json();

        chatWindow.removeChild(chatWindow.lastChild);

        addMessage(data.reply, "ai");

    } catch (err) {

        chatWindow.removeChild(chatWindow.lastChild);

        addMessage("❌ Unable to connect with AI.", "ai");

    }

}

if (sendButton) {

    sendButton.addEventListener("click", sendMessage);

    chatInput.addEventListener("keypress", function (e) {

        if (e.key === "Enter") {

            sendMessage();

        }

    });

}



function toggleSidebar() {

    const sidebar = document.querySelector(".ai-sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");

}

// ==========================
// BUSINESS PLANNER
// ==========================

const businessBtn = document.getElementById("generateBusiness");
const businessPrompt = document.getElementById("businessPrompt");
const businessType = document.getElementById("businessType");
const businessResult = document.getElementById("businessResult");

if (businessBtn) {

    businessBtn.addEventListener("click", () => {

        const prompt = businessPrompt.value.trim();

        if (!prompt) {
            alert("Please enter your business idea.");
            return;
        }

        businessResult.innerHTML = "📊 Synvora AI is preparing your business plan...";

        setTimeout(() => {

            businessResult.innerHTML = `
<h3>📄 Business Plan</h3>

<b>Business Type:</b> ${businessType.value}

<br><br>

<b>Business Idea:</b><br>
${prompt}

<br><br>

<b>Target Customers</b><br>
• Define your ideal customer.<br>
• Identify your target market.

<br><br>

<b>Revenue Model</b><br>
• Product Sales<br>
• Monthly Subscription<br>
• Premium Services

<br><br>

<b>Marketing Strategy</b><br>
• Social Media Marketing<br>
• SEO<br>
• Google Ads<br>
• Influencer Marketing

<br><br>

<b>Growth Plan</b><br>
• Launch MVP<br>
• Acquire first customers<br>
• Scale nationally<br>
• Expand internationally

<br><br>

✅ This is a demo plan. Later we'll connect it to the AI API for fully customized business plans.
`;

        }, 2000);

    });

}

// ==========================
// MARKETING AI
// ==========================

const marketingBtn = document.getElementById("generateMarketing");
const marketingPrompt = document.getElementById("marketingPrompt");
const marketingType = document.getElementById("marketingType");
const marketingResult = document.getElementById("marketingResult");

if (marketingBtn) {

    marketingBtn.addEventListener("click", () => {

        const prompt = marketingPrompt.value.trim();

        if (!prompt) {
            alert("Please enter your marketing request.");
            return;
        }

        marketingResult.innerHTML =
            "📢 Synvora AI is creating your marketing content...";

        setTimeout(() => {

            marketingResult.innerHTML = `
<h3>🚀 Marketing Content Ready</h3>

<b>Content Type:</b> ${marketingType.value}

<br><br>

<b>Prompt:</b><br>
${prompt}

<br><br>

<b>Generated Content:</b>

<br><br>

✨ Discover premium quality with our latest products!

Whether you're looking for style, performance, or value, we've got you covered.

✅ Premium Quality
✅ Affordable Prices
✅ Fast Delivery
✅ Trusted Brand

📩 Order today and experience the difference.

<br><br>

<b>Suggested Hashtags:</b><br>

#SynvoraAI #Marketing #Business #DigitalMarketing #AI #Growth

<br><br>

⚡ Demo Mode: Later this will generate fully AI-powered marketing content using the API.

`;

        }, 2000);

    });

}

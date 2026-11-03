// ==========================
// INVENTORY MANAGER
// ==========================

let inventory = [
    {
        name: "Laptop",
        sku: "LP-1001",
        stock: 45,
        price: 850
    },
    {
        name: "Wireless Mouse",
        sku: "MS-2045",
        stock: 8,
        price: 25
    },
    {
        name: "Mechanical Keyboard",
        sku: "KB-3010",
        stock: 0,
        price: 95
    }
];

console.log("Inventory Manager Loaded");
console.table(inventory);

// ==========================
// RENDER INVENTORY
// ==========================

function renderInventory(){

    const table = document.getElementById("inventoryTableBody");
  
console.log(table);
  
    if(!table) return;

    table.innerHTML = "";

    inventory.forEach(product=>{

        let status = "🟢 In Stock";
        let statusClass = "in-stock";

        if(product.stock <= 0){

            status = "🔴 Out of Stock";
            statusClass = "out-stock";

        }

        else if(product.stock < 10){

            status = "🟡 Low Stock";
            statusClass = "low-stock";

        }

        table.innerHTML += `

        <tr>

            <td>${product.name}</td>

            <td>${product.sku}</td>

            <td>${product.stock}</td>

            <td>$${product.price}</td>

            <td>

                <span class="${statusClass}">
                    ${status}
                </span>

            </td>

            <td>

                <button>Edit</button>

            </td>

        </tr>

        `;

    });

}
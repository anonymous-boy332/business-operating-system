// ==========================
// INVENTORY SYSTEM
// ==========================


let products = [

{
name:"Laptop",
category:"Electronics",
sku:"LP-1001",
stock:45,
price:"$850",
status:"In Stock"
},

{
name:"Wireless Mouse",
category:"Accessories",
sku:"MS-2045",
stock:8,
price:"$25",
status:"Low Stock"
},

{
name:"Mechanical Keyboard",
category:"Accessories",
sku:"KB-3010",
stock:0,
price:"$95",
status:"Out Stock"
}

];


// Load Products

function loadInventory(){

const table = document.querySelector("#inventoryProducts");


if(!table) return;


table.innerHTML="";


products.forEach(product=>{


let row=document.createElement("tr");


row.innerHTML=`

<td>${product.name}</td>

<td>${product.category}</td>

<td>${product.sku}</td>

<td>${product.stock}</td>

<td>${product.price}</td>

<td class="${getStatusClass(product.status)}">
${product.status}
</td>

<td>

<button onclick="deleteProduct('${product.name}')">
Delete
</button>

</td>

`;


table.appendChild(row);


});


}



// Status Color

function getStatusClass(status){


if(status==="In Stock")
return "in-stock";


if(status==="Low Stock")
return "low-stock";


return "out-stock";


}



// Delete Product

function deleteProduct(name){


products =
products.filter(
p=>p.name!==name
);


loadInventory();


alert("Product Deleted");


}



// Start

document.addEventListener(
"DOMContentLoaded",
loadInventory
);

console.log("Inventory JS Loaded");
/* ==================================
   BUSINESS OS - TRANSACTIONS JS
================================== */


/* ==========================================
   BUSINESS OS - TRANSACTIONS JS
   COMPANY-SPECIFIC TRANSACTION SYSTEM
========================================== */

let transactions = [];
let financeChart;

/* ==========================================
   LOAD ACTIVE COMPANY TRANSACTIONS
========================================== */

function loadCompanyTransactions(){

    if(typeof getCompanyData !== "function"){

        console.error(
            "Company Data Engine not loaded."
        );

        transactions = [];

        return;
    }

    const companyId =
        getActiveCompanyId();

    if(!companyId){

        console.warn(
            "No active company selected."
        );

        transactions = [];

        return;
    }

    transactions =
        getCompanyData(
            "transactions",
            companyId
        ) || [];

    console.log(
        "Transactions Loaded:",
        {
            companyId: companyId,
            count: transactions.length
        }
    );
}


// Add Transaction
function addTransaction(){

    let title = document.getElementById("transactionTitle").value;
    let amount = Number(
        document.getElementById("transactionAmount").value
    );
    let type = document.getElementById("transactionType").value;

  let category = document.getElementById("transactionCategory").value;

let payment = document.getElementById("paymentMethod").value;

let status = document.getElementById("transactionStatus").value;

let notes = document.getElementById("transactionNotes").value;
  
    if(!title || !amount){
        alert("Please fill all fields");
        return;
    }


    let transaction = {

    title: title,

    amount: amount,

    type: type,

    category: category,

    payment: payment,

    status: status,

    notes: notes,

    date:
        new Date()
            .toISOString()
            .split("T")[0]

};


    transactions.push(transaction);


    saveTransactions();


    displayTransactions();

updateTransactionStats();

updateFinanceChart();
document.getElementById("transactionTitle").value = "";

document.getElementById("transactionAmount").value = "";

document.getElementById("transactionType").value = "income";

  document.getElementById("transactionCategory").value = "Sales";
  
  document.getElementById("paymentMethod").value = "Cash";

document.getElementById("transactionStatus").value = "Paid";

document.getElementById("transactionNotes").value = "";
  
}



/* ==========================================
   SAVE ACTIVE COMPANY TRANSACTIONS
========================================== */

function saveTransactions(){

    if(typeof saveCompanyData !== "function"){

        console.error(
            "Company Data Engine not loaded."
        );

        return false;
    }

    const companyId =
        getActiveCompanyId();

    if(!companyId){

        alert(
            "Please select a company first."
        );

        return false;
    }

    return saveCompanyData(
        "transactions",
        transactions,
        companyId
    );
}



// Display Transactions

function displayTransactions(){


    let table = document.getElementById(
        "transactionList"
    );


    if(!table) return;


    table.innerHTML="";


    transactions.forEach(item=>{


        table.innerHTML += `

        <tr>

        <td>${item.title}</td>

        <td>$${item.amount}</td>

<td>
${item.type}
</td>

<td>
${item.category || "Other"}
</td>

<td>
${item.payment}
</td>

<td>

<span class="status ${item.status.toLowerCase()}">

${item.status}

</span>

</td>


<td>
${item.date}
</td>

<td>

<button class="view-btn" onclick="viewTransaction('${item.id}')">
View
</button>

<button class="edit-btn" onclick="editTransaction('${item.id}')">
Edit
</button>

<button class="delete-btn" onclick="deleteTransaction('${item.id}')">
Delete
</button>

</td>



        </tr>

        `;


    });


}

function filterTransactions(){

    let search = document.getElementById("searchTransaction").value.toLowerCase();

    let type = document.getElementById("filterType").value;

    let category = document.getElementById("filterCategory").value;

  let date =
document.getElementById("filterDate").value;

    let filtered = transactions.filter(item=>{

        let matchSearch =
        item.title.toLowerCase().includes(search);

        let matchType =
        type==="all" || item.type===type;

        let matchCategory =
        category==="all" || item.category===category;

      let matchDate =
date === "" || item.date === date;
      
        return matchSearch &&
       matchType &&
       matchCategory &&
       matchDate;

    });

    displayFilteredTransactions(filtered);

}

function displayFilteredTransactions(list){

    let table = document.getElementById("transactionList");

    table.innerHTML = "";

    list.forEach(item=>{

        table.innerHTML += `
        <tr>
            <td>${item.title}</td>
            <td>$${item.amount}</td>
            <td>${item.type}</td>
            <td>${item.category || "Other"}</td>
            <td>${item.payment}</td>

<td>

<span class="status ${item.status.toLowerCase()}">

${item.status}

</span>

</td>
            <td>${item.date}</td>
            <td>
                <button class="edit-btn" onclick="editTransaction('${item.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteTransaction('${item.id}')">Delete</button>
            </td>
        </tr>
        `;

    });

}

function updateFinanceChart(){

    let income = 0;
    let expense = 0;

    transactions.forEach(item=>{

        if(item.type==="income"){

            income += item.amount;

        }else{

            expense += item.amount;

        }

    });

    let ctx = document.getElementById("financeChart");

    if(!ctx) return;

    if(financeChart){

        financeChart.destroy();

    }

    financeChart = new Chart(ctx,{

        type:"doughnut",

        data:{

            labels:["Income","Expense"],

            datasets:[{

                data:[income,expense],

                backgroundColor:[
                    "#00AEEF",
                    "#EF4444"
                ]

            }]

        },

        options:{

            responsive:true,

            plugins:{

                legend:{
                    labels:{
                        color:"#ffffff"
                    }
                }

            }

        }

    });

}



// Update Stats

function updateTransactionStats(){


let income = 0;

let expense = 0;



transactions.forEach(item=>{


    if(item.type==="income"){

        income += item.amount;

    }

    else{

        expense += item.amount;

    }


});



let balance = income - expense;

  let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

let monthlyIncome = 0;
let monthlyExpense = 0;

transactions.forEach(item => {

    let d = new Date(item.date);

    if(
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
    ){

        if(item.type === "income"){

            monthlyIncome += item.amount;

        }else{

            monthlyExpense += item.amount;

        }

    }

});



document.getElementById(
    "totalIncome"
).innerHTML = "$" + income;



document.getElementById(
    "totalExpense"
).innerHTML = "$" + expense;



document.getElementById(
    "currentBalance"
).innerHTML = "$" + balance;

  document.getElementById(
"monthlyIncome"
).innerHTML = "$" + monthlyIncome;

document.getElementById(
"monthlyExpense"
).innerHTML = "$" + monthlyExpense;

document.getElementById(
"transactionCount"
).innerHTML = transactions.length;


}




// Load On Page Start

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCompanyTransactions();

        displayTransactions();

        updateTransactionStats();

        updateFinanceChart();

    }
);

// Delete Transaction

function deleteTransaction(id){


    transactions = transactions.filter(
        item => item.id !== id
    );


    saveTransactions();

    displayTransactions();

    updateTransactionStats();

  updateFinanceChart();

}

// Edit Transaction

function editTransaction(id){


let transaction = transactions.find(
item => item.id === id
);

  if(!transaction){
    return;
}


let newTitle = prompt(
"Enter New Title",
transaction.title
);


let newAmount = prompt(
"Enter New Amount",
transaction.amount
);



if(newTitle && newAmount){


transaction.title = newTitle;

transaction.amount = Number(newAmount);

let newPayment = prompt(
    "Payment Method",
    transaction.payment
);

if (newPayment) {
    
    transaction.payment = newPayment;
    
}

let newStatus = prompt(
    "Status",
    transaction.status
);

if (newStatus) {
    
    transaction.status = newStatus;
    
}

let newNotes = prompt(
    "Notes",
    transaction.notes
);

if (newNotes !== null) {
    
    transaction.notes = newNotes;
    
}

saveTransactions();

displayTransactions();

updateTransactionStats();

  updateFinanceChart();

}


}

function viewTransaction(id){

    let transaction = transactions.find(item => item.id === id);

    if(!transaction) return;

    document.getElementById("transactionDetails").innerHTML = `

        <p><strong>Title:</strong> ${transaction.title}</p>

        <p><strong>Amount:</strong> $${transaction.amount}</p>

        <p><strong>Type:</strong> ${transaction.type}</p>

        <p><strong>Category:</strong> ${transaction.category}</p>

        <p><strong>Payment:</strong> ${transaction.payment}</p>

        <p><strong>Status:</strong> ${transaction.status}</p>

        <p><strong>Notes:</strong> ${transaction.notes}</p>

        <p><strong>Date:</strong> ${transaction.date}</p>

    `;

    document.getElementById("viewTransactionModal").style.display = "flex";

}

function closeTransactionModal(){

    document.getElementById("viewTransactionModal").style.display = "none";

}
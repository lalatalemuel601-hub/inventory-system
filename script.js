       // --- DATA STORE ---
        let projects = JSON.parse(localStorage.getItem('ps6_projects')) || [
            { id: 1, name: 'Sample House Renovation', budget: 100000, deadline: '2023-12-30' }
        ];
        let transactions = JSON.parse(localStorage.getItem('ps6_trans')) || [];
        let currentProjId = null;

        // --- INIT ---
        window.onload = () => {
            document.getElementById('print-date').innerText = "Date: " + new Date().toLocaleDateString();
            renderOverview();
            renderProjectList();
            renderWarehouse();
            updateReports();
        };

// Function para lumipat ng view
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    
    // Show selected view
    let target = document.getElementById('view-' + viewName);
    if(target) target.style.display = 'block';

    // Trigger specific logic
    if (viewName === 'inventory') renderInventory();
    if (viewName === 'records') updateReports();
    if (viewName === 'reflection') renderReflection(); // <-- IMPORTANT: Add this line
}

// Logic para sa Reflection Table
    function renderReflection() {
        // Kunin ang value ng Search Bar
        let search = document.getElementById('search-ref') ? document.getElementById('search-ref').value.toLowerCase() : '';

        let analysis = {};
        transactions.forEach(t => {
            if (!analysis[t.item]) analysis[t.item] = { inQty:0, inCost:0, outQty:0, outRev:0 };
            let val = t.qty * t.price;
            if (t.type === 'IN') { analysis[t.item].inQty += t.qty; analysis[t.item].inCost += val; } 
            else { analysis[t.item].outQty += t.qty; analysis[t.item].outRev += val; }
        });

        let tbody = document.getElementById('reflection-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        let gInvest=0, gRev=0, gProfit=0;

        Object.keys(analysis).forEach(item => {
            // Search Logic: I-skip kung hindi match ang pangalan ng item
            if (!item.toLowerCase().includes(search)) return;

            let d = analysis[item];
            let avgBuy = d.inQty > 0 ? (d.inCost / d.inQty) : 0;
            let avgSell = d.outQty > 0 ? (d.outRev / d.outQty) : 0;
            let profit = d.outRev - (d.outQty * avgBuy);
            
            gInvest += d.inCost; gRev += d.outRev; gProfit += profit;

            tbody.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;"><b>${item}</b></td>
                <td style="text-align:center;">${d.inQty}</td><td>₱${avgBuy.toFixed(2)}</td>
                <td style="text-align:center;">${d.outQty}</td><td>₱${avgSell.toFixed(2)}</td>
                <td style="color:${profit>=0?'green':'red'}; font-weight:bold;">${profit>=0?'+':''}₱${profit.toLocaleString()}</td>
            </tr>`;
        });

        // Update Totals (Note: Ang totals ay magbabago base sa nakadisplay na search result para accurate)
        document.getElementById('ref-total-invest').innerText = '₱' + gInvest.toLocaleString();
        document.getElementById('ref-total-rev').innerText = '₱' + gRev.toLocaleString();
        let gpEl = document.getElementById('ref-net-profit');
        gpEl.innerText = (gProfit>=0?'+':'') + '₱' + gProfit.toLocaleString();
        gpEl.style.color = gProfit>=0?'green':'red';
    }

        // --- PROJECT FUNCTIONS ---
        function renderProjectList() {
            const container = document.getElementById('project-list-container');
            const search = document.getElementById('search-proj').value.toLowerCase();
            container.innerHTML = '';
            projects.forEach(p => {
                if(p.name.toLowerCase().includes(search)) {
                    let used = getProjectExpenses(p.id);
                    let percent = (used / p.budget) * 100;
                    let dotClass = percent > 90 ? 'bg-red' : (percent > 60 ? 'bg-orange' : 'bg-green');
                    let div = document.createElement('div');
                    div.className = `p-row ${p.id === currentProjId ? 'active' : ''}`;
                    div.innerHTML = `<span>${p.name}</span><div class="p-dot ${dotClass}"></div>`;
                    div.onclick = () => loadProjectDetails(p.id);
                    container.appendChild(div);
                }
            });
        }
        function getProjectExpenses(pid) {
            return transactions.filter(t => t.type === 'OUT' && t.refId === pid).reduce((acc, t) => acc + (t.qty * t.price), 0);
        }
            function loadProjectDetails(id) {
        currentProjId = id;
        renderProjectList(); // Refresh para mag-highlight ang selected
        
        let p = projects.find(x => x.id === id);
        let used = getProjectExpenses(id);
        let remaining = p.budget - used;
        let percent = Math.min((used / p.budget) * 100, 100);
        
        let statusText = percent > 85 ? "CRITICAL" : (percent > 50 ? "Caution" : "Healthy");
        let barColor = percent > 85 ? "var(--red)" : (percent > 50 ? "var(--orange)" : "var(--green)");

        let panel = document.getElementById('project-details-panel');
        panel.innerHTML = `
            <div class="header-flex">
                <div><h2>${p.name}</h2><small>Deadline: ${p.deadline}</small></div>
                <div style="display:flex; gap:5px;">
                    <!-- New Buttons -->
                    <button class="btn btn-sec" onclick="requireAuth('EDIT')">✏️ Edit</button>
                    <button class="btn btn-red" onclick="requireAuth('DELETE')">🗑️ Delete</button>
                    <!-- Old Buttons -->
                    <button class="btn btn-sec" onclick="printSpecificView('dashboard')">🖨️ Print</button>
                    <button class="btn" onclick="openBatchModal('OUT')">📤 Batch Deploy</button>
                </div>
            </div>
            
            <div class="health-container">
                <div style="display:flex; justify-content:space-between;"><b>Financial Health</b><span class="status-badge" style="color:${barColor}">${statusText}</span></div>
                <div class="progress-bg"><div class="progress-fill" style="width:${percent}%; background:${barColor}"></div></div>
            </div>
            
            <div class="stat-grid">
                <div class="card"><small>Budget</small><h3>₱${p.budget.toLocaleString()}</h3></div>
                <div class="card"><small>Expenses</small><h3 style="color:${barColor}">₱${used.toLocaleString()}</h3></div>
                <div class="card"><small>Remaining</small><h3 style="color:${remaining<0?'red':'green'}">₱${remaining.toLocaleString()}</h3></div>
            </div>
            
            <h3>Project History</h3>
            <table><thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Cost</th></tr></thead><tbody>
            ${transactions.filter(t => t.type === 'OUT' && t.refId === id).map(t => `<tr><td>${t.date}</td><td>${t.item}</td><td>${t.qty}</td><td>₱${(t.qty * t.price).toLocaleString()}</td></tr>`).join('')}
            </tbody></table>
        `;
    }
        // --- TRANSACTIONS ---
        function prepareTransaction(type) {
            if(type === 'IN') openModal('modal-receive');
            if(type === 'OUT') {
                if(!currentProjId) { alert("Select a project first."); return; }
                document.getElementById('deploy-proj-name').innerText = "For: " + projects.find(x=>x.id===currentProjId).name;
                openModal('modal-deploy');
            }
        }
        function processTransaction(type) {
            let item = document.getElementById(type === 'IN' ? 'in-item' : 'out-item').value;
            let qty = parseFloat(document.getElementById(type === 'IN' ? 'in-qty' : 'out-qty').value);
            let price = parseFloat(document.getElementById(type === 'IN' ? 'in-price' : 'out-price').value);
            let cat = type === 'IN' ? document.getElementById('in-cat').value : 'N/A';
            let refId = type === 'IN' ? 'Supplier' : currentProjId;
            let refName = type === 'IN' ? 'Supplier' : projects.find(p=>p.id===refId).name;

            if(!item || !qty || !price) { alert("Fill all fields"); return; }
            if(type === 'OUT') {
                let ins = transactions.filter(t => t.item === item && t.type === 'IN').reduce((a,b)=>a+b.qty,0);
                let outs = transactions.filter(t => t.item === item && t.type === 'OUT').reduce((a,b)=>a+b.qty,0);
                if((ins - outs) < qty) { alert("Not enough stock!"); return; }
            }
            transactions.push({ id: Date.now(), date: new Date().toLocaleDateString(), type, item, qty, price, category: cat, refId, refName });
            localStorage.setItem('ps6_trans', JSON.stringify(transactions));
            closeModals();
            if(currentProjId) loadProjectDetails(currentProjId);
            renderOverview(); renderWarehouse(); updateReports();
        }
        function saveProject() {
            let name = document.getElementById('np-name').value;
            let budget = parseFloat(document.getElementById('np-budget').value);
            let d = document.getElementById('np-date').value;
            if(name && budget) {
                projects.push({ id: Date.now(), name, budget, deadline: d });
                localStorage.setItem('ps6_projects', JSON.stringify(projects));
                renderProjectList(); renderOverview(); closeModals();
                renderProjects(); // I-refresh ang display
                alert("Project Created!");
            }
        }
    function renderWarehouse() {
        let tbody = document.getElementById('tbl-warehouse');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        
        // Kunin ang value ng Filter at ng Search Bar
        let filter = document.getElementById('filter-cat').value;
        let search = document.getElementById('search-warehouse') ? document.getElementById('search-warehouse').value.toLowerCase() : '';

        let items = [...new Set(transactions.map(t => t.item))];
        
        items.forEach(item => {
            // Search Logic: Kung hindi match sa search, skip na agad
            if (!item.toLowerCase().includes(search)) return;

            let all = transactions.filter(t => t.item === item);
            let lastIn = all.filter(t => t.type === 'IN').pop();
            
            // Filter Logic: Skip kung walang records o mali ang category
            if(!lastIn || (filter !== 'All' && lastIn.category !== filter)) return;
            
            let inQty = all.filter(t => t.type === 'IN').reduce((a,b)=>a+b.qty,0);
            let outQty = all.filter(t => t.type === 'OUT').reduce((a,b)=>a+b.qty,0);
            let onHand = inQty - outQty;
            let val = onHand * lastIn.price;
            
            // Hanapin ang part na ito sa loob ng renderWarehouse function:
    tbody.innerHTML += `<tr>
        <td><span class="badge">${lastIn.category}</span></td>
        <td>${item}</td>
        <td>${onHand}</td>
        <td>₱${lastIn.price.toLocaleString()}</td>
        <td>₱${val.toLocaleString()}</td>
        <td>${onHand<=5?'<span class="text-red">Low Stock</span>':'Good'}</td>
        
        <!-- BAGONG ACTION BUTTONS -->
        <td>
            <button class="btn-sm" onclick="editItem('${item}')" title="Edit Name">✏️</button>
            <button class="btn-sm btn-red" onclick="deleteItem('${item}')" title="Delete All Records">🗑️</button>
        </td>
    </tr>`;
        });
    }
        function updateReports() {
            let now = new Date();
            let monthTrans = transactions.filter(t => new Date(t.id).getMonth() === now.getMonth());
            document.getElementById('rep-in').innerText = '₱' + monthTrans.filter(t=>t.type==='IN').reduce((a,b)=>a+(b.qty*b.price),0).toLocaleString();
            document.getElementById('rep-out').innerText = '₱' + monthTrans.filter(t=>t.type==='OUT').reduce((a,b)=>a+(b.qty*b.price),0).toLocaleString();
            document.getElementById('tbl-records').innerHTML = transactions.slice().sort((a,b)=>b.id-a.id).map(t => `<tr><td>${t.date}</td><td>${t.type}</td><td>${t.item}</td><td>${t.qty}</td><td>₱${(t.qty*t.price).toLocaleString()}</td><td>${t.refName}</td></tr>`).join('');
        }
        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModals() { document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none'); }
        // --- NEW REPORT FUNCTION ---
function generateReport(type) {
    if (type === 'inventory') {
        // Lumipat sa Warehouse View at mag-print
        switchView('warehouse');
        setTimeout(() => { window.print(); }, 500); 
    } 
    else if (type === 'projects') {
        // Lumipat sa Dashboard (Overview) at mag-print
        switchView('overview'); // Mas maganda ang print layout ng Overview
        setTimeout(() => { window.print(); }, 500);
    } 
    else if (type === 'logs') {
        // Print lang ang current view (Records)
        window.print();
    }
}
// --- REPORT LOGIC ---
let repState = { year: null, month: null };
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Initial Load
function updateReports() {
    resetReportView();
}

function resetReportView() {
    repState = { year: null, month: null };
    document.getElementById('report-print-area').style.display = 'none';
    document.getElementById('rep-menu-interface').style.display = 'block';
    renderYears();
}

// 1. RENDER YEARS (Mukhang Calendar Year)
function renderYears() {
    let years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort().reverse();
    if (years.length === 0) years = [new Date().getFullYear()];
    
    document.getElementById('rep-breadcrumb').innerHTML = "Select Year";
    
    let html = '';
    years.forEach(y => {
        html += `
            <div class="cal-card" onclick="selectYear(${y})">
                <div class="cal-card-top">YEAR</div>
                <div class="cal-card-body">
                    <h2>${y}</h2>
                    <small>Tap to open</small>
                </div>
            </div>`;
    });
    document.getElementById('rep-selection-grid').innerHTML = html;
}

function selectYear(y) {
    repState.year = y;
    renderMonths();
}

// 2. RENDER MONTHS (Mukhang Calendar Month pages)
function renderMonths() {
    document.getElementById('rep-breadcrumb').innerHTML = `<span onclick="resetReportView()" style="cursor:pointer;text-decoration:underline">Years</span> > ${repState.year}`;
    let html = '';
    monthNames.forEach((m, index) => {
        html += `
            <div class="cal-card" onclick="selectMonth(${index})">
                <div class="cal-card-top" style="background:var(--primary)">${repState.year}</div>
                <div class="cal-card-body">
                    <h3>${m}</h3>
                    <small>Select Month</small>
                </div>
            </div>`;
    });
    document.getElementById('rep-selection-grid').innerHTML = html;
}

function selectMonth(m) {
    repState.month = m;
    renderWeeks();
}

// 3. RENDER WEEKS (Mukhang Calendar Weekly pages)
function renderWeeks() {
    let mName = monthNames[repState.month];
    document.getElementById('rep-breadcrumb').innerHTML = `<span onclick="renderMonths()" style="cursor:pointer;text-decoration:underline">${repState.year} > ${mName}</span> > Select Week`;
    
       const container = document.getElementById('rep-selection-grid');
    container.innerHTML = '';

    years.forEach(year => {
        let div = document.createElement('div');
        div.className = 'cal-card';
        div.onclick = () => { repState.year = year; renderMonths(); };
        div.innerHTML = `
            <div class="cal-card-top">${year}</div>
            <div class="cal-card-body">
                <h2>${year}</h2>
                <small>Fiscal Year</small>
            </div>
        `;
        container.appendChild(div);
    });
}

// 2. RENDER MONTHS
function renderMonths() {
    document.getElementById('rep-breadcrumb').innerHTML = `<span style="color:var(--primary); cursor:pointer;" onclick="renderYears()">${repState.year}</span> > Select Month`;
    const container = document.getElementById('rep-selection-grid');
    container.innerHTML = '';

    monthNames.forEach((m, index) => {
        let div = document.createElement('div');
        div.className = 'cal-card';
        div.onclick = () => { repState.month = index; renderWeeks(); };
        div.innerHTML = `
            <div class="cal-card-top">${repState.year}</div>
            <div class="cal-card-body">
                <h2>${index + 1}</h2>
                <small>${m}</small>
            </div>
        `;
        container.appendChild(div);
    });
}

// 3. RENDER WEEKS
function renderWeeks() {
    let mName = monthNames[repState.month];
    document.getElementById('rep-breadcrumb').innerHTML = `<span style="color:var(--primary); cursor:pointer;" onclick="renderYears()">${repState.year}</span> > <span style="color:var(--primary); cursor:pointer;" onclick="renderMonths()">${mName}</span> > Select Week`;
    
    const container = document.getElementById('rep-selection-grid');
    container.innerHTML = '';

    // Create 4 standard weeks for simplicity
    const weeks = [
        { label: "Week 1", range: "1-7", dStart: 1, dEnd: 7 },
        { label: "Week 2", range: "8-14", dStart: 8, dEnd: 14 },
        { label: "Week 3", range: "15-21", dStart: 15, dEnd: 21 },
        { label: "Week 4", range: "22-End", dStart: 22, dEnd: 31 }
    ];

    weeks.forEach(w => {
        let div = document.createElement('div');
        div.className = 'cal-card';
        div.onclick = () => generatePeriodReport(w.dStart, w.dEnd, w.label);
        div.innerHTML = `
            <div class="cal-card-top">${mName}</div>
            <div class="cal-card-body">
                <h2>${w.label}</h2>
                <small>Days ${w.range}</small>
            </div>
        `;
        container.appendChild(div);
    });
}

// 4. GENERATE AND SHOW REPORT
function generatePeriodReport(startDay, endDay, weekLabel) {
    // Hide Menu, Show Report
    document.getElementById('rep-menu-interface').style.display = 'none';
    document.getElementById('report-print-area').style.display = 'block';

    // Set Title
    let mName = monthNames[repState.month];
    document.getElementById('rep-period-text').innerText = `Period: ${mName} ${startDay} - ${endDay}, ${repState.year} (${weekLabel})`;

    // Filter Data
    let tbody = document.getElementById('rep-table-body');
    tbody.innerHTML = '';
    
    let totalIn = 0;
    let totalOut = 0;

    let filtered = transactions.filter(t => {
        let d = new Date(t.date);
        let tYear = d.getFullYear();
        let tMonth = d.getMonth();
        let tDay = d.getDate();

        return tYear === repState.year && 
               tMonth === repState.month && 
               tDay >= startDay && 
               tDay <= endDay;
    });

    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No transactions found for this period.</td></tr>';
    } else {
        filtered.forEach(t => {
            let total = t.qty * t.price;
            if(t.type === 'IN') totalIn += total;
            else totalOut += total;

            let row = `
                <tr>
                    <td>${t.date}</td>
                    <td style="font-weight:bold; color:${t.type==='IN'?'green':'red'}">${t.type}</td>
                    <td>${t.category || '-'}</td>
                    <td>${t.item}</td>
                    <td>${t.refName}</td>
                    <td>${t.qty}</td>
                    <td>${t.price.toFixed(2)}</td>
                    <td>${total.toLocaleString()}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // Update Footer Totals
    document.getElementById('rep-total-in').innerText = '₱' + totalIn.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('rep-total-out').innerText = '₱' + totalOut.toLocaleString(undefined, {minimumFractionDigits: 2});
}

// --- OVERVIEW REFRESH ---
function renderOverview() {
    // KPI
    let activeP = projects.length; // Simplified active count
    let stockVal = transactions.filter(t=>t.type==='IN').reduce((a,b)=>a+(b.qty*b.price),0) - transactions.filter(t=>t.type==='OUT').reduce((a,b)=>a+(b.qty*b.price),0); // Simplified value logic
    
    // Total Expenses (Project + Overhead if any)
    let totalExp = transactions.filter(t=>t.type==='OUT').reduce((a,b)=>a+(b.qty*b.price),0);
    
    // Remaining Fund (Assumption: Initial Capital - Expenses + Income if any)
    // For this simple version, let's just show Budget vs Expense across all projects
    let totalBudget = projects.reduce((a,b)=>a+b.budget,0);
    let net = totalBudget - totalExp;

    document.getElementById('ov-active-proj').innerText = activeP;
    document.getElementById('ov-stock-val').innerText = '₱' + stockVal.toLocaleString();
    document.getElementById('ov-total-exp').innerText = '₱' + totalExp.toLocaleString();
    document.getElementById('ov-net-fund').innerText = '₱' + net.toLocaleString();

    // Recent Table
    let rec = transactions.slice().sort((a,b)=>b.id - a.id).slice(0, 5);
    document.getElementById('ov-recent-tbl').innerHTML = rec.map(t => `
        <tr>
            <td>${t.date}</td>
            <td><span class="badge ${t.type==='IN'?'bg-green':'bg-orange'}">${t.type}</span></td>
            <td>${t.item}</td>
            <td>₱${(t.qty*t.price).toLocaleString()}</td>
            <td>${t.refName}</td>
        </tr>
    `).join('');

    // Alerts (Low Stock)
    let alertDiv = document.getElementById('alert-feed');
    alertDiv.innerHTML = '';
    
    // Check low stock
    let items = [...new Set(transactions.map(t=>t.item))];
    let alerts = 0;
    items.forEach(i => {
        let inQ = transactions.filter(x=>x.item===i && x.type==='IN').reduce((a,b)=>a+b.qty,0);
        let outQ = transactions.filter(x=>x.item===i && x.type==='OUT').reduce((a,b)=>a+b.qty,0);
        let bal = inQ - outQ;
        if(bal < 10) {
            alerts++;
            alertDiv.innerHTML += `<div class="alert-item alert-warning"><span><b>Low Stock:</b> ${i} (${bal} left)</span> <button class="btn btn-sec" style="padding:2px 8px; font-size:0.7rem;" onclick="switchView('warehouse')">View</button></div>`;
        }
    });

    if(alerts === 0) alertDiv.innerHTML = `<div class="alert-item alert-good">All systems nominal. No critical alerts.</div>`;
}
    // --- SECURITY & EDIT LOGIC ---
    
    // 1. Settings
    const ADMIN_PASSCODE = "admin123"; // Ito ang password mo. Pwede mong palitan.
    let pendingAction = null;      // Dito ise-save kung anong gusto gawin ng user (EDIT or DELETE)

    // 2. Open Passcode Modal
    function requireAuth(action) {
        pendingAction = action; 
        document.getElementById('auth-input').value = ''; // Clear input
        document.getElementById('modal-auth').style.display = 'flex';
    }

    // 3. Verify Passcode
    function verifyPasscode() {
        const input = document.getElementById('auth-input').value;
        
        if (input === ADMIN_PASSCODE) {
            closeModals(); // Close auth modal
            
            if (pendingAction === 'DELETE') {
                performDelete();
            } else if (pendingAction === 'EDIT') {
                openEditModal();
            }
        } else {
            alert("❌ Incorrect Passcode! Access Denied.");
        }
    }

    // 4. Perform Delete
    function performDelete() {
        if(confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            // Remove project from array
            projects = projects.filter(p => p.id !== currentProjId);
            
            // Optional: Remove transactions related to this project (Clean up)
            // transactions = transactions.filter(t => t.refId !== currentProjId);

            localStorage.setItem('ps6_projects', JSON.stringify(projects));
            // localStorage.setItem('ps6_trans', JSON.stringify(transactions)); // Uncomment kung gusto mo pati history mabura

            currentProjId = null;
            document.getElementById('project-details-panel').innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">Select a project to view details</div>';
            renderProjectList();
            renderOverview();
            alert("Project Deleted Successfully.");
        }
    }

    // 5. Open Edit Modal (Pre-fill Data)
    function openEditModal() {
        let p = projects.find(x => x.id === currentProjId);
        document.getElementById('edit-p-name').value = p.name;
        document.getElementById('edit-p-budget').value = p.budget;
        document.getElementById('edit-p-date').value = p.deadline;
        
        document.getElementById('modal-edit-proj').style.display = 'flex';
    }

    // 6. Save Edited Data
    function saveEditedProject() {
        let name = document.getElementById('edit-p-name').value;
        let budget = parseFloat(document.getElementById('edit-p-budget').value);
        let deadline = document.getElementById('edit-p-date').value;

        if (name && budget) {
            // Update Array
            let index = projects.findIndex(p => p.id === currentProjId);
            if (index !== -1) {
                projects[index].name = name;
                projects[index].budget = budget;
                projects[index].deadline = deadline;
                
                // Save to Storage
                localStorage.setItem('ps6_projects', JSON.stringify(projects));
                
                // Refresh View
                closeModals();
                loadProjectDetails(currentProjId);
                alert("Project Updated!");
            }
        } else {
            alert("Please fill in all fields.");
        }
    }
        // --- BATCH TRANSACTION LOGIC ---

    // 1. Buksan ang Modal at i-reset ang laman
    function openBatchModal(type) {
        // ... (ibang codes mo dito) ...

        // ISINGIT ITO DITO:
        updateInventorySuggestions(type); // <--- Refresh the list based on stock

        let container = document.getElementById(type === 'IN' ? 'modal-batch-in' : 'modal-batch-out');
        let rowContainer = document.getElementById(type === 'IN' ? 'batch-in-container' : 'batch-out-container');
        
        rowContainer.innerHTML = ''; // Clear previous data
        addBatchRow(type); // Maglagay ng isang row agad
        
        if (type === 'OUT') {
            if (!currentProjId) { alert("Select a project first!"); return; }
            let p = projects.find(x => x.id === currentProjId);
            document.getElementById('batch-project-name').innerText = "For: " + p.name;
        }

        container.style.display = 'flex';
    }

    // 2. Magdagdag ng Input Row sa HTML
    function addBatchRow(type) {
        let container = document.getElementById(type === 'IN' ? 'batch-in-container' : 'batch-out-container');
        let div = document.createElement('div');
        div.className = 'batch-row'; 
        
        let pricePlaceholder = type === 'IN' ? 'Cost per Unit' : 'Price per Unit';

        // NOTE: Pansinin ang attribute na list="inventory-list" sa unang input
        div.innerHTML = `
            <input type="text" class="inp col-name" placeholder="Item Name" list="inventory-list" required autocomplete="off">
            <input type="number" class="inp col-qty" placeholder="Qty" required>
            <input type="number" class="inp col-price" placeholder="${pricePlaceholder}" required>
            <button class="btn-x" onclick="this.parentElement.remove()" title="Remove">✖</button>
        `;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    // 3. I-save ang Lahat ng Rows
    function saveBatchTransaction(type) {
        let container = document.getElementById(type === 'IN' ? 'batch-in-container' : 'batch-out-container');
        let rows = container.querySelectorAll('.batch-row');
        let date = new Date().toISOString().split('T')[0];
        let newTrans = [];
        let isValid = true;

        if (rows.length === 0) { alert("No items to save."); return; }

        // Loop sa bawat row para kunin ang data
        rows.forEach(row => {
            let item = row.querySelector('.col-name').value.trim();
            let qty = parseFloat(row.querySelector('.col-qty').value);
            let price = parseFloat(row.querySelector('.col-price').value);

            if (!item || !qty || !price) {
                isValid = false;
                row.style.border = "1px solid red"; // Highlight error
            } else {
                row.style.border = "none";
                newTrans.push({
                    id: Date.now() + Math.random(), // Unique ID
                    date: date,
                    type: type,
                    item: item,
                    qty: qty,
                    price: price,
                    category: type === 'IN' ? document.getElementById('filter-cat').value : 'Project', // Auto category
                    refId: type === 'OUT' ? currentProjId : null
                });
            }
        });

        if (!isValid) {
            alert("Please fill in all fields correctly.");
            return;
        }

        // Add to main transactions array
        transactions.push(...newTrans);
        
        // Save & Refresh
        localStorage.setItem('ps6_trans', JSON.stringify(transactions));
        closeModals();
        renderOverview();
        
        if (type === 'IN') {
            renderWarehouse();
            alert(`Successfully Received ${newTrans.length} Items!`);
        } else {
            loadProjectDetails(currentProjId);
            alert(`Successfully Deployed ${newTrans.length} Items!`);
        }
    }
        // Update Suggestions List
    function updateInventorySuggestions(type) {
        let datalist = document.getElementById('inventory-list');
        datalist.innerHTML = ''; // Linisin muna
        
        // 1. Kunin ang lahat ng Unique Items
        let items = [...new Set(transactions.map(t => t.item))];
        
        items.forEach(item => {
            // 2. Compute Stock Level
            let all = transactions.filter(t => t.item === item);
            let inQty = all.filter(t => t.type === 'IN').reduce((a,b)=>a+b.qty,0);
            let outQty = all.filter(t => t.type === 'OUT').reduce((a,b)=>a+b.qty,0);
            let stock = inQty - outQty;

            // 3. Logic: 
            // Kung "OUT" (Deploy) transaction, ipakita lang kung may Stock > 0.
            // Kung "IN" (Receive), ipakita lahat (para madali mag-restock).
            if (type === 'OUT' && stock <= 0) return; 

            // 4. Gumawa ng Option sa listahan
            let option = document.createElement('option');
            option.value = item; 
            
            // Optional: Ipakita ang stock sa tabi ng pangalan (ex: "Cement - Stock: 50")
            if (type === 'OUT') {
                option.label = `Available: ${stock}`;
            }
            
            datalist.appendChild(option);
        });
    }
        // --- INVENTORY MANAGEMENT (Edit & Delete) ---

    // 1. EDIT ITEM NAME
    function editItem(oldName) {
        // Humingi ng bagong pangalan
        let newName = prompt(`Rename "${oldName}" to:`, oldName);
        
        // Validation: Kung walang tinype o same lang, cancel na.
        if (!newName || newName === oldName) return;

        // Update lahat ng transactions na may ganitong item name
        let count = 0;
        transactions.forEach(t => {
            if (t.item === oldName) {
                t.item = newName; // Palitan ang pangalan
                count++;
            }
        });

        // Save & Refresh
        localStorage.setItem('ps6_trans', JSON.stringify(transactions));
        renderOverview();
        renderWarehouse();
        alert(`Successfully updated ${count} records from "${oldName}" to "${newName}".`);
    }

    // 2. DELETE ITEM (Global Delete)
    function deleteItem(itemToDelete) {
        // Confirmation (Safety Check)
        if (!confirm(`⚠️ WARNING: Are you sure you want to delete ALL records of "${itemToDelete}"?\n\nThis will remove it from Warehouse and Project History permanently.`)) {
            return;
        }

        // Filter out (Alisin) lahat ng transactions na may pangalang ito
        let initialLength = transactions.length;
        transactions = transactions.filter(t => t.item !== itemToDelete);
        
        let deletedCount = initialLength - transactions.length;

        // Save & Refresh
        localStorage.setItem('ps6_trans', JSON.stringify(transactions));
        renderOverview();
        renderWarehouse();
        
        // Re-calculate Projects (Important para ma-update ang project costs)
        if (typeof currentProjId !== 'undefined') loadProjectDetails(currentProjId);
        
        alert(`Deleted "${itemToDelete}" and its ${deletedCount} history records.`);
    }
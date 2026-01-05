// Admin script using Fetch API for backend connection

// --- TABS LOGIC ---
window.showSection = function (sectionId) {
    document.getElementById('complaintsSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
    if (document.getElementById('reportsSection')) document.getElementById('reportsSection').style.display = 'none';
    if (document.getElementById('verificationSection')) document.getElementById('verificationSection').style.display = 'none';
    if (document.getElementById('settingsSection')) document.getElementById('settingsSection').style.display = 'none';

    if (sectionId === 'complaints') {
        document.getElementById('complaintsSection').style.display = 'block';
    } else if (sectionId === 'reports') {
        document.getElementById('reportsSection').style.display = 'block';
        renderReports();
        setupReportControls();
    } else if (sectionId === 'verification') {
        document.getElementById('verificationSection').style.display = 'block';
        renderPendingPayments();
    } else if (sectionId === 'settings') {
        document.getElementById('settingsSection').style.display = 'block';
        renderAccounts();
    } else {
        document.getElementById('usersSection').style.display = 'block';
    }
}

// Global data holders
let allUsers = {};
let allUserDocs = [];
let allComplaints = []; // Added to store complaints for modal access

// --- FETCH COMPLAINTS & USERS ---
async function loadServerData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();

        allComplaints = data.complaints || []; // Store globally
        renderComplaints(allComplaints);

        // Simplified data storage
        allUsers = {};
        data.users.forEach(u => allUsers[u.id] = u);

        // Render table
        renderUsers(data.users || []);

        // Store payments if they exist
        window.allPayments = data.payments || [];

        // Update billing summary
        updateBillingSummary(data.users || []);

        // Refresh reports if visible
        const reportsSec = document.getElementById('reportsSection');
        if (reportsSec && reportsSec.style.display === 'block') {
            renderReports();
        }

        // Update DB Status Indicator
        const dbStatusEl = document.getElementById('dbStatus');
        if (dbStatusEl) {
            if (data.isCloud) {
                dbStatusEl.innerText = "☁️ Cloud Synced";
                dbStatusEl.style.backgroundColor = "#059669";
                dbStatusEl.style.color = "white";
            } else {
                dbStatusEl.innerText = "⚠️ Temporary Mode (Local)";
                if (data.cloudError) {
                    const err = data.cloudError.toLowerCase();
                    if (err.includes("auth") || err.includes("password")) {
                        dbStatusEl.innerText += " (Wrong Password)";
                    } else if (err.includes("ip") || err.includes("whitelist")) {
                        dbStatusEl.innerText += " (IP Blocked)";
                    } else {
                        dbStatusEl.title = "Detailed Error: " + data.cloudError;
                    }
                }
                dbStatusEl.style.backgroundColor = "#b45309";
                dbStatusEl.style.color = "white";
            }
        }

        // Populate User Select in Payment Modal
        populatePaymentUserSelect(data.users || []);

        // Store accounts globally
        window.allAccounts = data.accounts || [];
        if (document.getElementById('settingsSection') && document.getElementById('settingsSection').style.display === 'block') {
            renderAccounts();
        }
    } catch (e) {
        console.error("Error loading data:", e);
    }
}

function renderComplaints(complaints) {
    const complaintsList = document.getElementById('complaintsList');
    complaintsList.innerHTML = '';

    if (complaints.length === 0) {
        complaintsList.innerHTML = '<p style="text-align: center;">No complaints found</p>';
        return;
    }

    // Sort by timestamp desc
    complaints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    complaints.forEach((data) => {
        let dateString = new Date(data.timestamp).toLocaleString();
        const card = document.createElement('div');
        card.className = 'complaint-card';
        card.innerHTML = `
            <div class="complaint-header">
                <span class="user-name">${escapeHtml(data.name)}</span>
                <span class="timestamp">${dateString}</span>
            </div>
            <div>
                <p><strong>Type:</strong> ${data.type || 'General'}</p>
                <p><strong>Msg:</strong> ${escapeHtml(data.message)}</p>
                ${data.adminReply ? `
                <div class="admin-reply-box">
                    <p style="margin:0; font-weight:600; font-size:0.85rem; color: #4caf50;">Your Reply:</p>
                    <p style="margin:5px 0 0 0; font-size:0.9rem;">${escapeHtml(data.adminReply)}</p>
                </div>
                ` : ''}
                <div style="margin-top:10px; font-size:0.85em; color:#666; display: flex; justify-content: space-between; align-items: flex-end;">
                    <span>Phone: ${escapeHtml(data.phone)} | Email: ${escapeHtml(data.email)}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary reply-complaint-btn" data-id="${data.id}" style="width: auto; padding: 5px 12px; font-size: 0.8em; background-color: var(--primary-color);">Reply</button>
                        <button class="btn-delete delete-complaint-btn" data-id="${data.id}">Delete</button>
                    </div>
                </div>
            </div>
        `;
        complaintsList.appendChild(card);
    });

    document.querySelectorAll('.reply-complaint-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            openReplyModal(id);
        });
    });

    document.querySelectorAll('.delete-complaint-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm("Are you sure you want to delete this complaint?")) {
                const id = e.target.getAttribute('data-id');
                try {
                    const res = await fetch('/api/complaints/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    if (res.ok) loadServerData();
                } catch (err) {
                    alert("Error deleting: " + err.message);
                }
            }
        });
    });
}

// 1. CHECK AUTH
const storedUser = localStorage.getItem("wifi_user");
if (!storedUser) {
    window.location.href = "index.html";
}

const currentUser = JSON.parse(storedUser);

// ROLE PROTECTION: Only Role 1 (Admin) can access this page
if (currentUser.role !== 1) {
    if (currentUser.role === 2) {
        window.location.href = "dashboard.html";
    } else {
        window.location.href = "index.html";
    }
}

// Display Admin Name
if (document.getElementById('adminWelcomeName')) {
    document.getElementById('adminWelcomeName').innerText = `Welcome, ${currentUser.name}`;
}

// --- FETCH USERS ---
// Initial Load and periodic refresh
loadServerData();
setInterval(loadServerData, 5000); // Refresh every 5 seconds

// Search Logic
const userSearchInput = document.getElementById('userSearchInput');
if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = Object.values(allUsers).filter(u => {
            return (u.name?.toLowerCase().includes(term) || u.phone?.includes(term) || u.cnic?.includes(term));
        });
        renderUsers(filtered);
    });
}

// CSV Download Logic
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
if (downloadExcelBtn) {
    downloadExcelBtn.onclick = () => {
        const users = Object.values(allUsers);
        if (users.length === 0) {
            alert("No data to download");
            return;
        }

        const headers = ["Name", "Phone", "CNIC", "Address", "Email", "Package", "Monthly Fee", "Balance", "Start Date", "End Date"];
        const rows = users.map(u => [
            `"${u.name || ''}"`,
            `"${u.phone || ''}"`,
            `"${u.cnic || ''}"`,
            `"${u.address || ''}"`,
            `"${u.email || ''}"`,
            `"${u.package || ''}"`,
            `"${u.monthlyFee || ''}"`,
            `"${u.balance || ''}"`,
            `"${u.startDate || ''}"`,
            `"${u.endDate || ''}"`
        ]);

        let csvContent = "sep=,\n" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `wifi_users_${new Date().toLocaleDateString()}.csv`;
        link.click();
    };
}

// --- ADD USER MODAL LOGIC ---
const addModal = document.getElementById("userModal");
const addBtn = document.getElementById("addUserBtn");
const closeAdd = document.getElementById("closeAddModal");

if (addBtn) addBtn.onclick = () => addModal.style.display = "block";
if (closeAdd) closeAdd.onclick = () => addModal.style.display = "none";

// --- EDIT USER MODAL LOGIC ---
const editModal = document.getElementById("editUserModal");
const closeEdit = document.getElementById("closeEditModal");

if (closeEdit) closeEdit.onclick = () => editModal.style.display = "none";

// --- REPLY MODAL LOGIC ---
const replyModal = document.getElementById("replyModal");
const closeReply = document.getElementById("closeReplyModal");

if (closeReply) closeReply.onclick = () => replyModal.style.display = "none";

window.onclick = (event) => {
    if (event.target == addModal) addModal.style.display = "none";
    if (event.target == editModal) editModal.style.display = "none";
    if (event.target == replyModal) replyModal.style.display = "none";
}

function openReplyModal(compId) {
    const comp = allComplaints.find(c => c.id === compId);
    if (!comp) return;

    document.getElementById('replyComplaintId').value = compId;
    document.getElementById('userMessagePreview').innerText = comp.message;
    document.getElementById('adminReplyText').value = comp.adminReply || "";
    replyModal.style.display = "block";
}

// Handle Reply Submit
document.getElementById('adminReplyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const compId = document.getElementById('replyComplaintId').value;
    const replyText = document.getElementById('adminReplyText').value;
    console.log("Admin submitting reply for:", compId, "Text:", replyText);
    const btn = e.target.querySelector('button');
    btn.innerText = "Sending...";

    try {
        const res = await fetch('/api/complaints/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: compId, reply: replyText })
        });

        const contentType = res.headers.get("content-type");
        if (res.ok) {
            alert("Reply Sent!");
            replyModal.style.display = "none";
            loadServerData();
        } else if (contentType && contentType.indexOf("application/json") !== -1) {
            const errData = await res.json();
            alert("Error: " + (errData.error || "Failed to send reply"));
        } else {
            const textError = await res.text();
            alert("Server Error (404/500): " + textError);
        }
    } catch (err) {
        alert("Network Error: " + err.message);
    } finally {
        btn.innerText = "Send Reply";
    }
});

// Make functions global for inline onclick
window.openEditModal = openEditModal;

function openEditModal(uid) {
    const user = allUsers[uid];
    if (!user) return;

    document.getElementById('editUserId').value = uid;
    document.getElementById('editCustomId').value = user.customId || "";
    document.getElementById('editPackage').value = user.package || "";
    document.getElementById('editFee').value = user.monthlyFee || "";
    document.getElementById('editBalance').value = user.balance || "";
    document.getElementById('editStart').value = user.startDate || "";
    document.getElementById('editEnd').value = user.endDate || "";
    document.getElementById('editCnic').value = user.cnic || "";
    if (document.getElementById('editAddress')) document.getElementById('editAddress').value = user.address || "";

    editModal.style.display = "block";
}

// Auto-calculate end date in edit modal when start date changes
document.getElementById('editStart').addEventListener('change', (e) => {
    const startVal = e.target.value;
    if (startVal) {
        const d = new Date(startVal);
        d.setMonth(d.getMonth() + 1);
        document.getElementById('editEnd').value = d.toISOString().split('T')[0];
    }
});

// Handle Edit Submit
document.getElementById('adminEditUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('editUserId').value;
    const btn = e.target.querySelector('button');
    btn.innerText = "Updating...";

    try {
        const res = await fetch('/api/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: uid,
                updates: {
                    package: document.getElementById('editPackage').value,
                    monthlyFee: document.getElementById('editFee').value,
                    balance: document.getElementById('editBalance').value,
                    startDate: document.getElementById('editStart').value,
                    endDate: document.getElementById('editEnd').value,
                    cnic: document.getElementById('editCnic').value,
                    customId: document.getElementById('editCustomId').value,
                    address: document.getElementById('editAddress') ? document.getElementById('editAddress').value : allUsers[uid].address
                }
            })
        });

        if (res.ok) {
            alert("User Details Updated!");
            editModal.style.display = "none";
            loadServerData();
        } else {
            const errData = await res.json();
            alert("Failed to update: " + (errData.error || "Server Error"));
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = "Update Details";
    }
});

// Handle manual add user
document.getElementById('adminAddUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "Adding...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customId: document.getElementById('adminCustomId').value,
                name: document.getElementById('adminName').value,
                phone: document.getElementById('adminPhone').value,
                cnic: document.getElementById('adminCnic').value,
                address: document.getElementById('adminAddress').value,
                email: document.getElementById('adminEmail').value,
                password: document.getElementById('adminPassword').value || "123",
                note: document.getElementById('adminNote').value,
                role: parseInt(document.getElementById('adminRole').value) || 2,
                package: "0",
                monthlyFee: "0",
                balance: "0",
                startDate: "-",
                endDate: "-"
            })
        });

        if (res.ok) {
            alert("User Added! Default password is '123'");
            addModal.style.display = "none";
            document.getElementById('adminAddUserForm').reset();
            loadServerData();
        } else {
            const errData = await res.json();
            alert("Error: " + (errData.error || "Failed to add user"));
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = "Save User";
        btn.disabled = false;
    }
});

function renderUsers(users) {
    const userTableBody = document.getElementById('adminUsersTableBody');
    const adminTableBody = document.getElementById('adminAdminsTableBody');
    if (!userTableBody || !adminTableBody) return;

    userTableBody.innerHTML = '';
    adminTableBody.innerHTML = '';

    const admins = users.filter(u => u.role === 1);
    const customers = users.filter(u => u.role === 2);

    // Render Admins
    if (admins.length === 0) {
        adminTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No administrators found</td></tr>';
    } else {
        admins.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${u.profilePic || 'https://via.placeholder.com/30?text=A'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;"></td>
                <td>${escapeHtml(u.name)}</td>
                <td>${u.phone}</td>
                <td style="font-size: 0.8em;">${u.cnic || '-'}</td>
                <td style="font-size: 0.8em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.address || '-'}</td>
                <td style="color: var(--primary-color); font-weight:600;">Admin</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="window.openEditModal('${u.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.8em; background-color: #007bff; width: auto;">Edit</button>
                        <button onclick="window.deleteUser('${u.id}')" class="btn-delete" style="padding: 4px 8px; font-size: 0.8em; width: auto;">Delete</button>
                    </div>
                </td>
            `;
            adminTableBody.appendChild(tr);
        });
    }

    // Render Customers
    if (customers.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center;">No customers found</td></tr>';
    } else {
        customers.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(u.customId || '-')}</strong></td>
                <td><img src="${u.profilePic || 'https://via.placeholder.com/30?text=U'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;"></td>
                <td>${escapeHtml(u.name)}</td>
                <td>${u.phone}</td>
                <td style="font-size: 0.8em;">${u.cnic || '-'}</td>
                <td style="font-size: 0.8em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.address || '-'}</td>
                <td>${u.package || '0'}</td>
                <td>${u.monthlyFee || '0'}</td>
                <td style="color:red; font-weight:bold;">${u.balance || '0'}</td>
                <td style="font-size: 0.8em;">${u.startDate || '-'}</td>
                <td style="font-size: 0.8em;">${calculateEndDate(u.startDate) || u.endDate || '-'}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="window.openEditModal('${u.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.8em; background-color: #007bff; width: auto;">Edit</button>
                        <button onclick="window.deleteUser('${u.id}')" class="btn-delete" style="padding: 4px 8px; font-size: 0.8em; width: auto;">Delete</button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(tr);
        });
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateBillingSummary(users) {
    let totalMonthlyFee = 0;
    let totalRemainingBalance = 0;

    users.forEach(u => {
        const fee = parseFloat(u.monthlyFee) || 0;
        const balance = parseFloat(u.balance) || 0;

        totalMonthlyFee += fee;
        totalRemainingBalance += balance;
    });

    // Calculate collected amount based on Monthly Fee vs Pending Balance
    const totalCollected = Math.max(0, totalMonthlyFee - totalRemainingBalance);

    console.log("📊 Billing Summary Update:", {
        totalMonthlyFee,
        totalRemainingBalance,
        totalCollected
    });

    const feeEl = document.getElementById('totalMonthlyFee');
    const balanceEl = document.getElementById('totalRemainingBalance');
    const collectedEl = document.getElementById('totalCollectedAmount');

    if (feeEl) feeEl.innerText = `Rs. ${totalMonthlyFee.toLocaleString()}`;
    if (balanceEl) balanceEl.innerText = `Rs. ${totalRemainingBalance.toLocaleString()}`;
    if (collectedEl) collectedEl.innerText = `Rs. ${totalCollected.toLocaleString()}`;
}

window.deleteUser = async function (uid) {
    const user = allUsers[uid];
    if (!user) return;

    // Prevention: Admin cannot delete themselves
    if (uid === currentUser.id) {
        alert("You cannot delete your own admin account!");
        return;
    }

    if (confirm(`Are you sure you want to delete user: ${user.name}? This action cannot be undone.`)) {
        try {
            const res = await fetch('/api/users/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: uid })
            });

            if (res.ok) {
                alert("User deleted successfully!");
                loadServerData();
            } else {
                const errData = await res.json();
                alert("Error: " + (errData.error || "Failed to delete user"));
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    }
}
function populatePaymentUserSelect(users) {
    const select = document.getElementById('payUserId');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select a user...</option>';
    users.filter(u => u.role === 2).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.innerText = `${u.name} (${u.phone})`;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

// Handle Record Payment
if (document.getElementById('recordPaymentForm')) {
    document.getElementById('recordPaymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerText = "Recording...";
        btn.disabled = true;

        const userId = document.getElementById('payUserId').value;
        const amount = document.getElementById('payAmount').value;
        const month = document.getElementById('payMonth').value;
        const user = allUsers[userId];

        try {
            const res = await fetch('/api/payments/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userName: user.name,
                    amount: parseFloat(amount),
                    month: month + " " + new Date().getFullYear()
                })
            });

            if (res.ok) {
                alert("Payment Recorded!");
                document.getElementById('paymentModal').style.display = 'none';
                e.target.reset();
                loadServerData();
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            btn.innerText = "Record Payment";
            btn.disabled = false;
        }
    });
}

function renderReports() {
    const tbody = document.getElementById('adminReportsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const users = Object.values(allUsers).filter(u => u.role === 2);
    const payments = window.allPayments || [];

    // Event Listeners for new controls
    const filterEl = document.getElementById('reportFilter');
    const downloadBtn = document.getElementById('downloadReportBtn');
    const addMonthContainer = document.getElementById('addMonthContainer');

    if (filterEl) {
        filterEl.onchange = () => {
            renderReports();
            if (filterEl.value === 'all') {
                if (addMonthContainer) addMonthContainer.style.display = 'flex';
            } else {
                if (addMonthContainer) addMonthContainer.style.display = 'none';
            }
        };
    }

    // Initial UI State check
    if (filterEl && addMonthContainer) {
        if (filterEl.value === 'all') {
            addMonthContainer.style.display = 'flex';
        } else {
            addMonthContainer.style.display = 'none';
        }
    }

    if (downloadBtn) downloadBtn.onclick = () => downloadReport();

    const filter = filterEl ? filterEl.value : 'all'; // Default to 'all' to show features

    // Calculate Projected (Total fees of all customers)
    let projectedMonthly = 0;
    users.forEach(u => projectedMonthly += (parseFloat(u.monthlyFee) || 0));

    // Determine loop range based on filter
    let loopMonths = [];

    if (filter === 'current') {
        loopMonths = [months[new Date().getMonth()] + " " + currentYear];
    } else {
        // Custom Mode: Load from storage or default
        const stored = localStorage.getItem('wifi_admin_report_months');
        if (stored) {
            loopMonths = JSON.parse(stored);
        } else {
            // Default: All months of current year
            loopMonths = months.map(m => m + " " + currentYear);
            localStorage.setItem('wifi_admin_report_months', JSON.stringify(loopMonths));
        }

        // Ensure container is visible if it was hidden
        if (addMonthContainer) addMonthContainer.style.display = 'flex';
    }

    // Calculate Total Real-time Pending Balance for synchronization
    let totalRealtimePending = 0;
    users.forEach(u => totalRealtimePending += (parseFloat(u.balance) || 0));

    const currentMonthStr = months[new Date().getMonth()] + " " + currentYear;

    loopMonths.forEach(monthYear => {
        let collected = 0;
        let pending = 0;

        if (monthYear === currentMonthStr) {
            // SYNC WITH CARDS: Use current user balances for the current month row
            pending = totalRealtimePending;
            collected = Math.max(0, projectedMonthly - pending);
        } else {
            // HISTORY: Use payment records for past/other months
            collected = payments
                .filter(p => p.month === monthYear)
                .reduce((sum, p) => sum + (p.amount || 0), 0);
            pending = Math.max(0, projectedMonthly - collected);
        }

        const row = document.createElement('tr');

        // Delete Button HTML (Only for Custom View)
        let actionHtml = '';
        if (filter !== 'current') {
            actionHtml = `<button onclick="deleteReportMonth('${monthYear}')" class="btn-delete" style="padding: 4px 8px; width: auto;">&times;</button>`;
        } else {
            actionHtml = `<span style="color: #ccc;">-</span>`;
        }

        row.innerHTML = `
            <td><strong>${monthYear}</strong></td>
            <td style="font-weight: 600;">Rs. ${projectedMonthly.toLocaleString()}</td>
            <td style="color: var(--accent-color); font-weight: bold;">Rs. ${collected.toLocaleString()}</td>
            <td style="color: ${pending > 0 ? 'var(--danger-color)' : 'var(--text-light)'}; font-weight: bold;">Rs. ${pending.toLocaleString()}</td>
            <td style="text-align: center;">${actionHtml}</td>
        `;
        tbody.appendChild(row);
    });
}

// SETUP CONTROLS (Only run once or safely idempotent)
function setupReportControls() {
    const addBtn = document.getElementById('addMonthBtn');
    // Removing old listeners via cloning or just checking attribute
    if (addBtn && !addBtn.hasAttribute('listener-added')) {
        addBtn.setAttribute('listener-added', 'true');
        addBtn.addEventListener('click', () => {
            const m = document.getElementById('newReportMonth').value;
            const y = document.getElementById('newReportYear').value || new Date().getFullYear();
            const newMonthStr = `${m} ${y}`;

            let currentList = JSON.parse(localStorage.getItem('wifi_admin_report_months') || "[]");
            if (!currentList.includes(newMonthStr)) {
                currentList.push(newMonthStr);
                // Sort logic (optional, but good for UX - by year then month index)
                // Simple sort for now or just append
                localStorage.setItem('wifi_admin_report_months', JSON.stringify(currentList));
                renderReports();
                alert(`Added ${newMonthStr} to view.`);
            } else {
                alert("Month already exists in view.");
            }
        });
    }
}

// Expose delete function
window.deleteReportMonth = function (monthStr) {
    if (!confirm(`Remove ${monthStr} from this view?`)) return;

    let currentList = JSON.parse(localStorage.getItem('wifi_admin_report_months') || "[]");
    currentList = currentList.filter(m => m !== monthStr);
    localStorage.setItem('wifi_admin_report_months', JSON.stringify(currentList));
    renderReports();
};

function downloadReport() {
    const tbody = document.getElementById('adminReportsTableBody');
    if (!tbody || tbody.rows.length === 0) {
        alert("No report data to download.");
        return;
    }

    const headers = ["Month", "Projected Income", "Collected Amount", "Remaining (Pending)"];
    const rows = [];

    // Extract data directly from the rendered table to match what is seen
    Array.from(tbody.rows).forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 4) {
            rows.push([
                `"${cells[0].innerText}"`, // Month
                `"${cells[1].innerText.replace('Rs. ', '').replace(/,/g, '')}"`, // Projected
                `"${cells[2].innerText.replace('Rs. ', '').replace(/,/g, '')}"`, // Collected
                `"${cells[3].innerText.replace('Rs. ', '').replace(/,/g, '')}"`  // Pending
            ]);
        }
    });

    let csvContent = "sep=,\n" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billing_report_${new Date().toDateString()}.csv`;
    link.click();
}

function renderPendingPayments() {
    const list = document.getElementById('pendingPaymentsList');
    if (!list) return;

    const payments = (window.allPayments || []).filter(p => p.status === 'pending');
    list.innerHTML = '';

    if (payments.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-light);">No pending verifications.</p>';
        return;
    }

    payments.forEach(p => {
        const div = document.createElement('div');
        div.className = 'complaint-card'; // Reuse styling
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="color: var(--primary-color);">${escapeHtml(p.userName)}</h4>
                    <p style="font-size: 0.9rem;"><strong>Amount:</strong> Rs. ${p.amount}</p>
                    <p style="font-size: 0.9rem;"><strong>Month:</strong> ${p.month}</p>
                    <p style="font-size: 0.9rem;"><strong>Tx ID:</strong> ${p.transactionId || 'N/A'}</p>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.75rem; color: var(--text-light);">${new Date(p.timestamp).toLocaleString()}</span>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <button class="btn-primary" onclick="viewProof('${p.id}')" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: var(--border-color);">View Slip</button>
                        <button class="btn-primary" onclick="approvePayment('${p.id}')" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: var(--accent-color);">Approve</button>
                        <button class="btn-delete" onclick="rejectPayment('${p.id}')" style="width: auto; padding: 4px 10px; font-size: 0.75rem;">Reject</button>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

window.viewProof = function (pid) {
    const pay = window.allPayments.find(p => p.id === pid);
    if (!pay || !pay.proof) {
        alert("No proof image found.");
        return;
    }
    document.getElementById('proofImage').src = pay.proof;
    document.getElementById('proofModal').style.display = 'block';
}

window.approvePayment = async function (pid) {
    if (!confirm("Are you sure you want to approve this payment?")) return;
    try {
        const res = await fetch('/api/payments/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pid })
        });
        if (res.ok) {
            alert("Payment Approved!");
            loadServerData();
            setTimeout(renderPendingPayments, 500);
        }
    } catch (e) { alert("Error: " + e.message); }
}

window.rejectPayment = async function (pid) {
    if (!confirm("Are you sure you want to reject this payment?")) return;
    try {
        const res = await fetch('/api/payments/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pid })
        });
        if (res.ok) {
            alert("Payment Rejected.");
            loadServerData();
            setTimeout(renderPendingPayments, 500);
        }
    } catch (e) { alert("Error: " + e.message); }
}

// --- SETTINGS / ACCOUNTS MANAGEMENT ---
function renderAccounts() {
    const list = document.getElementById('accountsList');
    if (!list) return;

    list.innerHTML = '';
    const accounts = window.allAccounts || [];

    if (accounts.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-light);">No accounts added.</p>';
        return;
    }

    accounts.forEach(acc => {
        const div = document.createElement('div');
        div.className = 'complaint-card';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <div>
                <strong style="color: var(--primary-color);">${escapeHtml(acc.type)}</strong>: ${escapeHtml(acc.name)} 
                <p style="font-size: 0.9rem; color: var(--text-light);">${escapeHtml(acc.details)}</p>
            </div>
            <button class="btn-delete" onclick="deleteAccount('${acc.id}')" style="width: auto;">Delete</button>
        `;
        list.appendChild(div);
    });
}

// Global exposure for onclick
window.deleteAccount = async function (id) {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
        const res = await fetch('/api/accounts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (res.ok) {
            alert("Account deleted!");
            loadServerData(); // Will refresh UI
            setTimeout(renderAccounts, 500);
        }
    } catch (e) { alert("Error: " + e.message); }
}

if (document.getElementById('addAccountForm')) {
    document.getElementById('addAccountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerText = "Adding...";
        btn.disabled = true;

        const type = document.getElementById('accType').value;
        const name = document.getElementById('accName').value;
        const details = document.getElementById('accDetails').value;

        try {
            const res = await fetch('/api/accounts/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, name, details })
            });

            if (res.ok) {
                alert("Account Added!");
                e.target.reset();
                loadServerData();
                setTimeout(renderAccounts, 500);
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            btn.innerText = "+ Add Account";
            btn.disabled = false;
        }
    });
}

function calculateEndDate(startDate) {
    if (!startDate || startDate === "-" || startDate === "") return null;
    try {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) return null; // Invalid date check
        start.setMonth(start.getMonth() + 1);
        return start.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
}

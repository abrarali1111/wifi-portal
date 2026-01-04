// Admin script using Fetch API for backend connection

// --- TABS LOGIC ---
window.showSection = function (sectionId) {
    document.getElementById('complaintsSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
    if (document.getElementById('reportsSection')) document.getElementById('reportsSection').style.display = 'none';

    if (sectionId === 'complaints') {
        document.getElementById('complaintsSection').style.display = 'block';
    } else if (sectionId === 'reports') {
        document.getElementById('reportsSection').style.display = 'block';
        renderReports();
        // Initialize Custom Report controls if any
        setupReportControls();
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

        // Populate User Select in Payment Modal
        populatePaymentUserSelect(data.users || []);
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
        adminTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No administrators found</td></tr>';
    } else {
        admins.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
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
        userTableBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">No customers found</td></tr>';
    } else {
        customers.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(u.customId || '-')}</strong></td>
                <td>${escapeHtml(u.name)}</td>
                <td>${u.phone}</td>
                <td style="font-size: 0.8em;">${u.cnic || '-'}</td>
                <td style="font-size: 0.8em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.address || '-'}</td>
                <td>${u.package || '0'}</td>
                <td>${u.monthlyFee || '0'}</td>
                <td style="color:red; font-weight:bold;">${u.balance || '0'}</td>
                <td style="font-size: 0.8em;">${u.startDate || '-'}</td>
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

    loopMonths.forEach(monthYear => {
        // Filter payments for this specific month
        const collected = payments
            .filter(p => p.month === monthYear)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const row = document.createElement('tr');
        const pending = projectedMonthly - collected;

        // Delete Button HTML (Only for Custom View)
        let actionHtml = '';
        if (filter !== 'current') {
            actionHtml = `<button onclick="deleteReportMonth('${monthYear}')" class="btn-delete" style="padding: 4px 8px; width: auto;">&times;</button>`;
        } else {
            actionHtml = `<span style="color: #ccc;">-</span>`;
        }

        row.innerHTML = `
            <td><strong>${monthYear}</strong></td>
            <td>Rs. ${projectedMonthly.toLocaleString()}</td>
            <td style="color: green; font-weight: bold;">Rs. ${collected.toLocaleString()}</td>
            <td style="color: ${pending > 0 ? 'red' : 'gray'};">Rs. ${pending.toLocaleString()}</td>
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

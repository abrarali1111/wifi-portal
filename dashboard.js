// Dashboard script using Fetch API for backend connection

// 1. CHECK AUTH
const storedUser = localStorage.getItem("wifi_user");
if (!storedUser) {
    window.location.href = "index.html";
}

const currentUser = JSON.parse(storedUser);
let userPayments = []; // Global to store for validation

// ROLE PROTECTION: Only Role 2 (User) can access this page
if (currentUser.role !== 2) {
    if (currentUser.role === 1) {
        window.location.href = "admin.html";
    } else {
        window.location.href = "index.html";
    }
}

// 2. REFRESH PROFILE FROM SERVER
async function refreshProfile() {
    try {
        const response = await fetch(`/api/user-data?phone=${currentUser.phone}`);
        const data = await response.json();

        const serverUser = data.user;
        if (serverUser) {
            localStorage.setItem("wifi_user", JSON.stringify(serverUser));
            updateUI(serverUser);
        }

        // Update other parts of dashboard with the SAME data we just got
        userPayments = data.payments || [];
        renderMyComplaints(data.complaints || []);
        renderMyPayments(data.payments || []);
        renderAccountsUI(data.accounts || []);

    } catch (e) {
        console.error("Dashboard refresh error:", e);
    }
}

function updateUI(user) {
    console.log("Updating UI with user:", user);
    if (!user) return;

    const setE = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    const fee = parseFloat(user.monthlyFee) || 0;
    const pending = parseFloat(user.balance) || 0;
    const paid = Math.max(0, fee - pending);

    setE('welcomeMsg', `Hello, ${user.name}`);
    setE('userCustomId', user.customId || "Not Assigned");
    setE('userName', user.name);
    setE('userCnic', user.cnic || "Not Added");
    setE('userPhone', user.phone);
    setE('userEmail', user.email || "-");
    setE('subPackage', user.package || "-");
    setE('subFee', fee + " PKR");
    setE('subPaid', paid + " PKR");
    setE('subBalance', pending + " PKR");
    setE('subStart', user.startDate || "-");
    setE('subAddress', user.address || "Not Added"); // Just in case
    setE('userAddress', user.address || "Not Added");

    // Date Logic: Exactly 1 month after startDate
    if (user.startDate && user.startDate !== "-" && user.startDate !== "") {
        try {
            const start = new Date(user.startDate);
            if (!isNaN(start.getTime())) {
                start.setMonth(start.getMonth() + 1);
                const end = start.toISOString().split('T')[0];
                setE('subEnd', end);
            } else {
                setE('subEnd', user.endDate || "-");
            }
        } catch (e) {
            console.error("Date calc error:", e);
            setE('subEnd', user.endDate || "-");
        }
    } else {
        setE('subEnd', user.endDate || "-");
    }
}

// Initial UI Fill
updateUI(currentUser);
refreshProfile();

// Periodically refresh profile and history
setInterval(() => {
    refreshProfile();
}, 5000);

// 3. FETCH USER'S COMPLAINTS
async function loadMyComplaints() {
    // Initial load only, thereafter it's handled by refreshProfile
    refreshProfile();
}

function renderMyComplaints(allComplaints) {
    const listDiv = document.getElementById('myComplaintsList');
    if (!listDiv) return;

    const myComplaints = allComplaints.filter(c => c.phone === currentUser.phone);

    listDiv.innerHTML = '';
    if (myComplaints.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #888;">No messages found.</p>';
        return;
    }

    // Sort desc
    myComplaints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    myComplaints.forEach(item => {
        let dateString = new Date(item.timestamp).toLocaleString();
        const card = document.createElement('div');
        card.className = 'complaint-card';
        card.innerHTML = `
                <div class="complaint-header">
                    <span class="user-name">You</span>
                    <span class="timestamp">${dateString}</span>
                </div>
                <div class="complaint-body">
                    <p><strong>[${item.type || 'General'}]</strong> ${escapeHtml(item.message)}</p>
                    ${item.adminReply ? `
                    <div class="admin-reply-box">
                        <p style="margin:0; font-weight:600; font-size:0.85rem; color: #4caf50;">Admin Reply:</p>
                        <p style="margin:5px 0 0 0; font-size:0.9rem;">${escapeHtml(item.adminReply)}</p>
                    </div>
                    ` : ''}
                    <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                        <button class="btn-delete delete-complaint-btn" data-id="${item.id}" style="width: auto; padding: 4px 10px; font-size: 0.75rem;">Delete</button>
                    </div>
                </div>
            `;
        listDiv.appendChild(card);
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
                    if (res.ok) loadMyComplaints();
                } catch (err) { alert("Error deleting: " + err.message); }
            }
        });
    });
}

loadMyComplaints();

async function loadAccounts() {
    // Initial load handled by refreshProfile
}

function renderAccountsUI(accounts) {
    const listDiv = document.getElementById('dynamicAccountsList');
    if (!listDiv) return;

    if (accounts.length === 0) {
        listDiv.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-light); text-align: center;">No payment methods available. Contact Admin.</p>';
        return;
    }

    listDiv.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 10px;">Please transfer the amount to one of the following accounts:</p>';

    accounts.forEach(acc => {
        const accDiv = document.createElement('div');
        accDiv.style.marginBottom = '10px';
        accDiv.innerHTML = `
                <p><strong>${escapeHtml(acc.type)}:</strong><br>${escapeHtml(acc.details)} (${escapeHtml(acc.name)})</p>
            `;
        listDiv.appendChild(accDiv);
    });
}

loadAccounts();

// 3.5 FETCH USER'S PAYMENTS
async function loadMyPayments() {
    // Initial load handled by refreshProfile or caller
}

function renderMyPayments(allPayments) {
    const body = document.getElementById('myPaymentHistoryBody');
    if (!body) return;

    const myPayments = allPayments.filter(p => p.userId === currentUser.id);

    body.innerHTML = '';
    if (myPayments.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888;">No payment records found.</td></tr>';
        return;
    }

    // Sort by timestamp desc
    myPayments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    myPayments.forEach(p => {
        const tr = document.createElement('tr');
        let statusColor = "#94a3b8"; // Pending
        if (p.status === 'approved') statusColor = "#10b981";
        if (p.status === 'rejected') statusColor = "#ef4444";

        tr.innerHTML = `
                <td><strong>${escapeHtml(p.month)}</strong></td>
                <td>Rs. ${p.amount.toLocaleString()}</td>
                <td><span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${escapeHtml(p.status)}</span></td>
            `;
        body.appendChild(tr);
    });
}

loadMyPayments();

// 4. NEW COMPLAINT MODAL & LOGIC
const modal = document.getElementById("complaintModal");
const btn = document.getElementById("newComplaintBtn");
const span = document.getElementsByClassName("close")[0];
const form = document.getElementById("newConversationForm");

if (btn) btn.onclick = () => modal.style.display = "block";
if (span) span.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('newMessageBody').value;
        const type = document.getElementById('complaintType').value;
        const btnSubmit = form.querySelector('button');

        btnSubmit.innerText = "Sending...";
        btnSubmit.disabled = true;

        try {
            const res = await fetch('/api/complaints/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: currentUser.name,
                    phone: currentUser.phone,
                    email: currentUser.email,
                    type: type,
                    message: msg
                })
            });

            if (res.ok) {
                alert("Message sent!");
                modal.style.display = "none";
                form.reset();
                loadMyComplaints();
            }

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            btnSubmit.innerText = "Send Message";
            btnSubmit.disabled = false;
        }
    });
}

// 5. ONLINE PAYMENT MODAL LOGIC
const payModal = document.getElementById("paymentUploadModal");
const payBtn = document.getElementById("payOnlineBtn");
const closePay = document.getElementById("closePaymentModal");
const payForm = document.getElementById("submitPaymentForm");

if (payBtn) payBtn.onclick = () => payModal.style.display = "block";
if (closePay) closePay.onclick = () => payModal.style.display = "none";

if (payForm) {
    payForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = payForm.querySelector('button');
        btnSubmit.innerText = "Submitting...";
        btnSubmit.disabled = true;

        const amount = document.getElementById('paySubmitAmount').value;
        const month = document.getElementById('paySubmitMonth').value;
        const txId = document.getElementById('paySubmitTxId').value;
        const fileInput = document.getElementById('paySubmitSlip');

        let base64File = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            base64File = await toBase64(file);
        }

        // Year Logic: If we are in Dec and user selects Jan/Feb, it's likely next year
        const now = new Date();
        let targetYear = now.getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const selectedMonthIdx = monthNames.indexOf(month);
        const currentMonthIdx = now.getMonth();

        if (selectedMonthIdx < currentMonthIdx - 6) { // E.g. Dec (11) to Jan (0)
            targetYear++;
        }

        const selectedMonthFull = month + " " + targetYear;
        const currentFee = parseFloat(currentUser.monthlyFee) || 0;

        // Validation: Sum of approved/pending for this month
        const alreadyPaidForMonth = userPayments
            .filter(p => p.month === selectedMonthFull && p.status !== 'rejected')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        if (alreadyPaidForMonth + parseFloat(amount) > currentFee) {
            const remaining = currentFee - alreadyPaidForMonth;
            if (remaining <= 0) {
                alert(`You have already paid/submitted the full fee (Rs. ${currentFee}) for ${selectedMonthFull}.`);
            } else {
                alert(`Your remaining fee for ${selectedMonthFull} is Rs. ${remaining}. You cannot pay more than this for this month.`);
            }
            btnSubmit.innerText = "Submit for Approval";
            btnSubmit.disabled = false;
            return;
        }

        try {
            const res = await fetch('/api/payments/submit-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    amount: parseFloat(amount),
                    month: selectedMonthFull,
                    transactionId: txId,
                    proof: base64File
                })
            });

            if (res.ok) {
                alert("Payment proof submitted! Admin will verify it soon.");
                payModal.style.display = "none";
                payForm.reset();
                loadMyPayments();
            } else {
                alert("Submission failed.");
            }
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            btnSubmit.innerText = "Submit for Approval";
            btnSubmit.disabled = false;
        }
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

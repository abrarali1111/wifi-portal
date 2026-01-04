// Dashboard script using Fetch API for backend connection

// 1. CHECK AUTH
const storedUser = localStorage.getItem("wifi_user");
if (!storedUser) {
    window.location.href = "index.html";
}

const currentUser = JSON.parse(storedUser);

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
        const response = await fetch('/api/data');
        const data = await response.json();
        const serverUser = data.users.find(u => u.phone === currentUser.phone);
        if (serverUser) {
            // Update local storage and UI
            localStorage.setItem("wifi_user", JSON.stringify(serverUser));
            updateUI(serverUser);
        } else {
            console.warn("User not found on server during refresh.");
        }
    } catch (e) {
        console.error("Profile refresh error:", e);
    }
}

function updateUI(user) {
    console.log("Updating UI with user:", user);
    if (!user) return;

    const setE = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setE('welcomeMsg', `Hello, ${user.name}`);
    setE('userCustomId', user.customId || "Not Assigned");
    setE('userName', user.name);
    setE('userCnic', user.cnic || "Not Added");
    setE('userPhone', user.phone);
    setE('userEmail', user.email || "-");
    setE('subPackage', user.package || "-");
    setE('subFee', user.monthlyFee ? user.monthlyFee + " PKR" : "0");
    setE('subStart', user.startDate || "-");
    setE('subEnd', user.endDate || "-");
    setE('subBalance', user.balance ? user.balance + " PKR" : "0");
    setE('userAddress', user.address || "Not Added");

    // Date Logic: If startDate exists, calculate End Date as +1 Month
    if (user.startDate && user.startDate !== "-" && user.startDate !== "") {
        try {
            const start = new Date(user.startDate);
            start.setMonth(start.getMonth() + 1);
            const end = start.toISOString().split('T')[0];
            setE('subEnd', end);
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
    loadMyComplaints();
}, 5000);

// 3. FETCH USER'S COMPLAINTS
async function loadMyComplaints() {
    const listDiv = document.getElementById('myComplaintsList');
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        const myComplaints = data.complaints.filter(c => c.phone === currentUser.phone);

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
    } catch (e) {
        console.error("Error loading history:", e);
        listDiv.innerHTML = '<p style="color:red">Error loading history.</p>';
    }
}

loadMyComplaints();

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

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Auth script using Fetch API for backend connection

// DOM Elements (Check if they exist on the current page)
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.getElementById('logoutBtn');

// --- REGISTRATION LOGIC ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('regBtn');
        const originalText = btn.innerText;
        btn.innerText = "Creating Account...";
        btn.disabled = true;

        const name = document.getElementById('regName').value;
        const cnic = document.getElementById('regCnic').value;
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPassword').value;
        const email = document.getElementById('regEmail').value;
        const address = document.getElementById('regAddress').value;
        const profilePicInput = document.getElementById('regProfilePic');

        let profilePicBase64 = "";
        if (profilePicInput && profilePicInput.files[0]) {
            profilePicBase64 = await toBase64(profilePicInput.files[0]);
        }

        try {
            const userObj = {
                name: name,
                cnic: cnic,
                phone: phone,
                password: password,
                email: email,
                address: address,
                profilePic: profilePicBase64,
                package: "Not Assigned",
                role: 2, // User role is 2
                monthlyFee: "0",
                balance: "0",
                startDate: "-",
                endDate: "-"
            };

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userObj)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.error || "Registration failed");
                return;
            }

            // Save session
            localStorage.setItem("wifi_user", JSON.stringify(result.user));

            alert("Account created successfully!");
            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Error registering:", error);
            alert("Error: " + error.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

// --- LOGIN LOGIC ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        const originalText = btn.innerText;
        btn.innerText = "Verifying...";
        btn.disabled = true;

        const phone = document.getElementById('loginPhone').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.error || "Login failed");
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }

            // Login successful
            localStorage.setItem("wifi_user", JSON.stringify(result.user));

            // Redirect based on role
            if (result.user.role === 1) {
                window.location.href = "admin.html";
            } else if (result.user.role === 2) {
                window.location.href = "dashboard.html";
            } else {
                alert("Unauthorized role. Please contact admin.");
            }

        } catch (error) {
            console.error("Error logging in:", error);
            alert("Error: " + error.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

// --- LOGOUT LOGIC ---
// This will be called from dashboard.js mostly, but if button exists:
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("wifi_user");
            window.location.href = "index.html";
        }
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

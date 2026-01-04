// Security Check for Admin Pages
const u = localStorage.getItem("wifi_user");

if (!u) {
    window.location.href = "index.html";
} else {
    try {
        const user = JSON.parse(u);
        console.log("Current User Role:", user.role);
        // Admin role is 1 (use == for loose comparison if needed)
        if (user.role != 1) {
            console.warn("Unauthorized access attempt. Role:", user.role);
            alert("Access Denied. Admins only.");
            window.location.href = "dashboard.html";
        }
    } catch (e) {
        console.error("Auth check error:", e);
        localStorage.removeItem("wifi_user");
        window.location.href = "index.html";
    }
}

// User list script using Fetch API for backend connection

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('listSearchInput');
const downloadBtn = document.getElementById('downloadExcelBtn');

let allUsers = [];

async function loadUsers() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        allUsers = data.users || [];
        renderTable(allUsers);
    } catch (e) {
        console.error("Error loading users:", e);
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">Error loading users. Check console.</td></tr>';
    }
}

loadUsers();
setInterval(loadUsers, 5000); // Refresh every 5s

function renderTable(users) {
    tableBody.innerHTML = '';
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No users found</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.name || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.cnic || '-'}</td>
            <td>${u.email || '-'}</td>
            <td>${u.package || 'Not Assigned'}</td>
            <td>${u.monthlyFee || '0'}</td>
            <td style="color:red; font-weight:bold;">${u.balance || '0'}</td>
            <td>${u.address || '-'}</td>
            <td>${u.startDate || '-'}</td>
            <td>${u.endDate || '-'}</td>
        `;
        tableBody.appendChild(tr);
    });
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u =>
        (u.name?.toLowerCase().includes(term) || u.phone?.includes(term) || u.cnic?.includes(term))
    );
    renderTable(filtered);
});

downloadBtn.onclick = () => {
    if (allUsers.length === 0) {
        alert("No data to download");
        return;
    }

    const headers = ["Name", "Phone", "CNIC", "Email", "Package", "Monthly Fee", "Balance", "Address", "Start Date", "End Date"];
    const rows = allUsers.map(u => [
        `"${u.name || ''}"`,
        `"${u.phone || ''}"`,
        `"${u.cnic || ''}"`,
        `"${u.email || ''}"`,
        `"${u.package || ''}"`,
        `"${u.monthlyFee || ''}"`,
        `"${u.balance || ''}"`,
        `"${u.address || ''}"`,
        `"${u.startDate || ''}"`,
        `"${u.endDate || ''}"`
    ]);

    let csvContent = "sep=,\n" // Help Excel recognize the separator
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "wifi_users_detailed_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const API_URL = 'http://localhost:5000/api';
let profitChart = null;
let distributionChart = null;
let allPaymentsData = [];

// ==================== AUTHENTICATION CHECK ====================
function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) userNameSpan.textContent = user.full_name || 'Admin';
    return true;
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ==================== HELPER FUNCTIONS ====================
function formatMoney(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return 'TZS 0';
    return 'TZS ' + amount.toLocaleString();
}

function escapeHtml(text) {
    if (!text) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getDaysRemaining(dueDate) {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function getCountdownBadge(daysRemaining) {
    if (daysRemaining > 14) return '<span class="countdown-safe"><i class="fas fa-check-circle"></i> ' + daysRemaining + ' siku</span>';
    if (daysRemaining > 7) return '<span class="countdown-warning"><i class="fas fa-clock"></i> ' + daysRemaining + ' siku</span>';
    if (daysRemaining > 0) return '<span class="countdown-danger"><i class="fas fa-hourglass-half"></i> ' + daysRemaining + ' siku</span>';
    if (daysRemaining === 0) return '<span class="countdown-critical"><i class="fas fa-hourglass-end"></i> LEO!</span>';
    return '<span class="countdown-critical"><i class="fas fa-times-circle"></i> Imechelewa ' + Math.abs(daysRemaining) + ' siku</span>';
}

function showMessage(msg, type) {
    const successDiv = document.getElementById('successMsg');
    const errorDiv = document.getElementById('errorMsg');
    if (type === 'success' && successDiv) {
        const span = successDiv.querySelector('span');
        if (span) span.textContent = msg;
        successDiv.style.display = 'block';
        setTimeout(() => successDiv.style.display = 'none', 3000);
    } else if (errorDiv) {
        const span = errorDiv.querySelector('span');
        if (span) span.textContent = msg;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 3000);
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) selectedTab.classList.add('active');

    const buttons = document.querySelectorAll('.tab-btn');
    for (let btn of buttons) {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
            break;
        }
    }

    if (tabName === 'dashboard') { loadDashboard(); loadCharts(); }
    if (tabName === 'clients') loadClients();
    if (tabName === 'loans') { loadLoans(); loadClientSelect(); }
    if (tabName === 'defaulters') loadDefaulters();
    if (tabName === 'payments') { loadPaymentHistory(); loadLoanSelect(); }
    if (tabName === 'reports') loadReports();
}

function updateDateTime() {
    const now = new Date();
    const dateTimeSpan = document.getElementById('dateTime');
    if (dateTimeSpan) {
        dateTimeSpan.innerHTML = '<i class="far fa-calendar-alt"></i> ' +
            now.toLocaleDateString('sw', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
            ' | <i class="far fa-clock"></i> ' + now.toLocaleTimeString('sw');
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
async function loadDashboard() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/reports/dashboard`, { headers });
        const data = await res.json();
        console.log('Dashboard data:', data);

        if (data.success) {
            document.getElementById('totalClients').innerHTML = data.data.totalClients?.count || 0;
            document.getElementById('activeLoans').innerHTML = data.data.activeLoans?.count || 0;
            document.getElementById('totalRemaining').innerHTML = formatMoney(data.data.activeLoans?.total_remaining || 0);
            document.getElementById('totalCollected').innerHTML = formatMoney(data.data.totalCollected?.total || 0);
            document.getElementById('defaulters').innerHTML = data.data.defaultedLoans?.count || 0;
            document.getElementById('monthlyProfit').innerHTML = formatMoney(data.data.monthlyProfit?.total || 0);
            document.getElementById('collectionRate').innerHTML = (data.data.collectionRate?.rate || 0) + '%';
        }
        await loadRecentLoans();
    } catch (e) { console.error('Error loading dashboard:', e); }
}

async function loadRecentLoans() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/loans/active`, { headers });
        const data = await res.json();
        const recentLoansDiv = document.getElementById('recentLoans');
        if (!recentLoansDiv) return;

        if (data.success && data.data && data.data.length > 0) {
            const sortedLoans = [...data.data].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
            let html = `<table class="loans-table"><thead><tr><th>Mteja</th><th>Simu</th><th>Kiasi</th><th>Kimebaki</th><th>Tarehe</th><th>Siku Zilizobaki</th><th>Hali</th><tr></thead><tbody>`;
            sortedLoans.forEach(l => {
                const daysRemaining = getDaysRemaining(l.due_date);
                const countdownBadge = getCountdownBadge(daysRemaining);
                let rowStyle = '';
                if (daysRemaining <= 7 && daysRemaining > 0) rowStyle = 'style="background: rgba(245, 158, 11, 0.1);"';
                if (daysRemaining <= 0) rowStyle = 'style="background: rgba(239, 68, 68, 0.15);"';
                html += `<tr ${rowStyle}><td><strong>${escapeHtml(l.client_name)}</strong></td><td>${l.phone_number || '-'}</td><td>${formatMoney(l.amount_borrowed)}</td><td>${formatMoney(l.remaining_balance)}</td><td>${l.due_date}</td><td>${countdownBadge}</td><td><span class="badge badge-active">Active</span></td></tr>`;
            });
            html += `</tbody></table>`;
            recentLoansDiv.innerHTML = html;
        } else {
            recentLoansDiv.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><br>Hakuna mikopo inayoendelea</div>';
        }
    } catch (e) { console.error('Error loading recent loans:', e); }
}

async function loadCharts() {
    try {
        const headers = getAuthHeaders();
        const profitRes = await fetch(`${API_URL}/reports/profit-trend`, { headers });
        const profitData = await profitRes.json();
        const profitCtx = document.getElementById('profitChart');
        if (profitCtx && profitData.success && profitData.data) {
            if (profitChart) profitChart.destroy();
            profitChart = new Chart(profitCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: profitData.data.map(d => d.month || d.month_name || ''),
                    datasets: [{
                        label: 'Faida (TZS)',
                        data: profitData.data.map(d => d.profit || d.total_profit || 0),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { labels: { color: '#e2e8f0' } } },
                    scales: {
                        y: { ticks: { color: '#e2e8f0' }, grid: { color: '#334155' } },
                        x: { ticks: { color: '#e2e8f0' }, grid: { color: '#334155' } }
                    }
                }
            });
        }

        const loansRes = await fetch(`${API_URL}/loans/all`, { headers });
        const loansData = await loansRes.json();
        const distCtx = document.getElementById('distributionChart');
        if (distCtx && loansData.success && loansData.data) {
            const active = loansData.data.filter(l => l.status === 'active').length;
            const completed = loansData.data.filter(l => l.status === 'completed').length;
            const defaulted = loansData.data.filter(l => l.status === 'defaulted').length;
            if (distributionChart) distributionChart.destroy();
            distributionChart = new Chart(distCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Inayoendelea', 'Imekamilika', 'Wadeni Sugu'],
                    datasets: [{
                        data: [active, completed, defaulted],
                        backgroundColor: ['#22c55e', '#3b82f6', '#dc2626'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { labels: { color: '#e2e8f0' } } }
                }
            });
        }
    } catch (e) { console.error('Chart error:', e); }
}

// ==================== CLIENTS FUNCTIONS ====================
async function loadClients() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/clients`, { headers });
        const data = await res.json();
        const clientsTable = document.getElementById('clientsTable');
        if (!clientsTable) return;

        if (data.success && data.data && data.data.length > 0) {
            let html = `<table class="clients-table"><thead><tr><th>ID</th><th>Jina Kamili</th><th>Namba ya Simu</th><th>Barua pepe</th><th>Anuani</th><th>Tarehe</th><th>Hali</th></tr></thead><tbody>`;
            data.data.forEach(c => {
                let statusBadge = c.status === 'active' ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Inactive</span>';
                html += `<tr>
                    <td><strong>#${c.id}</strong></td>
                    <td><strong>${escapeHtml(c.full_name)}</strong></td>
                    <td>${c.phone_number}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.address || '-'}</td>
                    <td>${c.registration_date || '-'}</td>
                    <td>${statusBadge}</td>
                </tr>`;
            });
            html += `</tbody></tr>`;
            clientsTable.innerHTML = html;
        } else {
            clientsTable.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><br>Hakuna wateja bado. Ongeza mteja!</div>';
        }
    } catch (e) { console.error('Error loading clients:', e); }
}

document.getElementById('addClientForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const headers = getAuthHeaders();
    const formData = {
        full_name: document.getElementById('full_name').value,
        phone_number: document.getElementById('phone_number').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value
    };
    try {
        const res = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
            showMessage('✅ Mteja ameongezwa kikamilifu!', 'success');
            e.target.reset();
            loadClients();
            loadDashboard();
        } else {
            showMessage('❌ ' + data.message, 'error');
        }
    } catch (e) { showMessage('❌ Server error: ' + e.message, 'error'); }
});

function exportClientsToExcel() {
    window.open(`${API_URL}/clients`, '_blank');
    showMessage('✅ Data imepakuliwa', 'success');
}

// ==================== LOANS FUNCTIONS ====================
async function loadClientSelect() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/clients`, { headers });
        const data = await res.json();
        const clientSelect = document.getElementById('client_id');
        if (!clientSelect) return;
        if (data.success && data.data) {
            let options = '<option value="">⚡ Chagua Mteja...</option>';
            data.data.forEach(c => {
                options += `<option value="${c.id}">👤 ${c.full_name} (${c.phone_number})</option>`;
            });
            clientSelect.innerHTML = options;
        }
    } catch (e) { console.error('Error loading client select:', e); }
}

async function loadLoans() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/loans/all`, { headers });
        const data = await res.json();
        const loansTable = document.getElementById('loansTable');
        if (!loansTable) return;

        if (data.success && data.data && data.data.length > 0) {
            let html = `<table class="loans-table"><thead><tr><th>Mteja</th><th>Simu</th><th>Kiasi</th><th>Riba</th><th>Jumla</th><th>Kimebaki</th><th>Tarehe</th><th>Hali</th></tr></thead><tbody>`;
            data.data.forEach(l => {
                html += `<tr>
                    <td><strong>${escapeHtml(l.client_name)}</strong></td>
                    <td>${l.phone_number || '-'}</td>
                    <td>${formatMoney(l.amount_borrowed)}</td>
                    <td>${l.interest_rate}%</td>
                    <td>${formatMoney(l.total_amount)}</td>
                    <td>${formatMoney(l.remaining_balance)}</td>
                    <td>${l.due_date}</td>
                    <td><span class="badge badge-${l.status}">${l.status}</span></td>
                </tr>`;
            });
            html += `</tbody></table>`;
            loansTable.innerHTML = html;
        } else {
            loansTable.innerHTML = '<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><br>Hakuna mikopo bado. Toa mkopo!</div>';
        }
    } catch (e) { console.error('Error loading loans:', e); }
}

document.getElementById('addLoanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('client_id').value;
    if (!clientId) { showMessage('❌ Tafadhali chagua mteja', 'error'); return; }
    try {
        const headers = getAuthHeaders();
        const clientRes = await fetch(`${API_URL}/clients/${clientId}`, { headers });
        const client = await clientRes.json();
        const amount = parseFloat(document.getElementById('amount_borrowed').value);
        const rate = parseFloat(document.getElementById('interest_rate').value);
        const duration = parseInt(document.getElementById('duration_months').value) || 1;
        let dueDate = document.getElementById('due_date').value;
        if (!dueDate) {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() + duration);
            dueDate = startDate.toISOString().split('T')[0];
        }
        const formData = {
            client_id: parseInt(clientId),
            client_name: client.data.full_name,
            phone_number: client.data.phone_number,
            amount_borrowed: amount,
            interest_rate: rate,
            duration_months: duration,
            due_date: dueDate
        };
        const res = await fetch(`${API_URL}/loans`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
            const interestAmount = amount * (rate / 100) * duration;
            showMessage(`✅ Mkopo umetolewa! Riba: ${formatMoney(interestAmount)}, Jumla: ${formatMoney(amount + interestAmount)}`, 'success');
            e.target.reset();
            document.getElementById('due_date').value = '';
            loadLoans();
            loadDashboard();
            loadCharts();
        } else { showMessage('❌ ' + data.message, 'error'); }
    } catch (e) { showMessage('❌ Server error: ' + e.message, 'error'); }
});

function exportLoansToExcel() {
    window.open(`${API_URL}/loans/all`, '_blank');
    showMessage('✅ Data imepakuliwa', 'success');
}

// ==================== DEFAULTERS FUNCTIONS ====================
async function loadDefaulters() {
    try {
        console.log('🔄 Loading defaulters...');
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/loans/defaulted`, { headers });
        const data = await res.json();
        console.log('✅ Defaulters data:', data);

        const totalDefaultersSpan = document.getElementById('totalDefaulters');
        const defaultersTotalDebtSpan = document.getElementById('defaultersTotalDebt');
        const defaultersTable = document.getElementById('defaultersTable');

        if (!defaultersTable) { console.error('defaultersTable not found!'); return; }

        if (data.success && data.data) {
            const defaultersList = data.data;
            if (totalDefaultersSpan) totalDefaultersSpan.innerHTML = defaultersList.length;
            const totalDebt = defaultersList.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);
            if (defaultersTotalDebtSpan) defaultersTotalDebtSpan.innerHTML = formatMoney(totalDebt);

            if (defaultersList.length === 0) {
                defaultersTable.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><br>✅ Hakuna wadeni sugu kwa sasa!</div>';
                return;
            }

            let html = `<table class="defaulters-table"><thead><tr><th>Mteja</th><th>Simu</th><th>Kiasi Alichokopa</th><th>Deni Linabaki</th><th>Tarehe ya Mwisho</th><th>Siku za Kuchelewa</th><th>Hali</th><th>Kitendo</th></tr></thead><tbody>`;
            for (const loan of defaultersList) {
                let daysOverdue = loan.days_overdue || 0;
                let rowClass = daysOverdue > 60 ? 'style="background: rgba(127, 29, 29, 0.4);"' : (daysOverdue > 30 ? 'style="background: rgba(220, 38, 38, 0.25);"' : 'style="background: rgba(239, 68, 68, 0.1);"');
                html += `<tr ${rowClass}>
                    <td><strong><i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> ${escapeHtml(loan.client_name)}</strong></td>
                    <td>${loan.phone_number || '-'}</td>
                    <td>${formatMoney(loan.amount_borrowed)}</td>
                    <td><span style="color: #ef4444; font-weight: bold;">${formatMoney(loan.remaining_balance)}</span></td>
                    <td><span style="color: #f59e0b;">${loan.due_date}</span></td>
                    <td><span class="badge badge-defaulted"><i class="fas fa-clock"></i> ${daysOverdue} siku</span></td>
                    <td><span class="badge badge-defaulted"><i class="fas fa-skull-crosswalk"></i> Defaulted</span></td>
                    <td><button class="action-btn" onclick="quickPayment(${loan.id}, ${loan.remaining_balance})"><i class="fas fa-money-bill-wave"></i> Lipa</button></td>
                </tr>`;
            }
            html += `</tbody><tfoot style="background: rgba(239, 68, 68, 0.15);"><tr><td colspan="8" style="text-align: center;"><i class="fas fa-info-circle"></i> Jumla ya Wadeni Sugu: ${defaultersList.length} | Jumla ya Deni: ${formatMoney(totalDebt)}</td><tr></tfoot></table>`;
            defaultersTable.innerHTML = html;
        }
    } catch (e) { console.error('Error loading defaulters:', e); }
}

async function sendSMSToDefaulters() {
    showMessage('📱 SMS zinatumwa kwa wadeni sugu...', 'success');
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/loans/defaulted`, { headers });
        const data = await res.json();
        if (data.success && data.data) {
            for (const loan of data.data) {
                if (loan.phone_number) console.log(`📱 SMS to ${loan.phone_number}: Ukumbusho - Deni lako la ${formatMoney(loan.remaining_balance)} limechelewa!`);
            }
            showMessage(`✅ SMS zimetumwa kwa wadeni ${data.data.length}`, 'success');
        }
    } catch (e) { showMessage('❌ Error sending SMS: ' + e.message, 'error'); }
}

// ==================== PAYMENTS FUNCTIONS ====================
async function loadLoanSelect() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/loans/active`, { headers });
        const data = await res.json();
        const paymentLoanSelect = document.getElementById('payment_loan_id');
        if (!paymentLoanSelect) return;
        if (data.success && data.data) {
            let options = '<option value="">⚡ Chagua Mkopo...</option>';
            data.data.forEach(l => {
                options += `<option value="${l.id}">👤 ${l.client_name} - ${formatMoney(l.remaining_balance)} inabaki</option>`;
            });
            paymentLoanSelect.innerHTML = options;
        }
    } catch (e) { console.error('Error loading loan select:', e); }
}

async function loadPaymentHistory() {
    try {
        const headers = getAuthHeaders();
        const loansRes = await fetch(`${API_URL}/loans/all`, { headers });
        const loansData = await loansRes.json();
        const paymentsTable = document.getElementById('paymentsHistoryTable');
        if (!paymentsTable) return;
        if (!loansData.success) {
            paymentsTable.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><br>Error loading data</div>';
            return;
        }

        let allPayments = [];
        if (loansData.data) {
            for (const loan of loansData.data) {
                try {
                    const paymentsRes = await fetch(`${API_URL}/payments/loan/${loan.id}`, { headers });
                    const paymentsData = await paymentsRes.json();
                    if (paymentsData.success && paymentsData.data) {
                        paymentsData.data.forEach(payment => {
                            allPayments.push({
                                id: payment.id,
                                amount: payment.amount,
                                payment_date: payment.payment_date,
                                receipt_number: payment.receipt_number,
                                client_name: loan.client_name,
                                phone_number: loan.phone_number || '-'
                            });
                        });
                    }
                } catch (e) { console.error(`Error fetching payments for loan ${loan.id}:`, e); }
            }
        }

        allPaymentsData = [...allPayments];
        allPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

        if (allPayments.length === 0) {
            paymentsTable.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><br>Hakuna historia ya malipo bado. Rekodi malipo ya kwanza!</div>';
            return;
        }

        let html = `<table class="payments-table"><thead><tr><th>Mteja</th><th>Simu</th><th>Kiasi Kilicholipwa</th><th>Namba ya Risiti</th><th>Tarehe ya Malipo</th><th>Hali</th></tr></thead><tbody>`;
        for (const p of allPayments) {
            html += `<tr>
                <td><strong>${escapeHtml(p.client_name)}</strong></td>
                <td>${escapeHtml(p.phone_number)}</td>
                <td><span class="payment-amount">+ ${formatMoney(p.amount)}</span></td>
                <td><span class="badge badge-payment">${p.receipt_number || 'N/A'}</span></td>
                <td>${p.payment_date}</td>
                <td><span class="badge badge-completed"><i class="fas fa-check-circle"></i> Imerekodiwa</span></td>
            </tr>`;
        }
        html += `</tbody></tr>`;
        paymentsTable.innerHTML = html;
    } catch (e) { console.error('Error loading payment history:', e); }
}

function sortPaymentsByDate() {
    if (allPaymentsData.length === 0) return;
    const sorted = [...allPaymentsData].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    let html = `<table class="payments-table"><thead><tr><th>Mteja</th><th>Simu</th><th>Kiasi Kilicholipwa</th><th>Namba ya Risiti</th><th>Tarehe ya Malipo</th><th>Hali</th></tr></thead><tbody>`;
    for (const p of sorted) {
        html += `<tr>
            <td><strong>${escapeHtml(p.client_name)}</strong></td>
            <td>${escapeHtml(p.phone_number)}</td>
            <td><span class="payment-amount">+ ${formatMoney(p.amount)}</span></td>
            <td><span class="badge badge-payment">${p.receipt_number || 'N/A'}</span></td>
            <td>${p.payment_date}</td>
            <td><span class="badge badge-completed">Imerekodiwa</span></td>
        </tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById('paymentsHistoryTable').innerHTML = html;
    showMessage('✅ Malipo yamepangwa kwa tarehe', 'success');
}

function refreshPayments() {
    loadPaymentHistory();
    showMessage('🔄 Historia ya malipo imeburudishwa', 'success');
}

window.quickPayment = async (loanId, remainingBalance) => {
    const amount = prompt('💰 Weka kiasi cha kulipa (TZS):\nDeni lililobaki: ' + formatMoney(remainingBalance), remainingBalance);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        try {
            const headers = getAuthHeaders();
            const res = await fetch(`${API_URL}/payments`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    loan_id: loanId,
                    amount: parseFloat(amount),
                    payment_date: new Date().toISOString().split('T')[0]
                })
            });
            const data = await res.json();
            if (data.success) {
                showMessage(`✅ Malipo ya ${formatMoney(parseFloat(amount))} yamerekodiwa!`, 'success');
                loadDashboard();
                loadLoans();
                loadDefaulters();
                loadPaymentHistory();
                loadLoanSelect();
                loadCharts();
                loadRecentLoans();
            } else { showMessage('❌ ' + data.message, 'error'); }
        } catch (e) { showMessage('❌ Server error: ' + e.message, 'error'); }
    }
};

document.getElementById('addPaymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loanId = document.getElementById('payment_loan_id').value;
    const amount = parseFloat(document.getElementById('payment_amount').value);
    const paymentDate = document.getElementById('payment_date').value;
    if (!loanId) { showMessage('❌ Chagua mkopo', 'error'); return; }
    if (!amount || amount <= 0) { showMessage('❌ Weka kiasi sahihi', 'error'); return; }
    if (!paymentDate) { showMessage('❌ Weka tarehe ya malipo', 'error'); return; }
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                loan_id: parseInt(loanId),
                amount: amount,
                payment_date: paymentDate
            })
        });
        const data = await res.json();
        if (data.success) {
            showMessage(`✅ Malipo ya ${formatMoney(amount)} yamerekodiwa kikamilifu!`, 'success');
            e.target.reset();
            loadDashboard();
            loadLoans();
            loadDefaulters();
            loadPaymentHistory();
            loadLoanSelect();
            loadCharts();
            loadRecentLoans();
        } else { showMessage('❌ ' + data.message, 'error'); }
    } catch (e) { showMessage('❌ Server error: ' + e.message, 'error'); }
});

// ==================== REPORTS FUNCTIONS ====================
async function loadReports() {
    try {
        const headers = getAuthHeaders();
        const resLoans = await fetch(`${API_URL}/loans/all`, { headers });
        const loansData = await resLoans.json();

        console.log('Reports data:', loansData);

        if (loansData.success) {
            const totalAmount = loansData.stats?.total_amount || 0;
            const totalInterest = loansData.stats?.total_interest || 0;
            const avgLoan = loansData.stats?.average_loan || 0;
            const collectionRate = loansData.stats?.collection_rate || 0;

            const totalLoansAmountSpan = document.getElementById('totalLoansAmount');
            const totalInterestSpan = document.getElementById('totalInterest');
            const avgLoanSpan = document.getElementById('avgLoan');
            const reportCollectionRateSpan = document.getElementById('reportCollectionRate');

            if (totalLoansAmountSpan) totalLoansAmountSpan.innerHTML = formatMoney(totalAmount);
            if (totalInterestSpan) totalInterestSpan.innerHTML = formatMoney(totalInterest);
            if (avgLoanSpan) avgLoanSpan.innerHTML = formatMoney(avgLoan);
            if (reportCollectionRateSpan) reportCollectionRateSpan.innerHTML = collectionRate + '%';
        }

        const resTrend = await fetch(`${API_URL}/reports/profit-trend`, { headers });
        const trendData = await resTrend.json();

        console.log('Profit trend data:', trendData);

        const profitTrendDiv = document.getElementById('profitTrend');
        if (profitTrendDiv && trendData.success && trendData.data) {
            if (trendData.data.length > 0) {
                let html = `<table class="loans-table">
                    <thead>
                        <tr>
                            <th>Mwezi</th>
                            <th>Faida (TZS)</th>
                        </tr>
                    </thead>
                    <tbody>`;
                for (const item of trendData.data) {
                    html += `<tr>
                        <td><strong>${item.month || item.month_name || '-'}</strong></td>
                        <td>${formatMoney(item.profit || item.total_profit || 0)}</span></td>
                    </table>`;
                }
                html += `</tbody></table>`;
                profitTrendDiv.innerHTML = html;
            } else {
                profitTrendDiv.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><br>Hakuna data ya faida bado</div>';
            }
        }
    } catch (e) {
        console.error('Error loading reports:', e);
        const profitTrendDiv = document.getElementById('profitTrend');
        if (profitTrendDiv) {
            profitTrendDiv.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><br>Error loading profit trend</div>';
        }
    }
}

// ==================== EXPORT FUNCTIONS ====================
async function exportToExcel() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/loans/all`, { headers });
        const data = await res.json();
        if (data.success && data.data) {
            const worksheet = XLSX.utils.json_to_sheet(data.data.map(l => ({
                'Mteja': l.client_name,
                'Simu': l.phone_number,
                'Kiasi Alichokopa': l.amount_borrowed,
                'Riba (%)': l.interest_rate,
                'Jumla ya Kulipa': l.total_amount,
                'Kimebaki': l.remaining_balance,
                'Tarehe ya Mwisho': l.due_date,
                'Hali': l.status
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Mikopo Yote');
            XLSX.writeFile(workbook, `Scholastica_Finance_${new Date().toISOString().split('T')[0]}.xlsx`);
            showMessage('✅ Ripoti imeexport kwa Excel!', 'success');
        }
    } catch (e) { showMessage('❌ Error: ' + e.message, 'error'); }
}

async function exportToPDF() {
    try {
        const headers = getAuthHeaders();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(245, 158, 11);
        doc.text('Scholastica Finance Report', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Tarehe: ${new Date().toLocaleDateString('sw')}`, 14, 30);

        const res = await fetch(`${API_URL}/loans/all`, { headers });
        const data = await res.json();
        if (data.success && data.data) {
            const tableData = data.data.map(l => [
                l.client_name,
                l.phone_number || '-',
                `TZS ${l.amount_borrowed.toLocaleString()}`,
                `${l.interest_rate}%`,
                `TZS ${l.remaining_balance.toLocaleString()}`,
                l.status
            ]);
            doc.autoTable({
                head: [['Mteja', 'Simu', 'Kiasi', 'Riba', 'Kimebaki', 'Hali']],
                body: tableData,
                startY: 40,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] }
            });
            doc.save(`Scholastica_Finance_${new Date().toISOString().split('T')[0]}.pdf`);
            showMessage('✅ Ripoti imeexport kwa PDF!', 'success');
        }
    } catch (e) { showMessage('❌ Error: ' + e.message, 'error'); }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            if (tabName) showTab(tabName);
        });
    });

    loadDashboard();
    loadCharts();
    loadClients();
    loadDefaulters();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Make functions available globally
window.logout = logout;
window.exportClientsToExcel = exportClientsToExcel;
window.exportLoansToExcel = exportLoansToExcel;
window.sendSMSToDefaulters = sendSMSToDefaulters;
window.sortPaymentsByDate = sortPaymentsByDate;
window.refreshPayments = refreshPayments;
window.quickPayment = quickPayment;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.showTab = showTab;
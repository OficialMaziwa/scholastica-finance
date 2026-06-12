// Toggle password visibility
document.querySelector('.toggle-password')?.addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
    }
});

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.getElementById('alert');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${message}`;
    alertDiv.style.display = 'block';

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');

    if (!identifier || !password) {
        showAlert('Tafadhali weka username/email na nywila', 'error');
        return;
    }

    // Show loading state
    loginBtn.querySelector('span').style.opacity = '0.7';
    loadingSpinner.style.display = 'inline-block';
    loginBtn.disabled = true;

    // Simulate login delay
    setTimeout(() => {
        // Mock users for demo
        const mockUsers = [
            { username: 'admin', email: 'admin@scholastica.com', password: 'Admin@123', full_name: 'Admin User', role: 'admin' },
            { username: 'manager', email: 'manager@scholastica.com', password: 'Manager123', full_name: 'Finance Manager', role: 'manager' }
        ];

        const user = mockUsers.find(u =>
            (u.username === identifier || u.email === identifier) && u.password === password
        );

        if (user) {
            // Create mock token
            const token = btoa(JSON.stringify({
                id: 1,
                username: user.username,
                role: user.role,
                exp: Date.now() + 86400000
            }));

            // Store token and user data
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify({
                id: 1,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }));

            showAlert('✅ Kuingia kumefanikiwa! Unaelekezwa dashboard...', 'success');

            // Redirect to dashboard after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showAlert('❌ Taarifa zako si sahihi. Jaribu tena.', 'error');
        }

        // Reset loading state
        loginBtn.querySelector('span').style.opacity = '1';
        loadingSpinner.style.display = 'none';
        loginBtn.disabled = false;
    }, 800);
});

// Check if user is already logged in
const token = localStorage.getItem('auth_token');
if (token) {
    // Redirect to dashboard if already logged in
    window.location.href = 'index.html';
}
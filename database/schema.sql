-- Connect to database: \c scholastica_finance

-- Table: clients (Wateja)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, blacklisted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: loans (Mikopo)
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    amount_borrowed DECIMAL(12,2) NOT NULL CHECK (amount_borrowed > 0),
    interest_rate DECIMAL(5,2) NOT NULL, -- percentage per month
    interest_amount DECIMAL(12,2) NOT NULL, -- calculated: amount_borrowed * (interest_rate/100) * loan_duration_months
    total_amount DECIMAL(12,2) NOT NULL, -- amount_borrowed + interest_amount
    amount_repaid DECIMAL(12,2) DEFAULT 0,
    remaining_balance DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_repaid) STORED,
    loan_duration_months INTEGER NOT NULL, -- duration in months
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, defaulted, written_off
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: payments (Malipo)
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash', -- cash, bank, mobile_money
    receipt_number VARCHAR(50) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users (Watumiaji wa mfumo)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- admin, manager, collector
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: activity_log (Rekodi za shughuli)
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_loans_client ON loans(client_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due_date ON loans(due_date);
CREATE INDEX idx_payments_loan ON payments(loan_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_clients_phone ON clients(phone_number);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user (password: Admin@123)
-- Password hash is bcrypt of 'Admin@123'
INSERT INTO users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@scholastica.com', '$2b$10$YourHashWillGoHere', 'System Administrator', 'admin');

-- Insert sample clients
INSERT INTO clients (full_name, phone_number, email, address) VALUES
('John Mbowe', '0712345678', 'john@example.com', 'Dar es Salaam'),
('Sarah Mwema', '0723456789', 'sarah@example.com', 'Arusha'),
('Peter Shaban', '0734567890', 'peter@example.com', 'Mwanza');

-- Insert sample loans
INSERT INTO loans (client_id, amount_borrowed, interest_rate, interest_amount, total_amount, amount_repaid, loan_duration_months, start_date, due_date, status) VALUES
(1, 500000, 10, 50000, 550000, 200000, 3, '2026-01-15', '2026-04-15', 'active'),
(2, 1000000, 8, 80000, 1080000, 500000, 6, '2026-01-01', '2026-07-01', 'active'),
(3, 300000, 12, 36000, 336000, 0, 2, '2026-02-01', '2026-04-01', 'defaulted');

-- Insert sample payments
INSERT INTO payments (loan_id, amount, payment_date, receipt_number) VALUES
(1, 100000, '2026-02-15', 'RCP001'),
(1, 100000, '2026-03-15', 'RCP002'),
(2, 250000, '2026-02-01', 'RCP003'),
(2, 250000, '2026-03-01', 'RCP004');
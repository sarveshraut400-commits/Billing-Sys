import sqlite3
import os

# Path to your SQLite database file
DB_PATH = os.path.join(os.path.dirname(__file__), 'billing.db')

def get_db_connection():
    """
    Returns a SQLite connection with row_factory = sqlite3.Row
    so that we can access columns by name (e.g., row['id']).
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================
# SHARED HELPER FUNCTIONS FOR OTHER MODULES
# ==========================================

def get_product_by_id(product_id):
    conn = get_db_connection()
    product = conn.execute(
        "SELECT id, product_name, price, gst_rate, stock FROM products WHERE id = ?",
        (product_id,)
    ).fetchone()
    conn.close()
    return dict(product) if product else None

def get_product_by_barcode(barcode):
    conn = get_db_connection()
    product = conn.execute(
        "SELECT * FROM products WHERE barcode = ?",
        (barcode,)
    ).fetchone()
    conn.close()
    return dict(product) if product else None

def get_user_by_username(shopkeeper_id):
    conn = get_db_connection()
    user = conn.execute(
        "SELECT * FROM shopkeepers WHERE shopkeeper_id = ?",
        (shopkeeper_id,)
    ).fetchone()
    conn.close()
    return dict(user) if user else None

def create_tables():
    """Creates all necessary tables if they don't exist."""
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode TEXT UNIQUE,
            product_name TEXT NOT NULL,
            price REAL NOT NULL,
            gst_rate REAL DEFAULT 0.18,
            stock INTEGER DEFAULT 0
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS shopkeepers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shopkeeper_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            shop_name TEXT NOT NULL,
            address TEXT NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            mobile TEXT UNIQUE NOT NULL,
            email TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            email TEXT,
            phone TEXT,
            total_bill REAL,
            date TEXT,
            time TEXT,
            invoice_number TEXT UNIQUE
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS bill_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            price REAL,
            quantity INTEGER,
            amount REAL,
            FOREIGN KEY(bill_id) REFERENCES bills(id)
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS purchase_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            invoice_number TEXT,
            amount REAL,
            purchase_date TEXT,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT UNIQUE NOT NULL,
            bill_id INTEGER,
            customer_name TEXT,
            grand_total REAL,
            date TEXT,
            time TEXT,
            pdf_path TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            performed_by TEXT DEFAULT 'System',
            timestamp TEXT NOT NULL
        )
    ''')
    
    # Insert seed log entries if empty
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM activity_logs")
    if cursor.fetchone()[0] == 0:
        from datetime import datetime
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        seed_logs = [
            ("Login/Checkout", "Admin Login", "Administrator logged into the system", "Admin", now),
            ("Billing", "Invoice Generated", "Invoice INV-0005 generated for ₹1,250.00 (Customer: John Doe)", "Staff", now),
            ("Inventory", "Product Added", "Added new product 'Wireless Mouse' with stock 50", "Admin", now),
            ("Inventory", "Stock Updated", "Updated stock for 'USB Cable' to 120 units", "Admin", now),
            ("Login/Checkout", "Staff Login", "Staff member logged into the POS counter", "Staff", now)
        ]
        cursor.executemany('''
            INSERT INTO activity_logs (category, action, details, performed_by, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', seed_logs)

    conn.commit()
    conn.close()

def log_activity(category, action, details="", performed_by="System", timestamp=None):
    """
    Logs a live event across Billing, Inventory, or Login/Checkout into the database.
    """
    from datetime import datetime
    if not timestamp:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO activity_logs (category, action, details, performed_by, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (category, action, details, performed_by, timestamp))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Logging error: {e}")

# Optionally create tables when this module is imported
create_tables()
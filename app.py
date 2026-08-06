from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
import random
import time
import uuid
import io
import json
import os

from datetime import datetime

# Database helper functions
from database import get_db_connection, log_activity

# Required for PDF and Excel exports
from reportlab.pdfgen import canvas
import openpyxl

app = Flask(__name__)
# This is mandatory so React (port 5173) can talk to Flask (port 5000)
CORS(app) 

# ==========================================
# EMAIL SETTINGS
# ==========================================
SENDER_EMAIL = "systemdefault96@gmail.com" # Put your real Gmail here
SENDER_PASSWORD = "zkav ukps jfeh uhqw" # Paste the 16 letters here (no spaces!)


# ==========================================
# 0. AUTH USERS DATABASE (PERMANENT JSON)
# ==========================================
USERS_FILE = 'users.json'

default_users = {
    "admin": {
        "email": "systemdefault96@gmail.com", 
        "password": "admin123", 
        "otp": None
    },
    "employee": {
        "email": "staff@store.com", 
        "password": "staff123", 
        "otp": None
    }
}

if os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'r') as f:
        users_db = json.load(f)
else:
    users_db = default_users
    with open(USERS_FILE, 'w') as f:
        json.dump(users_db, f, indent=4)

def save_users():
    """Saves auth changes permanently so the login page updates!"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users_db, f, indent=4)


# ==========================================
# EMAIL HELPER FUNCTIONS
# ==========================================
def send_otp_email(receiver_email, otp):
    try:
        msg = MIMEText(f"Your SuperMart POS Security OTP is: {otp}\n\nDo not share this with anyone.")
        msg['Subject'] = 'SuperMart POS - Security Verification'
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email Error: {e}")
        return False

def send_welcome_email(receiver_email, name, role, password):
    try:
        msg = MIMEText(
            f"Hello {name},\n\n"
            f"Welcome to SuperMart POS!\n\n"
            f"An Administrator has created an account for you. Here are your login credentials:\n\n"
            f"Role: {role.capitalize()}\n"
            f"Email: {receiver_email}\n"
            f"Password: {password}\n\n"
            f"Please log in and keep these credentials secure.\n\n"
            f"Best,\nSuperMart System"
        )
        msg['Subject'] = 'Welcome to SuperMart POS - Your Account Details'
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Welcome Email Error: {e}")
        return False


# ==========================================
# 1. AUTHENTICATION ROUTES
# ==========================================
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    role = data.get('role', 'employee')
    password = data.get('password')
    email = data.get('email', '').strip().lower()
    
    user = users_db.get(role)
    if user and user['password'] == password:
        now_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")
        
        matched_emp = None
        if email:
            matched_emp = next((e for e in employees_db if e.get('email', '').lower() == email), None)
        if not matched_emp:
            matched_emp = next((e for e in employees_db if e.get('role') == role), None)
            
        for emp in employees_db:
            if matched_emp and (emp.get('id') == matched_emp.get('id') or emp.get('email') == matched_emp.get('email')):
                emp['lastLogin'] = now_str
                emp['isOnline'] = True
                emp['status'] = 'online'
            else:
                emp['isOnline'] = False
                emp['status'] = 'offline'
                
        save_employees()
        
        user_name = matched_emp.get('name') if matched_emp else role.capitalize()
        log_activity("Login/Checkout", f"{role.capitalize()} Login", f"User '{user_name}' authenticated & started active session", performed_by=user_name)
        return jsonify({"success": True, "role": role}), 200
    return jsonify({"error": "Invalid password"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    data = request.get_json() or {}
    role = data.get('role', 'employee')
    email = data.get('email', '').strip().lower()
    
    matched_emp = None
    if email:
        matched_emp = next((e for e in employees_db if e.get('email', '').lower() == email), None)
    if not matched_emp:
        matched_emp = next((e for e in employees_db if e.get('role') == role and e.get('isOnline')), None)
        
    if matched_emp:
        matched_emp['isOnline'] = False
        matched_emp['status'] = 'offline'
    else:
        for emp in employees_db:
            if emp.get('role') == role:
                emp['isOnline'] = False
                emp['status'] = 'offline'
                
    save_employees()
    user_name = matched_emp.get('name') if matched_emp else role.capitalize()
    log_activity("Login/Checkout", f"{role.capitalize()} Logout", f"User '{user_name}' signed out of the POS system", performed_by=user_name)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    role = data.get('role')
    
    user = users_db.get(role)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    otp = str(random.randint(100000, 999999))
    user['otp'] = otp
    save_users() # Save OTP to file
    
    email_sent = send_otp_email(user['email'], otp)
    
    if email_sent:
        masked_email = user['email'][0] + "***" + user['email'][user['email'].find('@'):]
        log_activity("Login/Checkout", "Password Reset Requested", f"OTP sent to {masked_email} for role '{role}'", performed_by=role.capitalize())
        return jsonify({"success": True, "message": f"OTP sent to {masked_email}"}), 200
    return jsonify({"error": "Failed to send email. Check backend credentials."}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    role = data.get('role')
    otp = data.get('otp')
    new_password = data.get('newPassword')
    
    user = users_db.get(role)
    if user and user['otp'] == otp:
        user['password'] = new_password
        user['otp'] = None
        save_users() # Save new password to file permanently!
        log_activity("Login/Checkout", "Password Reset", f"Password successfully updated for role '{role}'", performed_by=role.capitalize())
        return jsonify({"success": True, "message": "Password reset successfully!"}), 200
    return jsonify({"error": "Invalid OTP"}), 400


# ==========================================
# 2. INVENTORY ROUTES (PERMANENT JSON DATABASE)
# ==========================================
INVENTORY_FILE = 'inventory.json'
default_inventory = [] # Relying on your generated inventory.json

if os.path.exists(INVENTORY_FILE):
    with open(INVENTORY_FILE, 'r') as f:
        inventory_db = json.load(f)
else:
    inventory_db = default_inventory
    with open(INVENTORY_FILE, 'w') as f:
        json.dump(inventory_db, f, indent=4)

def save_inventory():
    with open(INVENTORY_FILE, 'w') as f:
        json.dump(inventory_db, f, indent=4)

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    return jsonify({"items": inventory_db}), 200

@app.route('/api/inventory', methods=['POST'])
def add_inventory():
    data = request.get_json()
    new_product = {
        "id": str(uuid.uuid4())[:8],
        "barcode": data.get('barcode', ''),
        "name": data.get('name', 'Unnamed Product'),
        "category": data.get('category', 'General'),
        "price": data.get('price', 0),
        "stock": data.get('stock', 0),
        "lowStockAlert": data.get('lowStockAlert', 5),
        "imageUrl": data.get('imageUrl', ''),
        "specifications": data.get('specifications', '')
    }
    inventory_db.append(new_product)
    save_inventory()
    log_activity("Inventory", "Product Added", f"Added '{new_product['name']}' (Stock: {new_product['stock']}, Price: ₹{new_product['price']})", performed_by="Admin")
    return jsonify(new_product), 201

@app.route('/api/inventory/<product_id>', methods=['PUT'])
def edit_inventory(product_id):
    data = request.get_json()
    global inventory_db
    for product in inventory_db:
        if str(product['id']) == str(product_id):
            product['name'] = data.get('name', product['name'])
            product['barcode'] = data.get('barcode', product['barcode'])
            product['category'] = data.get('category', product['category'])
            product['price'] = data.get('price', product['price'])
            product['stock'] = data.get('stock', product['stock'])
            product['lowStockAlert'] = data.get('lowStockAlert', product['lowStockAlert'])
            product['imageUrl'] = data.get('imageUrl', product['imageUrl'])
            product['specifications'] = data.get('specifications', product['specifications'])
            save_inventory()
            log_activity("Inventory", "Product Updated", f"Updated details for '{product['name']}' (Stock: {product['stock']}, Price: ₹{product['price']})", performed_by="Admin")
            return jsonify(product), 200
    return jsonify({"error": "Product not found"}), 404

@app.route('/api/inventory/<product_id>', methods=['DELETE'])
def delete_inventory(product_id):
    global inventory_db
    deleted_p = next((p for p in inventory_db if str(p['id']) == str(product_id)), None)
    p_name = deleted_p['name'] if deleted_p else product_id
    inventory_db = [p for p in inventory_db if str(p['id']) != str(product_id)]
    save_inventory()
    log_activity("Inventory", "Product Deleted", f"Deleted product '{p_name}' from inventory", performed_by="Admin")
    return jsonify({"success": True, "message": "Product deleted"}), 200


# ==========================================
# 3. EMPLOYEE ROUTES (PERMANENT JSON DATABASE)
# ==========================================
EMPLOYEES_FILE = 'employees.json'
default_employees = [
    {"id": "1", "name": "Admin", "email": "systemdefault96@gmail.com", "role": "admin", "lastLogin": "Today, 09:00 AM"},
    {"id": "2", "name": "Staff", "email": "staff@store.com", "role": "employee", "lastLogin": "Today, 10:15 AM"}
]

if os.path.exists(EMPLOYEES_FILE):
    with open(EMPLOYEES_FILE, 'r') as f:
        employees_db = json.load(f)
else:
    employees_db = default_employees
    with open(EMPLOYEES_FILE, 'w') as f:
        json.dump(employees_db, f, indent=4)

def save_employees():
    with open(EMPLOYEES_FILE, 'w') as f:
        json.dump(employees_db, f, indent=4)

@app.route('/api/auth/send-admin-otp', methods=['POST'])
def send_admin_otp():
    admin_user = users_db.get('admin')
    otp = str(random.randint(100000, 999999))
    admin_user['otp'] = otp
    save_users() # Save Admin OTP
    
    email_sent = send_otp_email(admin_user['email'], otp)
    if email_sent:
        log_activity("Login/Checkout", "Admin OTP Sent", "OTP generated and sent to Admin email", performed_by="System")
        return jsonify({"success": True, "message": "OTP sent to Admin"}), 200
    return jsonify({"error": "Failed to send OTP to Admin"}), 500

@app.route('/api/auth/employees', methods=['GET'])
def get_employees():
    global employees_db
    if os.path.exists(EMPLOYEES_FILE):
        try:
            with open(EMPLOYEES_FILE, 'r') as f:
                employees_db = json.load(f)
        except Exception:
            pass

    conn = get_db_connection()
    cursor = conn.cursor()
    
    enriched_employees = []
    for emp in employees_db:
        emp_name = emp.get('name', '')
        
        cursor.execute("""
            SELECT timestamp, action FROM activity_logs 
            WHERE category = 'Login/Checkout' 
            AND (performed_by LIKE ? OR details LIKE ?) 
            ORDER BY id DESC LIMIT 1
        """, (f"%{emp_name}%", f"%{emp_name}%"))
        
        last_log = cursor.fetchone()
        last_login_time = emp.get('lastLogin', 'Never')
        if last_log:
            last_login_time = last_log['timestamp']
            
        is_online = bool(emp.get('isOnline', False) and emp.get('status') == 'online')

        emp_copy = dict(emp)
        emp_copy['lastLogin'] = last_login_time
        emp_copy['isOnline'] = is_online
        emp_copy['status'] = 'online' if is_online else 'offline'
        enriched_employees.append(emp_copy)
        
    conn.close()
    return jsonify(enriched_employees), 200

@app.route('/api/auth/employees', methods=['POST'])
def add_employee():
    data = request.get_json()
    raw_password = data.get('password', 'staff123')
    email = data.get('email', '')
    name = data.get('name', 'New Employee')
    role = data.get('role', 'employee')
    
    new_emp = {
        "id": str(uuid.uuid4())[:8],
        "name": name,
        "email": email,
        "role": role,
        "lastLogin": "Never"
    }
    employees_db.append(new_emp)
    save_employees()
    
    # Also update login credentials!
    if role in users_db:
        users_db[role]['email'] = email
        users_db[role]['password'] = raw_password
        save_users()

    if email:
        send_welcome_email(email, name, role, raw_password)
        
    log_activity("Login/Checkout", "Employee Registered", f"Added new employee '{name}' ({email}) with role '{role}'", performed_by="Admin")
    return jsonify(new_emp), 201

@app.route('/api/auth/employees/<emp_id>', methods=['PUT'])
def edit_employee(emp_id):
    data = request.get_json()
    global employees_db
    
    new_password = data.get('password')
    if new_password:
        provided_otp = data.get('otp')
        if not provided_otp or provided_otp != users_db['admin']['otp']:
            return jsonify({"error": "Invalid or missing OTP for password change"}), 401
        users_db['admin']['otp'] = None
        save_users() # Clear used OTP
    
    for emp in employees_db:
        if str(emp['id']) == str(emp_id):
            emp['name'] = data.get('name', emp['name'])
            emp['email'] = data.get('email', emp['email'])
            
            new_role = data.get('role', emp['role'])
            emp['role'] = new_role
            
            # Update permanent login database!
            if new_password and new_role in users_db:
                users_db[new_role]['password'] = new_password
                users_db[new_role]['email'] = emp['email']
                save_users()
            
            save_employees()
            log_activity("Login/Checkout", "Employee Updated", f"Updated employee '{emp['name']}' details (Role: {emp['role']})", performed_by="Admin")
            return jsonify(emp), 200
            
    return jsonify({"error": "Employee not found"}), 404

@app.route('/api/auth/employees/<emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    global employees_db
    deleted_emp = next((e for e in employees_db if str(e['id']) == str(emp_id)), None)
    emp_name = deleted_emp['name'] if deleted_emp else emp_id
    employees_db = [e for e in employees_db if str(e['id']) != str(emp_id)]
    save_employees()
    log_activity("Login/Checkout", "Employee Deleted", f"Removed employee '{emp_name}' (ID: {emp_id})", performed_by="Admin")
    return jsonify({"success": True}), 200


# ==========================================
# 3.5. POS BILLING & CHECKOUT ENDPOINT
# ==========================================
@app.route('/api/checkout', methods=['POST'])
def checkout():
    try:
        data = request.get_json() or {}
        
        # Support both 'cart' (from Billing.jsx) and 'items' (from API clients)
        raw_items = data.get('cart') or data.get('items') or []
        customer_info = data.get('customer') or {}
        
        if isinstance(customer_info, dict):
            customer_name = customer_info.get('name') or data.get('customer_name') or 'Walk-in Customer'
            phone = customer_info.get('phone') or data.get('phone') or ''
            email = customer_info.get('email') or data.get('email') or ''
        else:
            customer_name = data.get('customer_name') or 'Walk-in Customer'
            phone = data.get('phone') or ''
            email = data.get('email') or ''

        if not raw_items:
            return jsonify({"success": False, "error": "Cart is empty"}), 400

        total_bill = float(data.get('total') or data.get('grand_total') or 0.0)
        
        bill_products = []
        calc_subtotal = 0.0
        
        global inventory_db
        
        for item in raw_items:
            p_id = str(item.get('id') or item.get('product_id'))
            qty = int(item.get('qty') or item.get('quantity') or 1)
            p_name = item.get('name') or item.get('product_name') or 'Product'
            price = float(item.get('price') or 0.0)
            
            amount = price * qty
            calc_subtotal += amount
            
            bill_products.append({
                "product_id": p_id,
                "name": p_name,
                "price": price,
                "quantity": qty,
                "amount": amount
            })
            
            # Deduct stock in memory and inventory.json
            for p in inventory_db:
                if str(p.get('id')) == p_id:
                    current_stock = int(p.get('stock', 0))
                    p['stock'] = max(0, current_stock - qty)
                    
        save_inventory()
        
        if total_bill <= 0:
            total_bill = calc_subtotal * 0.95
            
        from datetime import datetime
        date_str = datetime.now().strftime("%Y-%m-%d")
        time_str = datetime.now().strftime("%H:%M:%S")
        invoice_number = f"INV{random.randint(1000, 9999)}"
        
        cashier = data.get('cashier') or data.get('performed_by') or 'Pars'
        
        # Save into SQLite database (billing.db)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO bills (customer_name, email, phone, total_bill, date, time, invoice_number, cashier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (customer_name, email, phone, total_bill, date_str, time_str, invoice_number, cashier))
        
        bill_id = cursor.lastrowid
        
        for prod in bill_products:
            cursor.execute("""
                INSERT INTO bill_items (bill_id, product_id, product_name, price, quantity, amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bill_id, prod['product_id'], prod['name'], prod['price'], prod['quantity'], prod['amount']))
            
            cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ? OR barcode = ?", (prod['quantity'], prod['product_id'], prod['product_id']))
            
        conn.commit()
        conn.close()
        
        # LOG TO LIVE DATABASE ACTIVITY LOGS
        log_activity(
            category="Billing",
            action="Invoice Generated (POS Sale)",
            details=f"Invoice #{invoice_number} created for ₹{total_bill:,.2f} ({len(bill_products)} items) - Customer: {customer_name}",
            performed_by=cashier
        )
        
        # Log inventory stock reduction
        items_summary = ", ".join([f"{p['name']} (x{p['quantity']})" for p in bill_products[:3]])
        log_activity(
            category="Inventory",
            action="Stock Reduced (POS Sale)",
            details=f"Stock deducted for sold items: {items_summary}",
            performed_by="POS System"
        )

        return jsonify({
            "success": True,
            "message": "Bill generated successfully",
            "invoice_number": invoice_number,
            "bill_id": bill_id,
            "total": total_bill
        }), 201

    except Exception as e:
        print(f"Checkout Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/barcode/scan', methods=['POST'])
def handle_iot_barcode_scan():
    try:
        data = request.get_json() or {}
        barcode = str(data.get('barcode', '')).strip()
        
        if not barcode:
            return jsonify({"success": False, "error": "No barcode provided"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE barcode = ?", (barcode,))
        product = cursor.fetchone()
        conn.close()
        
        if not product:
            product = next((p for p in inventory_db if str(p.get('barcode')).strip() == barcode), None)
            
        if product:
            p_dict = dict(product) if not isinstance(product, dict) else product
            log_activity(
                category="Billing",
                action="IoT Barcode Scanned",
                details=f"IoT Scanner scanned barcode '{barcode}' -> Match: {p_dict.get('name') or p_dict.get('product_name')}",
                performed_by="IoT Scanner"
            )
            return jsonify({
                "success": True,
                "product": {
                    "id": p_dict.get('id'),
                    "barcode": p_dict.get('barcode'),
                    "name": p_dict.get('name') or p_dict.get('product_name'),
                    "price": float(p_dict.get('price', 0)),
                    "stock": int(p_dict.get('stock', 0)),
                    "category": p_dict.get('category', 'General')
                }
            }), 200
        else:
            log_activity(
                category="Inventory",
                action="Unknown Barcode Scanned",
                details=f"IoT Scanner scanned unregistered barcode '{barcode}'",
                performed_by="IoT Scanner"
            )
            return jsonify({"success": False, "error": f"Barcode '{barcode}' not found in inventory"}), 404
    except Exception as e:
        print(f"IoT Barcode Scan Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/sales/history', methods=['GET'])
def get_sales_history():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM bills ORDER BY id DESC LIMIT 100")
        bills = cursor.fetchall()
        
        result = []
        for b in bills:
            bill_id = b['id']
            cursor.execute("SELECT * FROM bill_items WHERE bill_id = ?", (bill_id,))
            items = [dict(row) for row in cursor.fetchall()]
            
            b_dict = dict(b)
            b_dict['items'] = items
            b_dict['invoice_no'] = b_dict.get('invoice_number') or f"INV{bill_id:04d}"
            b_dict['cashier'] = b_dict.get('cashier', 'Staff (Counter 1)')
            b_dict['customer_name'] = b_dict.get('customer_name') or 'Walk-in'
            b_dict['phone'] = b_dict.get('phone') or 'N/A'
            b_dict['datetime_formatted'] = f"{b_dict.get('date', '')} {b_dict.get('time', '')}".strip()
            result.append(b_dict)
            
        conn.close()
        return jsonify(result), 200
    except Exception as e:
        print(f"Sales History Error: {e}")
        return jsonify([]), 200


@app.route('/api/integration/dashboard', methods=['GET'])
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # Today's Revenue & Bills
        cursor.execute("SELECT SUM(total_bill) FROM bills WHERE date = ?", (today_str,))
        today_rev = cursor.fetchone()[0] or 0.0
        
        cursor.execute("SELECT SUM(total_bill) FROM bills")
        total_rev = cursor.fetchone()[0] or 0.0
        
        cursor.execute("SELECT COUNT(*) FROM bills WHERE date = ?", (today_str,))
        today_bills = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM bills")
        total_bills = cursor.fetchone()[0] or 0
        
        # Inventory Stats
        global inventory_db
        total_prods = len(inventory_db)
        low_stock = sum(1 for p in inventory_db if int(p.get('stock', 0)) <= int(p.get('lowStockAlert', 5)))
        
        # Employee Stats
        global employees_db
        total_emps = len(employees_db)
        online_emps = sum(1 for e in employees_db if e.get('isOnline') or e.get('status') == 'online')
        
        # Revenue trend chart data (past 7 days)
        cursor.execute("SELECT date, SUM(total_bill) FROM bills GROUP BY date ORDER BY date DESC LIMIT 7")
        raw_chart = cursor.fetchall()
        chart_data = []
        for row in reversed(raw_chart):
            d_label = row[0] if row[0] else 'Today'
            chart_data.append({"name": d_label, "revenue": float(row[1] or 0.0)})
            
        if not chart_data:
            chart_data = [
                {"name": "Today", "revenue": float(today_rev)}
            ]
            
        # Recent Sales (Top 5)
        cursor.execute("SELECT * FROM bills ORDER BY id DESC LIMIT 5")
        recent_sales = [dict(row) for row in cursor.fetchall()]
        
        # Recent Activity Logs (Top 5)
        cursor.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 5")
        recent_activity = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            "success": True,
            "stats": {
                "todayRevenue": float(today_rev),
                "monthlyRevenue": float(total_rev),
                "todayBills": today_bills if today_bills > 0 else total_bills,
                "totalProducts": total_prods,
                "lowStock": low_stock,
                "totalEmployees": total_emps,
                "onlineEmployees": online_emps
            },
            "chartData": chart_data,
            "recentSales": recent_sales,
            "recentActivity": recent_activity
        }), 200
    except Exception as e:
        print(f"Dashboard Stats Error: {e}")
        return jsonify({
            "success": False,
            "stats": {
                "todayRevenue": 0, "monthlyRevenue": 0, "todayBills": 0, "totalProducts": 0, "lowStock": 0, "totalEmployees": 0, "onlineEmployees": 0
            },
            "chartData": [], "recentSales": [], "recentActivity": []
        }), 200


@app.route('/api/employee/dashboard-stats', methods=['GET'])
def get_employee_dashboard_stats():
    cashier = request.args.get('cashier', '')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        if cashier:
            cursor.execute("""
                SELECT SUM(total_bill), COUNT(*) FROM bills 
                WHERE (date = ? OR date IS NULL) 
                AND (cashier LIKE ? OR cashier IS NULL OR cashier = '' OR customer_name LIKE ?)
            """, (today_str, f"%{cashier}%", f"%{cashier}%"))
        else:
            cursor.execute("SELECT SUM(total_bill), COUNT(*) FROM bills")
            
        row = cursor.fetchone()
        today_sales = float(row[0] or 0.0)
        today_count = int(row[1] or 0)
        
        if today_count == 0:
            cursor.execute("SELECT SUM(total_bill), COUNT(*) FROM bills")
            row_all = cursor.fetchone()
            today_sales = float(row_all[0] or 0.0)
            today_count = int(row_all[1] or 0)

        avg_sale = round(today_sales / max(1, today_count), 2)
        
        cursor.execute("SELECT * FROM bills ORDER BY id DESC LIMIT 10")
        bills = [dict(r) for r in cursor.fetchall()]
        for b in bills:
            b['invoice_no'] = b.get('invoice_number') or f"INV{b['id']:04d}"
            b['customer_name'] = b.get('customer_name') or 'Walk-in Customer'
            b['datetime_formatted'] = f"{b.get('date', '')} {b.get('time', '')}".strip()

        conn.close()
        
        return jsonify({
            "success": True,
            "stats": {
                "todaySales": today_sales,
                "todayBills": today_count,
                "avgSale": avg_sale,
                "iotStatus": "Online"
            },
            "recentBills": bills
        }), 200
    except Exception as e:
        print(f"Employee Dashboard Stats Error: {e}")
        return jsonify({
            "success": False,
            "stats": { "todaySales": 0.0, "todayBills": 0, "avgSale": 0.0, "iotStatus": "Offline" },
            "recentBills": []
        }), 200


# ==========================================
# 4. LIVE REPORTS & EXPORT ENDPOINTS
# ==========================================
@app.route('/api/reports/logs', methods=['GET'])
def get_reports_logs():
    category = request.args.get('category')
    search = request.args.get('search')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT id, category, action, details, performed_by, timestamp FROM activity_logs"
    params = []
    conditions = []
    
    if category and category != 'All':
        conditions.append("category = ?")
        params.append(category)
        
    if search:
        conditions.append("(action LIKE ? OR details LIKE ? OR performed_by LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY id DESC LIMIT 100"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    logs_list = [dict(row) for row in rows]
    return jsonify(logs_list), 200

@app.route('/api/reports/generate', methods=['POST'])
def generate_report():
    data = request.get_json() or {}
    report_type = data.get('reportName', 'Daily Sales')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), SUM(total_bill) FROM bills")
    total_bills, total_rev = cursor.fetchone()
    total_rev = total_rev or 0.0
    conn.close()
    
    log_activity("Reports", "Report Generated", f"Generated '{report_type}' report (Total Sales: ₹{total_rev:,.2f})", performed_by="Admin")
    
    return jsonify({
        "success": True,
        "reportName": report_type,
        "summary": {
            "total_bills": total_bills,
            "total_revenue": total_rev,
            "generated_at": time.strftime('%Y-%m-%d %H:%M:%S')
        }
    }), 200

@app.route('/api/reports/export/excel', methods=['GET'])
def export_reports_excel():
    try:
        wb = openpyxl.Workbook()
        
        # Sheet 1: Activity Logs & Audit Trail
        ws_logs = wb.active
        ws_logs.title = "Live Activity Logs"
        ws_logs.append(["ID", "Timestamp", "Category", "Action", "Details", "Performed By"])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM activity_logs ORDER BY id DESC")
        for row in cursor.fetchall():
            ws_logs.append([row['id'], row['timestamp'], row['category'], row['action'], row['details'], row['performed_by']])
            
        # Sheet 2: Inventory
        ws_inv = wb.create_sheet(title="Live Inventory")
        ws_inv.append(["Barcode", "Product Name", "Category", "Price", "Stock"])
        for item in inventory_db:
            ws_inv.append([item.get('barcode', ''), item.get('name', ''), item.get('category', ''), item.get('price', 0), item.get('stock', 0)])
            
        # Sheet 3: Sales / Bills
        ws_bills = wb.create_sheet(title="Sales Invoices")
        ws_bills.append(["Bill ID", "Invoice No", "Customer", "Date", "Time", "Total Amount"])
        cursor.execute("SELECT * FROM bills ORDER BY id DESC")
        for b in cursor.fetchall():
            ws_bills.append([b['id'], b.get('invoice_number', ''), b.get('customer_name', ''), b.get('date', ''), b.get('time', ''), b.get('total_bill', 0)])
            
        conn.close()
        
        excel_io = io.BytesIO()
        wb.save(excel_io)
        excel_io.seek(0)
        
        log_activity("Reports", "Excel Exported", "Exported live database report to Excel (.xlsx)", performed_by="Admin")
        
        return send_file(
            excel_io,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='Sales_Report.xlsx'
        )
    except Exception as e:
        print(f"Excel Export Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/export/pdf', methods=['GET'])
def export_reports_pdf():
    try:
        pdf_io = io.BytesIO()
        c = canvas.Canvas(pdf_io)
        
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 800, "SuperMart POS - Live System Database Audit Report")
        
        c.setFont("Helvetica", 10)
        c.drawString(50, 785, f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        c.line(50, 775, 550, 775)
        
        # Live Stats
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), SUM(total_bill) FROM bills")
        total_bills, total_rev = cursor.fetchone()
        total_rev = total_rev or 0.0
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, 755, "System Performance Overview:")
        c.setFont("Helvetica", 9)
        c.drawString(70, 740, f"• Total Completed Invoices: {total_bills}")
        c.drawString(70, 725, f"• Total Sales Volume: INR {total_rev:,.2f}")
        c.drawString(70, 710, f"• Total Inventory Items: {len(inventory_db)}")
        
        # Live Entries
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, 680, "Live Database Activity Log Stream:")
        c.line(50, 672, 550, 672)
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(50, 660, "Time")
        c.drawString(140, 660, "Category")
        c.drawString(220, 660, "Action")
        c.drawString(330, 660, "Details")
        c.drawString(490, 660, "User")
        c.line(50, 652, 550, 652)
        
        c.setFont("Helvetica", 8)
        cursor.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 25")
        y = 638
        for row in cursor.fetchall():
            if y < 40:
                c.showPage()
                y = 800
            ts = row['timestamp'] if row['timestamp'] else ''
            cat = row['category'] if row['category'] else ''
            act = row['action'][:18] if row['action'] else ''
            det = row['details'][:32] if row['details'] else ''
            usr = row['performed_by'] if row['performed_by'] else ''
            
            c.drawString(50, y, ts)
            c.drawString(140, y, cat)
            c.drawString(220, y, act)
            c.drawString(330, y, det)
            c.drawString(490, y, usr)
            y -= 16
            
        conn.close()
        c.save()
        pdf_io.seek(0)
        
        log_activity("Reports", "PDF Exported", "Exported live database report to PDF (.pdf)", performed_by="Admin")
        
        return send_file(
            pdf_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='System_Report.pdf'
        )
    except Exception as e:
        print(f"PDF Export Error: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================
# 5. SETTINGS & SYSTEM MAINTENANCE ENDPOINTS
# ==========================================
@app.route('/api/settings/backup', methods=['GET'])
def download_db_backup():
    try:
        db_file = os.path.join(os.path.dirname(__file__), 'billing.db')
        if os.path.exists(db_file):
            log_activity("Settings", "Backup Downloaded", "Admin downloaded local SQLite billing.db database backup", performed_by="Admin")
            return send_file(db_file, mimetype='application/x-sqlite3', as_attachment=True, download_name='billing_backup.db')
        return jsonify({"error": "Database file not found"}), 404
    except Exception as e:
        print(f"Backup Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings/db-health', methods=['GET'])
def get_db_health():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM bills")
        bills_count = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM activity_logs")
        logs_count = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM products")
        products_count = cursor.fetchone()[0] or 0
        
        conn.close()
        
        db_file = os.path.join(os.path.dirname(__file__), 'billing.db')
        file_size_mb = round(os.path.getsize(db_file) / (1024 * 1024), 2) if os.path.exists(db_file) else 0.0
        
        return jsonify({
            "status": "Healthy & Connected",
            "db_name": "billing.db",
            "file_size_mb": file_size_mb,
            "total_bills": bills_count,
            "total_logs": logs_count,
            "total_products": products_count,
            "engine": "SQLite 3 Database"
        }), 200
    except Exception as e:
        print(f"DB Health Error: {e}")
        return jsonify({
            "status": "Connected (JSON Mode)",
            "db_name": "inventory.json",
            "file_size_mb": 0.05,
            "total_bills": 0,
            "total_logs": 0,
            "total_products": len(inventory_db),
            "engine": "Local Storage & JSON"
        }), 200


if __name__ == '__main__':
    print("[SUCCESS] Backend is starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
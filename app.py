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
    data = request.get_json()
    role = data.get('role')
    password = data.get('password')
    
    user = users_db.get(role)
    if user and user['password'] == password:
        log_activity("Login/Checkout", f"{role.capitalize()} Login", f"{role.capitalize()} user authenticated successfully", performed_by=role.capitalize())
        return jsonify({"success": True, "role": role}), 200
    return jsonify({"error": "Invalid password"}), 401

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
    return jsonify(employees_db), 200

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


if __name__ == '__main__':
    print("🚀 Backend is starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
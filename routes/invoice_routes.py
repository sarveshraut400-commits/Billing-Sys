from flask import Blueprint, request, jsonify
from datetime import datetime
import os
from database import get_db_connection
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

invoice_bp = Blueprint("invoice", __name__)

# =============================================
# Ensure invoices table exists
# =============================================
def init_invoice_table():
    conn = get_db_connection()
    try:
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
        conn.commit()
    finally:
        conn.close()

init_invoice_table()

# =============================================
# Invoice Number Generator
# =============================================
def generate_invoice_number():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT invoice_no FROM invoices ORDER BY invoice_no DESC LIMIT 1")
        last_inv = cursor.fetchone()
        cursor.execute("SELECT invoice_number FROM bills ORDER BY invoice_number DESC LIMIT 1")
        last_bill = cursor.fetchone()
    finally:
        conn.close()

    max_num = 0
    if last_inv:
        num = int(last_inv[0].replace("INV", ""))
        if num > max_num:
            max_num = num
    if last_bill:
        num = int(last_bill[0].replace("INV", ""))
        if num > max_num:
            max_num = num

    return f"INV{max_num + 1:04d}"

# =============================================
# Date/Time Helpers
# =============================================
def get_date():
    return datetime.now().strftime("%d-%m-%Y")

def get_time():
    return datetime.now().strftime("%I:%M %p")

# =============================================
# GST & Totals Calculation
# =============================================
def calculate_totals(subtotal, discount_percent=0):
    gst_rate = 0.18
    gst = subtotal * gst_rate
    discount = subtotal * (discount_percent / 100) if discount_percent else 0
    grand_total = subtotal + gst - discount
    return {
        "subtotal": round(subtotal, 2),
        "gst": round(gst, 2),
        "discount": round(discount, 2),
        "grand_total": round(grand_total, 2)
    }

# =============================================
# PDF Generation with ReportLab
# =============================================
def generate_pdf(invoice_no, customer_name, invoice_date,
                 invoice_time, products, subtotal, gst, discount, grand_total):

    os.makedirs("downloads", exist_ok=True)
    filename = f"downloads/invoice_{invoice_no}.pdf"
    c = canvas.Canvas(filename)

    # Title & Header info
    c.setFont("Helvetica-Bold", 20)
    c.drawString(180, 800, "ABC ELECTRONICS")
    c.setFont("Helvetica", 12)
    c.drawString(50, 770, f"Invoice No : {invoice_no}")
    c.drawString(50, 750, f"Customer   : {customer_name}")
    c.drawString(50, 730, f"Date       : {invoice_date}")
    c.drawString(50, 710, f"Time       : {invoice_time}")

    # Table Header
    y = 670
    c.setFont("Helvetica-Bold", 12)
    headers = [("Product", 50), ("Qty", 220), ("Price", 280), ("GST", 360), ("Total", 450)]
    for title, x_pos in headers:
        c.drawString(x_pos, y, title)

    y -= 20
    c.line(50, y, 550, y)
    y -= 20

    # Items
    c.setFont("Helvetica", 12)
    for item in products:
        total = item["price"] * item["qty"]
        c.drawString(50, y, item["name"])
        c.drawString(220, y, str(item["qty"]))
        c.drawString(280, y, f"₹{item['price']}")
        c.drawString(360, y, f"{item['gst']}%")
        c.drawString(450, y, f"₹{total}")
        y -= 20

    y -= 20
    c.line(50, y, 550, y)
    y -= 30

    # Totals
    c.drawString(350, y, f"Subtotal : ₹{subtotal}")
    c.drawString(350, y-20, f"GST : ₹{gst}")
    c.drawString(350, y-40, f"Discount : ₹{discount}")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(350, y-70, f"Grand Total : ₹{grand_total}")

    c.setFont("Helvetica", 12)
    c.drawString(180, y-120, "Thank You For Shopping!")
    c.save()
    
    return filename

# =============================================
# Wrapper function for the checkout route
# =============================================
def generate_invoice_pdf(bill_id, invoice_number, customer_name, grand_total, bill_products, subtotal, gst, discount):
    products_for_pdf = [
        {
            "name": item["name"],
            "price": item["price"],
            "qty": item["quantity"],
            "gst": 18 
        } for item in bill_products
    ]

    pdf_path = generate_pdf(
        invoice_no=invoice_number,
        customer_name=customer_name,
        invoice_date=get_date(),
        invoice_time=get_time(),
        products=products_for_pdf,
        subtotal=subtotal,
        gst=gst,
        discount=discount,
        grand_total=grand_total
    )

    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO invoices (invoice_no, bill_id, customer_name, grand_total, date, time, pdf_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (invoice_number, bill_id, customer_name, grand_total, get_date(), get_time(), pdf_path)
        )
        conn.commit()
    finally:
        conn.close()

    return pdf_path
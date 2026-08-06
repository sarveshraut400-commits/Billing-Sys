from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback

from database import get_db_connection
from routes.auth_routes import tokens
from routes.invoice_routes import (
    calculate_totals,
    generate_invoice_number,
    generate_invoice_pdf  # <-- correct import
)
from services.whatsapp_service import send_invoice_via_whatsapp

integration_bp = Blueprint("integration", __name__)

@integration_bp.route("/checkout", methods=["POST"])
def checkout():
    try:
        # ---------- 1. Validate Session ----------
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"success": False, "error": "Unauthorized: Missing token"}), 401

        session_data = tokens.get(token)
        if not session_data:
            return jsonify({"success": False, "error": "Unauthorized: Invalid token"}), 401

        if datetime.utcnow() > session_data["expires"]:
            return jsonify({"success": False, "error": "Unauthorized: Token expired"}), 401

        # ---------- 2. Parse Request ----------
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "No JSON data provided"}), 400

        customer_name = data.get("customer_name")
        email = data.get("email")
        phone = data.get("phone")
        items = data.get("items")
        discount_percent = data.get("discount_percent", 0)

        if not items:
            return jsonify({"success": False, "error": "No items"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        subtotal = 0
        bill_products = []

        for item in items:
            product_id = item.get("product_id")
            qty = item.get("quantity")
            if not product_id or not qty:
                return jsonify({"success": False, "error": "Each item must have product_id and quantity"}), 400

            cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
            product = cursor.fetchone()

            if not product:
                return jsonify({"success": False, "error": f"Product {product_id} not found"}), 404

            if product["stock"] < qty:
                return jsonify({
                    "success": False,
                    "error": f"Insufficient stock for {product['product_name']}. Available: {product['stock']}"
                }), 400

            amount = product["price"] * qty
            subtotal += amount
            bill_products.append({
                "product_id": product["id"],
                "name": product["product_name"],
                "price": product["price"],
                "quantity": qty,
                "amount": amount
            })

        # ---------- 3. Calculate Totals ----------
        totals = calculate_totals(subtotal, discount_percent)

        # ---------- 4. Generate Invoice Number ----------
        invoice_number = generate_invoice_number()

        # ---------- 5. Insert Bill ----------
        date = datetime.now().strftime("%Y-%m-%d")
        time = datetime.now().strftime("%H:%M:%S")

        cursor.execute("""
            INSERT INTO bills
            (customer_name, email, phone, total_bill, date, time, invoice_number)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (customer_name, email, phone, totals["grand_total"], date, time, invoice_number))

        bill_id = cursor.lastrowid

        for product in bill_products:
            cursor.execute("""
                INSERT INTO bill_items
                (bill_id, product_id, product_name, price, quantity, amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bill_id, product["product_id"], product["name"], product["price"],
                  product["quantity"], product["amount"]))

            cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ?",
                          (product["quantity"], product["product_id"]))

        # ---------- 6. Save Customer ----------
        cursor.execute("""
            INSERT OR IGNORE INTO customers (name, mobile, email)
            VALUES (?, ?, ?)
        """, (customer_name, phone, email))

        cursor.execute("SELECT id FROM customers WHERE mobile = ?", (phone,))
        customer = cursor.fetchone()
        customer_id = customer["id"] if customer else None

        if customer_id:
            cursor.execute("""
                INSERT INTO purchase_history (customer_id, invoice_number, amount, purchase_date)
                VALUES (?, ?, ?, ?)
            """, (customer_id, invoice_number, totals["grand_total"], date))

        conn.commit()
        conn.close()

        # ---------- 7. Generate PDF (REAL) ----------
        pdf_path = generate_invoice_pdf(
            bill_id=bill_id,
            invoice_number=invoice_number,
            customer_name=customer_name,
            grand_total=totals["grand_total"],
            bill_products=bill_products,
            subtotal=totals["subtotal"],
            gst=totals["gst"],
            discount=totals["discount"]
        )

        # ---------- 8. Send WhatsApp ----------
        whatsapp_status = "pending"
        try:
            whatsapp_result = send_invoice_via_whatsapp(
                phone=phone,
                customer_name=customer_name,
                invoice_no=invoice_number,
                amount=totals["grand_total"],
                pdf_path=pdf_path
            )
            whatsapp_status = whatsapp_result
        except Exception as e:
            whatsapp_status = {"error": str(e)}

        # ---------- 9. Return Success ----------
        return jsonify({
            "success": True,
            "message": "Checkout complete!",
            "bill_id": bill_id,
            "invoice_number": invoice_number,
            "subtotal": totals["subtotal"],
            "gst": totals["gst"],
            "discount": totals["discount"],
            "grand_total": totals["grand_total"],
            "pdf_path": pdf_path,
            "whatsapp": whatsapp_status
        }), 200

    except Exception as e:
        print("=" * 50)
        print("ERROR in /api/checkout:")
        traceback.print_exc()
        print("=" * 50)
        return jsonify({
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500
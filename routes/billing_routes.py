from flask import Blueprint, request, jsonify
from datetime import datetime
from database import get_db_connection, log_activity

billing_bp = Blueprint("billing", __name__)


# =====================================================
# GET ALL PRODUCTS (for billing dropdown)
# =====================================================
@billing_bp.route("/products", methods=["GET"])
def get_products():
    try:
        conn = get_db_connection()              # ✅ Fixed
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM products")
        products = cursor.fetchall()
        conn.close()

        return jsonify([
            {
                "id": row["id"],
                "name": row["product_name"],    # ✅ Changed from "name"
                "price": row["price"],
                "stock": row["stock"]           # ✅ Changed from "quantity"
            }
            for row in products
        ]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================
# ADD PRODUCT (if needed – optional)
# =====================================================
@billing_bp.route("/products", methods=["POST"])
def add_product():
    try:
        data = request.json
        product_name = data["name"]             # ✅ Expect "name", but we'll map
        price = data["price"]
        stock = data.get("stock", 0)            # ✅ Changed from "quantity"
        gst_rate = data.get("gst_rate", 0)      # Added optional gst

        conn = get_db_connection()              # ✅ Fixed
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO products (product_name, price, stock, gst_rate)
            VALUES (?, ?, ?, ?)
        """, (product_name, price, stock, gst_rate))

        conn.commit()
        conn.close()

        return jsonify({"message": "Product added successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================
# CREATE BILL (MULTIPLE PRODUCTS)
# =====================================================
@billing_bp.route("/bill", methods=["POST"])
def create_bill():
    try:
        data = request.json
        customer_name = data.get("customer_name")
        email = data.get("email")
        phone = data.get("phone")
        items = data.get("items")

        if not items:
            return jsonify({"error": "No products selected"}), 400

        conn = get_db_connection()              # ✅ Fixed
        cursor = conn.cursor()

        total_bill = 0
        bill_products = []

        # Check stock and calculate
        for item in items:
            product_id = item["product_id"]
            qty = item["quantity"]

            cursor.execute("SELECT * FROM products WHERE id=?", (product_id,))
            product = cursor.fetchone()

            if product is None:
                return jsonify({"error": "Product not found"}), 404

            if product["stock"] < qty:           # ✅ Changed from "quantity"
                return jsonify({
                    "error": f"Not enough stock for {product['product_name']}"   # ✅ Changed from "name"
                }), 400

            amount = product["price"] * qty
            total_bill += amount

            bill_products.append({
                "product_id": product["id"],
                "name": product["product_name"],   # ✅ Changed from "name"
                "price": product["price"],
                "quantity": qty,
                "amount": amount
            })

        # Date and time
        date = datetime.now().strftime("%Y-%m-%d")
        time = datetime.now().strftime("%H:%M:%S")

        # Insert bill (assuming table "bills" exists with these columns)
        cursor.execute("""
            INSERT INTO bills
            (customer_name, email, phone, total_bill, date, time)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (customer_name, email, phone, total_bill, date, time))

        bill_id = cursor.lastrowid

        # Insert bill items + update stock
        for product in bill_products:
            cursor.execute("""
                INSERT INTO bill_items
                (bill_id, product_id, product_name, price, quantity, amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                bill_id,
                product["product_id"],
                product["name"],
                product["price"],
                product["quantity"],
                product["amount"]
            ))

            # Update stock
            cursor.execute("""
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
            """, (product["quantity"], product["product_id"]))

        conn.commit()
        conn.close()

        # Log live activity entry into database
        inv_label = f"Bill #{bill_id}"
        details_str = f"Bill generated for ₹{total_bill:,.2f} ({len(bill_products)} items) - Customer: {customer_name or 'Walk-in'}"
        log_activity("Billing", "Invoice Generated", details_str, performed_by="Staff")

        return jsonify({
            "message": "Bill Generated Successfully",
            "bill_id": bill_id,
            "customer": customer_name,
            "email": email,
            "phone": phone,
            "date": date,
            "time": time,
            "total_bill": total_bill,
            "items": bill_products
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================
# GET ALL BILLS
# =====================================================
@billing_bp.route("/bills", methods=["GET"])
def get_bills():
    try:
        conn = get_db_connection()              # ✅ Fixed
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bills")
        bills = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in bills]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================
# GET BILL BY ID
# =====================================================
@billing_bp.route("/bill/<int:id>", methods=["GET"])
def get_bill(id):
    try:
        conn = get_db_connection()              # ✅ Fixed
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM bills WHERE id=?", (id,))
        bill = cursor.fetchone()

        if bill is None:
            return jsonify({"error": "Bill not found"}), 404

        cursor.execute("SELECT * FROM bill_items WHERE bill_id=?", (id,))
        items = cursor.fetchall()
        conn.close()

        return jsonify({
            "bill": dict(bill),
            "items": [dict(item) for item in items]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
from flask import Blueprint, request, jsonify
from database import get_db_connection

# ----------------------------------------------------
# Blueprint 1: Customer CRUD
# ----------------------------------------------------
customer_bp = Blueprint("customer", __name__)

@customer_bp.route("/customer", methods=["POST"])
def add_customer():
    data = request.get_json()
    name = data.get("name")
    mobile = data.get("mobile")
    email = data.get("email")

    if not name or not mobile:
        return jsonify({"success": False, "message": "Name and Mobile are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO customers (name, mobile, email) VALUES (?, ?, ?)",
                       (name, mobile, email))
        conn.commit()
        customer_id = cursor.lastrowid
        return jsonify({"success": True, "message": "Customer added.", "customer_id": customer_id}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
    finally:
        conn.close()

@customer_bp.route("/customer/<mobile>", methods=["GET"])
def get_customer(mobile):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, mobile, email FROM customers WHERE mobile = ?", (mobile,))
    customer = cursor.fetchone()
    conn.close()
    if customer:
        return jsonify({"id": customer["id"], "name": customer["name"],
                        "mobile": customer["mobile"], "email": customer["email"]}), 200
    return jsonify({"success": False, "message": "Customer not found."}), 404


# ----------------------------------------------------
# Blueprint 2: Purchase History
# ----------------------------------------------------
purchase_bp = Blueprint("purchase", __name__)

@purchase_bp.route("/purchase", methods=["POST"])
def add_purchase():
    data = request.get_json()
    customer_id = data.get("customer_id")
    invoice_number = data.get("invoice_number")
    amount = data.get("amount")
    purchase_date = data.get("purchase_date")

    if not customer_id or not invoice_number or amount is None or not purchase_date:
        return jsonify({"success": False, "message": "All fields are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO purchase_history (customer_id, invoice_number, amount, purchase_date)
            VALUES (?, ?, ?, ?)
        """, (customer_id, invoice_number, amount, purchase_date))
        conn.commit()
        purchase_id = cursor.lastrowid
        return jsonify({"success": True, "message": "Purchase added.", "purchase_id": purchase_id}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
    finally:
        conn.close()

@purchase_bp.route("/purchase/<int:customer_id>", methods=["GET"])
def get_purchase(customer_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, customer_id, invoice_number, amount, purchase_date
        FROM purchase_history WHERE customer_id = ?
    """, (customer_id,))
    purchases = cursor.fetchall()
    conn.close()
    if purchases:
        return jsonify([
            {"id": p["id"], "customer_id": p["customer_id"],
             "invoice_number": p["invoice_number"], "amount": p["amount"],
             "purchase_date": p["purchase_date"]}
            for p in purchases
        ]), 200
    return jsonify({"success": False, "message": "No purchase history found."}), 404
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection
import uuid
import re
from datetime import datetime, timedelta

auth_bp = Blueprint("auth", __name__)

# =============================================
# In‑memory token store (basic session handling)
# For production, store in database
# =============================================
tokens = {}  # token -> {'user_id': id, 'expires': datetime}

def create_user_table():
    """Create the shopkeepers table if it doesn't exist."""
    conn = get_db_connection()
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
    conn.commit()
    conn.close()

# Run table creation when blueprint is registered
create_user_table()


# =============================================
# API : REGISTER (optional – included for completeness)
# =============================================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    shopkeeper_id = data.get("shopkeeper_id", "").strip()
    name = data.get("name", "").strip()
    shop_name = data.get("shop_name", "").strip()
    address = data.get("address", "").strip()
    password = data.get("password", "")

    errors = []
    if not shopkeeper_id:
        errors.append("Shopkeeper ID is required.")
    elif not re.match('^[A-Za-z0-9_]+$', shopkeeper_id):
        errors.append("Shopkeeper ID can only contain letters, digits and underscores.")
    if not name:
        errors.append("Name is required.")
    if not shop_name:
        errors.append("Shop name is required.")
    if not address:
        errors.append("Address is required.")
    if not password:
        errors.append("Password is required.")
    elif len(password) < 6:
        errors.append("Password must be at least 6 characters.")

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    conn = get_db_connection()
    existing = conn.execute(
        "SELECT id FROM shopkeepers WHERE shopkeeper_id = ?", (shopkeeper_id,)
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"success": False, "errors": ["Shopkeeper ID already taken."]}), 400

    password_hash = generate_password_hash(password)
    conn.execute(
        "INSERT INTO shopkeepers (shopkeeper_id, name, shop_name, address, password_hash) VALUES (?, ?, ?, ?, ?)",
        (shopkeeper_id, name, shop_name, address, password_hash)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Registration successful."}), 201


# =============================================
# API : LOGIN
# =============================================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    shopkeeper_id = data.get("shopkeeper_id", "").strip()
    password = data.get("password", "")

    if not shopkeeper_id or not password:
        return jsonify({"success": False, "message": "Shopkeeper ID and password required."}), 400

    conn = get_db_connection()
    user = conn.execute(
        "SELECT * FROM shopkeepers WHERE shopkeeper_id = ?", (shopkeeper_id,)
    ).fetchone()
    conn.close()

    if user and check_password_hash(user["password_hash"], password):
        # Generate token
        token = str(uuid.uuid4())
        # Store with 24‑hour expiry
        tokens[token] = {
            "user_id": user["id"],
            "expires": datetime.utcnow() + timedelta(hours=24)
        }
        return jsonify({
            "success": True,
            "message": "Login successful.",
            "token": token,
            "user": {
                "id": user["id"],
                "shopkeeper_id": user["shopkeeper_id"],
                "name": user["name"],
                "shop_name": user["shop_name"],
                "address": user["address"]
            }
        }), 200

    return jsonify({"success": False, "message": "Invalid Shopkeeper ID or password."}), 401


# =============================================
# API : LOGOUT
# =============================================
@auth_bp.route("/logout", methods=["POST"])
def logout():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"success": False, "message": "Token required."}), 401

    if token in tokens:
        del tokens[token]   # invalidate token
        return jsonify({"success": True, "message": "Logged out."}), 200

    return jsonify({"success": False, "message": "Invalid or expired token."}), 401


# =============================================
# API : VALIDATE SESSION
# =============================================
@auth_bp.route("/validate", methods=["GET"])
def validate():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"success": False, "message": "Token required."}), 401

    session_data = tokens.get(token)
    if not session_data:
        return jsonify({"success": False, "message": "Invalid token."}), 401

    if datetime.utcnow() > session_data["expires"]:
        del tokens[token]   # clean up expired
        return jsonify({"success": False, "message": "Token expired."}), 401

    # Fetch user details
    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, shopkeeper_id, name, shop_name, address FROM shopkeepers WHERE id = ?",
        (session_data["user_id"],)
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"success": False, "message": "User not found."}), 401

    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "shopkeeper_id": user["shopkeeper_id"],
            "name": user["name"],
            "shop_name": user["shop_name"],
            "address": user["address"]
        }
    }), 200
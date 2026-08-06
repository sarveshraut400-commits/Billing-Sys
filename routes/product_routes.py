from flask import Blueprint, jsonify, request
from database import get_db_connection

product_bp = Blueprint("products", __name__)


# ----------------------------------------------------
# API 1 : Get All Products
# ----------------------------------------------------
@product_bp.route("/products", methods=["GET"])
def get_products():

    conn = get_db_connection()

    products = conn.execute(
        "SELECT * FROM products"
    ).fetchall()

    conn.close()

    return jsonify([dict(row) for row in products])


# ----------------------------------------------------
# API 2 : Search Product by Barcode
# ----------------------------------------------------
@product_bp.route("/products/barcode/<barcode>", methods=["GET"])
def get_barcode(barcode):

    conn = get_db_connection()

    product = conn.execute(
        "SELECT * FROM products WHERE barcode=?",
        (barcode,)
    ).fetchone()

    conn.close()

    if product:
        return jsonify(dict(product))

    return jsonify({"message": "Product Not Found"}), 404


# ----------------------------------------------------
# API 3 : Search Product by Name
# ----------------------------------------------------
@product_bp.route("/products/search", methods=["GET"])
def search_product():

    name = request.args.get("name")

    conn = get_db_connection()

    products = conn.execute(
        "SELECT * FROM products WHERE product_name LIKE ?",
        ('%' + name + '%',)
    ).fetchall()

    conn.close()

    return jsonify([dict(row) for row in products])


# ----------------------------------------------------
# API 4 : Product Details by ID
# ----------------------------------------------------
@product_bp.route("/products/id/<int:id>", methods=["GET"])
def product_details(id):

    conn = get_db_connection()

    product = conn.execute(
        "SELECT * FROM products WHERE id=?",
        (id,)
    ).fetchone()

    conn.close()

    if product:
        return jsonify(dict(product))

    return jsonify({"message": "Not Found"}), 404
import requests
import os
from dotenv import load_dotenv

load_dotenv()

ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

URL = f"https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/messages"
UPLOAD_URL = f"https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/media"


def send_whatsapp_message(phone, customer_name, invoice_no, amount):
    """
    Send a text message via WhatsApp.
    Uses 'Rs.' instead of ₹ to avoid encoding issues.
    """
    if not ACCESS_TOKEN or not PHONE_NUMBER_ID:
        return {"success": False, "error": "Missing credentials"}

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    body = (
        f"Hello {customer_name},\n\n"
        "Thank you for shopping with Smart Billing System.\n\n"
        f"Invoice Number : {invoice_no}\n"
        f"Amount : Rs. {amount}\n\n"
        "Your invoice has been generated successfully.\n\n"
        "Thank you."
    )

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {
            "body": body
        }
    }

    try:
        response = requests.post(URL, headers=headers, json=payload)
        response.encoding = 'utf-8'
        return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def upload_pdf(pdf_path):
    """
    Upload the PDF file to Meta and return the media ID.
    """
    if not ACCESS_TOKEN or not PHONE_NUMBER_ID:
        return None

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    data = {
        "messaging_product": "whatsapp"
    }

    try:
        with open(pdf_path, "rb") as pdf_file:
            files = {
                "file": (
                    os.path.basename(pdf_path),
                    pdf_file,
                    "application/pdf"
                )
            }
            response = requests.post(UPLOAD_URL, headers=headers, data=data, files=files)
            response.encoding = 'utf-8'
            if response.status_code == 200:
                return response.json().get("id")
            else:
                return None
    except Exception as e:
        print(f"PDF upload error: {e}")
        return None


def send_invoice_pdf(phone, media_id, filename):
    """
    Send the PDF using the media ID.
    """
    if not ACCESS_TOKEN or not PHONE_NUMBER_ID:
        return {"success": False, "error": "Missing credentials"}

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "document",
        "document": {
            "id": media_id,
            "filename": filename
        }
    }

    try:
        response = requests.post(URL, headers=headers, json=payload)
        response.encoding = 'utf-8'
        return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_invoice_via_whatsapp(phone, customer_name, invoice_no, amount, pdf_path):
    """
    Combined function: sends text message and PDF via WhatsApp.
    Returns a dictionary with both results.
    """
    results = {
        "text": {"success": False},
        "pdf": {"success": False}
    }

    # 1. Send text message
    try:
        text_response = send_whatsapp_message(phone, customer_name, invoice_no, amount)
        results["text"] = text_response
    except Exception as e:
        results["text"] = {"success": False, "error": str(e)}

    # 2. Upload PDF and send
    try:
        media_id = upload_pdf(pdf_path)
        if media_id:
            pdf_response = send_invoice_pdf(phone, media_id, os.path.basename(pdf_path))
            results["pdf"] = pdf_response
        else:
            results["pdf"] = {"success": False, "error": "PDF upload failed"}
    except Exception as e:
        results["pdf"] = {"success": False, "error": str(e)}

    return results
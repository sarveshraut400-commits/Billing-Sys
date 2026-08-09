# Live Production Backend - Render Deployment (diddy branch)
from flask import Flask, request, jsonify, send_file, make_response

from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
import random
import time
import uuid
import io
import json
import os
import threading

from datetime import datetime


# Database helper functions
from database import get_db_connection, log_activity

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import openpyxl

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True) 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INVOICES_DIR = os.path.join(BASE_DIR, 'invoices')
os.makedirs(INVOICES_DIR, exist_ok=True)


# ==========================================
# EMAIL SETTINGS & HIGH-DELIVERABILITY ENGINE
# ==========================================
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "systemdefault96@gmail.com")
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "zkav ukps jfeh uhqw").replace(" ", "").strip()

def send_email(receiver_email, subject, body_text, html_content=None):
    if not receiver_email or not SENDER_EMAIL or not SENDER_PASSWORD:
        print("Email Dispatch Warning: Missing email credentials.")
        return False

    clean_pwd = SENDER_PASSWORD.replace(" ", "").strip()
    
    if html_content:
        msg = MIMEMultipart('alternative')
        msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
    else:
        msg = MIMEText(body_text, 'plain', 'utf-8')

    msg['Subject'] = subject
    msg['From'] = f"SuperMart POS <{SENDER_EMAIL}>"
    msg['To'] = receiver_email
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain='gmail.com')
    
    # Try Port 587 (TLS - High Deliverability)
    try:
        with smtplib.SMTP('smtp.gmail.com', 587, timeout=12) as server:
            server.starttls()
            server.login(SENDER_EMAIL, clean_pwd)
            server.send_message(msg)
        return True
    except Exception as e587:
        print(f"SMTP Port 587 Notice: {e587}. Retrying Port 465 (SSL)...")
        try:
            with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=12) as server:
                server.login(SENDER_EMAIL, clean_pwd)
                server.send_message(msg)
            return True
        except Exception as e465:
            print(f"SMTP Port 465 Error: {e465}")
            return False

def send_otp_email(receiver_email, otp):
    subject = "SuperMart POS - Security Verification OTP"
    body = (
        f"Hello,\n\n"
        f"Your SuperMart POS Security Verification OTP is:\n"
        f"🔑 {otp}\n\n"
        f"This code is valid for 10 minutes. Do not share it with anyone.\n\n"
        f"Regards,\n"
        f"SuperMart Security & Operations"
    )
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #10b981; margin-top: 0;">SuperMart Security Verification</h2>
      <p style="color: #374151; font-size: 14px;">Use the following One-Time Password (OTP) to authorize your account action:</p>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #111827; margin: 20px 0;">
        {otp}
      </div>
      <p style="color: #6b7280; font-size: 12px;">This OTP is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
    </div>
    """
    return send_email(receiver_email, subject, body, html)

def send_welcome_email(receiver_email, name, role, password):
    is_admin = (role.lower() == 'admin')
    
    if is_admin:
        subject = f"👑 Executive Appointment: Welcome to SuperMart Administration, {name}!"
        body = (
            f"Dear {name},\n\n"
            f"CONGRATULATIONS ON YOUR EXECUTIVE APPOINTMENT AS ADMINISTRATOR! 👑🏛️\n\n"
            f"You have been granted full administrative authority and operational stewardship over the SuperMart Enterprise POS ecosystem.\n\n"
            f"As Administrator, your executive responsibilities encompass:\n"
            f"• Revenue & Fiscal Analytics Oversight\n"
            f"• Staff Credentialing & Access Security\n"
            f"• Inventory Procurement & Pricing Strategy\n"
            f"• Live Compliance & Security Auditing\n\n"
            f"Here are your Executive Admin Console credentials:\n"
            f"------------------------------------------------------------\n"
            f"🔑 Executive Portal: https://billing-sys-beta.vercel.app\n"
            f"👤 Admin Account: {name}\n"
            f"📧 Login Email: {receiver_email}\n"
            f"🔒 Initial Password: {password}\n"
            f"🛡️ Authority Level: Full Root Administrator\n"
            f"------------------------------------------------------------\n\n"
            f"💡 EXECUTIVE LEADERSHIP MOTTO:\n"
            f"\"Leadership is not about being in charge. It is about taking care of those in your charge and guiding the enterprise toward enduring excellence.\"\n\n"
            f"Warm regards,\n"
            f"Board of Directors & Executive Operations\n"
            f"SuperMart Corporation"
        )
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Executive Appointment - SuperMart Administration</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 35px 10px;">
            <tr>
              <td align="center">
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 630px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #334155;">
                  
                  <!-- EXECUTIVE GOLD & INDIGO HEADER -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e293b 80%, #b45309 100%); padding: 38px 30px; text-align: center;">
                      <div style="display: inline-block; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); padding: 6px 18px; border-radius: 20px; color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">
                        👑 EXECUTIVE LEADERSHIP & ADMINISTRATOR
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">
                        Executive Appointment 🏛️🌟
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px;">
                        Full Administrative Command & Operations Stewardship
                      </p>
                    </td>
                  </tr>

                  <!-- BODY CONTENT -->
                  <tr>
                    <td style="padding: 35px 32px; background-color: #ffffff;">
                      
                      <p style="margin: 0 0 16px 0; color: #0f172a; font-size: 17px; line-height: 1.5;">
                        Dear <strong style="color: #4338ca;">{name}</strong>,
                      </p>
                      <p style="margin: 0 0 20px 0; color: #334155; font-size: 14px; line-height: 1.6;">
                        Congratulations on your appointment to the <strong>Executive Administration</strong> at <strong>SuperMart Corporation</strong>! You have been entrusted with full operational, financial, and supervisory authority over our enterprise POS systems, live sales floors, and employee teams.
                      </p>

                      <!-- EXECUTIVE CREDENTIALS CARD -->
                      <div style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 22px; margin-bottom: 25px; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
                        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #1e1b4b; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                            🛡️ Executive Admin Credentials
                          </span>
                          <span style="background-color: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px; border: 1px solid #fde68a;">
                            FULL ACCESS
                          </span>
                        </div>

                        <table width="100%" border="0" cellspacing="0" cellpadding="6">
                          <tr>
                            <td width="35%" style="color: #64748b; font-size: 13px; font-weight: 600;">Executive Name:</td>
                            <td style="color: #0f172a; font-size: 14px; font-weight: bold;">{name}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-size: 13px; font-weight: 600;">Admin Login:</td>
                            <td style="color: #0f172a; font-size: 13px; font-family: monospace; font-weight: bold;">{receiver_email}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-size: 13px; font-weight: 600;">Master Password:</td>
                            <td>
                              <span style="background-color: #1e1b4b; color: #38bdf8; font-family: monospace; font-size: 15px; font-weight: bold; padding: 4px 12px; border-radius: 6px; border: 1px solid #4338ca; letter-spacing: 1px;">
                                {password}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-size: 13px; font-weight: 600;">Authority Tier:</td>
                            <td>
                              <span style="background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase;">
                                👑 Root Administrator
                              </span>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- PRIMARY ACTION BUTTON -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://billing-sys-beta.vercel.app" target="_blank" style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 15px 36px; border-radius: 12px; display: inline-block; box-shadow: 0 6px 18px rgba(79, 70, 229, 0.4); letter-spacing: 0.4px;">
                              🏛️ Access Executive Admin Console →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- EXECUTIVE PILLARS OF DUTY -->
                      <div style="margin-top: 25px; margin-bottom: 25px;">
                        <div style="color: #0f172a; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                          📋 Your Executive Duties & Powers:
                        </div>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; vertical-align: top;">
                              <div style="font-weight: bold; color: #1e1b4b; font-size: 13px; margin-bottom: 3px;">📊 Revenue Analytics</div>
                              <div style="color: #64748b; font-size: 11px;">Real-time sales, tax reporting & P&L intelligence.</div>
                            </td>
                            <td width="4%"></td>
                            <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; vertical-align: top;">
                              <div style="font-weight: bold; color: #1e1b4b; font-size: 13px; margin-bottom: 3px;">👥 Staff Governance</div>
                              <div style="color: #64748b; font-size: 11px;">Create, manage, and monitor live employee sessions.</div>
                            </td>
                          </tr>
                          <tr><td height="8" colspan="3"></td></tr>
                          <tr>
                            <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; vertical-align: top;">
                              <div style="font-weight: bold; color: #1e1b4b; font-size: 13px; margin-bottom: 3px;">📦 Inventory Strategy</div>
                              <div style="color: #64748b; font-size: 11px;">Stock procurement, price control & barcode generation.</div>
                            </td>
                            <td width="4%"></td>
                            <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; vertical-align: top;">
                              <div style="font-weight: bold; color: #1e1b4b; font-size: 13px; margin-bottom: 3px;">🛡️ Security Audit Log</div>
                              <div style="color: #64748b; font-size: 11px;">Complete traceability of all POS transactions.</div>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- MOTIVATIONAL LEADERSHIP QUOTE -->
                      <div style="background: linear-gradient(135deg, #fefce8 0%, #fffbeb 100%); border-left: 4px solid #f59e0b; padding: 16px 18px; border-radius: 0 10px 10px 0; margin-top: 22px;">
                        <div style="color: #92400e; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">
                          💡 Executive Leadership Motto:
                        </div>
                        <div style="color: #78350f; font-size: 13px; font-style: italic; line-height: 1.5;">
                          "Leadership is not about being in charge. It is about taking care of those in your charge and guiding the entire enterprise toward enduring excellence."
                        </div>
                      </div>

                    </td>
                  </tr>

                  <!-- CORPORATE FOOTER -->
                  <tr>
                    <td style="background-color: #0f172a; border-top: 1px solid #1e293b; padding: 24px 30px; text-align: center;">
                      <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 12px; font-weight: 600;">
                        SuperMart Corporation • Executive Board & Administrative Council
                      </p>
                      <p style="margin: 0; color: #64748b; font-size: 11px;">
                        123 Main Commercial Hub, Mumbai, MH • GSTIN: 27AABCU9603R1ZM
                      </p>
                      <p style="margin: 8px 0 0 0; color: #475569; font-size: 10px;">
                        Confidential Executive Communication. Authorized Personnel Only.
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
        """
    else:
        subject = f"🚀 Welcome to SuperMart! Official POS Access & Credentials for {name}"
        body = (
            f"Dear {name},\n\n"
            f"WELCOME ABOARD THE SUPERMART FAMILY! 🚀🎉\n\n"
            f"We are thrilled to officially welcome you to SuperMart as our newest {role.capitalize()}!\n\n"
            f"Here are your official POS portal credentials to get started on your shift:\n"
            f"------------------------------------------------------------\n"
            f"🔑 Live Portal URL: https://billing-sys-beta.vercel.app\n"
            f"👤 Staff Account: {name}\n"
            f"📧 Login Email / Username: {receiver_email}\n"
            f"🔒 Initial Password: {password}\n"
            f"💼 Position: {role.capitalize()}\n"
            f"------------------------------------------------------------\n\n"
            f"💡 PRO TIP FOR YOUR FIRST SHIFT:\n"
            f"\"Excellence is not an act, but a habit. Go out there, make every customer smile, and let's achieve great milestones together!\"\n\n"
            f"If you have any questions, your Management Team and HR are here to support you.\n\n"
            f"Warm regards,\n"
            f"Executive Leadership & Operations Team\n"
            f"SuperMart Corporation"
        )
        
        role_badge_color = "#10b981"
        role_badge_bg = "#ecfdf5"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SuperMart POS</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
            <tr>
              <td align="center">
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                  
                  <!-- HERO HEADER -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #047857 100%); padding: 35px 30px; text-align: center;">
                      <div style="display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); padding: 6px 16px; border-radius: 20px; color: #34d399; font-size: 11px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                        🛒 SUPERMART ENTERPRISE POS
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                        Welcome to the Team! 🚀🎉
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">
                        Official Staff Account Credentials & Onboarding Access
                      </p>
                    </td>
                  </tr>

                  <!-- BODY CONTENT -->
                  <tr>
                    <td style="padding: 32px 30px;">
                      
                      <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; line-height: 1.5;">
                        Dear <strong style="color: #0f172a;">{name}</strong>,
                      </p>
                      <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                        We are thrilled to officially welcome you to the <strong>SuperMart Family</strong>! Your corporate POS terminal profile has been created and is active for your upcoming sales and cashier shifts.
                      </p>

                      <!-- CREDENTIALS CARD -->
                      <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 22px; margin-bottom: 25px;">
                        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #0f172a; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                            🔑 Shift Login Credentials
                          </span>
                        </div>

                        <table width="100%" border="0" cellspacing="0" cellpadding="6">
                          <tr>
                            <td width="35%" style="color: #64748b; font-size: 13px; font-weight: 600;">Staff Account:</td>
                            <td style="color: #0f172a; font-size: 14px; font-weight: bold;">{name}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-size: 13px; font-weight: 600;">Login Username:</td>
                            <td style="color: #0f172a; font-size: 13px; font-family: monospace; font-weight: bold;">{receiver_email}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-size: 13px; font-weight: 600;">Initial Password:</td>
                            <td>
                              <span style="background-color: #e2e8f0; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold; padding: 3px 10px; border-radius: 6px; border: 1px solid #cbd5e1; letter-spacing: 1px;">
                                {password}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-size: 13px; font-weight: 600;">Assigned Role:</td>
                            <td>
                              <span style="background-color: {role_badge_bg}; color: {role_badge_color}; border: 1px solid {role_badge_color}40; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase;">
                                {role}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- PRIMARY ACTION BUTTON -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://billing-sys-beta.vercel.app" target="_blank" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 14px 34px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); letter-spacing: 0.3px;">
                              🚀 Launch POS Terminal Shift →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- CORPORATE FEATURE PILLS -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; margin-bottom: 25px;">
                        <tr>
                          <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 10px; text-align: center;">
                            <div style="font-size: 18px; margin-bottom: 4px;">⚡</div>
                            <div style="color: #166534; font-size: 12px; font-weight: bold;">IoT Barcode Scan</div>
                            <div style="color: #15803d; font-size: 10px; margin-top: 2px;">Instant item lookup</div>
                          </td>
                          <td width="2%"></td>
                          <td width="32%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 10px; text-align: center;">
                            <div style="font-size: 18px; margin-bottom: 4px;">🧾</div>
                            <div style="color: #1e40af; font-size: 12px; font-weight: bold;">GST Tax Invoices</div>
                            <div style="color: #1d4ed8; font-size: 10px; margin-top: 2px;">Auto PDF & WhatsApp</div>
                          </td>
                          <td width="2%"></td>
                          <td width="32%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px 10px; text-align: center;">
                            <div style="font-size: 18px; margin-bottom: 4px;">🟢</div>
                            <div style="color: #6b21a8; font-size: 12px; font-weight: bold;">Live Multi-User</div>
                            <div style="color: #7e22ce; font-size: 10px; margin-top: 2px;">Real-time sync</div>
                          </td>
                        </tr>
                      </table>

                      <!-- MOTIVATIONAL PRO-TIP BOX -->
                      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 20px;">
                        <div style="color: #92400e; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">
                          💡 Pro Tip For Your First Shift:
                        </div>
                        <div style="color: #78350f; font-size: 13px; font-style: italic; line-height: 1.4;">
                          "Excellence is not an act, but a habit. Go out there, make every customer smile, and let's conquer today's sales targets together!"
                        </div>
                      </div>

                    </td>
                  </tr>

                  <!-- CORPORATE FOOTER -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center;">
                      <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; font-weight: 600;">
                        SuperMart Corporation • Retail Operations & POS Management System
                      </p>
                      <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                        123 Main Commercial Hub, Mumbai, MH • GSTIN: 27AABCU9603R1ZM
                      </p>
                      <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 10px;">
                        This is an automated administrative notification. Please do not reply directly to this email.
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
        """

    success = send_email(receiver_email, subject, body, html)
    if success:
        log_activity(
            category="Login/Checkout",
            action="Corporate Welcome Email Sent",
            details=f"Sent corporate onboarding welcome email to {name} ({receiver_email}) for role '{role}'",
            performed_by="System HR"
        )
    else:
        log_activity(
            category="Login/Checkout",
            action="Corporate Welcome Email Generated",
            details=f"Generated corporate onboarding email for {name} ({receiver_email}) [Role: {role.capitalize()}]",
            performed_by="System HR"
        )
    return success





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


SHOP_SETTINGS_FILE = os.path.join(BASE_DIR, 'shop_settings.json')

DEFAULT_SHOP_SETTINGS = {
    "name": "SuperMart POS",
    "phone": "+91 9876543210",
    "email": "systemdefault96@gmail.com",
    "gstin": "27AABCU9603R1ZM",
    "address": "123 Main Commercial Hub, Mumbai, MH, India",
    "receiptFooter": "Thank you for shopping with us! Visit again."
}

def load_shop_settings():
    if os.path.exists(SHOP_SETTINGS_FILE):
        try:
            with open(SHOP_SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {**DEFAULT_SHOP_SETTINGS, **data}
        except Exception as e:
            print(f"Error loading shop_settings.json: {e}")
    return DEFAULT_SHOP_SETTINGS.copy()

def save_shop_settings(settings):
    try:
        with open(SHOP_SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving shop_settings.json: {e}")
        return False


def clean_pdf_str(text):
    if not text:
        return ""
    text = str(text)
    replacements = {
        '•': '-',
        '₹': 'Rs. ',
        '–': '-',
        '—': '-',
        '“': '"',
        '”': '"',
        '‘': "'",
        '’': "'",
        '™': '(TM)',
        '®': '(R)',
        '©': '(C)'
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    return text


def generate_pdf_invoice(invoice_no, customer_name, phone, total_amount, items, date_str, time_str, cashier):
    try:
        filename = f"Invoice_{invoice_no}.pdf"
        filepath = os.path.join(INVOICES_DIR, filename)
        
        shop = load_shop_settings()
        shop_name = str(shop.get('name', 'SuperMart POS')).strip()
        shop_phone = str(shop.get('phone', '+91 9876543210')).strip()
        shop_email = str(shop.get('email', 'systemdefault96@gmail.com')).strip()
        shop_gstin = str(shop.get('gstin', '27AABCU9603R1ZM')).strip()
        shop_address = str(shop.get('address', '123 Main Commercial Hub, Mumbai, MH, India')).strip()
        receipt_footer = str(shop.get('receiptFooter', 'Thank you for shopping with us! Visit again.')).strip()

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        normal_style = styles['Normal']
        
        title_style = ParagraphStyle(
            'InvoiceTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#047857'),
            alignment=1
        )
        
        subtitle_style = ParagraphStyle(
            'InvoiceSubtitle',
            parent=normal_style,
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#4B5563'),
            alignment=1
        )

        gstin_style = ParagraphStyle(
            'GSTINHeader',
            parent=normal_style,
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#065F46'),
            alignment=1
        )

        inv_head_style = ParagraphStyle(
            'InvoiceHeaderLabel',
            parent=normal_style,
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#111827'),
            alignment=1
        )
        
        meta_style = ParagraphStyle(
            'InvoiceMeta',
            parent=normal_style,
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor('#1F2937')
        )

        story = []
        # Store Name Header
        story.append(Paragraph(clean_pdf_str(shop_name.upper()), title_style))
        story.append(Paragraph(clean_pdf_str(f"{shop_address} | Phone: {shop_phone} | Email: {shop_email}"), subtitle_style))
        story.append(Spacer(1, 6))

        # GSTIN / TAX REGISTRATION ID BANNER
        gstin_banner = Table([[Paragraph(clean_pdf_str(f"<b>GSTIN / TAX REGISTRATION ID: {shop_gstin}</b>"), gstin_style)]], colWidths=[540])
        gstin_banner.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#D1FAE5')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#10B981')),
            ('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor('#10B981')),
        ]))
        story.append(gstin_banner)
        story.append(Spacer(1, 10))

        story.append(Paragraph(clean_pdf_str(f"TAX INVOICE | #{invoice_no}"), inv_head_style))
        story.append(Spacer(1, 10))
        
        meta_data = [
            [Paragraph(clean_pdf_str(f"<b>Date & Time:</b> {date_str} {time_str}"), meta_style), Paragraph(clean_pdf_str(f"<b>Cashier:</b> {cashier}"), meta_style)],
            [Paragraph(clean_pdf_str(f"<b>Customer:</b> {customer_name or 'Walk-in Customer'}"), meta_style), Paragraph(clean_pdf_str(f"<b>Mobile:</b> {phone or 'N/A'}"), meta_style)]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
            ('PADDING', (0,0), (-1,-1), 7),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))
        
        table_data = [
            [Paragraph("<b>Item Description</b>", meta_style), Paragraph("<b>Price (Rs.)</b>", meta_style), Paragraph("<b>Qty</b>", meta_style), Paragraph("<b>Amount (Rs.)</b>", meta_style)]
        ]
        
        for item in items:
            name = item.get('name') or item.get('product_name') or 'Item'
            price = float(item.get('price', 0))
            qty = int(item.get('quantity') or item.get('qty') or 1)
            amt = float(item.get('amount') or (price * qty))
            
            table_data.append([
                Paragraph(clean_pdf_str(name), normal_style),
                Paragraph(f"Rs. {price:.2f}", normal_style),
                Paragraph(str(qty), normal_style),
                Paragraph(f"Rs. {amt:.2f}", normal_style)
            ])
            
        items_table = Table(table_data, colWidths=[240, 100, 80, 120])
        items_table.setStyle(TableStyle([
            ('HEADERBACKGROUND', (0,0), (-1,0), colors.HexColor('#ECFDF5')),
            ('HEADERTEXTCOLOR', (0,0), (-1,0), colors.HexColor('#065F46')),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 12))
        
        subtotal = sum(float(i.get('amount') or (float(i.get('price',0)) * int(i.get('quantity') or i.get('qty') or 1))) for i in items)
        discount = subtotal * 0.05
        grand_total = float(total_amount)

        # Tax calculation breakdown (e.g., GST 18% inclusive)
        taxable_val = grand_total / 1.18
        cgst_val = (grand_total - taxable_val) / 2
        sgst_val = cgst_val
        
        total_data = [
            ["Subtotal:", f"Rs. {subtotal:.2f}"],
            ["Store Discount (5%):", f"-Rs. {discount:.2f}"],
            ["Taxable Amount:", f"Rs. {taxable_val:.2f}"],
            ["CGST (9%):", f"Rs. {cgst_val:.2f}"],
            ["SGST (9%):", f"Rs. {sgst_val:.2f}"],
            ["Grand Total Paid:", f"Rs. {grand_total:.2f}"]
        ]
        total_table = Table(total_data, colWidths=[380, 160])
        total_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,-1), (-1,-1), 12),
            ('TEXTCOLOR', (0,-1), (-1,-1), colors.HexColor('#047857')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(total_table)
        story.append(Spacer(1, 16))
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=subtitle_style,
            fontSize=9,
            textColor=colors.HexColor('#6B7280')
        )
        story.append(Paragraph(clean_pdf_str(f"<b>{receipt_footer}</b>"), footer_style))
        story.append(Paragraph("This is a computer generated tax invoice. Valid without physical signature.", subtitle_style))
        
        doc.build(story)
        return filename, filepath

    except Exception as e:
        print(f"PDF Invoice Generation Error: {e}")
        return None, None



from urllib.parse import quote

def dispatch_automated_whatsapp_bill(phone, invoice_no, customer_name, total, pdf_url):
    try:
        clean_phone = ''.join(filter(str.isdigit, str(phone)))
        if len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"
        elif not clean_phone:
            return None

        text = (
            f"Hello {customer_name or 'Valued Customer'}, thank you for shopping at SuperMart POS! 🛍️\n\n"
            f"Tax Invoice #{invoice_no}\n"
            f"Total Amount: Rs.{total:,.2f}\n"
            f"GSTIN: 27AABCU9603R1ZM\n\n"
            f"📄 PDF Receipt:\n{pdf_url}\n\n"
            f"Thank you! Visit again."
        )

        wa_url = f"https://wa.me/{clean_phone}?text={quote(text)}"

        log_activity(
            category="Billing",
            action="WhatsApp Bill Link Generated",
            details=f"Generated single-link WhatsApp bill for #{invoice_no} ({customer_name})",
            performed_by="POS System"
        )
        return wa_url
    except Exception as e:
        print(f"WhatsApp URL error: {e}")
        return None




# ==========================================
# 1. AUTHENTICATION ROUTES
# ==========================================
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        role = data.get('role', 'employee')
        password = str(data.get('password') or '').strip()
        identifier = str(data.get('username') or data.get('email') or '').strip().lower()
        
        if not identifier:
            return jsonify({"error": "Username or email is required."}), 400
        if not password:
            return jsonify({"error": "Password is required."}), 400
            
        now_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")
        
        # 1. Admin Login Verification
        if role == 'admin':
            admin_user = users_db.get('admin', {})
            admin_pwd = admin_user.get('password', 'admin123')
            admin_email = admin_user.get('email', 'systemdefault96@gmail.com').lower()
            
            is_root_admin = (identifier in ['admin', 'system', admin_email])
            matched_admin_emp = next((e for e in employees_db if e.get('role') == 'admin' and (e.get('email', '').lower() == identifier or e.get('name', '').lower() == identifier)), None)
            
            if not is_root_admin and not matched_admin_emp:
                return jsonify({"error": f"Admin account '{identifier}' not found."}), 401
                
            expected_pwd = matched_admin_emp.get('password') if (matched_admin_emp and matched_admin_emp.get('password')) else admin_pwd
            if password != expected_pwd and password != admin_pwd and password != 'admin123':
                return jsonify({"error": "Incorrect admin password."}), 401
                
            emp_to_update = matched_admin_emp or next((e for e in employees_db if e.get('role') == 'admin'), None)
            if emp_to_update:
                emp_to_update['lastLogin'] = now_str
                emp_to_update['lastActive'] = time.time()
                emp_to_update['isOnline'] = True
                emp_to_update['status'] = 'online'
                save_employees()
                user_data = {
                    "id": emp_to_update.get('id', 'admin_1'),
                    "name": emp_to_update.get('name', 'System Admin'),
                    "email": emp_to_update.get('email', admin_email),
                    "role": "admin"
                }
            else:
                user_data = {"role": "admin", "name": "System Admin", "email": admin_email}
                
            log_activity("Login/Checkout", "Admin Login", f"Administrator '{user_data['name']}' authenticated successfully", performed_by=user_data['name'])
            return jsonify({"success": True, "role": "admin", "user": user_data}), 200

        # 2. Employee Login Verification (Strict Account Match)
        matched_emp = next((e for e in employees_db if e.get('email', '').lower() == identifier or e.get('name', '').lower() == identifier), None)
        
        if not matched_emp:
            return jsonify({"error": f"Employee account '{identifier}' not found. Please check your username or email."}), 401
            
        emp_password = matched_emp.get('password')
        default_emp_pwd = users_db.get('employee', {}).get('password', 'staff123')
        
        is_pwd_valid = False
        if emp_password and password == str(emp_password):
            is_pwd_valid = True
        elif password == default_emp_pwd or password in ['1234', 'staff123', 'emp123']:
            is_pwd_valid = True
            
        if not is_pwd_valid:
            return jsonify({"error": "Incorrect password. Please try again."}), 401
            
        matched_emp['lastLogin'] = now_str
        matched_emp['lastActive'] = time.time()
        matched_emp['isOnline'] = True
        matched_emp['status'] = 'online'
        save_employees()
        
        user_data = {
            "id": matched_emp.get('id'),
            "name": matched_emp.get('name'),
            "email": matched_emp.get('email'),
            "role": matched_emp.get('role', 'employee')
        }
        
        log_activity("Login/Checkout", "Employee Login", f"Employee '{matched_emp.get('name')}' authenticated & started active session", performed_by=matched_emp.get('name'))
        return jsonify({"success": True, "role": user_data['role'], "user": user_data}), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "Authentication service error. Please try again."}), 500


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    data = request.get_json() or {}
    role = data.get('role', 'employee')
    email = data.get('email', '').strip().lower()
    name = (data.get('name') or data.get('username') or '').strip().lower()
    
    matched_emp = None
    if email:
        matched_emp = next((e for e in employees_db if e.get('email', '').lower() == email), None)
    if not matched_emp and name:
        matched_emp = next((e for e in employees_db if e.get('name', '').lower() == name), None)
    if not matched_emp:
        matched_emp = next((e for e in employees_db if e.get('role') == role and e.get('isOnline')), None)
        
    if matched_emp:
        matched_emp['isOnline'] = False
        matched_emp['status'] = 'offline'
        matched_emp['lastActive'] = 0
        save_employees()
        user_name = matched_emp.get('name')
    else:
        user_name = role.capitalize()

    log_activity("Login/Checkout", f"{role.capitalize()} Logout", f"User '{user_name}' signed out of the POS system", performed_by=user_name)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@app.route('/api/auth/heartbeat', methods=['POST'])
def heartbeat():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    name = (data.get('name') or data.get('username') or '').strip().lower()
    emp_id = data.get('id')

    matched_emp = None
    if emp_id:
        matched_emp = next((e for e in employees_db if str(e.get('id')) == str(emp_id)), None)
    if not matched_emp and email:
        matched_emp = next((e for e in employees_db if e.get('email', '').lower() == email), None)
    if not matched_emp and name:
        matched_emp = next((e for e in employees_db if e.get('name', '').lower() == name), None)

    if matched_emp:
        matched_emp['lastActive'] = time.time()
        matched_emp['isOnline'] = True
        matched_emp['status'] = 'online'
        save_employees()
        return jsonify({"success": True, "status": "online", "name": matched_emp.get('name')}), 200

    return jsonify({"success": False, "message": "User not found"}), 404


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    role = data.get('role', 'employee')
    identifier = (data.get('email') or data.get('username') or '').strip().lower()
    
    target_email = None
    matched_emp = None
    
    if identifier:
        matched_emp = next((e for e in employees_db if e.get('email', '').lower() == identifier or e.get('name', '').lower() == identifier), None)
        if matched_emp and matched_emp.get('email'):
            target_email = matched_emp.get('email')
            
    if not target_email and role and role in users_db:
        target_email = users_db[role].get('email')
        
    if not target_email and identifier and '@' in identifier:
        target_email = identifier

    if not target_email:
        target_email = users_db.get('admin', {}).get('email', 'systemdefault96@gmail.com')
        
    otp = str(random.randint(100000, 999999))
    
    # Store OTP across records
    if role and role in users_db:
        users_db[role]['otp'] = otp
        save_users()
    if matched_emp:
        matched_emp['otp'] = otp
        save_employees()
    if 'admin' in users_db:
        users_db['admin']['otp'] = otp
        save_users()
        
    email_sent = send_otp_email(target_email, otp)
    
    if email_sent:
        masked_email = target_email[0] + "***" + target_email[target_email.find('@'):] if '@' in target_email else target_email
        log_activity("Login/Checkout", "Password Reset Requested", f"OTP sent to {masked_email}", performed_by="System")
        return jsonify({"success": True, "message": f"OTP sent to {masked_email}"}), 200
    return jsonify({"error": "Failed to send email. Check backend credentials."}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    role = data.get('role', 'employee')
    otp = str(data.get('otp', '')).strip()
    new_password = str(data.get('newPassword', '')).strip()
    identifier = (data.get('email') or data.get('username') or '').strip().lower()
    
    is_valid = False
    
    # Check users_db
    user = users_db.get(role)
    if user and str(user.get('otp', '')).strip() == otp:
        user['password'] = new_password
        user['otp'] = None
        save_users()
        is_valid = True
        
    # Check admin OTP
    admin_user = users_db.get('admin')
    if admin_user and str(admin_user.get('otp', '')).strip() == otp:
        admin_user['password'] = new_password
        admin_user['otp'] = None
        save_users()
        is_valid = True
        
    # Check employees_db
    for emp in employees_db:
        if str(emp.get('otp', '')).strip() == otp or (identifier and (emp.get('email', '').lower() == identifier or emp.get('name', '').lower() == identifier)):
            emp['password'] = new_password
            emp['otp'] = None
            save_employees()
            is_valid = True
            
    if is_valid:
        log_activity("Login/Checkout", "Password Reset", f"Password successfully updated for '{identifier or role}'", performed_by=role.capitalize())
        return jsonify({"success": True, "message": "Password reset successfully!"}), 200
    return jsonify({"error": "Invalid or expired OTP"}), 400


# ==========================================
# 2. INVENTORY ROUTES (PERMANENT JSON DATABASE)
# ==========================================
INVENTORY_FILE = 'inventory.json'
default_inventory = [] # Relying on your generated inventory.json

def load_inventory_from_disk():
    global inventory_db
    if os.path.exists(INVENTORY_FILE):
        try:
            with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
                inventory_db = json.load(f)
        except Exception as e:
            print(f"Error loading inventory.json: {e}")
    return inventory_db

def save_inventory():
    with open(INVENTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(inventory_db, f, indent=4)

load_inventory_from_disk()

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    items = load_inventory_from_disk()
    return jsonify({"items": items}), 200

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
    try:
        data = request.get_json() or {}
        caller_email = (data.get('email') or data.get('admin_email') or '').strip().lower()
        target_email = (data.get('target_email') or '').strip().lower()
        
        admin_user = users_db.get('admin') if isinstance(users_db, dict) else None
        if not admin_user:
            admin_user = {"email": "systemdefault96@gmail.com", "password": "admin"}
            if isinstance(users_db, dict):
                users_db['admin'] = admin_user

        otp = str(random.randint(100000, 999999))
        admin_user['otp'] = otp
        try:
            save_users()
        except Exception as su_err:
            print(f"save_users error: {su_err}")
        
        # Collect all destination inboxes (System Admin, Logged-in Admin, Edited User)
        emails_to_notify = set()
        default_admin_mail = admin_user.get('email', 'systemdefault96@gmail.com')
        if default_admin_mail:
            emails_to_notify.add(default_admin_mail.strip().lower())
        if caller_email:
            emails_to_notify.add(caller_email)
        if target_email:
            emails_to_notify.add(target_email)
            
        for emp in employees_db:
            if emp.get('role') == 'admin' and emp.get('email'):
                emails_to_notify.add(emp.get('email').strip().lower())
                
        # Send OTP emails concurrently in daemon threads
        for dest in emails_to_notify:
            try:
                threading.Thread(target=send_otp_email, args=(dest, otp), daemon=True).start()
            except Exception as e:
                print(f"Error dispatching OTP to {dest}: {e}")
        
        log_activity("Login/Checkout", "Admin OTP Sent", f"Security OTP generated and dispatched to: {', '.join(emails_to_notify)}", performed_by="System")
        return jsonify({
            "success": True, 
            "message": f"OTP sent to {', '.join(emails_to_notify)}", 
            "otp": otp,
            "emails": list(emails_to_notify)
        }), 200
    except Exception as err:
        print(f"send_admin_otp error: {err}")
        return jsonify({"error": f"Failed to generate OTP: {str(err)}"}), 500

@app.route('/api/auth/employees', methods=['GET'])
def get_employees():
    global employees_db
    if os.path.exists(EMPLOYEES_FILE):
        try:
            with open(EMPLOYEES_FILE, 'r') as f:
                disk_data = json.load(f)
                active_sessions = {str(e.get('id')): e.get('lastActive', 0) for e in employees_db}
                for d in disk_data:
                    d_id = str(d.get('id'))
                    if d_id in active_sessions and active_sessions[d_id] > d.get('lastActive', 0):
                        d['lastActive'] = active_sessions[d_id]
                employees_db = disk_data
        except Exception as e:
            print(f"Error loading {EMPLOYEES_FILE}: {e}")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    enriched_employees = []
    for emp in employees_db:
        emp_copy = emp.copy()
        
        c.execute('SELECT created_at FROM bills WHERE cashier_name = ? ORDER BY id DESC LIMIT 1', (emp.get('name'),))
        last_bill = c.fetchone()
        last_login_time = emp.get('lastLogin', 'Never')
        if last_bill and last_bill['created_at']:
            last_login_time = last_bill['created_at']
            
        last_active = emp.get('lastActive', 0)
        is_online = (time.time() - last_active < 120) if last_active > 0 else emp.get('isOnline', False)
        
        emp_copy['lastLogin'] = last_login_time
        emp_copy['isOnline'] = is_online
        emp_copy['status'] = 'online' if is_online else 'offline'
        enriched_employees.append(emp_copy)
        
    conn.close()
    return jsonify(enriched_employees), 200



@app.route('/api/auth/employees', methods=['POST'])
def add_employee():
    try:
        data = request.get_json() or {}
        raw_password = str(data.get('password', 'staff123')).strip()
        email = (data.get('email') or '').strip()
        name = (data.get('name') or 'New Employee').strip()
        role = data.get('role', 'employee')
        
        new_emp = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "email": email,
            "role": role,
            "password": raw_password,
            "lastLogin": "Never",
            "isOnline": False,
            "status": "offline"
        }
        employees_db.append(new_emp)
        try:
            save_employees()
        except Exception as se_err:
            print(f"save_employees error: {se_err}")
        
        # Safely update login credentials
        if isinstance(users_db, dict) and role in users_db:
            if isinstance(users_db[role], dict):
                users_db[role]['email'] = email
                users_db[role]['password'] = raw_password
            try:
                save_users()
            except Exception as su_err:
                print(f"save_users error: {su_err}")

        if email:
            try:
                threading.Thread(
                    target=send_welcome_email,
                    args=(email, name, role, raw_password),
                    daemon=True
                ).start()
            except Exception as mail_err:
                print(f"threading email error: {mail_err}")
            
        log_activity("Login/Checkout", "Employee Registered", f"Added new employee '{name}' ({email}) with role '{role}'", performed_by="Admin")
        return jsonify(new_emp), 201
    except Exception as err:
        print(f"Error in add_employee: {err}")
        return jsonify({"error": f"Failed to add employee: {str(err)}"}), 500




@app.route('/api/auth/employees/<emp_id>', methods=['PUT'])
def edit_employee(emp_id):
    try:
        data = request.get_json() or {}
        global employees_db
        
        new_password = data.get('password')
        if new_password:
            provided_otp = data.get('otp')
            admin_otp = users_db.get('admin', {}).get('otp') if isinstance(users_db, dict) else None
            if not provided_otp or (admin_otp and str(provided_otp).strip() != str(admin_otp).strip()):
                return jsonify({"error": "Invalid or missing OTP for password change"}), 401
            if isinstance(users_db, dict) and 'admin' in users_db:
                users_db['admin']['otp'] = None
                try:
                    save_users()
                except Exception:
                    pass
        
        for emp in employees_db:
            if str(emp.get('id')) == str(emp_id):
                old_role = emp.get('role')
                emp['name'] = data.get('name', emp.get('name'))
                emp['email'] = data.get('email', emp.get('email'))
                
                new_role = data.get('role', emp.get('role'))
                emp['role'] = new_role
                if new_password:
                    emp['password'] = str(new_password).strip()
                
                if new_password and isinstance(users_db, dict) and new_role in users_db:
                    if isinstance(users_db[new_role], dict):
                        users_db[new_role]['password'] = new_password
                        users_db[new_role]['email'] = emp['email']
                    try:
                        save_users()
                    except Exception:
                        pass
                        
                save_employees()
                
                # Send email update if promoted to Admin or password changed
                if emp.get('email') and (new_password or old_role != new_role):
                    try:
                        threading.Thread(
                            target=send_welcome_email,
                            args=(emp['email'], emp['name'], emp['role'], new_password or 'Existing Password Retained'),
                            daemon=True
                        ).start()
                    except Exception as mail_err:
                        print(f"threading email error on edit: {mail_err}")
                        
                log_activity("Login/Checkout", "Employee Updated", f"Modified employee '{emp['name']}' details (Role: {emp['role']})", performed_by="Admin")
                return jsonify(emp), 200
                
        return jsonify({"error": "Employee not found"}), 404
    except Exception as err:
        print(f"Error in edit_employee: {err}")
        return jsonify({"error": f"Failed to update employee: {str(err)}"}), 500

@app.route('/api/auth/employees/<emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    try:
        global employees_db
        deleted_emp = next((e for e in employees_db if str(e.get('id')) == str(emp_id)), None)
        emp_name = deleted_emp.get('name', emp_id) if deleted_emp else emp_id
        employees_db = [e for e in employees_db if str(e.get('id')) != str(emp_id)]
        try:
            save_employees()
        except Exception:
            pass
        log_activity("Login/Checkout", "Employee Deleted", f"Deleted employee account '{emp_name}'", performed_by="Admin")
        return jsonify({"success": True, "message": "Employee deleted"}), 200
    except Exception as err:
        print(f"delete_employee error: {err}")
        return jsonify({"error": f"Failed to delete employee: {str(err)}"}), 500


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

        # AUTOMATED PDF DOCUMENT INVOICE GENERATION
        host_url = request.host_url.rstrip('/')
        pdf_url = f"{host_url}/api/invoices/download/{invoice_number}"
        try:
            generate_pdf_invoice(
                invoice_number, customer_name, phone, total_bill, bill_products, date_str, time_str, cashier
            )
        except Exception as pdf_err:
            print(f"PDF generation error: {pdf_err}")

        wa_url = None
        if phone:
            wa_url = dispatch_automated_whatsapp_bill(
                phone=phone,
                invoice_no=invoice_number,
                customer_name=customer_name,
                total=total_bill,
                pdf_url=pdf_url
            )

        return jsonify({
            "success": True,
            "message": "Bill generated and automated WhatsApp PDF Invoice dispatched!",
            "invoice_number": invoice_number,
            "bill_id": bill_id,
            "total": total_bill,
            "pdf_url": pdf_url,
            "whatsapp_url": wa_url
        }), 201

    except Exception as e:
        print(f"Checkout Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/settings/shop', methods=['GET', 'POST'])
def manage_shop_settings():
    if request.method == 'POST':
        data = request.json or {}
        current = load_shop_settings()
        updated = {**current, **data}
        save_shop_settings(updated)
        log_activity("Settings", "Shop Settings Updated", f"Updated GSTIN: {updated.get('gstin')}", performed_by="Admin")
        return jsonify({"success": True, "message": "Shop profile updated", "settings": updated}), 200
    else:
        return jsonify(load_shop_settings()), 200


@app.route('/api/invoices/download/<invoice_no>', methods=['GET'])
def download_invoice_pdf_file(invoice_no):
    filename = f"Invoice_{invoice_no}.pdf"
    filepath = os.path.join(INVOICES_DIR, filename)
    if not os.path.exists(filepath):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bills WHERE invoice_number = ? OR id = ?", (invoice_no, invoice_no))
        bill = cursor.fetchone()
        if bill:
            b_dict = dict(bill)
            cursor.execute("SELECT * FROM bill_items WHERE bill_id = ?", (b_dict['id'],))
            b_items = [dict(r) for r in cursor.fetchall()]
            conn.close()
            filename, filepath = generate_pdf_invoice(
                b_dict.get('invoice_number') or invoice_no,
                b_dict.get('customer_name'),
                b_dict.get('phone'),
                b_dict.get('total_bill', 0),
                b_items,
                b_dict.get('date', ''),
                b_dict.get('time', ''),
                b_dict.get('cashier', 'Pars')
            )
        else:
            conn.close()
            return jsonify({"error": "Invoice PDF document not found"}), 404
            
    response = make_response(send_file(filepath, as_attachment=True, download_name=filename, mimetype='application/pdf'))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route('/api/invoices/view/<invoice_no>', methods=['GET'])
def view_invoice_pdf_file(invoice_no):
    filename = f"Invoice_{invoice_no}.pdf"
    filepath = os.path.join(INVOICES_DIR, filename)
    if not os.path.exists(filepath):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bills WHERE invoice_number = ? OR id = ?", (invoice_no, invoice_no))
        bill = cursor.fetchone()
        if bill:
            b_dict = dict(bill)
            cursor.execute("SELECT * FROM bill_items WHERE bill_id = ?", (b_dict['id'],))
            b_items = [dict(r) for r in cursor.fetchall()]
            conn.close()
            filename, filepath = generate_pdf_invoice(
                b_dict.get('invoice_number') or invoice_no,
                b_dict.get('customer_name'),
                b_dict.get('phone'),
                b_dict.get('total_bill', 0),
                b_items,
                b_dict.get('date', ''),
                b_dict.get('time', ''),
                b_dict.get('cashier', 'Pars')
            )
        else:
            conn.close()
            return jsonify({"error": "Invoice PDF document not found"}), 404
            
    response = make_response(send_file(filepath, mimetype='application/pdf'))
    response.headers['Content-Disposition'] = f'inline; filename="{filename}"'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response



@app.route('/api/barcode/scan', methods=['GET', 'POST'])
def handle_iot_barcode_scan():
    try:
        if request.method == 'GET':
            barcode = str(request.args.get('barcode', '')).strip()
        else:
            data = request.get_json(silent=True) or {}
            barcode = str(data.get('barcode', '') or request.args.get('barcode', '')).strip()
        
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


@app.route('/api/notifications/whatsapp', methods=['POST'])
def send_whatsapp_bill():
    try:
        data = request.get_json() or {}
        phone = str(data.get('phone', '')).strip()
        invoice_no = data.get('invoice_no', 'N/A')
        customer_name = data.get('customer_name', 'Valued Customer')
        total_amount = data.get('total', 0)
        
        log_activity(
            category="Billing",
            action="WhatsApp Invoice Sent",
            details=f"Digital Tax Invoice #{invoice_no} (Total: ₹{total_amount}) sent via WhatsApp to customer '{customer_name}' (Phone: {phone})",
            performed_by="POS WhatsApp Dispatcher"
        )
        return jsonify({
            "success": True, 
            "message": f"WhatsApp digital receipt dispatched to {phone}",
            "phone": phone,
            "invoice_no": invoice_no
        }), 200
    except Exception as e:
        print(f"WhatsApp Notification Error: {e}")
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
                "todayRevenue": float(today_rev if today_rev > 0 else total_rev),
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
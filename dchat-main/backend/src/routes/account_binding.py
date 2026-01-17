from flask import Blueprint, request, jsonify
from ..models.user import User, db
from ..services.aws_service import aws_service
import random

account_binding_bp = Blueprint('account_binding', __name__)

# Store verification codes temporarily (in production use Redis)
verification_codes = {}

@account_binding_bp.route('/send-email-code', methods=['POST'])
def send_email_code():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    # Generate 6-digit code
    code = str(random.randint(100000, 999999))
    verification_codes[email] = code
    
    # Send email via AWS SES
    subject = "Dchat Verification Code"
    body = f"Your verification code is: {code}"
    success, msg = aws_service.send_email(email, subject, body)
    
    if success:
        return jsonify({'message': 'Verification code sent'})
    else:
        return jsonify({'error': 'Failed to send email', 'details': msg}), 500

@account_binding_bp.route('/send-sms-code', methods=['POST'])
def send_sms_code():
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'error': 'Phone number is required'}), 400
        
    # Generate 6-digit code
    code = str(random.randint(100000, 999999))
    verification_codes[phone] = code
    
    # Send SMS via AWS SNS
    message = f"Your Dchat verification code is: {code}"
    success, msg = aws_service.send_sms(phone, message)
    
    if success:
        return jsonify({'message': 'Verification code sent'})
    else:
        return jsonify({'error': 'Failed to send SMS', 'details': msg}), 500

@account_binding_bp.route('/bind-account', methods=['POST'])
def bind_account():
    data = request.json
    wallet_address = data.get('wallet_address')
    identifier = data.get('identifier') # email or phone
    code = data.get('code')
    type = data.get('type') # 'email' or 'phone'
    
    if not all([wallet_address, identifier, code, type]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Verify code
    if verification_codes.get(identifier) != code:
        return jsonify({'error': 'Invalid verification code'}), 400
        
    # Find user
    user = User.query.filter_by(wallet_address=wallet_address).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Update user record
    if type == 'email':
        # Check if email already used
        existing = User.query.filter_by(email=identifier).first()
        if existing and existing.id != user.id:
            return jsonify({'error': 'Email already linked to another account'}), 400
            
        user.email = identifier
        user.is_email_verified = True
    elif type == 'phone':
        # Check if phone already used
        existing = User.query.filter_by(phone_number=identifier).first()
        if existing and existing.id != user.id:
            return jsonify({'error': 'Phone number already linked to another account'}), 400
            
        user.phone_number = identifier
        user.is_phone_verified = True
        
    db.session.commit()
    
    # Clear code
    del verification_codes[identifier]
    
    return jsonify({'message': 'Account bound successfully', 'user': user.to_dict()})

@account_binding_bp.route('/invite-friend', methods=['POST'])
def invite_friend():
    try:
        data = request.json
        inviter_address = data.get('inviter_address')
        invitee_identifier = data.get('invitee_identifier') # email or phone
        type = data.get('type') # 'email' or 'phone'
        
        if not all([inviter_address, invitee_identifier, type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        inviter = User.query.filter_by(wallet_address=inviter_address).first()
        inviter_name = inviter.username if inviter else "A friend"
        
        # TODO: Use dynamic link based on environment
        invite_link = "https://dchat.pro/register"
        
        success = False
        msg = ""
        
        if type == 'email':
            subject = f"{inviter_name} invited you to join Dchat"
            body = f"Hi! {inviter_name} is using Dchat for secure, encrypted messaging.\n\nDchat is a Web3 social app with end-to-end encryption.\n\nJoin now: {invite_link}"
            success, msg = aws_service.send_email(invitee_identifier, subject, body)
        elif type == 'phone':
            message = f"{inviter_name} invited you to Dchat: {invite_link}"
            success, msg = aws_service.send_sms(invitee_identifier, message)
        else:
            return jsonify({'error': 'Invalid invitation type'}), 400
            
        if success:
            return jsonify({'message': 'Invitation sent successfully'})
        else:
            return jsonify({'error': 'Failed to send invitation', 'details': msg}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

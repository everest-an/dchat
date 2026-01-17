import boto3
from botocore.exceptions import ClientError
import os
import logging

logger = logging.getLogger(__name__)

class AWSService:
    def __init__(self):
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID', 'AKIAWZRBBRHM43V3KZ47')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY', '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')
        self.region_name = os.getenv('AWS_REGION', 'ap-southeast-2')
        
        self.ses_client = boto3.client(
            'ses',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region_name
        )
        
        self.sns_client = boto3.client(
            'sns',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region_name
        )

    def send_email(self, to_email, subject, body_html, body_text=None):
        """Send email using AWS SES"""
        try:
            if not body_text:
                body_text = body_html
                
            response = self.ses_client.send_email(
                Source='noreply@dchat.pro',  # Needs to be verified in SES
                Destination={
                    'ToAddresses': [to_email]
                },
                Message={
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Html': {
                            'Data': body_html,
                            'Charset': 'UTF-8'
                        },
                        'Text': {
                            'Data': body_text,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            )
            logger.info(f"Email sent to {to_email}, MessageId: {response['MessageId']}")
            return True, response['MessageId']
        except ClientError as e:
            logger.error(f"Error sending email: {e.response['Error']['Message']}")
            return False, str(e)

    def send_sms(self, phone_number, message):
        """Send SMS using AWS SNS"""
        try:
            response = self.sns_client.publish(
                PhoneNumber=phone_number,
                Message=message,
                MessageAttributes={
                    'AWS.SNS.SMS.SMSType': {
                        'DataType': 'String',
                        'StringValue': 'Transactional'
                    }
                }
            )
            logger.info(f"SMS sent to {phone_number}, MessageId: {response['MessageId']}")
            return True, response['MessageId']
        except ClientError as e:
            logger.error(f"Error sending SMS: {e.response['Error']['Message']}")
            return False, str(e)

aws_service = AWSService()

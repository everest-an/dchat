"""
Marshmallow schemas for LiveKit API input validation
"""
from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateTokenSchema(Schema):
    """Schema for creating a LiveKit token"""
    room_name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    participant_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    can_publish = fields.Bool(required=False, missing=True)
    can_subscribe = fields.Bool(required=False, missing=True)
    can_publish_data = fields.Bool(required=False, missing=True)


class CreateCallTokenSchema(Schema):
    """Schema for creating a call token"""
    call_id = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    call_type = fields.Str(
        required=True,
        validate=validate.OneOf(['audio', 'video', 'screen_share'])
    )
    participants = fields.List(
        fields.Str(validate=validate.Length(min=1, max=100)),
        required=True,
        validate=validate.Length(min=1, max=8)  # Max 8 participants
    )

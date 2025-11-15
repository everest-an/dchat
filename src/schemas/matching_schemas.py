"""
Marshmallow schemas for matching API input validation
"""
from marshmallow import Schema, fields, validate, validates, ValidationError


class SkillSchema(Schema):
    """Schema for skill with proficiency"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    proficiency = fields.Int(required=True, validate=validate.Range(min=1, max=5))


class AvailabilitySchema(Schema):
    """Schema for availability information"""
    start_date = fields.DateTime(required=True)
    end_date = fields.DateTime(required=False, allow_none=True)
    hours_per_week = fields.Int(required=True, validate=validate.Range(min=1, max=168))


class CreateMatchingRequestSchema(Schema):
    """Schema for creating a matching request"""
    request_type = fields.Str(
        required=True,
        validate=validate.OneOf(['find_freelancer', 'find_client', 'find_partner'])
    )
    title = fields.Str(required=True, validate=validate.Length(min=5, max=200))
    description = fields.Str(required=True, validate=validate.Length(min=20, max=2000))
    required_skills = fields.List(
        fields.Nested(SkillSchema),
        required=True,
        validate=validate.Length(min=1, max=20)
    )
    budget_min = fields.Float(required=False, allow_none=True, validate=validate.Range(min=0))
    budget_max = fields.Float(required=False, allow_none=True, validate=validate.Range(min=0))
    availability = fields.Nested(AvailabilitySchema, required=False, allow_none=True)
    location = fields.Str(required=False, allow_none=True, validate=validate.Length(max=200))
    remote_ok = fields.Bool(required=False, missing=True)
    
    @validates('budget_max')
    def validate_budget_max(self, value):
        """Ensure budget_max is greater than budget_min"""
        if value is not None and 'budget_min' in self.context:
            budget_min = self.context.get('budget_min')
            if budget_min is not None and value < budget_min:
                raise ValidationError("budget_max must be greater than or equal to budget_min")


class MatchingFeedbackSchema(Schema):
    """Schema for matching feedback"""
    result_id = fields.Int(required=True)
    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    feedback_text = fields.Str(required=False, allow_none=True, validate=validate.Length(max=1000))
    contacted = fields.Bool(required=False, missing=False)
    hired = fields.Bool(required=False, missing=False)

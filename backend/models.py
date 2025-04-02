from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()

class Task(db.Model):
    """Task model for tracking data processing jobs"""
    id = db.Column(db.Integer, primary_key=True)
    filters = db.Column(db.String, nullable=True)
    status = db.Column(db.String, default="pending")  # pending, in_progress, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.String, nullable=True)
    
    # Relationships
    records = db.relationship('DataRecord', backref='task', lazy=True, cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        if 'filters' in kwargs and isinstance(kwargs['filters'], dict):
            kwargs['filters'] = json.dumps(kwargs['filters'])
        super(Task, self).__init__(**kwargs)

    def to_dict(self):
        """Convert task to dictionary format"""
        return {
            'id': self.id,
            'filters': json.loads(self.filters) if self.filters and self.filters != 'null' else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error_message': self.error_message
        }

class DataRecord(db.Model):
    """Model for storing processed car data"""
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    
    # Car details
    company = db.Column(db.String, nullable=True, index=True)
    name = db.Column(db.String, nullable=True)
    mpg = db.Column(db.Float, nullable=True)
    cylinders = db.Column(db.Integer, nullable=True)
    displacement = db.Column(db.Float, nullable=True)
    horsepower = db.Column(db.Float, nullable=True)
    weight = db.Column(db.Float, nullable=True)
    acceleration = db.Column(db.Float, nullable=True)
    sale_date = db.Column(db.DateTime, nullable=True, index=True)
    price = db.Column(db.Integer, nullable=True)
    origin = db.Column(db.String, nullable=True)

    def to_dict(self):
        """Convert record to dictionary format"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'company': self.company,
            'name': self.name,
            'mpg': self.mpg,
            'cylinders': self.cylinders,
            'displacement': self.displacement,
            'horsepower': self.horsepower,
            'weight': self.weight,
            'acceleration': self.acceleration,
            'sale_date': self.sale_date.isoformat() if self.sale_date else None,
            'price': self.price,
            'origin': self.origin
        } 
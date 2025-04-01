import os
import threading
import time
import queue
import pandas as pd

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# -----------------------------
# Configuration and Initialization
# -----------------------------
app = Flask(__name__)
# Use SQLite database named data.db in the project root
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# -----------------------------
# Database Models
# -----------------------------
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # e.g., filter parameters can be stored as JSON string (for simplicity)
    filters = db.Column(db.String, nullable=True)
    status = db.Column(db.String, default="pending")  # pending, in_progress, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'filters': self.filters,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class DataRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    company = db.Column(db.String, nullable=True)
    name = db.Column(db.String, nullable=True)
    mpg = db.Column(db.Float, nullable=True)
    cylinders = db.Column(db.Integer, nullable=True)
    displacement = db.Column(db.Float, nullable=True)
    horsepower = db.Column(db.Float, nullable=True)
    weight = db.Column(db.Float, nullable=True)
    acceleration = db.Column(db.Float, nullable=True)
    sale_date = db.Column(db.DateTime, nullable=True)
    price = db.Column(db.Integer, nullable=True)
    origin = db.Column(db.String, nullable=True)

    def to_dict(self):
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

# Create the database tables if they don't exist yet
with app.app_context():
    db.create_all()

# -----------------------------
# In-Memory Job Queue and Worker
# -----------------------------
job_queue = queue.Queue()

def data_ingestion(task_id, filters=None):
    with app.app_context():
        print(f"[Task {task_id}] Starting data ingestion...", flush=True)
        time.sleep(5)  # Simulate delay before starting

        # Update task status to "in_progress"
        task = db.session.get(Task, task_id)
        task.status = "in_progress"
        db.session.commit()
        print(f"[Task {task_id}] Status set to in_progress.", flush=True)

        # Read unified data from CSV (simulate merging external sources)
        data_path = os.path.join(os.getcwd(), "data", "unified_cars.csv")
        if not os.path.exists(data_path):
            print(f"[Task {task_id}] ERROR: File {data_path} not found!", flush=True)
            return
        else:
            print(f"[Task {task_id}] Found file at {data_path}", flush=True)

        df = pd.read_csv(data_path)
        print(f"[Task {task_id}] Read {len(df)} rows from unified_cars.csv.", flush=True)

        # Insert records into DataRecord table with the associated task_id
        for i, (_, row) in enumerate(df.iterrows(), start=1):
            if i % 100 == 0:
                print(f"[Task {task_id}] Processed {i} / {len(df)} records...", flush=True)
            sale_date = pd.to_datetime(row['sale_date'], errors='coerce')
            record = DataRecord(
                task_id=task_id,
                company=row.get('company'),
                name=row.get('name'),
                mpg=row.get('mpg'),
                cylinders=row.get('cylinders'),
                displacement=row.get('displacement'),
                horsepower=row.get('horsepower'),
                weight=row.get('weight'),
                acceleration=row.get('acceleration'),
                sale_date=sale_date,
                price=row.get('price'),
                origin=row.get('origin')
            )
            db.session.add(record)
        print(f"[Task {task_id}] Finished processing records. Committing to database...", flush=True)

        # Mark task as completed
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        db.session.commit()
        print(f"[Task {task_id}] Task marked as completed.", flush=True)

def worker():
    while True:
        task_id, filters = job_queue.get()
        print(f"[Worker] Picked up task {task_id}.", flush=True)
        try:
            data_ingestion(task_id, filters)
        except Exception as e:
            print(f"[Worker] Error processing task {task_id}: {e}", flush=True)
        finally:
            job_queue.task_done()

worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

# -----------------------------
# API Endpoints
# -----------------------------
@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.get_json() or {}
    filters = data.get('filters', None)
    new_task = Task(filters=filters, status="pending")
    db.session.add(new_task)
    db.session.commit()
    job_queue.put((new_task.id, filters))
    return jsonify({'message': 'Task created', 'task': new_task.to_dict()}), 201

@app.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    db.session.remove()
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    db.session.refresh(task)
    print(f"[GET] Task {task_id} status after refresh: {task.status}", flush=True)
    response = task.to_dict()
    if task.status == "completed":
        records = DataRecord.query.filter_by(task_id=task_id).all()
        response['data'] = [record.to_dict() for record in records]
    return jsonify(response)

# -----------------------------
# Run the Flask Application
# -----------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

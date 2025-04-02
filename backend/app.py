from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_caching import Cache
import logging
from functools import wraps
import time

from config import Config
from models import db, Task
from worker import JobQueue

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
CORS(app, 
     resources={
         r"/*": {
             "origins": Config.CORS_ORIGINS,
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type"]
         }
     },
     supports_credentials=True
)
cache = Cache(app)
db.init_app(app)

# Set up logging
logging.basicConfig(level=Config.LOG_LEVEL, format=Config.LOG_FORMAT)
logger = logging.getLogger(__name__)

# Initialize job queue
job_queue = JobQueue(app)
job_queue.start_worker()

def create_tables():
    """Create database tables"""
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")

# -----------------------------
# Decorators
# -----------------------------
def handle_exceptions(f):
    """Decorator to handle exceptions and return appropriate responses"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}")
            return jsonify({
                'error': 'Internal server error',
                'message': str(e)
            }), 500
    return wrapper

def monitor_performance(f):
    """Decorator to monitor endpoint performance"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = f(*args, **kwargs)
        duration = time.time() - start_time
        logger.info(f"{f.__name__} took {duration:.2f} seconds")
        return result
    return wrapper

# -----------------------------
# API Endpoints
# -----------------------------
@app.route(f'{Config.API_PREFIX}/tasks', methods=['POST'])
@handle_exceptions
@monitor_performance
def create_task():
    """Create a new data processing task"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'No JSON data provided'
            }), 400

        filters = data.get('filters')
        logger.info(f"Received task creation request with filters: {filters}")
        
        # Input validation
        if filters and not isinstance(filters, dict):
            return jsonify({
                'error': 'Invalid filters format',
                'message': 'Filters must be a dictionary'
            }), 400

        # Create task
        new_task = Task(
            filters=filters,
            status="pending"
        )
        db.session.add(new_task)
        db.session.commit()
        logger.info(f"Created new task with ID: {new_task.id}")
        
        # Add to job queue
        if not job_queue.add_task(new_task.id, filters):
            new_task.status = "failed"
            new_task.error_message = "Queue is full"
            db.session.commit()
            return jsonify({
                'error': 'Queue full',
                'message': 'Server is busy, please try again later'
            }), 503

        return jsonify({
            'message': 'Task created',
            'task': new_task.to_dict()
        }), 201
    except Exception as e:
        logger.error(f"Error in create_task: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Server error',
            'message': str(e)
        }), 500

@app.route(f'{Config.API_PREFIX}/tasks/<int:task_id>', methods=['GET'])
@handle_exceptions
@monitor_performance
@cache.memoize(timeout=60)  # Cache results for 1 minute
def get_task(task_id):
    """Get task status and data"""
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({
            'error': 'Not found',
            'message': 'Task not found'
        }), 404

    response = task.to_dict()
    
    # Include data if task is completed
    if task.status == "completed":
        response['data'] = [record.to_dict() for record in task.records]
    
    return jsonify(response)

@app.route(f'{Config.API_PREFIX}/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'queue_size': job_queue.queue.qsize(),
        'worker_active': job_queue.worker_thread and job_queue.worker_thread.is_alive()
    })

# -----------------------------
# Application Startup
# -----------------------------
if __name__ == '__main__':
    create_tables()
    app.run(debug=True, host='0.0.0.0', port=5001)

import os

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///data.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # API
    API_PREFIX = '/api/v1'
    CORS_ORIGINS = ['http://localhost:3000']  # Add production URLs as needed
    
    # Data Processing
    DATA_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    UNIFIED_DATA_PATH = os.path.join(DATA_FOLDER, "unified_cars.csv")
    
    # Job Queue
    MAX_QUEUE_SIZE = 100
    WORKER_SLEEP_TIME = 0.1  # seconds
    
    # Cache
    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = 300  # 5 minutes
    
    # Security
    REQUEST_TIMEOUT = 30  # seconds
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # Logging
    LOG_LEVEL = "INFO"
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s' 
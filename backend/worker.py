import threading
import queue
import time
import pandas as pd
from datetime import datetime
import logging
from models import db, Task, DataRecord
from config import Config
import os
import json

logger = logging.getLogger(__name__)

class JobQueue:
    """Thread-safe job queue for handling data processing tasks"""
    def __init__(self, app):
        self.queue = queue.Queue(maxsize=Config.MAX_QUEUE_SIZE)
        self.app = app
        self.worker_thread = None
        self._setup_logging()

    def _setup_logging(self):
        """Configure logging for the worker"""
        logging.basicConfig(
            level=Config.LOG_LEVEL,
            format=Config.LOG_FORMAT
        )

    def start_worker(self):
        """Start the worker thread"""
        if self.worker_thread is None or not self.worker_thread.is_alive():
            self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
            self.worker_thread.start()
            logger.info("Worker thread started")

    def add_task(self, task_id, filters):
        """Add a new task to the queue"""
        try:
            self.queue.put((task_id, filters), block=False)
            logger.info(f"Task {task_id} added to queue")
            return True
        except queue.Full:
            logger.error(f"Queue is full, couldn't add task {task_id}")
            return False

    def _process_queue(self):
        """Main worker loop for processing tasks"""
        while True:
            try:
                task_id, filters = self.queue.get(timeout=1)
                with self.app.app_context():
                    self._process_task(task_id, filters)
            except queue.Empty:
                time.sleep(Config.WORKER_SLEEP_TIME)
            except Exception as e:
                logger.error(f"Error in worker thread: {str(e)}")

    def _process_task(self, task_id, filters):
        """Process a single task"""
        logger.info(f"Processing task {task_id} with filters: {filters}")
        
        try:
            # Update task status
            task = db.session.get(Task, task_id)
            if not task:
                logger.error(f"Task {task_id} not found")
                return

            task.status = "in_progress"
            db.session.commit()
            logger.info(f"Task {task_id} status updated to in_progress")

            # Check if data file exists
            if not os.path.exists(Config.UNIFIED_DATA_PATH):
                error_msg = f"Data file not found at {Config.UNIFIED_DATA_PATH}"
                logger.error(error_msg)
                task.status = "failed"
                task.error_message = error_msg
                db.session.commit()
                return

            # Read and process data
            df = pd.read_csv(Config.UNIFIED_DATA_PATH)
            logger.info(f"Read {len(df)} records from unified data")

            # Apply filters if provided
            if filters:
                df = self._apply_filters(df, filters)
                logger.info(f"Applied filters, {len(df)} records remaining")

            # Create records
            self._create_records(df, task_id)
            logger.info(f"Created records for task {task_id}")

            # Mark task as completed
            task.status = "completed"
            task.completed_at = datetime.utcnow()
            db.session.commit()
            logger.info(f"Task {task_id} completed successfully")

        except Exception as e:
            logger.error(f"Error processing task {task_id}: {str(e)}", exc_info=True)
            task.status = "failed"
            task.error_message = str(e)
            db.session.commit()

    def _apply_filters(self, df, filters):
        """Apply filters to the dataframe"""
        logger.info(f"Applying filters: {filters}")
        try:
            if isinstance(filters, str):
                filters = json.loads(filters)
                logger.info(f"Converted string filters to dict: {filters}")
            
            if 'startDate' in filters:
                df['sale_date'] = pd.to_datetime(df['sale_date'])
                df = df[df['sale_date'] >= filters['startDate']]
                logger.info(f"Applied start date filter: {filters['startDate']}, records remaining: {len(df)}")
            
            if 'endDate' in filters:
                df['sale_date'] = pd.to_datetime(df['sale_date'])
                df = df[df['sale_date'] <= filters['endDate']]
                logger.info(f"Applied end date filter: {filters['endDate']}, records remaining: {len(df)}")
            
            if 'carBrands' in filters and filters['carBrands']:
                logger.info(f"Available companies in data: {df['company'].unique().tolist()}")
                logger.info(f"Applying company filter for brands: {filters['carBrands']}")
                df = df[df['company'].isin(filters['carBrands'])]
                logger.info(f"After company filter, records remaining: {len(df)}")
                logger.info(f"Companies in filtered data: {df['company'].unique().tolist()}")
            
            return df
        except Exception as e:
            logger.error(f"Error applying filters: {str(e)}", exc_info=True)
            raise

    def _create_records(self, df, task_id):
        """Create DataRecord instances from dataframe"""
        batch_size = 1000
        records = []
        
        for i, row in df.iterrows():
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
                sale_date=pd.to_datetime(row.get('sale_date')),
                price=row.get('price'),
                origin=row.get('origin')
            )
            records.append(record)
            
            # Batch commit to improve performance
            if len(records) >= batch_size:
                db.session.bulk_save_objects(records)
                db.session.commit()
                records = []
        
        # Commit any remaining records
        if records:
            db.session.bulk_save_objects(records)
            db.session.commit() 
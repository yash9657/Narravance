# Car Sales Data Analysis Dashboard

A full-stack web application for analyzing and visualizing car sales data from multiple sources. The application provides an interactive dashboard with real-time data filtering, processing, and visualization capabilities.

## Features

### Backend (Flask)
- **Data Integration**: 
  - Combines data from multiple sources (JSON and CSV)
  - Unified data schema for consistent processing
  - SQLite database for storing processed data
  
- **Task Management**:
  - Asynchronous task processing using a job queue
  - Real-time task status tracking
  - Filter-based data processing
  
- **RESTful API**:
  - `/tasks` endpoint for creating new analysis tasks
  - Task status monitoring and data retrieval endpoints
  - CORS-enabled for frontend integration

### Frontend (React)
- **Task Creation**:
  - Interactive form for creating analysis tasks
  - Date range selection
  - Car brand filtering
  - Real-time validation and feedback
  
- **Task Monitoring**:
  - Real-time task status updates
  - Error handling and loading states
  - User-friendly status messages
  
- **Data Visualization**:
  - Interactive D3.js charts:
    - Line chart: Price trends over time
    - Bar chart: Total sales by company
    - Pie chart: Sales proportion by company
    - Scatter plot: Price vs. Horsepower correlation
  - Real-time data filtering capabilities:
    - Date range filtering
    - Company-specific filtering
    - Price range filtering
  - Responsive design with Tailwind CSS

## Technology Stack

### Backend
- **Framework**: Flask
- **Database**: SQLite with SQLAlchemy ORM
- **Data Processing**: Pandas
- **API**: RESTful with JSON
- **Concurrency**: Threading for background tasks

### Frontend
- **Framework**: React
- **Visualization**: D3.js
- **Styling**: Tailwind CSS
- **HTTP Client**: Fetch API

## Project Structure

```
project/
├── backend/
│   ├── app.py                 # Flask application with API endpoints
│   └── data/
│       ├── cars.json         # Source data in JSON format
│       ├── mpg.csv           # Source data in CSV format
│       └── unified_cars.csv  # Processed and unified dataset
│
├── frontend/
│   └── src/
│       └── components/
│           ├── TaskForm.js           # Task creation form
│           └── DataVisualization.js  # Data visualization dashboard
```

## Setup and Installation

### Backend Setup
1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install required packages:
   ```bash
   pip install flask flask-sqlalchemy flask-cors pandas
   ```

3. Start the Flask server:
   ```bash
   cd backend
   python app.py
   ```
   The server will run on `http://localhost:5001`

### Frontend Setup
1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the React development server:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`

## Usage

1. **Create a New Task**:
   - Navigate to the task creation form
   - Select date range for analysis
   - Enter car brands (comma-separated)
   - Submit the form to create a new analysis task

2. **Monitor Task Status**:
   - View task progress in real-time
   - Wait for task completion notification

3. **Explore Data Visualizations**:
   - Use the interactive filters to analyze specific data segments
   - Explore different chart types for various insights:
     - Price trends over time
     - Company-wise sales distribution
     - Price-horsepower correlation
     - Market share by company

4. **Filter Data**:
   - Use date range filters
   - Filter by specific companies
   - Set price range constraints
   - All visualizations update in real-time based on filters

## Data Processing

The application processes car sales data from two sources:
1. `cars.json`: Contains detailed car specifications
2. `mpg.csv`: Contains fuel efficiency data

The data is unified into a single dataset with the following schema:
- company
- name
- mpg
- cylinders
- displacement
- horsepower
- weight
- acceleration
- sale_date
- price
- origin

## API Endpoints

### POST /tasks
Creates a new analysis task
- Request body: `{ filters: { startDate, endDate, carBrands } }`
- Response: `{ message: string, task: Task }`

### GET /tasks/:taskId
Retrieves task status and data
- Response: `{ id, filters, status, created_at, completed_at, data? }`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
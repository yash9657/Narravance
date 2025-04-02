// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TaskForm from './components/TaskForm';
import TaskMonitor from './components/TaskMonitor';
import DataVisualization from './components/DataVisualization';

function App() {
  const [currentTaskId, setCurrentTaskId] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 p-6">
        <nav className="bg-white shadow-lg rounded-lg p-4 mb-6">
          <ul className="flex space-x-6">
            <li>
              <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
                Create Task
              </Link>
            </li>
            <li>
              <Link to="/monitor" className="text-blue-600 hover:text-blue-800 font-medium">
                Monitor Task
              </Link>
            </li>
            <li>
              <Link to="/visualize" className="text-blue-600 hover:text-blue-800 font-medium">
                Data Visualization
              </Link>
            </li>
          </ul>
        </nav>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <Routes>
            <Route
              path="/"
              element={<TaskForm onTaskCreated={(task) => setCurrentTaskId(task.id)} />}
            />
            <Route path="/monitor" element={<TaskMonitor />} />
            <Route
              path="/visualize"
              element={<DataVisualization taskId={currentTaskId} />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

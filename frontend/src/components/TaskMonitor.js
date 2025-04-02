// src/components/TaskMonitor.js
import React, { useState, useEffect } from 'react';

function TaskMonitor() {
  const [taskId, setTaskId] = useState('');
  const [taskData, setTaskData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (taskId) {
      const fetchTaskStatus = async () => {
        try {
          const response = await fetch(`http://localhost:5001/tasks/${taskId}`);
          if (response.ok) {
            const data = await response.json();
            setTaskData(data);
          } else {
            setTaskData({ error: 'Task not found' });
          }
        } catch (err) {
          console.error(err);
          setTaskData({ error: 'Failed to fetch task status' });
        }
      };

      fetchTaskStatus(); // Fetch immediately
      interval = setInterval(fetchTaskStatus, 5000); // Then every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // The useEffect will handle the polling
    setTimeout(() => setIsLoading(false), 1000); // Show loading state briefly
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Monitor Task Status</h2>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task ID
            </label>
            <input
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`self-end px-6 py-2 rounded-lg text-white font-medium ${
              isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            } transition-colors`}
          >
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      </form>

      {taskData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Task Status</h3>
          {taskData.error ? (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              {taskData.error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">ID</span>
                <span className="font-medium">{taskData.id}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(taskData.status)}`}>
                  {taskData.status}
                </span>
              </div>
              {taskData.status === 'completed' && taskData.data && (
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Records Processed</span>
                  <span className="font-medium">{taskData.data.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskMonitor;

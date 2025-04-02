// src/components/TaskForm.js
import React, { useState } from 'react';

function TaskForm({ onTaskCreated }) {
  const [startDate, setStartDate] = useState('1970-01-01');
  const [endDate, setEndDate] = useState('1975-12-31');
  const [carBrands, setCarBrands] = useState('Ford,Toyota');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    // Construct a filters object for better structure
    const filters = {
      startDate,
      endDate,
      carBrands: carBrands.split(',').map(brand => brand.trim())
    };

    try {
      const response = await fetch('http://localhost:5001/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });
      if (!response.ok) {
        throw new Error('Error creating task');
      }
      const data = await response.json();
      onTaskCreated(data.task);
      setMessage({ type: 'success', text: `Task created with ID: ${data.task.id}` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to create task.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create a New Task</h2>
      
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Car Brands (comma separated)</label>
          <input
            type="text"
            value={carBrands}
            onChange={(e) => setCarBrands(e.target.value)}
            placeholder="e.g., Ford,Toyota"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-3 px-4 rounded-lg text-white font-medium ${
            isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isLoading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}

export default TaskForm;

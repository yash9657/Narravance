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
      startDate: startDate,
      endDate: endDate,
      carBrands: carBrands.split(',').map(brand => brand.trim()).filter(brand => brand)
    };

    try {
      console.log('Sending request with filters:', filters);
      const response = await fetch('http://localhost:5001/api/v1/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ filters })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error creating task');
      }

      console.log('Response data:', data);
      onTaskCreated(data.task);
      setMessage({ type: 'success', text: `Task created with ID: ${data.task.id}` });
    } catch (err) {
      console.error('Error details:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to create task.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-700">
            <h2 className="text-3xl font-bold text-white">Create Analysis Task</h2>
            <p className="mt-2 text-blue-100">Configure your data analysis parameters</p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mx-6 mt-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            } flex items-center`}>
              <div className={`w-8 h-8 mr-3 rounded-full flex items-center justify-center ${
                message.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Date Range Section */}
              <div className="col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Car Brands Section */}
              <div className="col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Car Brands</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter brands (comma separated)
                  </label>
                  <input
                    type="text"
                    value={carBrands}
                    onChange={(e) => setCarBrands(e.target.value)}
                    placeholder="e.g., Ford, Toyota, BMW"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    disabled={isLoading}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Separate multiple brands with commas
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium text-lg transition duration-150 ${
                  isLoading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Create Analysis Task'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Card */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Tips</h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Select a date range to analyze car sales data within that period
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Enter car brands separated by commas (e.g., "Ford,Toyota,BMW")
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              The analysis task will process data and generate visualizations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TaskForm;

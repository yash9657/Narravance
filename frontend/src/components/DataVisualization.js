// src/components/DataVisualization.js
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

function DataVisualization({ taskId }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // New filter state variables
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  // Refs for the charts
  const lineChartRef = useRef();
  const barChartRef = useRef();
  const pieChartRef = useRef();
  const scatterPlotRef = useRef();
  const containerRef = useRef();

  // Fetch task data when taskId is provided and task is completed
  useEffect(() => {
    if (taskId) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`http://localhost:5001/api/v1/tasks/${taskId}`);
          if (response.ok) {
            const taskData = await response.json();
            if (taskData.status === 'completed') {
              setData(taskData.data || []);
              return true; // Data is loaded
            } else if (taskData.status === 'failed') {
              setError(`Task failed: ${taskData.error_message || 'Unknown error'}`);
              return true; // Stop polling on failure
            } else {
              setError(`Task is ${taskData.status}.`);
              return false; // Continue polling
            }
          } else {
            const errorData = await response.json();
            setError(errorData.message || 'Task not found.');
            return true; // Stop polling on error
          }
        } catch (err) {
          console.error('Error fetching task data:', err);
          setError('Failed to fetch task data. Please try again later.');
          return true; // Stop polling on error
        } finally {
          setIsLoading(false);
        }
      };

      let pollInterval;
      const startPolling = async () => {
        const shouldStop = await fetchData();
        if (!shouldStop) {
          pollInterval = setInterval(async () => {
            const shouldStop = await fetchData();
            if (shouldStop && pollInterval) {
              clearInterval(pollInterval);
            }
          }, 10000); // Poll every 10 seconds instead of 5
        }
      };

      startPolling();
      return () => {
        if (pollInterval) clearInterval(pollInterval);
      };
    }
  }, [taskId]);

  // Compute the filtered data based on user selections
  const filteredData = data.filter(d => {
    // Date filter (if sale_date is valid)
    if (filterStartDate) {
      if (new Date(d.sale_date) < new Date(filterStartDate)) return false;
    }
    if (filterEndDate) {
      if (new Date(d.sale_date) > new Date(filterEndDate)) return false;
    }
    // Company filter
    if (filterCompany !== 'all' && d.company !== filterCompany) return false;
    // Price range filter
    if (filterMinPrice && +d.price < +filterMinPrice) return false;
    if (filterMaxPrice && +d.price > +filterMaxPrice) return false;
    return true;
  });

  // Compute the list of companies from full data (for the filter dropdown)
  const companies = Array.from(new Set(data.map(d => d.company))).filter(Boolean);

  // --------------------------
  // LINE CHART: sale_date vs. price
  // --------------------------
  useEffect(() => {
    if (filteredData.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const aspectRatio = 0.5;
    const chartWidth = Math.min(containerWidth - 40, 800);
    const chartHeight = chartWidth * aspectRatio;

    d3.select(lineChartRef.current).selectAll('*').remove();

    const svg = d3
      .select(lineChartRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`);

    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const sortedData = filteredData
      .map(d => ({ ...d, sale_date: new Date(d.sale_date), price: +d.price }))
      .sort((a, b) => a.sale_date - b.sale_date);

    const x = d3.scaleTime()
      .domain(d3.extent(sortedData, d => d.sale_date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d.price)])
      .nice()
      .range([height, 0]);

    // Add x-axis with rotated labels
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .attr('class', 'x-axis')
      .call(
        d3.axisBottom(x)
          .tickFormat(d3.timeFormat('%Y-%m-%d'))
          .ticks(5)
      )
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', '#4B5563');

    // X-axis label
    g.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .style('fill', '#4B5563')
      .style('font-size', '12px')
      .text('Sale Date');

    // Add y-axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y))
      .style('font-size', '12px')
      .selectAll('text')
      .style('fill', '#4B5563');

    // Y-axis label
    g.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .style('fill', '#4B5563')
      .style('font-size', '12px')
      .text('Price ($)');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

    const line = d3.line()
      .x(d => x(d.sale_date))
      .y(d => y(d.price))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    g.selectAll('circle')
      .data(sortedData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.sale_date))
      .attr('cy', d => y(d.price))
      .attr('r', 3)
      .attr('fill', '#3b82f6');
  }, [filteredData]);

  // --------------------------
  // BAR CHART: Total Sales by Company
  // --------------------------
  useEffect(() => {
    if (filteredData.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const aspectRatio = 0.5;
    const chartWidth = Math.min(containerWidth - 40, 800);
    const chartHeight = chartWidth * aspectRatio;

    d3.select(barChartRef.current).selectAll('*').remove();

    const svg = d3.select(barChartRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`);

    const margin = { top: 20, right: 30, bottom: 70, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Aggregate total price by company
    const companyData = d3.rollups(
      filteredData,
      v => d3.sum(v, d => +d.price),
      d => d.company
    ).map(([company, totalPrice]) => ({ company, totalPrice }));

    const x = d3.scaleBand()
      .domain(companyData.map(d => d.company))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(companyData, d => d.totalPrice)])
      .nice()
      .range([height, 0]);

    // X-axis for bar chart
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .attr('class', 'x-axis')
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', '#4B5563');

    // X-axis label for bar chart
    g.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .style('fill', '#4B5563')
      .style('font-size', '12px')
      .text('Company');

    // Y-axis for bar chart
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y))
      .style('font-size', '12px')
      .selectAll('text')
      .style('fill', '#4B5563');

    // Y-axis label for bar chart
    g.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .style('fill', '#4B5563')
      .style('font-size', '12px')
      .text('Total Sales ($)');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

    g.selectAll('.bar')
      .data(companyData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.company))
      .attr('y', d => y(d.totalPrice))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.totalPrice))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.8);
  }, [filteredData]);

  // --------------------------
  // PIE CHART: Proportion of Records by Company
  // --------------------------
  useEffect(() => {
    if (filteredData.length === 0) return;

    const chartWidth = 400;
    const chartHeight = 400;
    const radius = Math.min(chartWidth, chartHeight) / 2;

    d3.select(pieChartRef.current).selectAll('*').remove();

    const svg = d3.select(pieChartRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`)
      .append('g')
      .attr('transform', `translate(${chartWidth / 2},${chartHeight / 2})`);

    const pieData = d3.rollups(
      filteredData,
      v => v.length,
      d => d.company
    ).map(([company, count]) => ({ company, count }));

    const color = d3.scaleOrdinal()
      .domain(pieData.map(d => d.company))
      .range(d3.schemeCategory10);

    const pie = d3.pie().value(d => d.count);
    const data_ready = pie(pieData);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    svg.selectAll('slice')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.company))
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('opacity', 0.8);

    svg.selectAll('text')
      .data(data_ready)
      .enter()
      .append('text')
      .text(d => d.data.company)
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .style('text-anchor', 'middle')
      .style('font-size', 12);
  }, [filteredData]);

  // --------------------------
  // SCATTER PLOT: Price vs. Horsepower
  // --------------------------
  useEffect(() => {
    if (filteredData.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const chartWidth = Math.min(containerWidth - 40, 800);
    const chartHeight = 400;

    d3.select(scatterPlotRef.current).selectAll('*').remove();

    const svg = d3.select(scatterPlotRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`);

    const margin = { top: 20, right: 30, bottom: 60, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const scatterData = filteredData.map(d => ({
      price: +d.price,
      horsepower: +d.horsepower
    })).filter(d => !isNaN(d.price) && !isNaN(d.horsepower));

    const x = d3.scaleLinear()
      .domain([0, d3.max(scatterData, d => d.horsepower)])
      .nice()
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(scatterData, d => d.price)])
      .nice()
      .range([height, 0]);

    // X-axis for scatter plot
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .attr('class', 'x-axis')
      .call(d3.axisBottom(x))
      .style('font-size', '12px')
      .selectAll('text')
      .style('fill', '#4B5563');

    // X-axis label for scatter plot
    g.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .style('fill', '#4B5563')
      .style('font-size', '12px')
      .text('Horsepower');

    // Y-axis for scatter plot
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y))
      .style('font-size', '12px')
      .selectAll('text')
      .style('fill', '#4B5563');

    // Y-axis label for scatter plot
    g.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .style('fill', '#4B5563')
      .style('font-size', '12px')
      .text('Price ($)');

    g.selectAll('circle')
      .data(scatterData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.horsepower))
      .attr('cy', d => y(d.price))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.7);
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8" ref={containerRef}>
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-700">
            <h2 className="text-3xl font-bold text-white">Data Analysis Dashboard</h2>
            <p className="mt-2 text-blue-100">Interactive visualization of car sales data</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Processing your data...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-800">
                <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Main Content */}
          {!isLoading && !error && (
            <div className="p-6">
              {/* Filters Section */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    >
                      <option value="all">All Companies</option>
                      {companies.map((comp) => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={filterMinPrice}
                      onChange={(e) => setFilterMinPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      placeholder="Min price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={filterMaxPrice}
                      onChange={(e) => setFilterMaxPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      placeholder="Max price"
                    />
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-50 mr-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-50 mr-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Price</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(d3.mean(filteredData, d => d.price) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-50 mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Companies</p>
                      <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-50 mr-4">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Price Range</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${Math.min(...filteredData.map(d => d.price)).toLocaleString()} - ${Math.max(...filteredData.map(d => d.price)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trends Over Time</h3>
                  <div className="aspect-w-16 aspect-h-9">
                    <div className="overflow-hidden">
                      <svg ref={lineChartRef} className="w-full h-full"></svg>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Sales by Company</h3>
                  <div className="aspect-w-16 aspect-h-9">
                    <div className="overflow-hidden">
                      <svg ref={barChartRef} className="w-full h-full"></svg>
                    </div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Distribution</h3>
                  <div className="aspect-w-16 aspect-h-9">
                    <div className="overflow-hidden flex justify-center">
                      <svg ref={pieChartRef} className="w-full h-full"></svg>
                    </div>
                  </div>
                </div>

                {/* Scatter Plot */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Price vs. Horsepower</h3>
                  <div className="aspect-w-16 aspect-h-9">
                    <div className="overflow-hidden">
                      <svg ref={scatterPlotRef} className="w-full h-full"></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* No Data State */}
              {!filteredData.length && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 mt-6 text-center">
                  <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">No Data Available</h3>
                  <p className="text-yellow-600">Try adjusting your filters to see more results</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataVisualization;

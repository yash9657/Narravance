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
          const response = await fetch(`http://localhost:5001/tasks/${taskId}`);
          if (response.ok) {
            const taskData = await response.json();
            if (taskData.status === 'completed') {
              setData(taskData.data);
            } else {
              setError('Task is not yet completed.');
            }
          } else {
            setError('Task not found.');
          }
        } catch (err) {
          console.error(err);
          setError('Failed to fetch task data.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
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
      .attr('height', chartHeight);

    const margin = { top: 20, right: 30, bottom: 30, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Ensure dates and prices are numbers
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

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .attr('class', 'text-gray-600');

    g.append('g')
      .call(d3.axisLeft(y))
      .attr('class', 'text-gray-600');

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
  // BAR CHART: Total Sales (sum of price) by Company
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
      .attr('height', chartHeight);

    const margin = { top: 20, right: 30, bottom: 60, left: 60 },
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

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('class', 'text-gray-600');

    g.append('g')
      .call(d3.axisLeft(y))
      .attr('class', 'text-gray-600');

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

    const container = containerRef.current;
    const chartWidth = 400;
    const chartHeight = 400;
    const radius = Math.min(chartWidth, chartHeight) / 2;

    d3.select(pieChartRef.current).selectAll('*').remove();

    const svg = d3.select(pieChartRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .append('g')
      .attr('transform', `translate(${chartWidth / 2},${chartHeight / 2})`);

    // Aggregate count by company
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

    // Optionally, add labels
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
      .attr('height', chartHeight);

    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Ensure numeric values for price and horsepower
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

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .attr('class', 'text-gray-600')
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', '#000')
      .attr('text-anchor', 'middle')
      .text('Horsepower');

    g.append('g')
      .call(d3.axisLeft(y))
      .attr('class', 'text-gray-600')
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('fill', '#000')
      .attr('text-anchor', 'middle')
      .text('Price');

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
    <div className="max-w-6xl mx-auto" ref={containerRef}>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Data Visualization</h2>
      
      {/* Filter Panel */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md"
            >
              <option value="all">All</option>
              {companies.map((comp) => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Price</label>
            <input
              type="number"
              value={filterMinPrice}
              onChange={(e) => setFilterMinPrice(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Price</label>
            <input
              type="number"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Charts Layout */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">{error}</div>
      ) : !filteredData.length ? (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-6">
          No data to display. Adjust your filters or ensure the task is completed.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Price Trends Over Time</h3>
            <div className="overflow-x-auto">
              <svg ref={lineChartRef} className="w-full"></svg>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Total Sales by Company</h3>
            <div className="overflow-x-auto">
              <svg ref={barChartRef} className="w-full"></svg>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Sales Proportion by Company</h3>
            <div className="flex justify-center">
              <svg ref={pieChartRef}></svg>
            </div>
          </div>

          {/* Scatter Plot */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Price vs. Horsepower</h3>
            <div className="overflow-x-auto">
              <svg ref={scatterPlotRef} className="w-full"></svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataVisualization;

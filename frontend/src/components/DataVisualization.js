// src/components/DataVisualization.js
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

function DataVisualization({ taskId }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lineChartRef = useRef();
  const barChartRef = useRef();
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

  // Draw a simple line chart showing sale_date vs. price
  useEffect(() => {
    if (data.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const aspectRatio = 0.5; // height will be half of width
    const chartWidth = Math.min(containerWidth - 40, 800); // max width of 800px
    const chartHeight = chartWidth * aspectRatio;

    // Clear previous SVG content
    d3.select(lineChartRef.current).selectAll('*').remove();

    const svg = d3
      .select(lineChartRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight);

    const margin = { top: 20, right: 30, bottom: 30, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates and sort data
    data.forEach((d) => {
      d.sale_date = new Date(d.sale_date);
      d.price = +d.price;
    });
    const sortedData = data.sort((a, b) => a.sale_date - b.sale_date);

    // Set up scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(sortedData, (d) => d.sale_date))
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(sortedData, (d) => d.price)])
      .nice()
      .range([height, 0]);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .attr('class', 'text-gray-600');

    g.append('g')
      .call(d3.axisLeft(y))
      .attr('class', 'text-gray-600');

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

    // Draw line
    const line = d3
      .line()
      .x((d) => x(d.sale_date))
      .y((d) => y(d.price))
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
      .attr('cx', (d) => x(d.sale_date))
      .attr('cy', (d) => y(d.price))
      .attr('r', 3)
      .attr('fill', '#3b82f6');
  }, [data]);

  // Draw a simple bar chart aggregating total price by company
  useEffect(() => {
    if (data.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const aspectRatio = 0.5;
    const chartWidth = Math.min(containerWidth - 40, 800);
    const chartHeight = chartWidth * aspectRatio;

    // Clear previous SVG content
    d3.select(barChartRef.current).selectAll('*').remove();

    const svg = d3
      .select(barChartRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight);

    const margin = { top: 20, right: 30, bottom: 60, left: 60 },
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Aggregate data: sum price for each company
    const companyData = d3.rollups(
      data,
      (v) => d3.sum(v, (d) => +d.price),
      (d) => d.company
    );
    const chartData = companyData.map(([company, totalPrice]) => ({ company, totalPrice }));

    // Set up scales
    const x = d3
      .scaleBand()
      .domain(chartData.map((d) => d.company))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.totalPrice)])
      .nice()
      .range([height, 0]);

    // Add axes
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

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

    // Draw bars
    g.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.company))
      .attr('y', (d) => y(d.totalPrice))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d.totalPrice))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.8);
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto" ref={containerRef}>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Data Visualization</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      ) : !data.length ? (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-6">
          No data loaded. Please ensure you have a completed task and pass its ID.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Price Trends Over Time</h3>
            <div className="overflow-x-auto">
              <svg ref={lineChartRef} className="w-full"></svg>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Total Sales by Company</h3>
            <div className="overflow-x-auto">
              <svg ref={barChartRef} className="w-full"></svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataVisualization;

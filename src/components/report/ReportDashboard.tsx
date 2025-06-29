import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface Report {
  id: string;
  type: 'environmental' | 'regulatory';
  category?: string;
  city?: string;
  violationType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  description: string;
  imageUrl?: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'done';
  timestamp: number;
  user_id: string;
  remarks?: string;
}

interface FilterState {
  dateRange: 'today' | 'week' | 'month' | 'custom';
  customStartDate: string;
  customEndDate: string;
  status: 'all' | 'pending' | 'in-progress' | 'resolved' | 'done';
  type: 'all' | 'environmental' | 'regulatory';
  category: string;
  city: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportDashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'month',
    customStartDate: '',
    customEndDate: '',
    status: 'all',
    type: 'all',
    category: '',
    city: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to view reports');
      }

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on current filters
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Date range filter
      const reportDate = new Date(report.timestamp);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let dateFilter = true;
      switch (filters.dateRange) {
        case 'today':
          dateFilter = reportDate >= startOfDay;
          break;
        case 'week':
          dateFilter = reportDate >= startOfWeek;
          break;
        case 'month':
          dateFilter = reportDate >= startOfMonth;
          break;
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate);
            const endDate = new Date(filters.customEndDate);
            dateFilter = reportDate >= startDate && reportDate <= endDate;
          }
          break;
      }

      // Status filter
      const statusFilter = filters.status === 'all' || report.status === filters.status;

      // Type filter
      const typeFilter = filters.type === 'all' || report.type === filters.type;

      // Category filter
      const categoryFilter = !filters.category || report.category === filters.category;

      // City filter
      const cityFilter = !filters.city || report.city === filters.city;

      return dateFilter && statusFilter && typeFilter && categoryFilter && cityFilter;
    });
  }, [reports, filters]);

  // Chart data calculations
  const chartData = useMemo(() => {
    // Status distribution
    const statusData = filteredReports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Type distribution
    const typeData = filteredReports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category distribution
    const categoryData = filteredReports.reduce((acc, report) => {
      const category = report.category || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily trend
    const dailyTrend = filteredReports.reduce((acc, report) => {
      const date = new Date(report.timestamp).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      status: Object.entries(statusData).map(([name, value]) => ({ name, value })),
      type: Object.entries(typeData).map(([name, value]) => ({ name, value })),
      category: Object.entries(categoryData).map(([name, value]) => ({ name, value })),
      dailyTrend: Object.entries(dailyTrend)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([date, value]) => ({ date, value }))
    };
  }, [filteredReports]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-gray-600 mt-1">Analytics and insights for your reports</p>
        </div>

        {/* Filter Controls */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="environmental">Environmental</option>
                <option value="regulatory">Regulatory</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="waste">Waste Management</option>
                <option value="dumping">Illegal Dumping</option>
                <option value="water">Water Pollution</option>
                <option value="air">Air Pollution</option>
                <option value="deforestation">Deforestation</option>
                <option value="noise">Noise Violation</option>
                <option value="parking">Illegal Parking</option>
                <option value="construction">Construction Violation</option>
                <option value="business">Business Permit Violation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
              <input
                type="date"
                value={filters.customStartDate}
                onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={filters.customEndDate}
                onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="End Date"
              />
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{filteredReports.length}</div>
              <div className="text-sm text-gray-600">Total Reports</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredReports.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {filteredReports.filter(r => r.status === 'in-progress').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {filteredReports.filter(r => r.status === 'resolved' || r.status === 'done').length}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Pie Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.status}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Type Distribution Bar Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.type}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Trend Line Chart */}
            <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Report Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.category}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDashboard; 
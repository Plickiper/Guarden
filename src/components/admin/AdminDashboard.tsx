import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { generateEmailContent, sendEmail } from '../../services/emailService';
import CryptoJS from 'crypto-js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Report {
  id: string;
  type: string;
  category?: string;
  city?: string;
  violation_type?: string;
  location: string;
  description: string;
  image_url?: string;
  status: 'pending' | 'in-progress' | 'done';
  timestamp: number;
  user_id: string;
  user_email?: string;
  remarks?: string;
}

const ENCRYPTION_KEY = 'REPLACE_WITH_A_SECURE_KEY';

function decryptField(value: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || value;
  } catch {
    return value;
  }
}

const AdminDashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'done'>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState<string>('');

  // New filter states
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Get all reports with user information from the view
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports_with_users')
        .select('*')
        .order('timestamp', { ascending: false });

      if (reportsError) {
        console.error('Fetch error:', reportsError);
        throw reportsError;
      }

      if (!reportsData) {
        throw new Error('No reports data received');
      }

      console.log('Fetched reports data:', reportsData);
      setReports(reportsData);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: 'pending' | 'in-progress' | 'done') => {
    setUpdatingStatus(reportId);
    setError('');
    try {
      console.log('Updating status for report:', reportId, 'to:', newStatus);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      if (!session) {
        throw new Error('No active session');
      }

      console.log('Current user:', session.user);

      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (adminError) {
        console.error('Admin check error:', adminError);
        throw new Error('Failed to verify admin status');
      }

      if (!adminData) {
        throw new Error('User is not an admin');
      }

      console.log('Admin verification successful');

      // First, verify the report exists and get its current state
      const { data: existingReports, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      if (!existingReports || existingReports.length === 0) {
        throw new Error('Report not found');
      }

      const existingReport = existingReports[0];
      console.log('Existing report:', existingReport);

      // Try updating with a direct update
      const { error: updateError } = await supabase
        .from('reports')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Update completed, verifying...');

      // Wait a moment for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the update was successful
      const { data: verifyReports, error: verifyError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId);

      if (verifyError) {
        console.error('Verify error:', verifyError);
        throw verifyError;
      }

      if (!verifyReports || verifyReports.length === 0) {
        throw new Error('Report not found during verification');
      }

      const verifyData = verifyReports[0];
      console.log('Verify data:', verifyData);

      if (verifyData.status !== newStatus) {
        console.error('Status mismatch:', {
          expected: newStatus,
          actual: verifyData.status,
          reportId: reportId,
          originalStatus: existingReport.status
        });
        throw new Error('Status update failed - status mismatch');
      }

      // Update the local state with the new status
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus }
            : report
        )
      );

      // Force a refresh of the reports list
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports_with_users')
        .select('*')
        .order('timestamp', { ascending: false });

      if (reportsError) {
        console.error('Refresh error:', reportsError);
        throw reportsError;
      }

      if (!reportsData) {
        throw new Error('No reports data received');
      }

      console.log('Refreshed reports data:', reportsData);
      setReports(reportsData);
    } catch (error: any) {
      console.error('Status update error:', error);
      setError(error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSendEmail = async (report: Report) => {
    if (!selectedAgency) {
      setError('Please select an agency to forward the report to');
      return;
    }

    setSendingEmail(report.id);
    try {
      const { subject, templateParams } = generateEmailContent(
        report.type,
        report.description,
        report.location,
        report.image_url,
        report.category,
        report.city,
        report.violation_type
      );

      const emailSent = await sendEmail(selectedAgency, subject, templateParams);
      
      if (emailSent) {
        await handleStatusChange(report.id, 'in-progress');
        setError('');
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Enhanced filtering logic with all filters
  const filteredReports = useMemo(() => {
    let filtered = reports.map(report => ({
      ...report,
      // Only decrypt fields that were previously encrypted, except 'type'
      category: report.category ? decryptField(report.category) : report.category,
      city: report.city ? decryptField(report.city) : report.city,
      violation_type: report.violation_type ? decryptField(report.violation_type) : report.violation_type,
      location: report.location ? decryptField(report.location) : report.location,
      description: report.description ? decryptField(report.description) : report.description,
      user_id: report.user_id ? decryptField(report.user_id) : report.user_id,
      remarks: report.remarks ? decryptField(report.remarks) : report.remarks,
    }));

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
          } else {
            return filtered;
          }
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(report => {
        const reportDate = new Date(report.timestamp);
        return isWithinInterval(reportDate, { start: startDate, end: endDate });
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }

    // Violation type filter
    if (violationTypeFilter !== 'all') {
      filtered = filtered.filter(report => report.violation_type === violationTypeFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(report => report.city === cityFilter);
    }

    return filtered;
  }, [reports, statusFilter, dateRange, customStartDate, customEndDate, categoryFilter, violationTypeFilter, cityFilter]);

  // Graph data preparation
  const graphData = useMemo(() => {
    // Status distribution for pie chart
    const statusData = filteredReports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category distribution for bar chart
    const categoryData = filteredReports.reduce((acc, report) => {
      const category = report.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // City distribution for bar chart
    const cityData = filteredReports.reduce((acc, report) => {
      const city = report.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily trend for line chart (last 7 days)
    const dailyTrend = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      
      const count = filteredReports.filter(report => {
        const reportDate = new Date(report.timestamp);
        return isWithinInterval(reportDate, { start: dayStart, end: dayEnd });
      }).length;

      return {
        date: format(date, 'MMM dd'),
        count,
        fullDate: date
      };
    }).reverse();

    return {
      statusData: Object.entries(statusData).map(([status, count]) => ({ status, count })),
      categoryData: Object.entries(categoryData).map(([category, count]) => ({ category, count })),
      cityData: Object.entries(cityData).map(([city, count]) => ({ city, count })),
      dailyTrend
    };
  }, [filteredReports]);

  // Get unique values for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    reports.forEach(report => {
      if (report.category) {
        categories.add(decryptField(report.category));
      }
    });
    return Array.from(categories).sort();
  }, [reports]);

  const uniqueViolationTypes = useMemo(() => {
    const types = new Set<string>();
    reports.forEach(report => {
      if (report.violation_type) {
        types.add(decryptField(report.violation_type));
      }
    });
    return Array.from(types).sort();
  }, [reports]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    reports.forEach(report => {
      if (report.city) {
        cities.add(decryptField(report.city));
      }
    });
    return Array.from(cities).sort();
  }, [reports]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const handleExportPDF = async () => {
    const jsPDFModule = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDFModule.jsPDF();
    doc.text('Reports Export', 14, 16);
    const tableColumn = [
      'ID',
      'Type',
      'Category/Violation',
      'City',
      'Description',
      'Status',
      'Timestamp',
      'Remarks',
    ];
    const tableRows = reports.map((report) => [
      report.id,
      report.type,
      report.category || report.violation_type || '-',
      report.city || '-',
      report.description,
      report.status,
      new Date(report.timestamp).toLocaleString(),
      report.remarks || '-',
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 22 });
    doc.save('reports_export.pdf');
  };

  const handleEditRemarks = (report: Report) => {
    setEditingRemarksId(report.id);
    setRemarksDraft(report.remarks || '');
  };

  const handleSaveRemarks = async (reportId: string) => {
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ remarks: remarksDraft })
        .eq('id', reportId);
      if (updateError) throw updateError;
      // Update the local state for the edited report's remarks
      setReports(prevReports => prevReports.map(r =>
        r.id === reportId ? { ...r, remarks: remarksDraft } : r
      ));
      setEditingRemarksId(null);
      setRemarksDraft('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelRemarks = () => {
    setEditingRemarksId(null);
    setRemarksDraft('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Export as PDF
          </button>
        </div>
        <div>
          <div className="w-full min-w-[1200px] overflow-x-auto py-8">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <p className="mt-2 text-sm text-gray-700">
                  Review and manage violation reports
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Comprehensive Filter Controls */}
            <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom Date Range */}
                {dateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Violation Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Violation Type</label>
                  <select
                    value={violationTypeFilter}
                    onChange={(e) => setViolationTypeFilter(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="all">All Types</option>
                    {uniqueViolationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* City Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="all">All Cities</option>
                    {uniqueCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredReports.length}</span> reports
                  {dateRange !== 'all' && ` for ${dateRange === 'today' ? 'today' : dateRange === 'week' ? 'this week' : dateRange === 'month' ? 'this month' : 'custom range'}`}
                  {statusFilter !== 'all' && ` with status "${statusFilter}"`}
                  {categoryFilter !== 'all' && ` in category "${categoryFilter}"`}
                  {violationTypeFilter !== 'all' && ` of type "${violationTypeFilter}"`}
                  {cityFilter !== 'all' && ` in city "${cityFilter}"`}
                </p>
              </div>
            </div>

            {/* Graphs Section */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution Pie Chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={graphData.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {graphData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Trend Line Chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={graphData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Category Distribution Bar Chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={graphData.categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* City Distribution Bar Chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">City Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={graphData.cityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-8 flex flex-col">
              <div className="inline-block min-w-full py-2 align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 table-fixed">
                    <colgroup>
                      <col style={{ width: '7%' }} /> {/* Type */}
                      <col style={{ width: '18%' }} /> {/* Description */}
                      <col style={{ width: '12%' }} /> {/* Location */}
                      <col style={{ width: '8%' }} /> {/* Status */}
                      <col style={{ width: '12%' }} /> {/* Submitted By */}
                      <col style={{ width: '13%' }} /> {/* Remarks */}
                      <col style={{ width: '15%' }} /> {/* Actions */}
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Type
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Description
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Location
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Submitted By
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Remarks
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredReports.map((report) => (
                        <tr key={report.id}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{report.type}{report.category && <div className="text-xs">{report.category}</div>}{report.violation_type && <div className="text-xs">{report.violation_type}</div>}</td>
                          <td className="px-3 py-4 text-sm text-gray-500 break-words max-w-xs">{report.description}{report.image_url && (<a href={report.image_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-900 block">View Image</a>)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{report.location}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm"><span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(report.status)}`}>{report.status}</span></td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 break-words max-w-xs">{report.user_id}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 break-words max-w-xs">
                            {editingRemarksId === report.id ? (
                              <div>
                                <textarea
                                  className="w-full rounded border border-gray-300 p-1 text-sm"
                                  value={remarksDraft}
                                  onChange={e => setRemarksDraft(e.target.value)}
                                  rows={2}
                                  placeholder="Leave a note about user activity, moderation, or verification..."
                                />
                                <div className="flex space-x-2 mt-1">
                                  <button
                                    onClick={() => handleSaveRemarks(report.id)}
                                    className="px-2 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelRemarks}
                                    className="px-2 py-1 text-xs rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span>{report.remarks || <span className="italic text-gray-400">No remarks</span>}</span>
                                <button
                                  onClick={() => handleEditRemarks(report)}
                                  className="ml-2 text-xs text-primary-600 hover:underline"
                                  title="Edit remarks"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="space-y-2">
                              <select
                                value={selectedAgency}
                                onChange={(e) => setSelectedAgency(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              >
                                <option value="">Select Agency</option>
                                <option value="ashie23122312@gmail.com">Test Agency</option>
                                <option value="actioncenter@denr.gov.ph">DENR Action Center</option>
                                <option value="aksyonkalikasan@denr.gov.ph">Aksyon Kalikasan</option>
                                <option value="eia@emb.gov.ph">Environmental Impact Assessment</option>
                                <option value="info@llda.gov.ph">Laguna Lake Development Authority</option>
                                <option value="bpld@quezoncity.gov.ph">Quezon City Business Permit</option>
                                <option value="legal.bpld@quezoncity.gov.ph">Quezon City Legal</option>
                                <option value="dbo@quezoncity.gov.ph">Quezon City Building</option>
                                <option value="idpd.cpdd@quezoncity.gov.ph">Quezon City Zoning</option>
                                <option value="bplo@taguig.gov.ph">Taguig Business Permit</option>
                                <option value="lbo@taguig.gov.ph">Taguig Building</option>
                                <option value="cpdo@taguig.gov.ph">Taguig Planning</option>
                                <option value="towertaguig@gmail.com">Taguig Environmental</option>
                              </select>
                              <button
                                onClick={() => handleSendEmail(report)}
                                disabled={!selectedAgency || sendingEmail === report.id}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                              >
                                {sendingEmail === report.id ? 'Sending...' : 'Send to Agency'}
                              </button>
                              <select
                                value={report.status}
                                onChange={(e) => handleStatusChange(report.id, e.target.value as any)}
                                disabled={updatingStatus === report.id}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              >
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                              {updatingStatus === report.id && (
                                <span className="text-xs text-gray-500">Updating...</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 
import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { findAppropriateAgency, generateEmailContent, sendEmail } from '../../services/emailService';
import BackupManager from './BackupManager';

interface Report {
  id: string;
  type: 'environmental' | 'regulatory';
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
}

const AdminDashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'done'>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'backup'>('reports');

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const fetchReports = async () => {
    try {
      // Get all reports with user information from the view
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports_with_users')
        .select('*')
        .order('timestamp', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: 'pending' | 'in-progress' | 'done') => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;
      fetchReports();
    } catch (error: any) {
      setError(error.message);
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

  const filteredReports = reports.filter(report => 
    statusFilter === 'all' ? true : report.status === statusFilter
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('reports')}
            className={`${
              activeTab === 'reports'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`${
              activeTab === 'backup'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Backup
          </button>
        </nav>
      </div>

      {activeTab === 'reports' ? (
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            
            <div className="mt-4 flex space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
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
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredReports.map((report) => (
                          <tr key={report.id}>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {report.type}
                              {report.category && <div className="text-xs">{report.category}</div>}
                              {report.violation_type && <div className="text-xs">{report.violation_type}</div>}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="max-w-xs truncate">{report.description}</div>
                              {report.image_url && (
                                <a
                                  href={report.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  View Image
                                </a>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {report.location}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(report.status)}`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {report.user_id}
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
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="done">Done</option>
                                </select>
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
      ) : (
        <BackupManager />
      )}
    </div>
  );
};

export default AdminDashboard; 
import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

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
  status: 'pending' | 'in-progress' | 'resolved';
  timestamp: number;
  user_id: string;
}

const ReportHistory: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Please log in to view your reports');
        }

        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', session.user.id)
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

    fetchReports();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Report History</h2>
      
      {reports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You haven't submitted any reports yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {report.type === 'environmental' ? 'Environmental Violation' : 'City Regulation Compliance'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(report.timestamp)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    report.status
                  )}`}
                >
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
              </div>

              <div className="mt-4">
                {report.type === 'environmental' && report.category && (
                  <p className="text-sm text-gray-600">
                    Category: {report.category.charAt(0).toUpperCase() + report.category.slice(1)}
                  </p>
                )}
                {report.type === 'regulatory' && (
                  <>
                    {report.city && (
                      <p className="text-sm text-gray-600">City: {report.city}</p>
                    )}
                    {report.violationType && (
                      <p className="text-sm text-gray-600">
                        Violation Type: {report.violationType}
                      </p>
                    )}
                  </>
                )}
                <p className="mt-2 text-gray-700">{report.description}</p>
              </div>

              {report.imageUrl && (
                <div className="mt-4">
                  <img
                    src={report.imageUrl}
                    alt="Report evidence"
                    className="max-w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportHistory; 
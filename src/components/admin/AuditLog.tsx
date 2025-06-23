import React, { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';

interface AuditLogEntry {
  id: string;
  report_id: string;
  changed_by: string;
  changed_at: string;
  change_type: string;
  old_data: any;
  new_data: any;
}

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('changed_at', { ascending: false });
        if (error) throw error;
        setLogs(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Log (History Trail)</h2>
      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-gray-500">No audit log entries found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Report ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Changed By</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Change Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">What Changed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                // Compute what changed
                let changes: string[] = [];
                if (log.old_data && log.new_data) {
                  for (const key of Object.keys(log.new_data)) {
                    if (log.old_data[key] !== log.new_data[key]) {
                      changes.push(`${key}: '${log.old_data[key]}' → '${log.new_data[key]}'`);
                    }
                  }
                }
                return (
                  <tr key={log.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{new Date(log.changed_at).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-700">{log.report_id}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{log.changed_by}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{log.change_type}</td>
                    <td className="px-4 py-2 whitespace-pre-line text-sm text-gray-700">
                      {changes.length > 0 ? changes.join('\n') : 'No field changes'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLog; 
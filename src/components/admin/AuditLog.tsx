import React, { useEffect, useState, useMemo } from 'react';
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

  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportId, setReportId] = useState('');
  const [changedBy, setChangedBy] = useState('');
  const [changeType, setChangeType] = useState('');

  // Unique dropdown values
  const uniqueChangedBy = useMemo(() => Array.from(new Set(logs.map(l => l.changed_by).filter(Boolean))), [logs]);
  const uniqueChangeTypes = useMemo(() => Array.from(new Set(logs.map(l => l.change_type).filter(Boolean))), [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Date filter
      const logDate = new Date(log.changed_at);
      const fromOk = !dateFrom || logDate >= new Date(dateFrom);
      const toOk = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');
      // Report ID filter
      const reportIdOk = !reportId || log.report_id.toLowerCase().includes(reportId.toLowerCase());
      // Changed by filter
      const changedByOk = !changedBy || log.changed_by === changedBy;
      // Change type filter
      const changeTypeOk = !changeType || log.change_type === changeType;
      return fromOk && toOk && reportIdOk && changedByOk && changeTypeOk;
    });
  }, [logs, dateFrom, dateTo, reportId, changedBy, changeType]);

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
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-6 dark:text-white">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Audit Log (History Trail)</h2>
        {/* Filter Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full rounded border-gray-300 p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full rounded border-gray-300 p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Report ID</label>
            <input type="text" value={reportId} onChange={e => setReportId(e.target.value)} placeholder="Search by Report ID" className="w-full rounded border-gray-300 p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Changed By</label>
            <select value={changedBy} onChange={e => setChangedBy(e.target.value)} className="w-full rounded border-gray-300 p-2">
              <option value="">All</option>
              {uniqueChangedBy.map(user => <option key={user} value={user}>{user}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Change Type</label>
            <select value={changeType} onChange={e => setChangeType(e.target.value)} className="w-full rounded border-gray-300 p-2">
              <option value="">All</option>
              {uniqueChangeTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
        ) : filteredLogs.length === 0 ? (
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
                {filteredLogs.map((log) => {
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
    </div>
  );
};

export default AuditLog; 
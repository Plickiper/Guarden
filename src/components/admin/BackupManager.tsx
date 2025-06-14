import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

interface Backup {
  id: string;
  created_at: string;
  size: number;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed';
}

const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Create backup record
      const { data: backup, error: backupError } = await supabase
        .from('backups')
        .insert([
          {
            type: 'manual',
            status: 'completed',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (backupError) throw backupError;

      // Export database tables
      const tables = ['reports', 'agency_emails'];
      const backupData: Record<string, any[]> = {};

      // Backup reports
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*');

      if (reportsError) throw reportsError;
      backupData['reports'] = reports || [];

      // Backup agency emails
      const { data: agencyEmails, error: agencyEmailsError } = await supabase
        .from('agency_emails')
        .select('*');

      if (agencyEmailsError) throw agencyEmailsError;
      backupData['agency_emails'] = agencyEmails || [];

      // Upload backup to storage
      const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });

      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(`${backup.id}.json`, backupBlob);

      if (uploadError) throw uploadError;

      setSuccess('Backup created successfully');
      loadBackups();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Download backup file
      const { data, error: downloadError } = await supabase.storage
        .from('backups')
        .download(`${backupId}.json`);

      if (downloadError) throw downloadError;

      // Parse backup data
      const backupData = await data.text();
      const { reports, agency_emails } = JSON.parse(backupData);

      // Restore reports
      if (reports && reports.length > 0) {
        const { error: reportsError } = await supabase
          .from('reports')
          .upsert(reports, { onConflict: 'id' });
        if (reportsError) throw reportsError;
      }

      // Restore agency emails
      if (agency_emails && agency_emails.length > 0) {
        const { error: agencyEmailsError } = await supabase
          .from('agency_emails')
          .upsert(agency_emails, { onConflict: 'id' });
        if (agencyEmailsError) throw agencyEmailsError;
      }

      // Create restore record
      const { error: restoreError } = await supabase
        .from('backups')
        .insert([
          {
            type: 'restore',
            status: 'completed',
            created_at: new Date().toISOString(),
          },
        ]);

      if (restoreError) throw restoreError;

      // Refresh backups list
      await loadBackups();
    } catch (err) {
      console.error('Restore failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('backups')
        .remove([`${backupId}.json`]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('backups')
        .delete()
        .eq('id', backupId);

      if (dbError) throw dbError;

      setSuccess('Backup deleted successfully');
      loadBackups();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Backup Management</h2>
          <button
            onClick={handleManualBackup}
            disabled={loading}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating Backup...' : 'Create Manual Backup'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {backup.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        backup.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {backup.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRestore(backup.id)}
                      disabled={loading}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(backup.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackupManager; 
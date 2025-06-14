import { supabase } from '../config/supabase';

class BackupService {
  private static instance: BackupService;
  private backupInterval: NodeJS.Timeout | null = null;
  private readonly BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_BACKUPS = 10; // Keep last 10 backups
  private lastBackupTime: number = 0;
  private readonly MIN_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes cooldown

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  public async startBackupService() {
    if (this.backupInterval) {
      return; // Service already running
    }

    // Schedule regular backups
    this.backupInterval = setInterval(async () => {
      await this.performBackup();
      await this.cleanupOldBackups();
    }, this.BACKUP_INTERVAL);
  }

  public stopBackupService() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  private async performBackup() {
    try {
      // Check if enough time has passed since last backup
      const now = Date.now();
      if (now - this.lastBackupTime < this.MIN_BACKUP_INTERVAL) {
        console.log('Skipping backup - too soon since last backup');
        return;
      }

      // Create backup record
      const { data: backup, error: backupError } = await supabase
        .from('backups')
        .insert([
          {
            type: 'automatic',
            status: 'completed',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (backupError) throw backupError;

      // Export database tables
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

      this.lastBackupTime = now;
      console.log('Automatic backup completed successfully');
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  }

  private async cleanupOldBackups() {
    try {
      // Get all backups ordered by creation date
      const { data: backups, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Keep only the most recent MAX_BACKUPS
      const backupsToDelete = backups.slice(this.MAX_BACKUPS);

      for (const backup of backupsToDelete) {
        // Delete from storage
        await supabase.storage
          .from('backups')
          .remove([`${backup.id}.json`]);

        // Delete from database
        await supabase
          .from('backups')
          .delete()
          .eq('id', backup.id);
      }

      console.log(`Cleaned up ${backupsToDelete.length} old backups`);
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }
}

export { BackupService }; 
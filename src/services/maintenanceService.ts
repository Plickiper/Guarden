class MaintenanceService {
  private static instance: MaintenanceService;

  private constructor() {}

  public static getInstance(): MaintenanceService {
    if (!MaintenanceService.instance) {
      MaintenanceService.instance = new MaintenanceService();
    }
    return MaintenanceService.instance;
  }

  public isMaintenanceMode(): boolean {
    return process.env.REACT_APP_MAINTENANCE_MODE === 'true';
  }
}

export { MaintenanceService }; 
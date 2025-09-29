import { CohortId } from '@/types/cohort';
import { DataAdapter, CSVDataAdapter } from '@/lib/data-adapter';

export type DataSourceType = 'csv' | 'mongodb' | 'storacha';

export class DataService {
  private adapters: Map<DataSourceType, DataAdapter>;
  private currentAdapter: DataSourceType;
  private fallbackOrder: DataSourceType[] = ['csv', 'mongodb', 'storacha'];

  constructor(defaultAdapter: DataSourceType = 'csv') {
    this.adapters = new Map();
    this.currentAdapter = defaultAdapter;
    
    // Initialize all adapters
    this.adapters.set('csv', new CSVDataAdapter());
    // this.adapters.set('mongodb', new MongoDBDataAdapter());
    // this.adapters.set('storacha', new StorachaDataAdapter());
  }

  async loadCohortData(cohortId: CohortId): Promise<string> {
    const adapter = this.adapters.get(this.currentAdapter);
    
    if (!adapter) {
      throw new Error(`Adapter not found: ${this.currentAdapter}`);
    }

    try {
      console.log(`DataService: Using ${this.currentAdapter} adapter for cohort ${cohortId}`);
      return await adapter.loadCohortData(cohortId);
    } catch (error) {
      console.warn(`Primary adapter ${this.currentAdapter} failed:`, error);
      
      // Try fallback adapters
      return await this.tryFallbackAdapters(cohortId);
    }
  }

  private async tryFallbackAdapters(cohortId: CohortId): Promise<string> {
    const fallbacks = this.fallbackOrder.filter(adapter => adapter !== this.currentAdapter);
    
    for (const adapterType of fallbacks) {
      const adapter = this.adapters.get(adapterType);
      if (!adapter) continue;

      try {
        console.log(`DataService: Trying fallback adapter: ${adapterType} for cohort ${cohortId}`);
        
        // Check if adapter is available
        if (adapter.validateConnection) {
          const isValid = await adapter.validateConnection();
          if (!isValid) {
            console.warn(`Fallback adapter ${adapterType} validation failed`);
            continue;
          }
        }

        const data = await adapter.loadCohortData(cohortId);
        console.log(`DataService: Successfully loaded data using fallback adapter: ${adapterType}`);
        return data;
      } catch (error) {
        console.warn(`Fallback adapter ${adapterType} failed:`, error);
        continue;
      }
    }

    throw new Error(`All data adapters failed for cohort ${cohortId}`);
  }

  // Switch primary adapter
  switchAdapter(adapter: DataSourceType): void {
    if (!this.adapters.has(adapter)) {
      throw new Error(`Adapter not available: ${adapter}`);
    }
    
    console.log(`DataService: Switching from ${this.currentAdapter} to ${adapter}`);
    this.currentAdapter = adapter;
  }

  getCurrentAdapter(): DataSourceType {
    return this.currentAdapter;
  }

  async checkAdapterHealth(): Promise<Record<DataSourceType, boolean>> {
    const health: Record<DataSourceType, boolean> = {} as Record<DataSourceType, boolean>;
    
    for (const [type, adapter] of this.adapters) {
      try {
        if (adapter.validateConnection) {
          health[type] = await adapter.validateConnection();
        } else {
          health[type] = true; // Assume healthy if no validation method
        }
      } catch {
        health[type] = false;
      }
    }
    
    return health;
  }
}

// Singleton instance
export const dataService = new DataService('csv');

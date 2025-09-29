import { EngagementData } from '@/types/dashboard';
import { CohortId } from '@/types/cohort';

// Base adapter interface
export interface DataAdapter {
  loadCohortData(cohortId: CohortId): Promise<string>;
  validateConnection?(): Promise<boolean>;
  getAdapterName(): string;
}

// CSV Adapter (current implementation)
export class CSVDataAdapter implements DataAdapter {
  getAdapterName(): string {
    return 'csv';
  }

  async loadCohortData(cohortId: CohortId): Promise<string> {
    const filenames = {
      '1': 'Weekly Engagement Survey Breakdown (4).csv',
      '2': 'Cohort 2 Weekly Engagement Survey Raw Dataset.csv'
    };
    
    const filePath = `/data/cohort-${cohortId}/${filenames[cohortId]}`;
    
    try {
      console.log(`CSV Adapter: Loading data for cohort ${cohortId} from ${filePath}`);
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV for cohort ${cohortId}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error(`CSV Adapter error for cohort ${cohortId}:`, error);
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Test connection by trying to fetch cohort-2 data (current default)
      const response = await fetch('/data/cohort-2/Cohort 2 Weekly Engagement Survey Raw Dataset.csv', { 
        method: 'HEAD' 
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// // MongoDB Adapter (future implementation)
// export class MongoDBDataAdapter implements DataAdapter {
//   getAdapterName(): string {
//     return 'mongodb';
//   }

//   async loadCohortData(cohortId: CohortId): Promise<string> {
//     try {
//       console.log(`MongoDB Adapter: Loading data for cohort ${cohortId}`);
//       const collectionMap = {
//         '1': 'cohort1',
//         '2': 'cohort2'
//       };
      
//       const response = await fetch(`/api/cohort/${collectionMap[cohortId]}`);
      
//       if (!response.ok) {
//         throw new Error(`Failed to fetch MongoDB data for cohort ${cohortId}: ${response.statusText}`);
//       }
      
//       const jsonData = await response.json();
      
//       // Convert JSON to CSV format for compatibility with existing processing
//       return this.jsonToCsv(jsonData);
//     } catch (error) {
//       console.error(`MongoDB Adapter error for cohort ${cohortId}:`, error);
//       throw error;
//     }
//   }

//   async validateConnection(): Promise<boolean> {
//     try {
//       const response = await fetch('/api/health/mongodb');
//       return response.ok;
//     } catch {
//       return false;
//     }
//   }

//   private jsonToCsv(data: any[]): string {
//     if (!data || data.length === 0) return '';
    
//     const headers = Object.keys(data[0]);
//     const csvHeaders = headers.join(',');
//     const csvRows = data.map(row => 
//       headers.map(header => {
//         const value = row[header] || '';
//         // Escape commas and quotes
//         return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
//           ? `"${value.replace(/"/g, '""')}"` 
//           : value;
//       }).join(',')
//     );
    
//     return [csvHeaders, ...csvRows].join('\n');
//   }
// }

// // Storacha Adapter (future implementation)
// export class StorachaDataAdapter implements DataAdapter {
//   getAdapterName(): string {
//     return 'storacha';
//   }

//   async loadCohortData(cohortId: CohortId): Promise<string> {
//     try {
//       console.log(`Storacha Adapter: Loading data for cohort ${cohortId}`);
      
//       // Future Storacha implementation
//       // const storachaClient = await this.getStorachaClient();
//       // const data = await storachaClient.retrieve(`pldg-dashboard/cohort-${cohortId}/engagement-data`);
//       // return data;
      
//       throw new Error('Storacha adapter not yet implemented');
//     } catch (error) {
//       console.error(`Storacha Adapter error for cohort ${cohortId}:`, error);
//       throw error;
//     }
//   }

//   async validateConnection(): Promise<boolean> {
//     // Future Storacha connection validation
//     return false;
//   }
// }

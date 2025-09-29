"use client";

import * as React from 'react';
import { ProcessedData, EngagementData } from '@/types/dashboard';
import { createContext, useContext, useState, useEffect } from 'react';
import { CohortId, COHORT_DATA } from '@/types/cohort';
import { loadCohortData, processData } from '@/lib/data-processing';
import { trackCohortUsage } from '@/lib/analytics';
import { dataService, DataSourceType } from '@/lib/data-service';
import Papa from 'papaparse';

interface DashboardSystemContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  lastUpdated: string;
  isFetching: boolean;
  refresh: () => Promise<void>;
  selectedCohort: CohortId;
  setSelectedCohort: (cohort: CohortId) => void;
  
  // New adapter-related properties
  currentAdapter: DataSourceType;
  switchAdapter: (adapter: DataSourceType) => void;
  adapterHealth: Record<DataSourceType, boolean>;
  refreshAdapterHealth: () => Promise<void>;
}

interface CachedData {
  data: ProcessedData;
  timestamp: number;
}

export const DashboardSystemContext = createContext<DashboardSystemContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export function DashboardSystemProvider({ children }: { children: React.ReactNode }) {
  const [selectedCohort, setSelectedCohort] = useState<CohortId>('2');
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [isFetching, setIsFetching] = useState(false);
  
  // New adapter-related state
  const [currentAdapter, setCurrentAdapter] = useState<DataSourceType>('csv');
  const [adapterHealth, setAdapterHealth] = useState<Record<DataSourceType, boolean>>({
    csv: true,
    mongodb: false,
    storacha: false
  });

  // Add cache ref
  const dataCache = React.useRef<Record<string, CachedData>>({});

  const loadCohortDataWithCache = async (cohortId: CohortId) => {
    const cacheKey = `${cohortId}_${currentAdapter}`;
    const cached = dataCache.current[cacheKey];
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached data for cohort ${cohortId} (${currentAdapter})`);
      trackCohortUsage(cohortId, 'view', {
        activeContributors: cached.data.activeContributors,
        totalContributions: cached.data.totalContributions,
        engagementRate: cached.data.programHealth.engagementRate
      });
      return cached.data;
    }

    try {
      setIsFetching(true);
      const csvText = await loadCohortData(cohortId);

      return new Promise<ProcessedData>((resolve, reject) => {
        Papa.parse<EngagementData>(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          complete: (results) => {
            const processedData = processData(results.data, null, cohortId);
            dataCache.current[cacheKey] = {
              data: processedData,
              timestamp: now
            };

            // Track cohort data load
            trackCohortUsage(cohortId, 'refresh', {
              activeContributors: processedData.activeContributors,
              totalContributions: processedData.totalContributions,
              engagementRate: processedData.programHealth.engagementRate
            });

            resolve(processedData);
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error(`Error loading cohort ${cohortId} data:`, error);
      throw error;
    } finally {
      setIsFetching(false);
    }
  };

  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const freshData = await loadCohortDataWithCache(selectedCohort);
      setData(freshData);
      setLastUpdated(new Date().toISOString());
      setIsError(false);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setIsError(true);
      setError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Track cohort switches
  const handleCohortChange = (newCohortId: CohortId) => {
    trackCohortUsage(newCohortId, 'switch');
    setSelectedCohort(newCohortId);
  };

  // Handle adapter switching
  const switchAdapter = (adapter: DataSourceType) => {
    console.log(`Switching to ${adapter} adapter`);
    dataService.switchAdapter(adapter);
    setCurrentAdapter(adapter);
    
    // Clear cache when switching adapters
    dataCache.current = {};
    
    // Refresh data with new adapter
    refresh();
  };

  // Check adapter health
  const refreshAdapterHealth = async () => {
    try {
      const health = await dataService.checkAdapterHealth();
      setAdapterHealth(health);
      console.log('Adapter health check:', health);
    } catch (error) {
      console.error('Failed to check adapter health:', error);
    }
  };

  // Load data when cohort changes
  useEffect(() => {
    refresh();
  }, [selectedCohort]);

  // Initial adapter health check
  useEffect(() => {
    refreshAdapterHealth();
  }, []);

  // Update current adapter state when service changes
  useEffect(() => {
    setCurrentAdapter(dataService.getCurrentAdapter());
  }, []);

  return (
    <DashboardSystemContext.Provider value={{
      data,
      isLoading,
      isError,
      error,
      refresh,
      lastUpdated,
      isFetching,
      selectedCohort,
      setSelectedCohort: handleCohortChange,
      currentAdapter,
      switchAdapter,
      adapterHealth,
      refreshAdapterHealth
    }}>
      {children}
    </DashboardSystemContext.Provider>
  );
}

export function useDashboardSystemContext() {
  const context = React.useContext(DashboardSystemContext);
  if (!context) {
    throw new Error('useDashboardSystemContext must be used within a DashboardSystemProvider');
  }
  return context;
}

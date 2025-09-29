'use client';

import React, { useMemo } from 'react';
import { useDashboardSystemContext } from '@/context/DashboardSystemContext';
import ExecutiveSummary from './ExecutiveSummary';
import { ActionableInsights } from './ActionableInsights';
import EngagementChart from './EngagementChart';
import TechnicalProgressChart from './TechnicalProgressChart';
import { TechPartnerChart } from './TechPartnerChart';
import TopPerformersTable from './TopPerformersTable';
import { LoadingSpinner } from '../ui/loading';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, Database, FileText, Cloud } from 'lucide-react';
import { enhanceTechPartnerData } from '@/lib/utils';
import { CohortSelector } from './CohortSelector';
import { COHORT_DATA } from '@/types/cohort';

export default function DeveloperEngagementDashboard() {
  const {
    data: processedData,
    isLoading,
    isError,
    error,
    refresh,
    lastUpdated,
    isFetching,
    selectedCohort,
    setSelectedCohort,
    currentAdapter,
    switchAdapter,
    adapterHealth
  } = useDashboardSystemContext();

  const enhancedTechPartnerData = useMemo(() =>
    processedData?.techPartnerPerformance && processedData?.rawEngagementData
      ? enhanceTechPartnerData(processedData.techPartnerPerformance, processedData.rawEngagementData)
      : [],
    [processedData?.techPartnerPerformance, processedData?.rawEngagementData]
  );

  const getAdapterIcon = (adapter: string) => {
    switch (adapter) {
      case 'csv': return <FileText className="w-4 h-4" />;
      case 'mongodb': return <Database className="w-4 h-4" />;
      case 'storacha': return <Cloud className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <LoadingSpinner />
        <span className="ml-2 mt-2">Loading cohort data...</span>
      </div>
    );
  }

  if (isError || !processedData) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-4 text-center text-red-600">
          Error loading data: {error || 'No data available'}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mt-4 mx-auto block"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <header className="mb-8 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">PLDG Developer Engagement</h1>
            <p className="mt-2 text-indigo-100">
              {COHORT_DATA[selectedCohort].name} - Real-time insights and engagement metrics
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Cohort Selector */}
            <CohortSelector
              selectedCohort={selectedCohort}
              onCohortChange={setSelectedCohort}
            />

            {/* Data Source Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
              {getAdapterIcon(currentAdapter)}
              <span className="text-sm text-white/90 capitalize">{currentAdapter}</span>
              <div className={`w-2 h-2 rounded-full ${adapterHealth[currentAdapter] ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <span className="text-sm text-indigo-200">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isFetching}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
                />
                <span className="text-xs">Refresh Data</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Adapter Switch Controls (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 flex gap-2">
            {(['csv', 'mongodb', 'storacha'] as const).map((adapter) => (
              <Button
                key={adapter}
                variant={currentAdapter === adapter ? "default" : "outline"}
                size="sm"
                onClick={() => switchAdapter(adapter)}
                disabled={!adapterHealth[adapter]}
                className="flex items-center gap-1 text-xs"
              >
                {getAdapterIcon(adapter)}
                {adapter.toUpperCase()}
                {!adapterHealth[adapter] && <span className="text-red-400">●</span>}
              </Button>
            ))}
          </div>
        )}
      </header>

      {/* Dashboard Content */}
      <div className="space-y-8">
        {/* Executive Summary */}
        <div className="bg-white rounded-lg shadow-md">
          <ExecutiveSummary data={processedData} />
        </div>

        {/* Action Items */}
        <ActionableInsights data={processedData} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EngagementChart data={processedData.engagementTrends} />
          <TechnicalProgressChart
            data={processedData.technicalProgress}
            githubData={{
              inProgress: processedData.issueMetrics[0]?.open || 0,
              done: processedData.issueMetrics[0]?.closed || 0,
            }}
          />
        </div>

        {/* Tech Partner Overview */}
        <TechPartnerChart data={enhancedTechPartnerData} />

        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPerformersTable data={processedData.topPerformers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

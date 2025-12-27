
export interface AppFunction {
  id: string;
  appName: string;
  functionName: string;
  path: string;
  landingPage: string;
  exampleQueries: string[];
}

export interface AnalysisResult {
  isDefined: boolean;
  matchScore: number;
  matchedFunction?: AppFunction;
  reasoning: string;
  suggestedImprovement?: string;
}

export interface SearchRecord {
  id: string;
  query: string;
  timestamp: number;
  result: AnalysisResult;
}

export type ViewType = 'dashboard' | 'management' | 'analysis' | 'batchAnalysis';

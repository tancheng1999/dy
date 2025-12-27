
import React, { useState, useMemo } from 'react';
import { AppFunction, AnalysisResult, SearchRecord } from '../types';
import { analyzeQuery } from '../services/geminiService';

interface AISearchProps {
  functions: AppFunction[];
  history: SearchRecord[];
  onAddRecord: (record: SearchRecord) => void;
  onClearHistory: () => void;
}

export const AISearch: React.FC<AISearchProps> = ({ functions, history, onAddRecord, onClearHistory }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);

  // Filter for records from today (last 24 hours)
  const todayRecords = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return history.filter(r => r.timestamp > oneDayAgo);
  }, [history]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setCurrentResult(null);
    try {
      const analysis = await analyzeQuery(query, functions);
      setCurrentResult(analysis);
      
      // Add to history
      onAddRecord({
        id: Math.random().toString(36).substr(2, 9),
        query,
        timestamp: Date.now(),
        result: analysis
      });
    } catch (err) {
      alert('AI 判研请求失败，请检查 API Key 配置或网络连接。');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in zoom-in-95 duration-500 pb-20">
      {/* Search Input Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-900">智能判研中心</h3>
          <p className="text-slate-500 mt-2">输入用户的新需求，AI 将为您检索该功能是否已有定义</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative group">
            <textarea
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all text-lg font-medium resize-none shadow-inner"
              placeholder="例如：'打开抖音扫一扫'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <div className="absolute right-4 bottom-4 flex gap-2">
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
                title="清除输入"
              >
                🗑️
              </button>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className={`flex items-center gap-2 px-8 py-2 rounded-lg font-bold shadow-lg transition-all ${
                  loading 
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    AI 识别中...
                  </>
                ) : (
                  <>
                    <span>🚀</span> 开启判研
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {loading && (
          <div className="mt-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
          </div>
        )}

        {currentResult && (
          <div className="mt-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <ResultCard result={currentResult} />
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <span>🕒</span> 今日研判记录
            <span className="text-xs font-normal text-slate-400 ml-2">仅显示 24 小时内记录</span>
          </h4>
          <button 
            onClick={onClearHistory}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            🗑️ 清空历史
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {todayRecords.length > 0 ? (
            todayRecords.map((record) => (
              <details key={record.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-all">
                <summary className="p-4 flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-xs font-mono text-slate-400">{formatTime(record.timestamp)}</span>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-md">"{record.query}"</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      record.result.isDefined ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {record.result.isDefined ? '已定义' : '新功能'}
                    </span>
                    <span className="text-slate-300 group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="p-6 pt-0 border-t border-slate-50">
                   <ResultCard result={record.result} compact />
                </div>
              </details>
            ))
          ) : (
            <div className="text-center py-12 bg-white/50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 text-sm italic">暂无今日研判记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for rendering analysis result
const ResultCard: React.FC<{ result: AnalysisResult; compact?: boolean }> = ({ result, compact }) => (
  <div className={`p-1 rounded-2xl ${result.isDefined ? 'bg-emerald-500' : 'bg-orange-500'}`}>
    <div className={`bg-white rounded-[14px] ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`${compact ? 'w-10 h-10 text-xl' : 'w-14 h-14 text-3xl'} rounded-full flex items-center justify-center shadow-sm ${
            result.isDefined ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
          }`}>
            {result.isDefined ? '✅' : '❓'}
          </div>
          <div>
            <h4 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-slate-900`}>
              {result.isDefined ? '功能已存在' : '发现潜在新功能'}
            </h4>
            {!compact && (
              <p className="text-sm text-slate-500">
                判研置信度: <span className="font-bold">{(result.matchScore * 100).toFixed(1)}%</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-6`}>
        <div className="space-y-3">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">判研逻辑</h5>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
            {result.reasoning}
          </div>
        </div>

        <div className="space-y-3">
          {result.isDefined && result.matchedFunction ? (
            <>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">匹配详情</h5>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-blue-600 font-bold uppercase">App</span>
                  <span className="text-xs font-bold text-slate-800">{result.matchedFunction.appName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-100/50 pt-2">
                  <span className="text-[10px] text-blue-600 font-bold uppercase">功能</span>
                  <span className="text-xs font-bold text-slate-800">{result.matchedFunction.functionName}</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-blue-100/50 pt-2">
                  <span className="text-[10px] text-blue-600 font-bold uppercase">直达路径</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white/50 p-1.5 rounded break-all leading-tight">
                    {result.matchedFunction.path}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-t border-blue-100/50 pt-2">
                  <span className="text-[10px] text-blue-600 font-bold uppercase">示例 Query</span>
                  <div className="flex flex-wrap gap-1">
                    {result.matchedFunction.exampleQueries.slice(0, 3).map((q, i) => (
                      <span key={i} className="text-[9px] bg-white/70 px-1.5 py-0.5 rounded-full border border-blue-100 text-slate-600">
                        "{q}"
                      </span>
                    ))}
                    {result.matchedFunction.exampleQueries.length > 3 && (
                      <span className="text-[9px] text-slate-400 italic">...等</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">优化建议</h5>
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg">
                 <p className="text-xs text-slate-700 italic">"{result.suggestedImprovement || '该功能语义与现有定义差异较大。'}"</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);

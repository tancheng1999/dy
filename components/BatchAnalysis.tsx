
import React, { useState, useRef } from 'react';
import { AppFunction, SearchRecord, AnalysisResult } from '../types';
import { analyzeQuery } from '../services/geminiService';
import * as XLSX from 'xlsx';

interface BatchAnalysisProps {
  functions: AppFunction[];
  onAddRecords: (records: SearchRecord[]) => void;
}

interface BatchItem {
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: AnalysisResult;
}

export const BatchAnalysis: React.FC<BatchAnalysisProps> = ({ functions, onAddRecords }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    let queries: string[] = [];

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (fileExt === 'txt') {
          const text = event.target?.result as string;
          queries = text.split('\n').map(s => s.trim()).filter(Boolean);
        } else if (fileExt === 'csv' || fileExt === 'xlsx' || fileExt === 'xls') {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          // Flatten first column
          queries = json.map(row => String(row[0] || '').trim()).filter(Boolean);
        } else if (fileExt === 'json') {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            queries = json.map(item => typeof item === 'string' ? item : (item.query || '')).filter(Boolean);
          }
        }

        if (queries.length > 0) {
          setItems(queries.map(q => ({ query: q, status: 'pending' })));
          setProgress(0);
        } else {
          alert('未检测到有效的查询内容。');
        }
      } catch (err) {
        alert('解析文件失败。');
      }
    };

    if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startBatchProcess = async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);
    const newRecords: SearchRecord[] = [];
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      updatedItems[i].status = 'processing';
      setItems([...updatedItems]);

      try {
        const result = await analyzeQuery(updatedItems[i].query, functions);
        updatedItems[i].status = 'completed';
        updatedItems[i].result = result;
        
        newRecords.push({
          id: Math.random().toString(36).substr(2, 9),
          query: updatedItems[i].query,
          timestamp: Date.now(),
          result
        });
      } catch (err) {
        updatedItems[i].status = 'error';
      }

      setProgress(Math.round(((i + 1) / updatedItems.length) * 100));
      setItems([...updatedItems]);
      // Small delay to avoid aggressive rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
    onAddRecords(newRecords);
    alert(`批量处理完成！成功处理 ${newRecords.length} 条记录。`);
  };

  const downloadResults = () => {
    const data = items.map(item => ({
      '查询Query': item.query,
      '判定结果': item.result ? (item.result.isDefined ? '已定义' : '新功能') : '未处理',
      '匹配置信度': item.result ? `${(item.result.matchScore * 100).toFixed(1)}%` : '-',
      '匹配App': item.result?.matchedFunction?.appName || '-',
      '匹配功能点': item.result?.matchedFunction?.functionName || '-',
      '研判理由': item.result?.reasoning || '-',
      '建议': item.result?.suggestedImprovement || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "研判结果");
    XLSX.writeFile(wb, "batch_audit_results.xlsx");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">批量研判工具</h3>
            <p className="text-slate-500 mt-2">支持上传包含多条 Query 的文件进行自动化批量比对</p>
          </div>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.csv,.xlsx,.xls,.json" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
            >
              📂 上传待审文件
            </button>
            {items.length > 0 && !isProcessing && (
              <button 
                onClick={startBatchProcess}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
              >
                🚀 开始批量研判
              </button>
            )}
            {items.some(i => i.status === 'completed') && (
              <button 
                onClick={downloadResults}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg transition-all"
              >
                📥 导出报表
              </button>
            )}
          </div>
        </div>

        {items.length > 0 ? (
          <div className="space-y-6">
            {/* Progress Area */}
            {isProcessing && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div className="flex justify-between text-sm font-bold text-blue-700">
                  <span>正在处理中...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-500 italic">
                  正在通过 Gemini AI 分析语义，请保持页面开启...
                </p>
              </div>
            )}

            {/* Table Area */}
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-4 py-3 w-12">#</th>
                    <th className="px-4 py-3">用户待审 Query</th>
                    <th className="px-4 py-3 w-32">当前状态</th>
                    <th className="px-4 py-3 w-48">研判结论</th>
                    <th className="px-4 py-3 w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className={`text-sm transition-colors ${item.status === 'processing' ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">"{item.query}"</td>
                      <td className="px-4 py-3">
                        {item.status === 'pending' && <span className="text-slate-400 flex items-center gap-1">⚪ 等待中</span>}
                        {item.status === 'processing' && (
                          <span className="text-blue-500 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                            研判中
                          </span>
                        )}
                        {item.status === 'completed' && <span className="text-emerald-500 font-bold flex items-center gap-1">✅ 已完成</span>}
                        {item.status === 'error' && <span className="text-red-500 font-bold flex items-center gap-1">❌ 失败</span>}
                      </td>
                      <td className="px-4 py-3">
                        {item.result ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.result.isDefined ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                              {item.result.isDefined ? '已定义' : '新功能'}
                            </span>
                            <span className="text-[10px] text-slate-400">Score: {(item.result.matchScore * 100).toFixed(0)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.result && (
                          <button 
                            onClick={() => alert(`【研判理由】\n${item.result?.reasoning}`)}
                            className="text-xs text-blue-600 hover:underline font-bold"
                          >
                            查看详情
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm mb-4">📄</div>
            <p className="text-slate-500 font-medium">暂无待审清单，请先上传文件</p>
            <p className="text-slate-400 text-xs mt-1">支持文本(.txt)逐行读取 或 Excel/CSV 表格读取首列</p>
          </div>
        )}
      </div>
    </div>
  );
};

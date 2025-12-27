
import React, { useState } from 'react';
import { AppFunction } from '../types';

interface FunctionManagementProps {
  functions: AppFunction[];
  onDelete: (id: string) => void;
}

export const FunctionManagement: React.FC<FunctionManagementProps> = ({ functions, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = functions.filter(f => 
    f.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.functionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.exampleQueries.some(q => q.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="搜索App、功能点或Query..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">
          显示 {filtered.length} / {functions.length} 条定义
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-4">App名称</th>
              <th className="px-6 py-4">功能点</th>
              <th className="px-6 py-4">直达路径</th>
              <th className="px-6 py-4">实例Query (Top 2)</th>
              <th className="px-6 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                      {f.appName.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-700">{f.appName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                    {f.functionName}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500 font-mono">{f.path}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {f.exampleQueries.slice(0, 2).map((q, idx) => (
                      <div key={idx} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block mr-1">
                        "{q}"
                      </div>
                    ))}
                    {f.exampleQueries.length > 2 && <span className="text-[10px] text-slate-400 italic">+{f.exampleQueries.length - 2} more</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onDelete(f.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-bold p-1 hover:bg-red-50 rounded transition-all"
                    title="删除定义"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  未找到匹配的功能定义
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

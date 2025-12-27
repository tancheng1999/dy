
import React, { useRef, useState } from 'react';
import { AppFunction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface DashboardProps {
  functions: AppFunction[];
  onUpload: (funcs: AppFunction[]) => void;
  onNavigate: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ functions, onUpload, onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const stats = [
    { label: '已定义功能总数', value: functions.length, icon: '📦', color: 'bg-blue-500' },
    { label: '覆盖App数量', value: new Set(functions.map(f => f.appName)).size, icon: '📱', color: 'bg-emerald-500' },
    { label: '昨日查询量', value: 124, icon: '⚡', color: 'bg-purple-500' },
    { label: 'AI判研准确率', value: '98.5%', icon: '🎯', color: 'bg-orange-500' },
  ];

  const chartData = Object.entries(
    functions.reduce((acc, f) => {
      acc[f.appName] = (acc[f.appName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count: count as number }))
   .sort((a, b) => b.count - a.count)
   .slice(0, 8);

  const processRawData = (data: any[]): AppFunction[] => {
    return data.map((item: any) => {
      let queries: string[] = [];
      const qVal = item.exampleQueries || item['实例query'] || item['Query'] || item['Example Queries'];
      
      if (Array.isArray(qVal)) {
        queries = qVal;
      } else if (typeof qVal === 'string') {
        queries = qVal.split(/[;；,，\n]/).map((s: string) => s.trim()).filter(Boolean);
      } else if (qVal) {
        queries = [String(qVal)];
      }

      return {
        id: item.id || Math.random().toString(36).substr(2, 9),
        appName: item.appName || item['App名称'] || item['App Name'] || item['App'] || 'Unknown App',
        functionName: item.functionName || item['功能点名称'] || item['功能点'] || item['Function Name'] || 'Unknown Function',
        path: item.path || item['功能直达路径'] || item['路径'] || item['Path'] || '',
        landingPage: item.landingPage || item['最终落地页'] || item['落地页'] || item['Landing Page'] || '',
        exampleQueries: queries
      };
    });
  };

  const parseHtmlTable = (html: string): AppFunction[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) return [];

    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(el => el.textContent?.trim() || '');
    const data = rows.slice(1).map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const obj: any = {};
      headers.forEach((header, i) => {
        if (cells[i]) {
          obj[header] = cells[i].textContent?.trim() || '';
        }
      });
      return obj;
    });

    return processRawData(data);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            onUpload(processRawData(json));
            alert('JSON 文件导入成功！');
          }
        } catch (err) {
          alert('解析失败，请确保上传有效的JSON文件。');
        }
      };
      reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          onUpload(processRawData(jsonData));
          alert(`Excel 文件导入成功！`);
        } catch (err) {
          alert('解析 Excel 失败。');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExt === 'html' || fileExt === 'htm') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const html = event.target?.result as string;
        const results = parseHtmlTable(html);
        if (results.length > 0) {
          onUpload(results);
          alert(`HTML 表格导入成功！共 ${results.length} 条数据。`);
        } else {
          alert('未能从 HTML 文件中找到有效的表格数据。');
        }
      };
      reader.readAsText(file);
    } else {
      alert('仅支持 .json, .xlsx, .xls, .html 格式的文件。');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlImport = async () => {
    if (!webUrl) return;
    setIsFetching(true);
    try {
      // Note: In a real app, this might need a proxy for CORS.
      // We'll try to fetch, and if it fails, suggest pasting HTML.
      const response = await fetch(webUrl).catch(() => null);
      if (!response) {
        throw new Error('CORS error or network unreachable. Please try pasting the HTML source instead.');
      }
      const html = await response.text();
      const results = parseHtmlTable(html);
      if (results.length > 0) {
        onUpload(results);
        alert(`从网页导入成功！共 ${results.length} 条数据。`);
        setIsWebModalOpen(false);
        setWebUrl('');
      } else {
        alert('该页面未检测到符合格式的表格数据。');
      }
    } catch (err: any) {
      alert(err.message || '抓取失败。');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-white text-2xl`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span>📊</span> 各App功能分布 Top 8
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl">
            ☁️
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">同步已有定义</h3>
            <p className="text-sm text-slate-500 mt-2">
              上传清单文件 (JSON / Excel / HTML)，<br />或直接从网页地址抓取表格。
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,.xlsx,.xls,.html,.htm"
          />
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>📤</span> 导入本地文件
            </button>
            <button
              onClick={() => setIsWebModalOpen(true)}
              className="w-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>🌐</span> 抓取网页表格
            </button>
          </div>
          <div className="text-[10px] text-slate-400">支持格式: .json, .xlsx, .xls, .html</div>
          <button 
            onClick={onNavigate}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            跳转到判研中心
          </button>
        </div>
      </div>

      {/* Web Import Modal */}
      {isWebModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-900">从网页抓取数据</h4>
              <button onClick={() => setIsWebModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                输入包含功能定义表格的网页 URL。程序将自动解析网页中的首个表格元素。
              </p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">网页地址</label>
                <input
                  type="url"
                  placeholder="https://example.com/app-functions"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3">
                <span className="text-amber-500">⚠️</span>
                <p className="text-[10px] text-amber-700">
                  由于浏览器同源策略 (CORS)，某些网站可能无法直接抓取。如果失败，请保存网页为 .html 文件后通过“导入本地文件”上传。
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setIsWebModalOpen(false)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-100 transition-all"
              >
                取消
              </button>
              <button
                disabled={!webUrl || isFetching}
                onClick={handleUrlImport}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isFetching ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isFetching ? '正在解析...' : '立即抓取'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

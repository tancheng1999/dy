
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FunctionManagement } from './components/FunctionManagement';
import { AISearch } from './components/AISearch';
import { BatchAnalysis } from './components/BatchAnalysis';
import { AppFunction, ViewType, SearchRecord } from './types';

// Mock Initial Data
const INITIAL_DATA: AppFunction[] = [
  {
    id: '1',
    appName: '抖音 (TikTok)',
    functionName: '扫一扫',
    path: '打开抖音-首页-左上角更多-扫一扫',
    landingPage: 'snssdk1128://qrcode',
    exampleQueries: ['打开抖音扫一扫', '使用抖音扫一扫', '抖音怎么扫码']
  },
  {
    id: '2',
    appName: '支付宝 (Alipay)',
    functionName: '收钱码',
    path: '打开支付宝-收钱',
    landingPage: 'alipays://platformapi/startapp?appId=20000056',
    exampleQueries: ['打开支付宝收钱', '我的收款码', '展示支付宝收钱码']
  },
  {
    id: '3',
    appName: '微信 (WeChat)',
    functionName: '朋友圈',
    path: '打开微信-发现-朋友圈',
    landingPage: 'weixin://dl/moments',
    exampleQueries: ['打开微信朋友圈', '看看朋友圈', '我想发个朋友圈']
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [functions, setFunctions] = useState<AppFunction[]>([]);
  const [history, setHistory] = useState<SearchRecord[]>([]);

  useEffect(() => {
    // Load local storage or default
    const savedFunctions = localStorage.getItem('app_functions_db');
    if (savedFunctions) {
      setFunctions(JSON.parse(savedFunctions));
    } else {
      setFunctions(INITIAL_DATA);
    }

    const savedHistory = localStorage.getItem('app_search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_functions_db', JSON.stringify(functions));
  }, [functions]);

  useEffect(() => {
    localStorage.setItem('app_search_history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = (newFunctions: AppFunction[]) => {
    setFunctions(prev => [...prev, ...newFunctions]);
  };

  const deleteFunction = (id: string) => {
    setFunctions(prev => prev.filter(f => f.id !== id));
  };

  const addSearchRecord = (record: SearchRecord) => {
    setHistory(prev => [record, ...prev]);
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空所有研判记录吗？')) {
      setHistory([]);
    }
  };

  return (
    <Layout currentView={view} onViewChange={setView}>
      {view === 'dashboard' && (
        <Dashboard 
          functions={functions} 
          onUpload={handleFileUpload}
          onNavigate={() => setView('analysis')}
        />
      )}
      {view === 'management' && (
        <FunctionManagement 
          functions={functions} 
          onDelete={deleteFunction}
        />
      )}
      {view === 'analysis' && (
        <AISearch 
          functions={functions}
          history={history}
          onAddRecord={addSearchRecord}
          onClearHistory={clearHistory}
        />
      )}
      {view === 'batchAnalysis' && (
        <BatchAnalysis 
          functions={functions}
          onAddRecords={(records) => setHistory(prev => [...records, ...prev])}
        />
      )}
    </Layout>
  );
};

export default App;

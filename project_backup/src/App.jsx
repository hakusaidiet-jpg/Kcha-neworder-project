import React, { useState, useEffect } from 'react';
import Reception from './components/Reception';
import Kitchen from './components/Kitchen';
import { Leaf } from 'lucide-react';

function App() {
  const [view, setView] = useState('reception');

  useEffect(() => {
    // Simple routing based on query param ?view=kitchen
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'kitchen') {
      setView('kitchen');
    }
  }, []);

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-matcha-50">
      {/* Header */}
      <header className="bg-matcha-700 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="w-6 h-6" />
            K-ChaCha Order
          </h1>
          <div className="text-sm bg-matcha-800 px-3 py-1 rounded-full">
            {view === 'reception' ? '受付・注文' : '調理場・管理'}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl">
        {view === 'reception' ? <Reception /> : <Kitchen />}
      </main>

      {/* View Switcher for Demo/Dev convenience */}
      <div className="fixed bottom-2 right-2 opacity-20 hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            const newView = view === 'reception' ? 'kitchen' : 'reception';
            setView(newView);
            const url = new URL(window.location);
            url.searchParams.set('view', newView);
            window.history.pushState({}, '', url);
          }}
          className="bg-gray-800 text-white text-xs px-2 py-1 rounded"
        >
          Switch View
        </button>
      </div>
    </div>
  );
}

export default App;

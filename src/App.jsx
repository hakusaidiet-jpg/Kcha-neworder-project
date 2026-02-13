import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TopMenu from './components/TopMenu';
import OrderScreen from './components/POS/OrderScreen';
import KitchenDisplay from './components/Kitchen/KitchenDisplay';
import SalesDashboard from './components/Dashboard/SalesDashboard';
import ExtrasScreen from './components/Extras/ExtrasScreen';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TopMenu />} />
          <Route path="order" element={<OrderScreen />} />
          <Route path="kitchen" element={<KitchenDisplay />} />
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="extras" element={<ExtrasScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;

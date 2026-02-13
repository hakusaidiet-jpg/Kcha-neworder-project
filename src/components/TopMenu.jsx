import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TopMenu.css';

const TopMenu = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: '売上\n状況', path: '/dashboard', className: 'item-1' },
    { title: '注文\n&\n会計', path: '/order', className: 'item-2' },
    { title: '調理場', path: '/kitchen', className: 'item-3' },
    { title: 'その他', path: '/extras', className: 'item-4' },
  ];

  return (
    <div className="top-menu-wrapper">
      <h1 className="top-menu-title">Kcha-order-pro</h1>
      <div className="top-menu-grid">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className={`menu-item ${item.className}`}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopMenu;

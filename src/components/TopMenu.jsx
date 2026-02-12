import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TopMenu.css';

const TopMenu = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: '注文・会計', path: '/order', className: 'item-1' },
    { title: '調理場', path: '/kitchen', className: 'item-2' },
    { title: '売上管理', path: '/dashboard', className: 'item-3' },
    { title: 'その他', path: '#', className: 'item-4' },
  ];

  return (
    <div className="top-menu-grid">
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => navigate(item.path)}
          className={`menu - item ${item.className} `}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
};

export default TopMenu;

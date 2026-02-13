import React, { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './SalesDashboard.css';

const SalesDashboard = () => {
    const { orders } = useOrders();
    const [expenses, setExpenses] = useState([]);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

    // Filter completed orders for TODAY only
    const completedOrders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return orders.filter(o => {
            const isCompleted = o.status === 'completed';
            const orderDate = o.createdAt;
            return isCompleted && orderDate >= today;
        });
    }, [orders]);

    // Key Stats
    const totalRevenue = useMemo(() => completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [completedOrders]);
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const netProfit = totalRevenue - totalExpenses;

    // Item Breakdown with Units
    const itemStats = useMemo(() => {
        const stats = {
            tea: { name: 'お茶席', count: 0, unit: '席' },
            manju: { name: '紅白饅頭', count: 0, unit: '箱' },
            latte: { name: '抹茶ラテ', count: 0, unit: '杯' },
            latte_topping: { name: 'トッピング', count: 0, unit: '杯' }
        };
        completedOrders.forEach(o => {
            o.items.forEach(item => {
                if (stats[item.id]) {
                    stats[item.id].count += item.quantity;
                }
            });
        });
        return stats;
    }, [completedOrders]);

    // Time Series Data (10:00 - 18:00)
    const graphData = useMemo(() => {
        const data = {};
        for (let i = 10; i <= 18; i++) {
            data[i] = { latte: 0, topping: 0 };
        }

        completedOrders.forEach(o => {
            const h = o.createdAt?.getHours();
            if (h >= 10 && h <= 18 && data[h]) {
                o.items.forEach(i => {
                    if (i.id === 'latte') data[h].latte += i.quantity;
                    if (i.id === 'latte_topping') data[h].topping += i.quantity;
                });
            }
        });
        return data;
    }, [completedOrders]);

    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!newExpense.name || !newExpense.amount) return;
        setExpenses([...expenses, { ...newExpense, amount: parseInt(newExpense.amount), id: Date.now() }]);
        setNewExpense({ name: '', amount: '' });
    };

    const handleDeleteExpense = (id) => {
        setExpenses(expenses.filter(e => e.id !== id));
    };

    // Premium SVG Graph Generator
    const renderGraph = () => {
        const hours = Object.keys(graphData).map(Number);
        const height = 400;
        const width = 800;
        const paddingLeft = 60;
        const paddingRight = 40;
        const paddingTop = 40;
        const paddingBottom = 60;

        const maxVal = 100; // Fixed max cups

        const getX = (hour) => paddingLeft + ((hour - 10) * (width - paddingLeft - paddingRight) / (18 - 10));
        const getY = (val) => height - paddingBottom - (Math.min(val, maxVal) * (height - paddingTop - paddingBottom) / maxVal);

        const makePath = (type) => {
            return hours.map((h, i) =>
                `${i === 0 ? 'M' : 'L'} ${getX(h)} ${getY(graphData[h][type])}`
            ).join(' ');
        };

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="premium-graph">
                {/* Background Grid */}
                {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                        <line
                            x1={paddingLeft} y1={getY(val)} x2={width - paddingRight} y2={getY(val)}
                            stroke="#e0e0e0" strokeDasharray="5,5"
                        />
                        <text x={paddingLeft - 10} y={getY(val) + 5} textAnchor="end" fontSize="14" fill="#666">{val}</text>
                    </g>
                ))}

                {/* Axes */}
                <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#333" strokeWidth="2" />
                <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#333" strokeWidth="2" />

                {/* X Axis Labels */}
                {hours.map(h => (
                    <text key={h} x={getX(h)} y={height - 20} textAnchor="middle" fontSize="14" fill="#333">{h}:00</text>
                ))}

                {/* Data Lines */}
                <path d={makePath('latte')} fill="none" stroke="#2E2300" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d={makePath('topping')} fill="none" stroke="#DE9501" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {hours.map(h => (
                    <g key={h}>
                        <circle cx={getX(h)} cy={getY(graphData[h].latte)} r="6" fill="#fff" stroke="#2E2300" strokeWidth="3" />
                        <circle cx={getX(h)} cy={getY(graphData[h].topping)} r="6" fill="#fff" stroke="#DE9501" strokeWidth="3" />
                    </g>
                ))}

                {/* Legend */}
                <g transform={`translate(${width - 200}, ${paddingTop})`}>
                    <line x1="0" y1="0" x2="20" y2="0" stroke="#2E2300" strokeWidth="4" />
                    <text x="25" y="5" fontSize="14">抹茶ラテ</text>
                    <line x1="0" y1="25" x2="20" y2="25" stroke="#DE9501" strokeWidth="4" />
                    <text x="25" y="30" fontSize="14">トッピング</text>
                </g>
            </svg>
        );
    };

    return (
        <div className="dashboard-root">
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <h1 className="header-title">売り上げ状況</h1>
                    <div className="header-underline"></div>
                </header>

                <div className="main-layout">
                    {/* Left: Graph Area */}
                    <div className="chart-section">
                        <div className="chart-card">
                            {renderGraph()}
                        </div>

                        <div className="financial-summary">
                            <div className="mini-stat">
                                <span className="label">売上金額</span>
                                <span className="value">¥{totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="mini-stat">
                                <span className="label">経費合計</span>
                                <span className="value">¥{totalExpenses.toLocaleString()}</span>
                            </div>
                            <div className="mini-stat profit">
                                <span className="label">純利益</span>
                                <span className="value">¥{netProfit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats Sidebar */}
                    <aside className="stats-sidebar">
                        <div className="sidebar-card">
                            {Object.values(itemStats).map(item => (
                                <div key={item.name} className="sidebar-item">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-count">
                                        <span className="number">{item.count}</span>
                                        <span className="unit">({item.unit})</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Expense Input Tool in Sidebar */}
                        <div className="expense-tool">
                            <h3>経費入力</h3>
                            <form onSubmit={handleAddExpense} className="expense-form">
                                <input
                                    type="text"
                                    placeholder="項目名"
                                    value={newExpense.name}
                                    onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="金額"
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                />
                                <button type="submit">追加</button>
                            </form>
                            <div className="expense-list-mini">
                                {expenses.map(e => (
                                    <div key={e.id} className="expense-item-mini">
                                        <span>{e.name}: ¥{e.amount}</span>
                                        <button onClick={() => handleDeleteExpense(e.id)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;

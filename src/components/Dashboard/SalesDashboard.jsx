import React, { useMemo, useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './SalesDashboard.css';

const SalesDashboard = () => {
    const { orders } = useOrders();
    const [selectedPoint, setSelectedPoint] = useState(null); // { hour, type, count }

    // Filter completed orders for TODAY only
    const completedOrders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return orders.filter(o => {
            const orderDate = o.createdAt;
            return orderDate >= today;
        });
    }, [orders]);

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

    // Custom Item Breakdown Logic
    const customStats = useMemo(() => {
        const breakdown = {}; // { price: count }
        completedOrders.forEach(o => {
            o.items.forEach(item => {
                if (item.id === 'custom') {
                    const price = item.price || 0;
                    breakdown[price] = (breakdown[price] || 0) + item.quantity;
                }
            });
        });
        // Sort by price descending
        return Object.entries(breakdown)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([price, count]) => ({ price, count }));
    }, [completedOrders]);

    // Time Series Data (10:00 - 18:00)
    const graphData = useMemo(() => {
        const data = {};
        for (let i = 10; i <= 18; i++) {
            data[i] = { latte: 0, topping: 0 };
        }

        completedOrders.forEach(o => {
            const h = o.createdAt?.getHours();
            const y = o.createdAt?.getFullYear();
            const m = (o.createdAt?.getMonth() || 0) + 1;
            const d = o.createdAt?.getDate();
            const isSpecialPeriod = y === 2026 && m === 2 && (d >= 20 && d <= 28);

            // Even if it's the special period, the graph is hardcoded for 10-18
            if ((isSpecialPeriod || (h >= 10 && h <= 18)) && data[h]) {
                o.items.forEach(i => {
                    if (i.id === 'latte') data[h].latte += i.quantity;
                    if (i.id === 'latte_topping') data[h].topping += i.quantity;
                });
            }
        });
        return data;
    }, [completedOrders]);

    // Premium SVG Graph Generator (Enhanced Height)
    const renderGraph = () => {
        const hours = Object.keys(graphData).map(Number);
        const height = 450;
        const width = 800;
        const paddingLeft = 60;
        const paddingRight = 40;
        const paddingTop = 40;
        const paddingBottom = 60;

        const maxVal = 100;

        const getX = (hour) => paddingLeft + ((hour - 10) * (width - paddingLeft - paddingRight) / (18 - 10));
        const getY = (val) => height - paddingBottom - (Math.min(val, maxVal) * (height - paddingTop - paddingBottom) / maxVal);

        const makePath = (type) => {
            return hours.map((h, i) =>
                `${i === 0 ? 'M' : 'L'} ${getX(h)} ${getY(graphData[h][type])}`
            ).join(' ');
        };

        // Grid values: 0, 10, 20... 100
        const gridValues = Array.from({ length: 11 }, (_, i) => i * 10);

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="premium-graph" onClick={() => setSelectedPoint(null)}>
                {/* Background Grid */}
                {gridValues.map(val => (
                    <g key={val}>
                        <line
                            x1={paddingLeft} y1={getY(val)} x2={width - paddingRight} y2={getY(val)}
                            stroke="#e5e5e5" strokeWidth={val % 50 === 0 ? "2" : "1"}
                            strokeDasharray={val % 50 === 0 ? "" : "3,3"}
                        />
                        <text x={paddingLeft - 12} y={getY(val) + 5} textAnchor="end" fontSize="13" fill="#666" fontWeight={val % 50 === 0 ? "bold" : "normal"}>{val}</text>
                    </g>
                ))}

                {/* Axes */}
                <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#333" strokeWidth="2" />
                <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#333" strokeWidth="2" />

                {/* X Axis Labels */}
                {hours.map(h => (
                    <text key={h} x={getX(h)} y={height - 25} textAnchor="middle" fontSize="14" fill="#333" fontWeight="bold">{h}:00</text>
                ))}

                {/* Data Lines - Updated Colors */}
                {/* Latte: Green (#81c784) */}
                <path d={makePath('latte')} fill="none" stroke="#81c784" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Topping: Pink (#f06292) */}
                <path d={makePath('topping')} fill="none" stroke="#f06292" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points with Interaction */}
                {hours.map(h => (
                    <g key={h}>
                        {/* Latte Point */}
                        <circle
                            cx={getX(h)} cy={getY(graphData[h].latte)} r="9"
                            fill="#fff" stroke="#81c784" strokeWidth="3"
                            cursor="pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPoint({ x: getX(h), y: getY(graphData[h].latte), count: graphData[h].latte, label: '抹茶ラテ' });
                            }}
                        />
                        {/* Topping Point */}
                        <circle
                            cx={getX(h)} cy={getY(graphData[h].topping)} r="9"
                            fill="#fff" stroke="#f06292" strokeWidth="3"
                            cursor="pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPoint({ x: getX(h), y: getY(graphData[h].topping), count: graphData[h].topping, label: 'トッピング' });
                            }}
                        />
                    </g>
                ))}

                {/* Tooltip */}
                {selectedPoint && (
                    <g transform={`translate(${selectedPoint.x}, ${selectedPoint.y - 45})`}>
                        <path d="M -30 -30 L 30 -30 L 30 0 L 5 0 L 0 8 L -5 0 L -30 0 Z" fill="#333" />
                        <text x="0" y="-10" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
                            {selectedPoint.count}杯
                        </text>
                    </g>
                )}

                {/* Legend */}
                <g transform={`translate(${width - 180}, ${paddingTop - 10})`}>
                    <rect x="-10" y="-10" width="180" height="70" rx="10" fill="rgba(255,255,255,0.8)" />
                    <line x1="10" y1="15" x2="40" y2="15" stroke="#81c784" strokeWidth="5" />
                    <text x="50" y="20" fontSize="16" fontWeight="bold">抹茶ラテ</text>
                    <line x1="10" y1="45" x2="40" y2="45" stroke="#f06292" strokeWidth="5" />
                    <text x="50" y="50" fontSize="16" fontWeight="bold">トッピング</text>
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

                            {/* Custom Items Breakdown Section */}
                            <div className="custom-breakdown-container">
                                <h3 className="breakdown-title">カスタム注文内訳</h3>
                                <div className="breakdown-list">
                                    {customStats.length > 0 ? (
                                        customStats.map((stat, i) => (
                                            <span key={i} className="breakdown-item">
                                                ¥{stat.price}×{stat.count}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="no-data">データなし</span>
                                    )}
                                </div>
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
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;

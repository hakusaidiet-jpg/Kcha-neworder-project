import React, { useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './SalesDashboard.css';

const SalesDashboard = () => {
    const { orders } = useOrders();

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

    // Premium SVG Graph Generator (Enhanced Height)
    const renderGraph = () => {
        const hours = Object.keys(graphData).map(Number);
        const height = 550; // Increased height
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
            <svg viewBox={`0 0 ${width} ${height}`} className="premium-graph">
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

                {/* Data Lines */}
                <path d={makePath('latte')} fill="none" stroke="#2E2300" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={makePath('topping')} fill="none" stroke="#DE9501" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {hours.map(h => (
                    <g key={h}>
                        <circle cx={getX(h)} cy={getY(graphData[h].latte)} r="7" fill="#fff" stroke="#2E2300" strokeWidth="3" />
                        <circle cx={getX(h)} cy={getY(graphData[h].topping)} r="7" fill="#fff" stroke="#DE9501" strokeWidth="3" />
                    </g>
                ))}

                {/* Legend */}
                <g transform={`translate(${width - 180}, ${paddingTop - 10})`}>
                    <rect x="-10" y="-10" width="180" height="70" rx="10" fill="rgba(255,255,255,0.8)" />
                    <line x1="10" y1="15" x2="40" y2="15" stroke="#2E2300" strokeWidth="5" />
                    <text x="50" y="20" fontSize="16" fontWeight="bold">抹茶ラテ</text>
                    <line x1="10" y1="45" x2="40" y2="45" stroke="#DE9501" strokeWidth="5" />
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

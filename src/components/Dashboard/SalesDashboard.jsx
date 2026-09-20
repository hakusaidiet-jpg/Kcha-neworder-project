import React, { useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './SalesDashboard.css';

const SalesDashboard = () => {
    const { orders } = useOrders();

    // Filter today's completed orders
    const completedOrders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return orders.filter(o => {
            const orderDate = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
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

        // Convert to array
        return Object.entries(data).map(([hour, counts]) => ({
            hour: `${hour}:00`,
            ...counts
        }));
    }, [completedOrders]);

    // Find Max Value for Scaling (min 10)
    const maxVal = useMemo(() => {
        const currentMax = Math.max(
            ...graphData.map(d => Math.max(d.latte, d.topping)),
            0
        );
        return Math.max(currentMax, 10);
    }, [graphData]);

    // SVG Coordinate Helper Functions
    const svgWidth = 650;
    const svgHeight = 280;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };

    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const getX = (index) => {
        return padding.left + (index / (graphData.length - 1)) * chartWidth;
    };

    const getY = (val) => {
        return padding.top + chartHeight - (val / maxVal) * chartHeight;
    };

    const renderGraph = () => {
        const lattePoints = graphData.map((d, i) => `${getX(i)},${getY(d.latte)}`).join(' ');
        const toppingPoints = graphData.map((d, i) => `${getX(i)},${getY(d.topping)}`).join(' ');

        return (
            <div className="custom-chart-wrapper">
                {/* Legend */}
                <div className="chart-legend">
                    <div className="legend-item">
                        <span className="legend-dot dot-latte"></span>
                        <span className="legend-label">抹茶ラテ</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot dot-topping"></span>
                        <span className="legend-label">トッピング</span>
                    </div>
                </div>

                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="dashboard-svg">
                    {/* Background Horizontal Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = padding.top + chartHeight * ratio;
                        const labelValue = Math.round(maxVal * (1 - ratio));
                        return (
                            <g key={idx}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={svgWidth - padding.right}
                                    y2={y}
                                    stroke="#e5e5e5"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    className="axis-label"
                                >
                                    {labelValue}
                                </text>
                            </g>
                        );
                    })}

                    {/* X-Axis Labels */}
                    {graphData.map((d, i) => (
                        <text
                            key={i}
                            x={getX(i)}
                            y={svgHeight - padding.bottom + 25}
                            textAnchor="middle"
                            className="axis-label"
                        >
                            {d.hour}
                        </text>
                    ))}

                    {/* Lines */}
                    <polyline
                        fill="none"
                        stroke="#6B8E23"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={lattePoints}
                    />
                    <polyline
                        fill="none"
                        stroke="#D2B48C"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={toppingPoints}
                    />

                    {/* Data Points */}
                    {graphData.map((d, i) => (
                        <g key={`latte-point-${i}`}>
                            <circle
                                cx={getX(i)}
                                cy={getY(d.latte)}
                                r="4"
                                fill="#fff"
                                stroke="#6B8E23"
                                strokeWidth="2"
                            />
                        </g>
                    ))}
                    {graphData.map((d, i) => (
                        <g key={`topping-point-${i}`}>
                            <circle
                                cx={getX(i)}
                                cy={getY(d.topping)}
                                r="4"
                                fill="#fff"
                                stroke="#D2B48C"
                                strokeWidth="2"
                            />
                        </g>
                    ))}
                </svg>
            </div>
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

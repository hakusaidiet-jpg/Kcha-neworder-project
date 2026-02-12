import React, { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './SalesDashboard.css';

const SalesDashboard = () => {
    const { orders } = useOrders();
    const [expenses, setExpenses] = useState([]);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

    // Filter completed orders
    const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);

    // key stats
    const totalRevenue = useMemo(() => completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [completedOrders]);
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const netProfit = totalRevenue - totalExpenses;

    // Item Breakdown
    const itemCounts = useMemo(() => {
        const counts = { tea: 0, manju: 0, latte: 0, latte_topping: 0 };
        completedOrders.forEach(o => {
            o.items.forEach(item => {
                if (counts[item.id] !== undefined) {
                    counts[item.id] += item.quantity;
                }
            });
        });
        return counts;
    }, [completedOrders]);

    // Time Series Data (Group by Hour)
    const timeSeriesData = useMemo(() => {
        const data = {}; // { "10": 5, "11": 8... }
        // Initialize hours 10:00 to 18:00
        for (let i = 10; i <= 18; i++) data[i] = 0;

        completedOrders.forEach(o => {
            const date = o.createdAt; // Date object from hook
            if (date) {
                const hour = date.getHours();
                if (data[hour] !== undefined) {
                    data[hour] += 1; // Count orders (or items? prompt said "how many cups ordered", let's count orders for now or items?) 
                    // Prompt: "Visualize... how many cups ordered... time vs count"
                    // To be precise, let's count *items* roughly or just orders. Let's count *total items sold* per hour for the graph.
                    // Actually prompt says "Matcha latte normal and topping separated by color".
                    // That implies a multi-line graph.
                }
            }
        });
        return data;
    }, [completedOrders]);

    // Specific Time Series for Graph (Multi-line)
    const graphData = useMemo(() => {
        // Structure: { "10": { latte: 0, topping: 0 }, "11": ... }
        const data = {};
        for (let i = 10; i <= 16; i++) data[i] = { latte: 0, topping: 0 }; // 10:00 - 16:00 (Festival time)

        completedOrders.forEach(o => {
            const h = o.createdAt?.getHours();
            if (data[h]) {
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

    // Simple SVG Graph Generator
    const renderGraph = () => {
        const hours = Object.keys(graphData);
        const height = 300;
        const width = 600;
        const padding = 40;
        const maxVal = Math.max(
            ...Object.values(graphData).map(d => Math.max(d.latte, d.topping)),
            10 // Minimum scale
        );

        const getX = (index) => padding + (index * (width - padding * 2) / (hours.length - 1));
        const getY = (val) => height - padding - (val * (height - padding * 2) / maxVal);

        // Generate path d
        const makePath = (type) => {
            return hours.map((h, i) =>
                `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(graphData[h][type])}`
            ).join(' ');
        };

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="sales-graph">
                {/* Grid & Axis */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeWidth="2" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#333" strokeWidth="2" />

                {/* Labels */}
                {hours.map((h, i) => (
                    <text key={h} x={getX(i)} y={height - 10} textAnchor="middle" fontSize="12">{h}:00</text>
                ))}

                {/* Lines */}
                <path d={makePath('latte')} fill="none" stroke="#81c784" strokeWidth="3" />
                <path d={makePath('topping')} fill="none" stroke="#f06292" strokeWidth="3" />

                {/* Points */}
                {hours.map((h, i) => (
                    <g key={h}>
                        <circle cx={getX(i)} cy={getY(graphData[h].latte)} r="4" fill="#81c784" />
                        <circle cx={getX(i)} cy={getY(graphData[h].topping)} r="4" fill="#f06292" />
                    </g>
                ))}
            </svg>
        );
    };

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">売上管理・収支報告</h1>

            <div className="dashboard-grid">
                {/* Top Row: Cards */}
                <div className="stat-card">
                    <h3>総売上</h3>
                    <p className="stat-value">¥{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>経費</h3>
                    <p className="stat-value expense-text">-¥{totalExpenses.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>純利益</h3>
                    <p className="stat-value profit-text">¥{netProfit.toLocaleString()}</p>
                </div>

                {/* Graph Section */}
                <div className="graph-container">
                    <h3>販売推移 (緑:ラテ / ピンク:トッピング)</h3>
                    {renderGraph()}
                </div>

                {/* Item Breakdown Table */}
                <div className="table-container">
                    <h3>商品別販売数</h3>
                    <table className="data-table">
                        <thead>
                            <tr><th>商品名</th><th>個数</th><th>小計</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>お茶席</td><td>{itemCounts.tea}</td><td>¥{(itemCounts.tea * 700).toLocaleString()}</td></tr>
                            <tr><td>紅白饅頭</td><td>{itemCounts.manju}</td><td>¥{(itemCounts.manju * 500).toLocaleString()}</td></tr>
                            <tr><td>抹茶ラテ</td><td>{itemCounts.latte}</td><td>¥{(itemCounts.latte * 500).toLocaleString()}</td></tr>
                            <tr><td>ラテ(トッピング)</td><td>{itemCounts.latte_topping}</td><td>¥{(itemCounts.latte_topping * 600).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* Expenses Input */}
                <div className="expenses-container">
                    <h3>経費入力 (材料費など)</h3>
                    <form onSubmit={handleAddExpense} className="expense-form">
                        <input
                            type="text"
                            placeholder="項目 (例: 紙コップ代)"
                            value={newExpense.name}
                            onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                            className="expense-input"
                        />
                        <input
                            type="number"
                            placeholder="金額"
                            value={newExpense.amount}
                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                            className="expense-input"
                        />
                        <button type="submit" className="expense-btn">追加</button>
                    </form>
                    <ul className="expense-list">
                        {expenses.map(e => (
                            <li key={e.id}>
                                {e.name}: ¥{e.amount.toLocaleString()}
                                <span className="delete-x" onClick={() => handleDeleteExpense(e.id)}>×</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;

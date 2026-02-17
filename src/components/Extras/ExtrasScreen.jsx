import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { useMemos } from '../../hooks/useMemos';
import './ExtrasScreen.css';

const ExtrasScreen = () => {
    const { orders } = useOrders();
    const { memos, addMemo } = useMemos();
    const [memoText, setMemoText] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showSales, setShowSales] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom of memos
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [memos]);

    // Format timestamp: YY,MM,DD,HH:mm (Line style + year/date/time)
    const formatMemoTime = (date) => {
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yy},${mm},${dd},${hh}:${min}`;
    };

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Calculate Today's Sales (Matches Dashboard Logic)
    const todaysSalesTotal = useMemo(() => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return orders
            .filter(o => {
                const date = o.createdAt;
                return date >= startOfDay;
            })
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [orders]);

    // Hardcoded 2025 Data
    const data2025 = [
        { date: '2025/11/21', latte: 47, topping: 31, total: (47 * 500) + (31 * 600) },
        { date: '2025/11/22', latte: 134, topping: 31, total: (134 * 500) + (31 * 600) },
        { date: '2025/11/23', latte: 131, topping: 50, total: (131 * 500) + (50 * 600) },
        { date: '2025/11/24', latte: 73, topping: 58, total: (73 * 500) + (58 * 600) },
    ];

    // Aggregate Historical Data (Sales by Date and Group by Year)
    const historyDataByYear = useMemo(() => {
        const groups = {};
        orders.filter(o => {
            const h = o.createdAt.getHours();
            return o.status === 'completed' && (h >= 10 && h < 18);
        }).forEach(o => {
            const dateStr = o.createdAt.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const yearStr = o.createdAt.getFullYear().toString();

            if (!groups[dateStr]) groups[dateStr] = { date: dateStr, year: yearStr, latte: 0, topping: 0, total: 0 };

            o.items.forEach(item => {
                if (item.id === 'latte') groups[dateStr].latte += item.quantity;
                if (item.id === 'latte_topping') groups[dateStr].topping += item.quantity;
            });
            groups[dateStr].total += (o.totalAmount || 0);
        });

        // Convert the 2025 hardcoded data to a similar format if not already
        const formatted2025 = data2025.map(d => ({ ...d, year: '2025' }));

        const allData = [...Object.values(groups), ...formatted2025];

        // Filter: ONLY Latte >= 30 AND Topping >= 30
        const filteredData = allData.filter(d => d.latte >= 30 && d.topping >= 30);

        // Group by Year
        const byYear = filteredData.reduce((acc, current) => {
            const year = current.year;
            if (!acc[year]) acc[year] = [];
            acc[year].push(current);
            return acc;
        }, {});

        // Sort dates within years and years descending
        Object.keys(byYear).forEach(y => {
            byYear[y].sort((a, b) => new Date(b.date) - new Date(a.date));
        });

        return Object.entries(byYear).sort((a, b) => b[0] - a[0]); // [[ "2026", [...] ], [ "2025", [...] ]]
    }, [orders]);

    const handleSendMemo = (e) => {
        e.preventDefault();
        if (memoText.trim()) {
            addMemo(memoText);
            setMemoText('');
        }
    };

    const handleSalesDoubleTap = () => {
        const currentHour = new Date().getHours();
        if (currentHour >= 18) {
            setShowSales(prev => !prev);
        } else {
            alert('18:00以降に表示されます');
        }
    };

    const handleSalesTap = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 400; // ms
        if (now - lastTap < DOUBLE_TAP_DELAY) {
            handleSalesDoubleTap();
            setLastTap(0); // Reset after reveal
        } else {
            setLastTap(now);
        }
    };

    return (
        <div className="extras-container">
            <div className="extras-grid">

                <div className="panel sales-panel" onClick={handleSalesTap} style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <h2 className="panel-title sales-title">今日の売り上げ</h2>
                    {showSales ? (
                        <div className="revealed-sales">
                            <div className="revealed-date">{year}年{month}月{day}日</div>
                            <div className="revealed-amount">¥{todaysSalesTotal.toLocaleString()}</div>
                        </div>
                    ) : (
                        <>
                            <div className="date-display">
                                <span className="year">{year}年</span>
                                <div className="month-day">
                                    {month}月 {day}日
                                </div>
                            </div>
                            <div className="amount-display">
                                <span className="currency">¥</span>
                                <span className="amount">****</span>
                            </div>
                        </>
                    )}
                    <div className="dash-line"></div>
                </div>

                {/* 2. Today's Memo Panel */}
                <div className="panel memo-panel">
                    <h2 className="panel-title">今日のメモ</h2>
                    <div className="memo-list" ref={scrollRef}>
                        {memos.map(m => (
                            <div key={m.id} className="memo-item">
                                <span className="memo-time">{formatMemoTime(m.createdAt)}</span>
                                <span className="memo-text">{m.text}</span>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleSendMemo} className="memo-input-form">
                        <input
                            type="text"
                            placeholder="メモを入力..."
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                        />
                        <button type="submit">送信</button>
                    </form>
                </div>

                {/* 3. Past Data Button */}
                <div className="button-area">
                    <button
                        className="past-data-btn"
                        onClick={() => setShowHistory(true)}
                    >
                        過去<br />データ
                    </button>
                </div>
            </div>

            {/* History Overlay */}
            {showHistory && (
                <div className="history-overlay" onClick={() => setShowHistory(false)}>
                    <div className="history-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>過去の売り上げ推移</h3>
                            <button className="close-btn" onClick={() => setShowHistory(false)}>×</button>
                        </div>
                        <div className="history-list">
                            {historyDataByYear.map(([year, records]) => (
                                <div key={year} className="year-section">
                                    <div className="year-header">
                                        <span className="year-label">{year}年</span>
                                        <div className="year-divider"></div>
                                    </div>
                                    <table className="history-table">
                                        <thead>
                                            <tr>
                                                <th>日付</th>
                                                <th>ラテ</th>
                                                <th>トッピング</th>
                                                {/* Amount removed as requested */}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((row) => (
                                                <tr key={row.date}>
                                                    <td className="date-col">{row.date}</td>
                                                    <td className="count-col">{row.latte}杯</td>
                                                    <td className="count-col">{row.topping}杯</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtrasScreen;

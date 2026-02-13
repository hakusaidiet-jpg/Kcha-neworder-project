import React, { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { useMemos } from '../../hooks/useMemos';
import './ExtrasScreen.css';

const ExtrasScreen = () => {
    const { orders } = useOrders();
    const { memos, addMemo } = useMemos();
    const [memoText, setMemoText] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Calculate Today's Sales
    const todaysSalesTotal = useMemo(() => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return orders
            .filter(o => o.status === 'completed' && o.createdAt >= startOfDay)
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [orders]);

    // Aggregate Historical Data (Sales by Date)
    const historyData = useMemo(() => {
        const groups = {};
        orders.filter(o => o.status === 'completed').forEach(o => {
            const dateStr = o.createdAt.toLocaleDateString();
            groups[dateStr] = (groups[dateStr] || 0) + (o.totalAmount || 0);
        });
        return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
    }, [orders]);

    const handleSendMemo = (e) => {
        e.preventDefault();
        if (memoText.trim()) {
            addMemo(memoText);
            setMemoText('');
        }
    };

    return (
        <div className="extras-container">
            <div className="extras-grid">

                {/* 1. Today's Sales Panel */}
                <div className="panel sales-panel">
                    <h2 className="panel-title sales-title">今日の売り上げ</h2>
                    <div className="date-display">
                        <span className="year">{year}年</span>
                        <div className="month-day">
                            {month}月 {day}日
                        </div>
                    </div>
                    <div className="amount-display">
                        <span className="currency">¥</span>
                        <span className="amount">{todaysSalesTotal.toLocaleString()}</span>
                    </div>
                    <div className="dash-line"></div>
                </div>

                {/* 2. Today's Memo Panel */}
                <div className="panel memo-panel">
                    <h2 className="panel-title">今日のメモ</h2>
                    <div className="memo-list">
                        {memos.map(m => (
                            <div key={m.id} className="memo-item">
                                <span className="memo-time">{m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>日付</th>
                                        <th>売上金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyData.map(([date, amount]) => (
                                        <tr key={date}>
                                            <td>{date}</td>
                                            <td>¥{amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtrasScreen;

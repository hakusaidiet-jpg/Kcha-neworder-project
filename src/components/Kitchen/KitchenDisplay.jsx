import React, { useState, useEffect } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './KitchenDisplay.css';

const KitchenDisplay = () => {
    const { orders, updateOrderStatus } = useOrders();
    const [now, setNow] = useState(new Date());
    const [cancelTarget, setCancelTarget] = useState(null); // ID of order to cancel

    // Update timer every second
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter only pending/active orders
    const activeOrders = orders.filter(o => o.status === 'pending');

    const getElapsedTime = (createdAt) => {
        if (!createdAt) return '0:00';
        const diff = Math.floor((now - createdAt) / 1000); // seconds
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleComplete = (id) => {
        // Play sound (placeholder)
        // const audio = new Audio('/sounds/complete.mp3');
        // audio.play().catch(e => console.log('Audio play failed', e));
        updateOrderStatus(id, 'completed');
    };

    const confirmCancel = () => {
        if (cancelTarget) {
            updateOrderStatus(cancelTarget, 'cancelled');
            setCancelTarget(null);
        }
    };

    return (
        <div className="kitchen-container">
            <h1 className="kitchen-title">調理場モニター ({activeOrders.length}件)</h1>

            <div className="orders-list">
                {activeOrders.length === 0 && <div className="no-orders">注文待ち...</div>}

                {activeOrders.map(order => (
                    <div key={order.id} className="kitchen-order-card">
                        <div className="card-header">
                            <span className="order-time-elapsed">{getElapsedTime(order.createdAt)}経過</span>
                            <div className="card-actions">
                                <button
                                    className="action-btn btn-cancel"
                                    onClick={() => setCancelTarget(order.id)}
                                >
                                    キャンセル
                                </button>
                                <button
                                    className="action-btn btn-complete"
                                    onClick={() => handleComplete(order.id)}
                                >
                                    完了
                                </button>
                            </div>
                        </div>

                        <div className="card-items">
                            {order.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`order-item ${item.id === 'latte_topping' ? 'highlight-topping' : ''} ${item.id === 'latte' ? 'highlight-latte' : ''}`}
                                >
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-qty">x{item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Cancel Confirmation Modal */}
            {cancelTarget && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>本当にキャンセルしますか？</h2>
                        <div className="modal-buttons">
                            <button className="modal-btn btn-back" onClick={() => setCancelTarget(null)}>戻る</button>
                            <button className="modal-btn btn-confirm" onClick={confirmCancel}>はい、キャンセルします</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenDisplay;

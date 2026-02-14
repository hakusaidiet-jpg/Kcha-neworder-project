import React, { useState, useEffect } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './KitchenDisplay.css';

const KitchenDisplay = () => {
    const { orders, isConnected, updateItemStatus } = useOrders();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter only pending orders
    const activeOrders = orders.filter(o => o.status === 'pending');

    // Flatten all pending drink items into individual banners
    const latteBanners = activeOrders.flatMap(order => {
        return order.items
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter(item => (item.id === 'latte' || item.id === 'latte_topping') && !item.completed)
            .map(item => ({
                ...item,
                orderId: order.id,
                createdAt: order.createdAt,
                uniqueKey: `${order.id}-${item.originalIndex}`
            }));
    });

    const getElapsedTimeSeconds = (createdAt) => {
        if (!createdAt) return 0;
        return Math.floor((now - createdAt) / 1000);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getTimeColorClass = (seconds) => {
        if (seconds >= 300) return 'urgent-time';
        if (seconds >= 180) return 'warning-time';
        return 'normal-time';
    };

    const handleCompleteItem = (orderId, itemIndex) => {
        // Play success audio
        try {
            const base = import.meta.env.BASE_URL || '/';
            const audioPath = (base.endsWith('/') ? base : base + '/') + 'complete.mp3';
            const audio = new Audio(audioPath);
            audio.play().catch(() => { });
        } catch (e) { }

        // Mark individual item as completed (it will disappear due to the filter above)
        updateItemStatus(orderId, itemIndex, true);
    };

    return (
        <div className="kitchen-banner-container">
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                fontSize: '0.8rem',
                color: isConnected ? '#4caf50' : '#f44336',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '4px 8px',
                borderRadius: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1000
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: isConnected ? '#4caf50' : '#f44336',
                    borderRadius: '50%',
                    display: 'inline-block'
                }}></span>
                {isConnected ? 'ライブ同期中' : 'オフライン (再接続待ち...)'}
            </div>

            <div className="kitchen-banner-title">
                <span>調理場：注文状況</span>
                <span style={{ fontSize: '1.5rem', color: '#334155', fontWeight: 'bold' }}>
                    受付中: <span style={{ fontSize: '3rem', color: '#ef4444', marginLeft: '10px' }}>{latteBanners.length}杯</span>
                </span>
            </div>

            <div className="banners-list">
                {latteBanners.length === 0 && (
                    <div className="no-banners">
                        注文待ち...
                    </div>
                )}

                {latteBanners.map(banner => {
                    const elapsed = getElapsedTimeSeconds(banner.createdAt);
                    const orderNum = banner.orderNum || banner.orderId.slice(-4).toUpperCase();
                    const orderTime = banner.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div key={banner.uniqueKey} className={`kitchen-banner banner-${banner.id}`}>
                            <div className="banner-left">
                                <div className="order-metadata" style={{ backgroundColor: '#ffed4a', padding: '2px 8px', borderRadius: '4px', color: '#000', fontSize: '1.2rem' }}>
                                    No. {orderNum} | {orderTime}
                                </div>
                                <div className="product-info-row">
                                    <span className="product-name">{banner.name}</span>
                                    <span className="product-qty">x{banner.quantity}</span>
                                </div>
                            </div>

                            <div className="banner-right">
                                <button
                                    className="complete-btn-kitchen"
                                    onClick={() => handleCompleteItem(banner.orderId, banner.originalIndex)}
                                >
                                    完了
                                </button>
                                <div className={`time-counter ${getTimeColorClass(elapsed)}`}>
                                    {formatTime(elapsed)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KitchenDisplay;

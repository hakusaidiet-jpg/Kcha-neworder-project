import React, { useState, useEffect } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './KitchenDisplay.css';

const KitchenDisplay = () => {
    const { orders, updateOrderStatus } = useOrders();
    const [now, setNow] = useState(new Date());

    // Update timer every second for real-time lag-free feel
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter only pending orders
    const activeOrders = orders.filter(o => o.status === 'pending');

    // Flatten orders into individual "latte banners"
    const latteBanners = activeOrders.flatMap(order => {
        return order.items
            .filter(item => item.id === 'latte' || item.id === 'latte_topping')
            .map((item, index) => ({
                ...item,
                orderId: order.id,
                createdAt: order.createdAt,
                uniqueKey: `${order.id}-${index}`
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
        if (seconds >= 300) return 'urgent-time';   // 5+ mins
        if (seconds >= 180) return 'warning-time';  // 3+ mins
        return 'normal-time';
    };

    const handleComplete = (orderId) => {
        // In this version, completing a latte banner completes the whole order for simplicity.
        // If there are other items in the order, they will also be cleared.
        updateOrderStatus(orderId, 'completed');
    };

    return (
        <div className="kitchen-banner-container">
            <h1 className="kitchen-banner-title">抹茶ラテ 注文状況 ({latteBanners.length}件)</h1>

            <div className="banners-list">
                {latteBanners.length === 0 && (
                    <div className="no-banners">
                        注文待ち...
                        <div className="sub-text">抹茶ラテの注文が入るとここに表示されます</div>
                    </div>
                )}

                {latteBanners.map(banner => {
                    const elapsed = getElapsedTimeSeconds(banner.createdAt);
                    const isTopping = banner.id === 'latte_topping';

                    return (
                        <div
                            key={banner.uniqueKey}
                            className={`kitchen-banner ${isTopping ? 'banner-topping' : 'banner-normal'}`}
                        >
                            <div className="banner-left">
                                <span className="product-info">{banner.name}</span>
                                <span className="product-qty">✖️ {banner.quantity}</span>
                            </div>

                            <div className="banner-right">
                                <button
                                    className="complete-btn-kitchen"
                                    onClick={() => handleComplete(banner.orderId)}
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

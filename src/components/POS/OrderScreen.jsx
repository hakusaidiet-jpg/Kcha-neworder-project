import React, { useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './OrderScreen.css';

const PRODUCTS = [
    { id: 'tea', name: 'お茶席', price: 700, color: '#81c784' },
    { id: 'manju', name: '紅白饅頭', price: 500, color: '#ff8a80' },
    { id: 'latte', name: '抹茶ラテ', price: 500, color: '#aed581' }, // Standard
    { id: 'latte_topping', name: '抹茶ラテ\n(トッピング)', price: 600, color: '#f06292' }, // Special
];

const OrderScreen = () => {
    const { addOrder } = useOrders();
    const [cart, setCart] = useState({}); // { productId: count }
    const [receivedAmount, setReceivedAmount] = useState('');
    const [showChange, setShowChange] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Helper to calculate total
    const totalAmount = Object.entries(cart).reduce((sum, [id, count]) => {
        const product = PRODUCTS.find(p => p.id === id);
        return sum + (product.price * count);
    }, 0);

    const handleProductClick = (id) => {
        setCart(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
    };

    const handleDecrement = (id, e) => {
        e.stopPropagation();
        setCart(prev => {
            const newCount = (prev[id] || 0) - 1;
            if (newCount <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: newCount };
        });
    };

    const handleNumPad = (value) => {
        if (value === 'AC') {
            setReceivedAmount('');
            return;
        }
        if (value === 'back') {
            setReceivedAmount(prev => prev.slice(0, -1));
            return;
        }
        if (value === '00') {
            setReceivedAmount(prev => prev + '00');
            return;
        }
        setReceivedAmount(prev => prev + value);
    };

    const handleCheckout = async () => {
        if (isProcessing) return;
        const received = parseInt(receivedAmount, 10);
        if (!received || received < totalAmount) {
            alert('金額が不足しています');
            return;
        }

        setIsProcessing(true);
        const items = Object.entries(cart).map(([id, count]) => {
            const product = PRODUCTS.find(p => p.id === id);
            return { ...product, quantity: count };
        });

        const success = await addOrder(items, totalAmount, received);
        if (success) {
            setShowChange(true);
            setCart({});
            setReceivedAmount('');
            // Reset after a delay or manual close? User wanted "one tap" logic.
            // Maybe show a large "Change" screen that user taps to dismiss/reset.
        }
        setIsProcessing(false);
    };

    const resetAll = () => {
        setCart({});
        setReceivedAmount('');
        setShowChange(false);
    };

    const changeAmount = (parseInt(receivedAmount, 10) || 0) - totalAmount;

    if (showChange) {
        return (
            <div className="order-screen-container success-bg" onClick={resetAll}>
                <h1 className="change-title">おつり</h1>
                <div className="change-amount">¥{changeAmount.toLocaleString()}</div>
                <p className="tap-hint">タップして次の注文へ</p>
            </div>
        );
    }

    return (
        <div className="order-screen-container">
            {/* Product Grid */}
            <div className="product-grid">
                {PRODUCTS.map(product => (
                    <button
                        key={product.id}
                        className="product-btn"
                        style={{ backgroundColor: product.color }}
                        onClick={() => handleProductClick(product.id)}
                    >
                        <span className="product-name">{product.name}</span>
                        <span className="product-price">¥{product.price}</span>
                        {cart[product.id] > 0 && (
                            <div className="quantity-badge">
                                <span className="count">{cart[product.id]}</span>
                                <div className="decrement-btn" onClick={(e) => handleDecrement(product.id, e)}>−</div>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Right Side: Totals & Keypad */}
            <div className="control-panel">
                {/* Customer View (Upside Down) */}
                <div className="customer-view">
                    <div className="upside-down-content">
                        <div className="row customer-total-row">
                            <span className="customer-label">合計</span>
                            <span className="customer-price">¥{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Staff View */}
                <div className="staff-totals">
                    <div className="row total-row">
                        <span>合計</span>
                        <span>¥{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="row received-row">
                        <span>預り</span>
                        <span>{userReadableReceived(receivedAmount)}</span>
                    </div>
                    <div className="row change-row-preview">
                        <span>おつり</span>
                        <span>¥{Math.max(0, (parseInt(receivedAmount) || 0) - totalAmount).toLocaleString()}</span>
                    </div>
                </div>

                {/* Keypad */}
                <div className="keypad">
                    {[7, 8, 9, 'AC', 4, 5, 6, 'back', 1, 2, 3, '00', 0].map((key, i) => (
                        <button
                            key={i}
                            className={`key-btn ${key === 'AC' ? 'ac-btn' : ''} ${key === 0 ? 'zero-btn' : ''}`}
                            onClick={() => handleNumPad(String(key))}
                        >
                            {key === 'back' ? '⌫' : key}
                        </button>
                    ))}
                    <button className="enter-btn" onClick={handleCheckout} disabled={isProcessing}>
                        会計
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper for display
const userReadableReceived = (val) => val ? `¥${parseInt(val, 10).toLocaleString()}` : '';

export default OrderScreen;

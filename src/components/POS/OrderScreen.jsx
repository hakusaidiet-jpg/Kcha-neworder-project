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
    const [isProcessing, setIsProcessing] = useState(false);

    // Helper to calculate total
    const totalAmount = Object.entries(cart).reduce((sum, [id, count]) => {
        const product = PRODUCTS.find(p => p.id === id);
        return sum + (product.price * count);
    }, 0);

    const handleProductClick = (id) => {
        console.log("Product clicked:", id);
        setCart(prev => {
            const currentCount = prev[id] || 0;
            if (currentCount >= 10) {
                console.warn("Item limit reached for:", id);
                return prev;
            }
            const next = {
                ...prev,
                [id]: currentCount + 1
            };
            console.log("New Cart State:", next);
            return next;
        });
    };

    const handleDecrement = (id, e) => {
        if (e) e.stopPropagation();
        console.log("Decrement clicked:", id);
        setCart(prev => {
            const newCount = (prev[id] || 0) - 1;
            if (newCount <= 0) {
                const { [id]: _, ...rest } = prev;
                console.log("Item removed from cart:", id);
                return rest;
            }
            const next = { ...prev, [id]: newCount };
            console.log("Updated Cart State (minus):", next);
            return next;
        });
    };

    const handleNumPad = (value) => {
        console.log("NumPad clicked:", value);
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
        console.log("--- handleCheckout Clicked ---");
        if (isProcessing) {
            console.warn("Checkout already in progress, ignore click");
            return;
        }
        if (totalAmount === 0) {
            console.warn("Checkout stopped: Total is 0");
            alert('商品を選択してください');
            return;
        }

        const received = parseInt(receivedAmount, 10);
        console.log("Checkout Data:", { cart, totalAmount, received });

        if (!received || received < totalAmount) {
            console.warn("Insufficient funds or invalid input. Received:", received, "Total:", totalAmount);
            alert('金額が不足しています。預かり金額を入力してください。');
            return;
        }

        setIsProcessing(true);
        console.log("isProcessing set to true. Sending to Firebase...");

        try {
            const items = Object.entries(cart).map(([id, count]) => {
                const product = PRODUCTS.find(p => p.id === id);
                return { ...product, quantity: count };
            });

            // addOrder handles Firestore interaction (persistence enabled)
            const success = await addOrder(items, totalAmount, received);
            console.log("addOrder outcome:", success);

            if (success) {
                // Play Audio
                try {
                    console.log("Attempting audio playback...");
                    const base = import.meta.env.BASE_URL || '/';
                    const audioPath = (base.endsWith('/') ? base : base + '/') + 'checkout.mp3';
                    const audio = new Audio(audioPath);
                    audio.play().then(() => console.log("Audio OK"))
                        .catch(e => console.warn("Audio blocked/error:", e));
                } catch (e) {
                    console.error("Audio system error:", e);
                }

                console.log("Performing reset...");
                setCart({});
                setReceivedAmount('');
            } else {
                console.error("addOrder returned false");
                alert('注文の送信に失敗しました。');
            }
        } catch (error) {
            console.error("CRITICAL CHECKOUT ERROR:", error);
            alert('予期せぬエラーが発生しました。');
        } finally {
            console.log("Checkout cleanup. isProcessing -> false");
            setIsProcessing(false);
        }
    };

    const resetAll = (e) => {
        if (e) e.stopPropagation();
        setCart({});
        setReceivedAmount('');
    };

    return (
        <div className="order-screen-container">
            {/* Product Grid */}
            <div className="product-grid">
                {PRODUCTS.map(product => {
                    const count = cart[product.id] || 0;
                    return (
                        <div
                            key={product.id}
                            className="product-card"
                            style={{ backgroundColor: product.color }}
                        >
                            <div className="product-info-area" onClick={() => handleProductClick(product.id)}>
                                <span className="product-name">{product.name}</span>
                                <span className="product-price">¥{product.price}</span>
                            </div>

                            <div className="product-counter-area">
                                <button
                                    className="counter-btn minus"
                                    onClick={(e) => handleDecrement(product.id, e)}
                                    disabled={count === 0}
                                >
                                    −
                                </button>
                                <span className="counter-value">{count}</span>
                                <button
                                    className="counter-btn plus"
                                    onClick={(e) => handleProductClick(product.id)}
                                >
                                    ＋
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right Side: Totals & Keypad */}
            <div className="control-panel">
                {/* Customer View (Top Right, Upside Down) */}
                <div className="customer-display-box">
                    <div className="customer-text-upside-down">
                        <div className="label">合計</div>
                        <div className="amount">¥{totalAmount.toLocaleString()}</div>
                    </div>
                </div>

                {/* Staff Totals display */}
                <div className="staff-display-box">
                    <div className="display-row">
                        <span className="label">預かり</span>
                        <span className="value">¥{(parseInt(receivedAmount, 10) || 0).toLocaleString()}</span>
                    </div>
                    <div className="display-row staff-total-row">
                        <span className="label">合計</span>
                        <span className="value">¥{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="display-row change">
                        <span className="label">おつり</span>
                        <span className="value">¥{Math.max(0, (parseInt(receivedAmount, 10) || 0) - totalAmount).toLocaleString()}</span>
                    </div>
                </div>

                {/* Version Stamp for Debugging */}
                <div style={{ fontSize: '0.7rem', color: '#ccc', textAlign: 'right', marginTop: '5px' }}>
                    v2.0.0 - Stability
                </div>

                {/* Keypad */}
                <div className="keypad-container">
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
                        <button
                            className={`complete-btn ${(!isProcessing && totalAmount > 0) ? 'ready' : ''}`}
                            onClick={handleCheckout}
                            disabled={isProcessing || totalAmount === 0}
                        >
                            {isProcessing ? '送信中...' : '完了'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for display
const userReadableReceived = (val) => val ? `¥${parseInt(val, 10).toLocaleString()}` : '';

export default OrderScreen;

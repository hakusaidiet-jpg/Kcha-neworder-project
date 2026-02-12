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
        setCart(prev => {
            const currentCount = prev[id] || 0;
            if (currentCount >= 10) return prev; // Limit to 10
            return {
                ...prev,
                [id]: currentCount + 1
            };
        });
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
        console.log("--- Checkout Started ---");
        console.log("Cart:", cart);
        console.log("Total:", totalAmount, "Received:", received);

        if (!received || received < totalAmount) {
            console.warn("Insufficient funds or invalid input");
            alert('金額が不足しています');
            return;
        }

        setIsProcessing(true);
        try {
            const items = Object.entries(cart).map(([id, count]) => {
                const product = PRODUCTS.find(p => p.id === id);
                return { ...product, quantity: count };
            });

            console.log("Preparing to write to Firebase...");
            // addOrder handles Firestore interaction (Now works with persistence)
            const success = await addOrder(items, totalAmount, received);
            console.log("Firebase Write Result:", success);

            if (success) {
                // Play Audio
                try {
                    console.log("Attempting to play audio...");
                    const base = import.meta.env.BASE_URL || '/';
                    const audioPath = (base.endsWith('/') ? base : base + '/') + 'checkout.mp3';
                    const audio = new Audio(audioPath);
                    audio.play().then(() => console.log("Audio played successfully"))
                        .catch(e => console.warn("Audio playback issue (often blocked by browser):", e));
                } catch (e) {
                    console.error("Audio system error:", e);
                }

                // IMMEDIATE RESET
                console.log("Resetting cart and inputs...");
                setCart({});
                setReceivedAmount('');
            } else {
                console.error("Firebase write returned failure (success is false/undefined)");
                alert('送信に失敗しました。Firebaseの設定（API Key等）またはネット環境を確認してください。');
            }
        } catch (error) {
            console.error("CRITICAL Checkout Error:", error);
            alert('システムエラーが発生しました。詳細はコンソールを確認してください。');
        } finally {
            console.log("--- Checkout Finished ---");
            // ALWAYS re-enable the button
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
                        <button className="complete-btn" onClick={handleCheckout} disabled={isProcessing || totalAmount === 0}>
                            完了
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

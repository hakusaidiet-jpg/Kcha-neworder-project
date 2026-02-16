import React, { useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './OrderScreen.css';

const PRODUCTS = [
    { id: 'tea', name: 'お茶席', price: 700, color: '#6E6702' },
    { id: 'manju', name: '紅白饅頭', price: 500, color: '#C05805' },
    { id: 'custom', name: 'カスタム', price: 0, color: '#8B4513' },
    { id: 'latte', name: '抹茶ラテ', price: 500, color: '#2E2300' },
    { id: 'latte_topping', name: '抹茶ラテ\n(トッピング)', price: 600, color: '#DE9501' },
];

const OrderScreen = () => {
    const { addOrder, isConnected } = useOrders();
    const [cart, setCart] = useState({}); // { productId: { count, customPrice? } }
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [customPriceMode, setCustomPriceMode] = useState(false);
    const [customPriceInput, setCustomPriceInput] = useState('');

    // Helper to calculate total
    const totalAmount = Object.entries(cart).reduce((sum, [id, data]) => {
        const product = PRODUCTS.find(p => p.id === id);
        // Handle both old format (number) and new format (object)
        if (typeof data === 'number') {
            return sum + (product.price * data);
        }
        const { count, customPrice } = data;
        const price = customPrice !== undefined ? customPrice : product.price;
        return sum + (price * count);
    }, 0);

    const handleProductClick = (id) => {
        console.log("Product clicked:", id);

        // Special handling for custom product
        if (id === 'custom') {
            if (!customPriceMode) {
                // Enter custom price mode
                setCustomPriceMode(true);
                setCustomPriceInput('');
                console.log("Entered custom price mode");
                return;
            } else {
                // Add to cart with custom price
                const price = parseInt(customPriceInput, 10);
                if (!price || price <= 0) {
                    alert('カスタム価格を入力してください');
                    return;
                }

                setCart(prev => {
                    const currentData = prev[id] || { count: 0, customPrice: price };
                    const currentCount = typeof currentData === 'number' ? currentData : currentData.count;

                    if (currentCount >= 10) {
                        console.warn("Item limit reached for:", id);
                        return prev;
                    }

                    const next = {
                        ...prev,
                        [id]: { count: currentCount + 1, customPrice: price }
                    };
                    console.log("Added custom item with price:", price);
                    return next;
                });

                // Exit custom price mode
                setCustomPriceMode(false);
                setCustomPriceInput('');
                return;
            }
        }

        // Normal product handling
        setCart(prev => {
            const currentData = prev[id] || { count: 0 };
            const currentCount = typeof currentData === 'number' ? currentData : currentData.count;

            if (currentCount >= 10) {
                console.warn("Item limit reached for:", id);
                return prev;
            }
            const next = {
                ...prev,
                [id]: { count: currentCount + 1 }
            };
            console.log("New Cart State:", next);
            return next;
        });
    };

    const handleDecrement = (id, e) => {
        if (e) e.stopPropagation();
        console.log("Decrement clicked:", id);
        setCart(prev => {
            const currentData = prev[id];
            if (!currentData) return prev;

            const currentCount = typeof currentData === 'number' ? currentData : currentData.count;
            const newCount = currentCount - 1;

            if (newCount <= 0) {
                const { [id]: _, ...rest } = prev;
                console.log("Item removed from cart:", id);
                return rest;
            }

            const next = {
                ...prev,
                [id]: typeof currentData === 'number' ? newCount : { ...currentData, count: newCount }
            };
            console.log("Updated Cart State (minus):", next);
            return next;
        });
    };

    const handleNumPad = (value) => {
        console.log("NumPad clicked:", value);

        // Determine which input to update based on mode
        const setInput = customPriceMode ? setCustomPriceInput : setReceivedAmount;

        if (value === 'AC') {
            setInput('');
            if (customPriceMode) {
                setCustomPriceMode(false);
            }
            return;
        }
        if (value === 'back') {
            setInput(prev => prev.slice(0, -1));
            return;
        }
        if (value === '00') {
            setInput(prev => prev + '00');
            return;
        }
        setInput(prev => prev + value);
    };

    const handleCheckout = async () => {
        if (isProcessing) return;
        if (totalAmount === 0) {
            alert('商品を選択してください');
            return;
        }

        const received = parseInt(receivedAmount, 10);
        if (!received || received < totalAmount) {
            alert('金額が不足しています。預かり金額を入力してください。');
            return;
        }

        setIsProcessing(true);
        try {
            const items = Object.entries(cart).map(([id, data]) => {
                const product = PRODUCTS.find(p => p.id === id);
                const count = typeof data === 'number' ? data : data.count;
                const customPrice = typeof data === 'object' ? data.customPrice : undefined;

                return {
                    ...product,
                    price: customPrice !== undefined ? customPrice : product.price,
                    quantity: count
                };
            });

            // Race: Firestore local acknowledge vs 2s timeout
            const result = await Promise.race([
                addOrder(items, totalAmount, received),
                new Promise(resolve => setTimeout(() => resolve('timeout'), 2000))
            ]);

            // Feedbacks (Audio)
            try {
                const base = import.meta.env.BASE_URL || '/';
                const audioPath = (base.endsWith('/') ? base : base + '/') + 'checkout.mp3';
                const audio = new Audio(audioPath);
                audio.play().catch(() => { });
            } catch (e) { }

            // Immediate Reset
            setCart({});
            setReceivedAmount('');

            if (result === 'timeout') {
                console.warn("Firestore local resolve timed out. Resetting anyway for speed.");
            } else if (!result) {
                alert('送信に失敗した可能性があります。Wi-Fiを確認してください。');
            }
        } catch (error) {
            console.error("CRITICAL Checkout Error:", error);
            alert('システムエラーが発生しました。');
        } finally {
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
            <div className="pos-product-grid">
                {PRODUCTS.map(product => {
                    const cartData = cart[product.id];
                    const count = cartData ? (typeof cartData === 'number' ? cartData : cartData.count) : 0;
                    const isCustomMode = product.id === 'custom' && customPriceMode;

                    return (
                        <div
                            key={product.id}
                            className={`pos-product-card ${isCustomMode ? 'custom-mode' : ''}`}
                            style={{ backgroundColor: product.color }}
                        >
                            <div className="product-info-area" onClick={() => handleProductClick(product.id)}>
                                <span className="pos-product-name">{product.name}</span>
                                {isCustomMode ? (
                                    <span className="pos-product-price custom-price-input">¥{customPriceInput || '0'}</span>
                                ) : (
                                    <span className="pos-product-price">¥{product.price}</span>
                                )}
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
                {/* Custom Price Mode Indicator */}
                {customPriceMode && (
                    <div className="custom-price-indicator">
                        <div className="indicator-text">カスタム価格入力中</div>
                        <div className="indicator-amount">¥{(parseInt(customPriceInput, 10) || 0).toLocaleString()}</div>
                    </div>
                )}

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

                {/* Version Stamp & Sync Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                    <div style={{ fontSize: '0.7rem', color: isConnected ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '6px', height: '6px', backgroundColor: isConnected ? '#4caf50' : '#f44336', borderRadius: '50%', display: 'inline-block' }}></span>
                        {isConnected ? '同期中' : 'オフライン'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#ff6600', fontWeight: 'bold' }}>
                        NEW v3.1.0 (UI修正版)
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
                        <button
                            className={`pos-complete-btn ${(!isProcessing && totalAmount > 0) ? 'ready' : ''}`}
                            onClick={handleCheckout}
                            disabled={isProcessing || totalAmount === 0}
                        >
                            {isProcessing ? '送信中...' : '決済'}
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

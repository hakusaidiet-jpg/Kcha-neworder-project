import React, { useState, useEffect } from 'react';
import { useOrders } from '../../hooks/useOrders';
import './OrderScreen.css';

/* -------------------------------
   🔊 効果音（事前ロード & 高速再生）
-------------------------------- */
const checkoutSoundRef = { current: null };

const initAudio = () => {
    if (!checkoutSoundRef.current) {
        const base = import.meta.env.BASE_URL || '/';
        const path = (base.endsWith('/') ? base : base + '/') + 'checkout.mp3';

        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = 1.0;

        // iOS unlock
        const unlock = () => {
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(() => { });
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('click', unlock);
        };

        window.addEventListener('touchstart', unlock, { once: true });
        window.addEventListener('click', unlock, { once: true });

        checkoutSoundRef.current = audio;
    }
};

/* -------------------------------
   商品
-------------------------------- */
const PRODUCTS = [
    { id: 'tea', name: 'お茶席', price: 700, color: '#6E6702' },
    { id: 'manju', name: '紅白饅頭', price: 500, color: '#C05805' },
    { id: 'custom', name: 'カスタム', price: 0, color: '#8B4513' },
    { id: 'latte', name: '抹茶ラテ', price: 500, color: '#2E2300' },
    { id: 'latte_topping', name: '抹茶ラテ\n(トッピング)', price: 600, color: '#DE9501' },
];

const OrderScreen = () => {
    const { addOrder, isConnected } = useOrders();

    const [cart, setCart] = useState({});
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [customPriceMode, setCustomPriceMode] = useState(false);
    const [customPriceInput, setCustomPriceInput] = useState('');
    const [vh, setVh] = useState(window.innerHeight);

    // iPad Height Stability
    useEffect(() => {
        const handleResize = () => setVh(window.innerHeight);
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        initAudio();
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    // Helper to calculate total
    const totalAmount = Object.entries(cart).reduce((sum, [id, data]) => {
        const product = PRODUCTS.find(p => p.id === id);
        if (typeof data === 'number') {
            return sum + (product.price * data);
        }
        const { count, customPrice } = data;
        const price = customPrice !== undefined ? customPrice : product.price;
        return sum + (price * count);
    }, 0);

    const handleProductClick = (id) => {
        if (id === 'custom') {
            if (!customPriceMode) {
                setCustomPriceMode(true);
                setCustomPriceInput('');
                return;
            } else {
                const price = parseInt(customPriceInput, 10);
                if (!price || price <= 0) {
                    alert('カスタム価格を入力してください');
                    return;
                }
                setCart(prev => {
                    const currentData = prev[id] || { count: 0, customPrice: price };
                    const currentCount = typeof currentData === 'number' ? currentData : currentData.count;
                    if (currentCount >= 10) return prev;
                    return { ...prev, [id]: { count: currentCount + 1, customPrice: price } };
                });
                setCustomPriceMode(false);
                setCustomPriceInput('');
                return;
            }
        }

        setCart(prev => {
            const currentData = prev[id] || { count: 0 };
            const currentCount = typeof currentData === 'number' ? currentData : currentData.count;
            if (currentCount >= 10) return prev;
            return { ...prev, [id]: { count: currentCount + 1 } };
        });
    };

    const handleDecrement = (id, e) => {
        if (e) e.stopPropagation();
        setCart(prev => {
            const currentData = prev[id];
            if (!currentData) return prev;
            const currentCount = typeof currentData === 'number' ? currentData : currentData.count;
            const newCount = currentCount - 1;
            if (newCount <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: typeof currentData === 'number' ? newCount : { ...currentData, count: newCount } };
        });
    };

    const handleNumPad = (value) => {
        const setInput = customPriceMode ? setCustomPriceInput : setReceivedAmount;
        if (value === 'AC') {
            setInput('');
            if (customPriceMode) setCustomPriceMode(false);
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
        setInput(prev => (prev === '0' ? value : prev + value));
    };

    const handleCheckout = async () => {
        if (isProcessing || totalAmount === 0) return;

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

            const success = await addOrder(items, totalAmount, received);
            if (success) {
                // Play Sound
                if (checkoutSoundRef.current) {
                    checkoutSoundRef.current.currentTime = 0;
                    checkoutSoundRef.current.play().catch(() => { });
                }
                setCart({});
                setReceivedAmount('');
            } else {
                // alert shown in useOrders (e.g. time limit)
            }
        } catch (error) {
            console.error("Checkout Error:", error);
            alert('注文の送信に失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="order-screen-container" style={{ height: vh }}>
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
                                <button className="counter-btn minus" onClick={(e) => handleDecrement(product.id, e)} disabled={count === 0}>−</button>
                                <span className="counter-value">{count}</span>
                                <button className="counter-btn plus" onClick={() => handleProductClick(product.id)}>＋</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right Side: Totals & Keypad */}
            <div className="control-panel">
                {customPriceMode && (
                    <div className="custom-price-indicator">
                        <div className="indicator-text">カスタム価格入力中</div>
                        <div className="indicator-amount">¥{(parseInt(customPriceInput, 10) || 0).toLocaleString()}</div>
                    </div>
                )}

                <div className="customer-display-box">
                    <div className="customer-text-upside-down">
                        <div className="label">合計</div>
                        <div className="amount">¥{totalAmount.toLocaleString()}</div>
                    </div>
                </div>

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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                    <div style={{ fontSize: '0.7rem', color: isConnected ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '6px', height: '6px', backgroundColor: isConnected ? '#4caf50' : '#f44336', borderRadius: '50%', display: 'inline-block' }}></span>
                        {isConnected ? '同期中' : 'オフライン'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#999' }}>v3.2.1 Stable</div>
                </div>

                <div className="keypad-container">
                    <div className="keypad">
                        {[7, 8, 9, 'AC', 4, 5, 6, 'back', 1, 2, 3, '00', 0].map((key, i) => (
                            <button
                                key={i}
                                className={`key-btn ${key === 'AC' ? 'ac-btn' : ''} ${key === 0 ? 'zero-btn' : ''} ${key === 'back' ? 'back-btn' : ''}`}
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
                            {isProcessing ? '...' : '決済'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderScreen;

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

    /* -------------------------------
       🔥 iPad回転対応（高さ同期）
    -------------------------------- */
    useEffect(() => {
        const updateHeight = () => {
            document.documentElement.style.setProperty(
                '--app-height',
                `${window.innerHeight}px`
            );
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        window.addEventListener('orientationchange', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('orientationchange', updateHeight);
        };
    }, []);

    /* -------------------------------
       🔊 Audio init
    -------------------------------- */
    useEffect(() => {
        initAudio();
    }, []);

    /* -------------------------------
       合計計算
    -------------------------------- */
    const totalAmount = Object.entries(cart).reduce((sum, [id, data]) => {
        const product = PRODUCTS.find(p => p.id === id);
        if (typeof data === 'number') {
            return sum + (product.price * data);
        }
        const { count, customPrice } = data;
        const price = customPrice !== undefined ? customPrice : product.price;
        return sum + (price * count);
    }, 0);

    /* -------------------------------
       商品クリック
    -------------------------------- */
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

                    return {
                        ...prev,
                        [id]: { count: currentCount + 1, customPrice: price }
                    };
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

            return {
                ...prev,
                [id]: { count: currentCount + 1 }
            };
        });
    };

    const handleDecrement = (id, e) => {
        e.stopPropagation();

        setCart(prev => {
            const currentData = prev[id];
            if (!currentData) return prev;

            const currentCount = typeof currentData === 'number' ? currentData : currentData.count;
            const newCount = currentCount - 1;

            if (newCount <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [id]: typeof currentData === 'number' ? newCount : { ...currentData, count: newCount }
            };
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
        setInput(prev => prev + value);
    };

    /* -------------------------------
       決済
    -------------------------------- */
    const handleCheckout = async () => {
        if (isProcessing || totalAmount === 0) return;

        const received = parseInt(receivedAmount, 10);
        if (!received || received < totalAmount) {
            alert('金額が不足しています');
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

            await addOrder(items, totalAmount, received);

            // 🔊 即時再生（ラグなし）
            const audio = checkoutSoundRef.current;
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            }

            setCart({});
            setReceivedAmount('');

        } catch (e) {
            alert('エラーが発生しました');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="order-screen-container">
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
                                {isCustomMode
                                    ? <span className="pos-product-price">¥{customPriceInput || '0'}</span>
                                    : <span className="pos-product-price">¥{product.price}</span>
                                }
                            </div>

                            <div className="product-counter-area">
                                <button className="counter-btn" onClick={(e) => handleDecrement(product.id, e)} disabled={count === 0}>−</button>
                                <span className="counter-value">{count}</span>
                                <button className="counter-btn" onClick={() => handleProductClick(product.id)}>＋</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="control-panel">
                {customPriceMode && (
                    <div className="custom-price-indicator">
                        カスタム価格入力中 ¥{customPriceInput || 0}
                    </div>
                )}

                <div className="customer-display-box">
                    <div className="customer-text-upside-down">
                        合計 ¥{totalAmount}
                    </div>
                </div>

                <div className="staff-display-box">
                    <div>預かり ¥{receivedAmount || 0}</div>
                    <div>合計 ¥{totalAmount}</div>
                    <div>お釣り ¥{Math.max(0, (parseInt(receivedAmount, 10) || 0) - totalAmount)}</div>
                </div>

                <div className="keypad">
                    {[1,2,3,4,5,6,7,8,9,0].map(n => (
                        <button key={n} onClick={() => handleNumPad(String(n))}>{n}</button>
                    ))}
                    <button onClick={() => handleNumPad('00')}>00</button>
                    <button onClick={() => handleNumPad('back')}>⌫</button>
                    <button onClick={() => handleNumPad('AC')}>AC</button>
                    <button onClick={handleCheckout}>決済</button>
                </div>
            </div>
        </div>
    );
};

export default OrderScreen;

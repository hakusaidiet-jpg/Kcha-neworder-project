import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { useMemos } from '../../hooks/useMemos';
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
   商品（デフォルト & 保存価格読み込み）
-------------------------------- */
const DEFAULT_PRODUCTS = [
    { id: 'tea', name: 'お茶席', price: 700, color: '#6E6702' },
    { id: 'manju', name: '紅白饅頭', price: 500, color: '#C05805' },
    { id: 'latte', name: '抹茶ラテ', price: 500, color: '#2E2300' },
    { id: 'latte_topping', name: '抹茶ラテ\n(トッピング)', price: 600, color: '#DE9501' },
];

const loadSavedPrices = () => {
    try {
        const saved = localStorage.getItem('kcha_product_prices');
        if (saved) {
            const parsed = JSON.parse(saved);
            return DEFAULT_PRODUCTS.map(p => ({
                ...p,
                price: typeof parsed[p.id] === 'number' ? parsed[p.id] : p.price
            }));
        }
    } catch (e) {
        console.error("Failed to load saved prices:", e);
    }
    return DEFAULT_PRODUCTS;
};

const OrderScreen = () => {
    const { addOrder, isConnected } = useOrders();
    const { addMemo } = useMemos();

    const [products, setProducts] = useState(loadSavedPrices);
    const [cart, setCart] = useState({});
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [vh, setVh] = useState(window.innerHeight);

    // 価格変更モード用 State & Ref
    const [editingProductId, setEditingProductId] = useState(null);
    const [editingPriceInput, setEditingPriceInput] = useState('');

    const longPressTimerRef = useRef(null);
    const isLongPressedRef = useRef(false);
    const touchStartPosRef = useRef({ x: 0, y: 0 });

    // iPad Height Stability
    useEffect(() => {
        const handleResize = () => setVh(window.innerHeight);
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        initAudio();
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    // Helper to calculate total
    const totalAmount = Object.entries(cart).reduce((sum, [id, count]) => {
        const product = products.find(p => p.id === id);
        if (!product) return sum;
        return sum + (product.price * count);
    }, 0);

    // 長押しタイマー管理
    const startPressTimer = (productId, clientX, clientY) => {
        if (editingProductId) return;
        isLongPressedRef.current = false;
        touchStartPosRef.current = { x: clientX, y: clientY };

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
            isLongPressedRef.current = true;
            setEditingProductId(productId);
            setEditingPriceInput('');
            if (navigator.vibrate) {
                try { navigator.vibrate([40, 40, 40]); } catch (e) { }
            }
        }, 3000);
    };

    const cancelPressTimer = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchStart = (productId, e) => {
        const touch = e.touches[0];
        startPressTimer(productId, touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e) => {
        if (!longPressTimerRef.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
            cancelPressTimer();
        }
    };

    const handleMouseDown = (productId, e) => {
        if (e.button !== 0) return;
        startPressTimer(productId, e.clientX, e.clientY);
    };

    // 価格変更の確定処理
    const finishEditing = async (productId) => {
        const targetProduct = products.find(p => p.id === productId);
        if (!targetProduct) {
            setEditingProductId(null);
            setEditingPriceInput('');
            return;
        }

        const oldPrice = targetProduct.price;
        const newPrice = editingPriceInput !== '' ? parseInt(editingPriceInput, 10) : null;

        if (newPrice !== null && !isNaN(newPrice) && newPrice > 0 && newPrice !== oldPrice) {
            const updatedProducts = products.map(p => {
                if (p.id === productId) {
                    return { ...p, price: newPrice };
                }
                return p;
            });
            setProducts(updatedProducts);

            try {
                const pricesMap = {};
                updatedProducts.forEach(p => { pricesMap[p.id] = p.price; });
                localStorage.setItem('kcha_product_prices', JSON.stringify(pricesMap));
            } catch (e) {
                console.error("Failed to save prices:", e);
            }

            try {
                const cleanName = targetProduct.name.replace(/\n/g, '');
                await addMemo(`${cleanName}の価格が¥${oldPrice.toLocaleString()}から¥${newPrice.toLocaleString()}に変更されました`);
            } catch (err) {
                console.error("Failed to add price change memo:", err);
            }
        }

        setEditingProductId(null);
        setEditingPriceInput('');
    };

    // 数量のインクリメント（+1）
    const handleIncrement = (id, e) => {
        if (e) e.stopPropagation();
        if (editingProductId) return;

        setCart(prev => {
            const currentCount = prev[id] || 0;
            if (currentCount >= 10) return prev;
            return { ...prev, [id]: currentCount + 1 };
        });
    };

    // 数量のデクリメント（-1）
    const handleDecrement = (id, e) => {
        if (e) e.stopPropagation();
        if (editingProductId) return;

        setCart(prev => {
            const currentCount = prev[id];
            if (!currentCount) return prev;
            const newCount = currentCount - 1;
            if (newCount <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: newCount };
        });
    };

    // カード本体タップ時
    const handleCardClick = (productId) => {
        cancelPressTimer();

        // 長押し直後のタップは無視
        if (isLongPressedRef.current) {
            isLongPressedRef.current = false;
            return;
        }

        // 編集中カードのタップで確定
        if (editingProductId === productId) {
            finishEditing(productId);
            return;
        }

        // 他の商品が編集中なら無視
        if (editingProductId) {
            return;
        }

        // 商品カード本体タップによる注文カウント増加（+1）
        handleIncrement(productId);
    };

    const handleNumPad = (value) => {
        // 価格変更モード中
        if (editingProductId) {
            if (value === 'AC') {
                setEditingPriceInput('0');
                return;
            }
            if (value === 'back') {
                setEditingPriceInput(prev => {
                    const next = prev.slice(0, -1);
                    return next === '' ? '0' : next;
                });
                return;
            }
            if (value === '00') {
                setEditingPriceInput(prev => {
                    if (!prev || prev === '0') return '0';
                    if (prev.length >= 6) return prev;
                    return prev + '00';
                });
                return;
            }
            setEditingPriceInput(prev => {
                if (!prev || prev === '0') return String(value);
                if (prev.length >= 6) return prev;
                return prev + String(value);
            });
            return;
        }

        // 通常の預かり金額入力
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
        setReceivedAmount(prev => (prev === '0' ? value : prev + value));
    };

    const handleCheckout = async () => {
        if (isProcessing || totalAmount === 0 || editingProductId) return;

        const received = parseInt(receivedAmount, 10);
        if (!received || received < totalAmount) {
            alert('金額が不足しています。預かり金額を入力してください。');
            return;
        }

        setIsProcessing(true);
        try {
            const items = Object.entries(cart).map(([id, count]) => {
                const product = products.find(p => p.id === id);
                return {
                    ...product,
                    quantity: count
                };
            });

            const success = await addOrder(items, totalAmount, received);
            if (success) {
                if (checkoutSoundRef.current) {
                    checkoutSoundRef.current.currentTime = 0;
                    checkoutSoundRef.current.play().catch(() => { });
                }
                setCart({});
                setReceivedAmount('');
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
                {products.map(product => {
                    const count = cart[product.id] || 0;
                    const isEditing = editingProductId === product.id;
                    const displayedPrice = isEditing
                        ? (editingPriceInput !== '' ? (parseInt(editingPriceInput, 10) || 0) : product.price)
                        : product.price;

                    return (
                        <div
                            key={product.id}
                            className={`pos-product-card ${isEditing ? 'editing-jiggle' : ''}`}
                            style={{ backgroundColor: product.color }}
                            onContextMenu={(e) => e.preventDefault()}
                            onTouchStart={(e) => handleTouchStart(product.id, e)}
                            onTouchEnd={cancelPressTimer}
                            onTouchMove={handleTouchMove}
                            onTouchCancel={cancelPressTimer}
                            onMouseDown={(e) => handleMouseDown(product.id, e)}
                            onMouseUp={cancelPressTimer}
                            onMouseLeave={cancelPressTimer}
                            onClick={() => handleCardClick(product.id)}
                        >
                            <div className="product-info-area">
                                <span className="pos-product-name">{product.name}</span>
                                <span className={`pos-product-price ${isEditing ? 'editing-price' : ''}`}>
                                    ¥{displayedPrice.toLocaleString()}
                                </span>
                            </div>

                            <div
                                className="product-counter-area"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <button
                                    className="counter-btn minus"
                                    onClick={(e) => handleDecrement(product.id, e)}
                                    disabled={count === 0 || !!editingProductId}
                                >
                                    −
                                </button>
                                <span className="counter-value">{count}</span>
                                <button
                                    className="counter-btn plus"
                                    onClick={(e) => handleIncrement(product.id, e)}
                                    disabled={!!editingProductId}
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
                {editingProductId && (
                    <div className="price-editing-indicator">
                        <div className="indicator-label">価格変更中（テンキーで入力）</div>
                        <div className="indicator-hint">カードをもう一度タップすると確定</div>
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
                            className={`pos-complete-btn ${(!isProcessing && totalAmount > 0 && !editingProductId) ? 'ready' : ''}`}
                            onClick={handleCheckout}
                            disabled={isProcessing || totalAmount === 0 || !!editingProductId}
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

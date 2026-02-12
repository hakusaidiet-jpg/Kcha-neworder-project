import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, Clock, Coffee, AlertCircle, BarChart3, X } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';

const Kitchen = () => {
    const [orders, setOrders] = useState([]);
    const [now, setNow] = useState(Date.now());
    const [showDashboard, setShowDashboard] = useState(false);
    const [dailyStats, setDailyStats] = useState({ totalSales: 0, totalCount: 0, itemBreakdown: {} });

    // Real-time listener for pending orders
    useEffect(() => {
        // Listen for ALL orders today to calculate stats, but we filter pending for the main view
        // In a real app, we might split this into two listeners for performance
        const todayStart = startOfDay(new Date());

        const q = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc") // Newest first
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAtDate: doc.data().createdAt?.toDate() || new Date()
            }));

            // Filter for active kitchen view
            const pendingData = allOrders
                .filter(o => o.status === 'pending')
                .sort((a, b) => a.createdAtDate - b.createdAtDate); // Oldest first for kitchen

            setOrders(pendingData);

            // Calculate Daily Stats (Client-side aggregation for prototype)
            // Only count orders from "today"
            const todayOrders = allOrders.filter(o => o.createdAtDate >= todayStart);

            const stats = todayOrders.reduce((acc, order) => {
                acc.totalSales += order.totalAmount || 0;
                acc.totalCount += 1;

                order.items.forEach(item => {
                    acc.itemBreakdown[item.name] = (acc.itemBreakdown[item.name] || 0) + item.qty;
                });
                return acc;
            }, { totalSales: 0, totalCount: 0, itemBreakdown: {} });

            setDailyStats(stats);
        });

        const interval = setInterval(() => setNow(Date.now()), 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const handleComplete = async (orderId) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, {
                status: 'completed',
                completedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error completing order: ", e);
            alert("更新に失敗しました");
        }
    };

    const getElapsedTime = (createdAtDate) => {
        const diff = Math.floor((now - createdAtDate.getTime()) / 1000); // seconds
        const mm = String(Math.floor(diff / 60)).padStart(2, '0');
        const ss = String(diff % 60).padStart(2, '0');
        return { str: `${mm}:${ss}`, seconds: diff };
    };

    const pendingDrinks = orders.reduce((sum, order) => {
        return sum + order.items.reduce((s, i) => i.category === 'drink' ? s + i.qty : s, 0);
    }, 0);

    return (
        <div className="h-full relative">
            {/* Header */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-matcha-200 mb-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Coffee className="text-matcha-600" /> キッチンモニター
                </h2>

                <div className="flex gap-4 items-center">
                    <div className={`px-4 py-1 rounded-full font-bold text-sm h-fit ${pendingDrinks > 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-matcha-100 text-matcha-800'}`}>
                        待ちドリンク: {pendingDrinks}杯
                    </div>

                    <button
                        onClick={() => setShowDashboard(true)}
                        className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 font-bold"
                    >
                        <BarChart3 size={16} /> 売上確認
                    </button>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                {orders.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400">
                        現在オーダーはありません
                    </div>
                ) : (
                    orders.map((order) => {
                        const { str, seconds } = getElapsedTime(order.createdAtDate);
                        let timerColor = "text-gray-500";
                        let bgClass = "bg-white";
                        if (seconds > 300) {
                            timerColor = "text-red-600 font-bold";
                            bgClass = "bg-red-50 border-red-200";
                        } else if (seconds > 180) {
                            timerColor = "text-yellow-600 font-bold";
                            bgClass = "bg-yellow-50 border-yellow-200";
                        }

                        return (
                            <div key={order.id} className={`${bgClass} border rounded-xl shadow-md p-4 flex flex-col`}>
                                <div className="flex justify-between items-start mb-3 border-b border-gray-200 pb-2">
                                    <div className={`flex items-center gap-1 text-xl font-mono ${timerColor}`}>
                                        <Clock size={18} /> {str}
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-4)}</span>
                                </div>

                                <div className="flex-1 space-y-2 mb-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-lg">
                                            <span className={item.category === 'drink' ? 'font-bold text-gray-800' : 'text-gray-600'}>
                                                {item.name}
                                            </span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700">x{item.qty}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleComplete(order.id)}
                                    className="w-full py-3 bg-matcha-600 hover:bg-matcha-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
                                >
                                    <CheckCircle size={20} /> 提供完了
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Sales Dashboard Modal */}
            {showDashboard && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2"><BarChart3 /> 本日の売上速報</h3>
                            <button onClick={() => setShowDashboard(false)} className="hover:bg-gray-700 p-1 rounded"><X /></button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-matcha-50 p-4 rounded-xl text-center border border-matcha-100">
                                    <div className="text-sm text-gray-500 mb-1">売上合計</div>
                                    <div className="text-3xl font-bold text-matcha-800">¥{dailyStats.totalSales.toLocaleString()}</div>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
                                    <div className="text-sm text-gray-500 mb-1">総注文数</div>
                                    <div className="text-3xl font-bold text-orange-800">{dailyStats.totalCount}件</div>
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">商品別販売数</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {Object.entries(dailyStats.itemBreakdown).length === 0 ? (
                                    <p className="text-center text-gray-400 py-4">まだ売上データがありません</p>
                                ) : (
                                    Object.entries(dailyStats.itemBreakdown)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([name, count]) => (
                                            <div key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                                <span className="font-bold">{name}</span>
                                                <span className="bg-white px-3 py-1 rounded shadow-sm font-mono font-bold">{count}個</span>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Kitchen;

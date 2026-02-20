import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp, limit, getDocs } from 'firebase/firestore';

export const useOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Subscribe to active orders (pending or cooking)
    useEffect(() => {
        // If db is not initialized (e.g. missing keys), skip
        if (!db) {
            console.warn("Firebase DB not initialized");
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'orders'),
            orderBy('createdAt', 'asc')
        );

        console.log("Initializing Firestore Snapshot Listener for 'orders'...");

        // Listen with metadata changes to detect connection status
        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            // If the snapshot has pending writes or is from cache, it might not be synced yet
            // But if it's NOT from cache (fromServer), we are definitely connected.
            const fromCache = snapshot.metadata.fromCache;
            setIsConnected(!fromCache);

            const ordersData = snapshot.docs.map(doc => {
                const data = doc.data({ serverTimestamps: 'estimate' });
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                };
            });
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("CRITICAL: Firestore Snapshot Error:", error);
            setIsConnected(false);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addOrder = async (items, totalAmount, receivedAmount) => {
        // Time Restriction: 10:00 - 18:00
        // Bypass for Special Period: 2026/02/20 - 2026/02/23
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hour = now.getHours();

        const isSpecialPeriod = year === 2026 && month === 2 && (day >= 20 && day <= 28);

        if (!isSpecialPeriod && (hour < 10 || hour >= 18)) {
            alert('注文受付時間外です (10:00 - 18:00)');
            return false;
        }

        if (!db) {
            console.error("addOrder failed: Firestore 'db' is not initialized.");
            return false;
        }
        try {
            // Get the last order to determine the next order number
            const lastOrderQuery = query(
                collection(db, 'orders'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const lastOrderSnapshot = await getDocs(lastOrderQuery);
            let nextOrderNum = 1;

            if (!lastOrderSnapshot.empty) {
                const lastOrderData = lastOrderSnapshot.docs[0].data();
                const lastNum = lastOrderData.orderNum || 0;
                // Cycle from 1 to 25
                nextOrderNum = (lastNum % 25) + 1;
            }

            const docRef = await addDoc(collection(db, 'orders'), {
                items,
                totalAmount,
                receivedAmount,
                change: receivedAmount - totalAmount,
                status: 'pending',
                orderNum: nextOrderNum,
                createdAt: serverTimestamp(),
            });
            return true;
        } catch (error) {
            console.error("addOrder ERROR:", error);
            return false;
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        if (!db) return;
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status,
                completedAt: status === 'completed' ? serverTimestamp() : null
            });
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

    const updateItemStatus = async (orderId, itemIndex, isCompleted) => {
        if (!db) return;
        try {
            const orderRef = doc(db, 'orders', orderId);

            // Get current order data to update items array
            const snapshot = orders.find(o => o.id === orderId);
            if (!snapshot) return;

            const newItems = [...snapshot.items];
            newItems[itemIndex] = { ...newItems[itemIndex], completed: isCompleted };

            await updateDoc(orderRef, { items: newItems });
        } catch (error) {
            console.error("Error updating item status:", error);
        }
    };

    return { orders, loading, isConnected, addOrder, updateOrderStatus, updateItemStatus };
};

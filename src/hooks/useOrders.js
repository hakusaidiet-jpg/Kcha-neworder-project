import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export const useOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

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
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("Firestore Snapshot received! Doc count:", snapshot.docs.length);
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
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addOrder = async (items, totalAmount, receivedAmount) => {
        if (!db) {
            console.error("addOrder failed: Firestore 'db' is not initialized.");
            return false;
        }
        console.log("addOrder calling Firestore with:", { items, totalAmount, receivedAmount });
        try {
            const docRef = await addDoc(collection(db, 'orders'), {
                items,
                totalAmount,
                receivedAmount,
                change: receivedAmount - totalAmount,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            console.log("addOrder SUCCESS. Doc ID:", docRef.id);
            return true;
        } catch (error) {
            console.error("addOrder ERROR in Firestore write:", error);
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

    return { orders, loading, addOrder, updateOrderStatus };
};

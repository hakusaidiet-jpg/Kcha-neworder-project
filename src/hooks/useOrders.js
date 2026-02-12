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

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert Firestore Timestamp to Date object for easier handling
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            }));
            // Filter for active orders locally or use compound query if indexed
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addOrder = async (items, totalAmount, receivedAmount) => {
        if (!db) return;
        try {
            await addDoc(collection(db, 'orders'), {
                items, // Array of { name, price, quantity, type }
                totalAmount,
                receivedAmount,
                change: receivedAmount - totalAmount,
                status: 'pending', // pending -> completed -> cancelled
                createdAt: serverTimestamp(),
            });
            return true;
        } catch (error) {
            console.error("Error adding order:", error);
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

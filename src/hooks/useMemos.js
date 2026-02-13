import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit, where } from 'firebase/firestore';

export const useMemos = () => {
    const [memos, setMemos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const q = query(
            collection(db, 'memos'),
            where('createdAt', '>=', sixMonthsAgo),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const memosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })).reverse(); // Oldest first for chat display
            setMemos(memosData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addMemo = async (text) => {
        if (!db || !text.trim()) return;
        try {
            await addDoc(collection(db, 'memos'), {
                text,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error adding memo:", error);
        }
    };

    return { memos, loading, addMemo };
};

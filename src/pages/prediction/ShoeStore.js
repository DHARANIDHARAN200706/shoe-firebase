import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import {
  collection, addDoc, getDocs, query, where, deleteDoc, doc
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

export default function ShoeStore() {
  const [shoeName, setShoeName] = useState('');
  const [shoePrice, setShoePrice] = useState('');
  const [shoes, setShoes] = useState([]);
  const [shoeDetails, setShoeDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [pastViews, setPastViews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth)
      .then((userCredential) => {
        setUserId(userCredential.user.uid);
        loadShoes(userCredential.user.uid);
        loadPastViews(userCredential.user.uid);
      })
      .catch((error) => {
        console.error('Auth error:', error);
        setError('Failed to authenticate. Please try again.');
      });
  }, []);

  const loadShoes = async (uid) => {
    try {
      const q = query(collection(db, 'shoes'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const loadedShoes = [];
      const shoeDocs = new Map();
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const price = parseFloat(data.price);
        if (!isNaN(price)) {
          loadedShoes.push({ name: data.shoeName, price });
          shoeDocs.set(data.shoeName, docSnap.id);
        } else {
          console.warn('Invalid shoe price:', docSnap.id, data);
        }
      });
      setShoes(loadedShoes);
      window.shoeDocs = shoeDocs;
    } catch (error) {
      console.error('Error loading shoes:', error);
      setError('Failed to load shoes.');
    }
  };

  const loadPastViews = async (uid) => {
    try {
      const q = query(collection(db, 'shoeViews'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const views = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        views.push({
          id: docSnap.id,
          shoeName: data.shoeName,
          details: data.details,
          timestamp: data.timestamp.toDate().toLocaleString(),
        });
      });
      setPastViews(views.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      console.error('Error loading past views:', error);
      setError('Failed to load past views.');
    }
  };

  const addShoe = async () => {
    const trimmed = shoeName.trim();
    const price = parseFloat(shoePrice);
    if (!trimmed || isNaN(price) || price <= 0) {
      setError('Please enter a valid shoe name and price.');
      return;
    }
    if (shoes.some((shoe) => shoe.name === trimmed)) {
      setError('This shoe is already in your list.');
      return;
    }
    if (userId) {
      try {
        const docRef = await addDoc(collection(db, 'shoes'), {
          userId,
          shoeName: trimmed,
          price,
          timestamp: new Date(),
        });
        setShoes([...shoes, { name: trimmed, price }]);
        window.shoeDocs.set(trimmed, docRef.id);
        setShoeName('');
        setShoePrice('');
        setError('');
      } catch (error) {
        console.error('Error adding shoe:', error);
        setError('Failed to add shoe.');
      }
    }
  };

  const deleteShoe = async (shoeToDelete) => {
    if (userId && window.shoeDocs.has(shoeToDelete)) {
      try {
        const docId = window.shoeDocs.get(shoeToDelete);
        await deleteDoc(doc(db, 'shoes', docId));
        setShoes(shoes.filter((item) => item.name !== shoeToDelete));
        window.shoeDocs.delete(shoeToDelete);
        setError('');
      } catch (error) {
        console.error('Error deleting shoe:', error);
        setError('Failed to delete shoe.');
      }
    }
  };

  const clearShoes = async () => {
    if (userId) {
      try {
        const q = query(collection(db, 'shoes'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const deletePromises = [];
        querySnapshot.forEach((docSnap) => {
          deletePromises.push(deleteDoc(docSnap.ref));
        });
        await Promise.all(deletePromises);
        setShoes([]);
        window.shoeDocs.clear();
        setError('');
      } catch (error) {
        console.error('Error clearing shoes:', error);
        setError('Failed to clear shoes.');
      }
    }
  };

  const viewShoeDetails = async () => {
    if (shoes.length === 0) {
      setError('Add at least one shoe.');
      return;
    }

    setLoading(true);
    setShoeDetails('');
    setError('');
    try {
      const res = await fetch('/api/shoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoes, userId }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setShoeDetails(data.details || 'No details found.');

      if (data.details && userId) {
        await addDoc(collection(db, 'shoeViews'), {
          userId,
          shoeName: shoes.map((s) => s.name).join(', '),
          details: data.details,
          timestamp: new Date(),
        });
        loadPastViews(userId);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      setShoeDetails('Something went wrong!');
      setError('Failed to fetch shoe details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>🥿 Shoe Store</h2>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          type="text"
          value={shoeName}
          onChange={(e) => setShoeName(e.target.value)}
          placeholder="Shoe Name"
          style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="number"
          value={shoePrice}
          onChange={(e) => setShoePrice(e.target.value)}
          placeholder="Price ($)"
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button onClick={addShoe} disabled={!userId} style={{ padding: '10px 15px' }}>
          Add
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button onClick={clearShoes} disabled={!userId || shoes.length === 0} style={{ marginRight: '10px' }}>
          Clear All
        </button>
        <button onClick={viewShoeDetails} disabled={!userId || shoes.length === 0}>
          {loading ? 'Loading...' : 'View Shoe Details'}
        </button>
      </div>

      <h3 style={{ marginTop: '20px' }}>🛍️ Your Shoe List</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {shoes.map((shoe, i) => (
          <div key={i} style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '2px 2px 6px rgba(0,0,0,0.05)',
            position: 'relative',
          }}>
            <h4 style={{ margin: 0 }}>{shoe.name}</h4>
            <p style={{ color: '#666' }}>
              ${typeof shoe.price === 'number' ? shoe.price.toFixed(2) : 'N/A'}
            </p>
            <button
              onClick={() => deleteShoe(shoe.name)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                border: 'none',
                background: 'transparent',
                color: 'red',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {shoeDetails && (
        <div style={{ marginTop: '30px' }}>
          <h3>Shoe Details</h3>
          <p style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
            {shoeDetails}
          </p>
        </div>
      )}

      {pastViews.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>📜 Past Views</h3>
          {pastViews.map((view) => (
            <div key={view.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
              <p><strong>Shoe(s):</strong> {view.shoeName}</p>
              <p><strong>Details:</strong> {view.details}</p>
              <p><strong>Date:</strong> {view.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

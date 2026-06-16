import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (currentUser: User) => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        let currentRole = data.role || 'member';
        
        // Auto bootstrap admin for the verified runtime user email
        if (currentUser.email === 'embrujitos123@gmail.com' && currentRole !== 'admin') {
          await setDoc(userDocRef, { role: 'admin' }, { merge: true });
          currentRole = 'admin';
        }
        setRole(currentRole);
      } else {
        const isDefaultAdmin = currentUser.email === 'embrujitos123@gmail.com';
        const assignedRole = isDefaultAdmin ? 'admin' : 'member';
        
        await setDoc(userDocRef, {
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email,
          photoURL: currentUser.photoURL || '',
          role: assignedRole,
          createdAt: serverTimestamp(),
        });
        setRole(assignedRole);
      }
    } catch (error) {
      console.error("Error fetching or establishing user profile:", error);
      // Fallback if there is an error (e.g. read before creation)
      setRole('member');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchRole(currentUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login with Google failed:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // Immediately set the display profile name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
        
        // Initialize Firestore profile synchronously right after sign up
        const isDefaultAdmin = email === 'embrujitos123@gmail.com';
        const assignedRole = isDefaultAdmin ? 'admin' : 'member';
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, {
          displayName: name,
          email: email,
          photoURL: '',
          role: assignedRole,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Email signup failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUserRole = async () => {
    if (auth.currentUser) {
      await fetchRole(auth.currentUser);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      role, 
      isAdmin, 
      loading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      logout,
      refreshUserRole 
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

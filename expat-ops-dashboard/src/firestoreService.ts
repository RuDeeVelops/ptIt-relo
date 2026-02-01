import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUser } from './authService';

export interface Step {
  id: string;
  userId: string;
  phase: string;
  title: string;
  notes: string;
  budgetEstimated: number;
  budgetActual: number;
  budgetDeferred?: number;
  status: 'todo' | 'progress' | 'done';
  date?: Date | null;
  orderIndex?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const STEPS_COLLECTION = 'steps';

export const addStep = async (step: Omit<Step, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const docRef = await addDoc(collection(db, STEPS_COLLECTION), {
      ...step,
      userId: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding step:', error);
    throw error;
  }
};

export const updateStep = async (stepId: string, updates: Partial<Step>) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const stepRef = doc(db, STEPS_COLLECTION, stepId);
    await updateDoc(stepRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating step:', error);
    throw error;
  }
};

export const deleteStep = async (stepId: string) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  try {
    await deleteDoc(doc(db, STEPS_COLLECTION, stepId));
  } catch (error) {
    console.error('Error deleting step:', error);
    throw error;
  }
};

export const subscribeToUserSteps = (userId: string, callback: (steps: Step[]) => void) => {
  try {
    const q = query(
      collection(db, STEPS_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const steps: Step[] = [];
      snapshot.forEach((doc) => {
        steps.push({ id: doc.id, ...doc.data() } as Step);
      });
      // Sort by orderIndex if available, otherwise by creation date
      steps.sort((a, b) => {
        // If both have orderIndex, use it
        if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number') {
          return a.orderIndex - b.orderIndex;
        }
        // Otherwise, fall back to creation date
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
      callback(steps);
    });
  } catch (error) {
    console.error('Error subscribing to steps:', error);
    throw error;
  }
};

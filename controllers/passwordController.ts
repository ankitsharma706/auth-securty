import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export const listPasswords = async (req: any, res: Response) => {
  try {
    const passwordsSnapshot = await db.collection('passwords')
      .where('userId', '==', req.session.userId)
      .orderBy('sourceName', 'asc')
      .get();
    
    const passwords: any[] = [];
    passwordsSnapshot.forEach(doc => {
      const data = doc.data();
      passwords.push({ 
        id: doc.id, 
        ...data,
        decryptedPassword: decrypt(data.encryptedPassword)
      });
    });

    res.render('passwords/index', { passwords });
  } catch (error) {
    console.error(error);
    res.redirect('/dashboard');
  }
};

export const newPasswordPage = (req: Request, res: Response) => {
  res.render('passwords/new', { error: null });
};

export const createPassword = async (req: any, res: Response) => {
  const { sourceName, username, password, category, notes } = req.body;

  if (!sourceName || !username || !password) {
    return res.render('passwords/new', { error: 'Source, Username/Email, and Password are required' });
  }

  try {
    const encryptedPassword = encrypt(password);
    const newEntry = {
      userId: req.session.userId,
      sourceName,
      username,
      encryptedPassword,
      category: category || 'Social',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('passwords').add(newEntry);
    res.redirect('/passwords');
  } catch (error) {
    console.error(error);
    res.render('passwords/new', { error: 'Failed to save password' });
  }
};

export const searchPasswords = async (req: any, res: Response) => {
  const { query } = req.query;
  if (!query) return res.redirect('/passwords');

  try {
    const passwordsSnapshot = await db.collection('passwords')
      .where('userId', '==', req.session.userId)
      .where('sourceName', '>=', query)
      .where('sourceName', '<=', query + '\uf8ff')
      .get();
    
    const results: any[] = [];
    passwordsSnapshot.forEach(doc => {
      const data = doc.data();
      results.push({ 
        id: doc.id, 
        ...data,
        decryptedPassword: decrypt(data.encryptedPassword)
      });
    });

    res.render('passwords/search', { results, query });
  } catch (error) {
    console.error(error);
    res.redirect('/dashboard');
  }
};

export const retrievePassword = async (req: any, res: Response) => {
  const { sourceName } = req.body;
  if (!sourceName) return res.redirect('/dashboard');

  try {
    const passwordsSnapshot = await db.collection('passwords')
      .where('userId', '==', req.session.userId)
      .where('sourceName', '==', sourceName)
      .limit(1)
      .get();
    
    if (passwordsSnapshot.empty) {
      return res.render('passwords/retrieve_result', { result: null, sourceName });
    }

    const doc = passwordsSnapshot.docs[0];
    const data = doc.data();
    const result = {
      id: doc.id,
      ...data,
      decryptedPassword: decrypt(data.encryptedPassword)
    };

    res.render('passwords/retrieve_result', { result, sourceName });
  } catch (error) {
    console.error(error);
    res.redirect('/dashboard');
  }
};

export const editPasswordPage = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const doc = await db.collection('passwords').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== req.session.userId) {
      return res.redirect('/passwords');
    }

    const data = doc.data();
    const password = {
      id: doc.id,
      ...data,
      decryptedPassword: decrypt(data!.encryptedPassword)
    };

    res.render('passwords/edit', { password, error: null });
  } catch (error) {
    console.error(error);
    res.redirect('/passwords');
  }
};

export const updatePassword = async (req: any, res: Response) => {
  const { id } = req.params;
  const { sourceName, username, password, category, notes } = req.body;

  try {
    const doc = await db.collection('passwords').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== req.session.userId) {
      return res.redirect('/passwords');
    }

    const encryptedPassword = encrypt(password);
    await db.collection('passwords').doc(id).update({
      sourceName,
      username,
      encryptedPassword,
      category,
      notes,
      updatedAt: new Date()
    });

    res.redirect('/passwords');
  } catch (error) {
    console.error(error);
    res.redirect('/passwords');
  }
};

export const deletePassword = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const doc = await db.collection('passwords').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== req.session.userId) {
      return res.redirect('/passwords');
    }

    await db.collection('passwords').doc(id).delete();
    res.redirect('/passwords');
  } catch (error) {
    console.error(error);
    res.redirect('/passwords');
  }
};

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { db } from '../config/firebase.js';

export const registerPage = (req: Request, res: Response) => {
  res.render('auth/register', { error: null });
};

export const loginPage = (req: Request, res: Response) => {
  res.render('auth/login', { error: null });
};

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('auth/register', { error: 'Please provide all fields' });
  }

  try {
    const userQuery = await db.collection('users').where('email', '==', email).get();
    if (!userQuery.empty) {
      return res.render('auth/register', { error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      email,
      passwordHash,
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userRef = await db.collection('users').add(newUser);
    
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.render('auth/register', { error: 'Registration failed during session setup.' });
      }
      (req.session as any).userId = userRef.id;
      (req.session as any).email = email;
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error(error);
    res.render('auth/register', { error: 'Registration failed. Please try again.' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('auth/login', { error: 'Please provide all fields' });
  }

  try {
    const userQuery = await db.collection('users').where('email', '==', email).get();
    if (userQuery.empty) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(password, userData.passwordHash);

    if (!isMatch) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (userData.twoFactorEnabled) {
      // 2FA is a partial login, we keep the session but mark it as pending
      (req.session as any).tempUserId = userDoc.id;
      (req.session as any).tempEmail = email;
      return res.redirect('/2fa/verify-login');
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.render('auth/login', { error: 'Login failed during session setup.' });
      }
      (req.session as any).userId = userDoc.id;
      (req.session as any).email = email;
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error(error);
    res.render('auth/login', { error: 'Login failed. Please try again.' });
  }
};

export const setup2FA = async (req: any, res: Response) => {
  try {
    const userDoc = await db.collection('users').doc(req.session.userId).get();
    if (!userDoc.exists) return res.redirect('/dashboard');

    const secret = speakeasy.generateSecret({
      name: `SecureVaultPro:${req.session.email}`
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store temporarily in session or DB
    (req.session as any).tempSecret = secret.base32;

    res.render('auth/2fa-setup', { 
      qrCodeDataUrl, 
      secret: secret.base32,
      error: null 
    });
  } catch (error) {
    console.error(error);
    res.redirect('/dashboard');
  }
};

export const verifySetup2FA = async (req: any, res: Response) => {
  const { token } = req.body;
  const secret = req.session.tempSecret;

  if (!token || !secret) {
    return res.render('auth/2fa-setup', { 
      error: 'Invalid setup session. Please try again.',
      qrCodeDataUrl: null,
      secret: null
    });
  }

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token
  });

  if (verified) {
    await db.collection('users').doc(req.session.userId).update({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      updatedAt: new Date()
    });
    delete req.session.tempSecret;
    res.redirect('/dashboard');
  } else {
    // Re-generate QR for the retry or allow them to retry with same secret
    res.render('auth/2fa-setup', { 
      error: 'Invalid token. Please try again.',
      qrCodeDataUrl: await QRCode.toDataURL(`otpauth://totp/SecureVaultPro:${req.session.email}?secret=${secret}`),
      secret: secret
    });
  }
};

export const verifyLogin2FAPage = (req: Request, res: Response) => {
  if (!(req.session as any).tempUserId) {
    console.log('No tempUserId in session, redirecting to login');
    return res.redirect('/login');
  }
  res.render('auth/2fa-verify', { error: null });
};

export const verifyLogin2FA = async (req: Request, res: Response) => {
  const { token } = req.body;
  const tempUserId = (req.session as any).tempUserId;
  const tempEmail = (req.session as any).tempEmail;

  if (!tempUserId) {
    console.log('Verification failed: No tempUserId in session');
    return res.redirect('/login');
  }

  try {
    const userDoc = await db.collection('users').doc(tempUserId).get();
    if (!userDoc.exists) {
      console.log('Verification failed: User record not found');
      return res.render('auth/login', { error: 'Session expired. Please login again.' });
    }

    const userData = userDoc.data();

    const verified = speakeasy.totp.verify({
      secret: userData!.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow for slight clock drift (30 seconds)
    });

    if (verified) {
      console.log(`2FA Success for user: ${tempEmail}`);
      
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.render('auth/2fa-verify', { error: 'Verification failed during session setup.' });
        }
        (req.session as any).userId = tempUserId;
        (req.session as any).email = tempEmail;
        res.redirect('/dashboard');
      });
    } else {
      console.log(`2FA Invalid token for user: ${tempEmail}`);
      res.render('auth/2fa-verify', { error: 'Invalid 2FA token. Please try again.' });
    }
  } catch (error) {
    console.error('2FA Verification Error:', error);
    res.render('auth/2fa-verify', { error: 'Verification system unavailable. Please try later.' });
  }
};

export const disable2FA = async (req: any, res: Response) => {
  try {
    await db.collection('users').doc(req.session.userId).update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date()
    });
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.redirect('/dashboard');
  }
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/login');
  });
};

import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && (req.session as any).userId) {
    return next();
  }
  res.redirect('/login');
};

export const isNotAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && (req.session as any).userId) {
    return res.redirect('/dashboard');
  }
  next();
};

export interface User {
  id?: string;
  email: string;
  passwordHash: string;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordEntry {
  id?: string;
  userId: string;
  sourceName: string;
  username: string;
  encryptedPassword: string;
  category: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

# SecureVault Pro | Premium Password Manager

SecureVault Pro is a production-ready password management system built with security as a priority. It uses industry-standard encryption and hashing to ensure your credentials remain private and unreachable even in the event of a database breach.

## 🛡️ Security Architecture

### 1. Secure Password Storage
We never store passwords in plain text. Every password entry in the database is encrypted using **AES-256-CBC** via the `crypto-js` library. The encryption key is stored securely in environment variables and is never exposed to the client.

### 2. Password Hashing
User accounts are protected using **bcrypt**. When a user creates an account, their master password is salted and hashed with a cost factor of 10. This makes dictionary attacks and rainbow table attacks computationally expensive and virtually impossible.

### 3. Password Retrieval Security
The "Retrieve Password" feature performs a direct database query via Firebase Firestore. Results are decrypted on-the-fly and served to the user only after successful session authentication.

### 4. Session Handling
Sessions are managed using `express-session` with a secure secret. Session cookies are configured to be `httpOnly` to prevent XSS-based session hijacking.

### 5. Brute-Force Protection
The application implements traditional login verification logic. On the server side, multiple failed attempts can be tracked via the user model (future expansion) to lock accounts temporarily.

## 🚀 Installation & Setup

1. **Clone the repository**
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   - `SESSION_SECRET`: A long random string.
   - `ENCRYPTION_KEY`: A 32-character string for AES encryption.
   - `GEMINI_API_KEY`: (Optional) For AI features.
4. **Firebase Configuration**:
   Ensure `firebase-applet-config.json` is present with your project details.
5. **Run Development Server**:
   ```bash
   npm run dev
   ```
6. **Build for Production**:
   ```bash
   npm run build
   ```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Database**: Google Firestore (via Firebase Admin SDK)
- **Templating**: EJS
- **Authentication**: Custom Auth with bcrypt
- **Security**: CryptoJS (AES-256), bcrypt
- **Styling**: Tailwind CSS 4.0

## 🧪 Troubleshooting

- **Firestore Permission Denied**: Check `firestore.rules` and ensure your service account has the "Cloud Datastore User" role.
- **Session Not Persisting**: Ensure your browser accepts cookies and that the `SESSION_SECRET` is set.
- **Decryption Failed**: This happens if the `ENCRYPTION_KEY` changes. Existing passwords will become unreadable if the key is lost.

---
*Created by Senior Cybersecurity Engineer & Full-stack Architect.*

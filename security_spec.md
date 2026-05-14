# Security Specification: SecureVault Pro

## 1. Data Invariants
- A password entry MUST belong to the authenticated user (`userId` match).
- Passwords MUST be stored in an encrypted format.
- `sourceName` is required and must be unique per user (handled in application logic).
- `createdAt` is immutable after creation.
- A user can only access their own password entries.

## 2. Integrity & Identity
- Users are authenticated via Firebase Auth.
- Sessions are managed via `express-session` with secure cookies.
- Server-side validation ensures that users cannot spoof `userId` during Firestore writes.

## 3. "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a password entry for a different `userId`.
2. **Access Breach**: Attempt to `list` passwords without being logged in.
3. **Data Poisoning**: Attempt to inject a 10MB string into `sourceName`.
4. **Relational Leak**: Attempt to `get` a password entry by ID that belongs to another user.
5. **Timestamp Tampering**: Attempt to set `createdAt` to a future date.
6. **Immutable Field Attack**: Attempt to change `userId` on an existing password entry.
7. **Bypassing Encryption**: Attempt to write a plain text password (app logic prevents this, but rules check types).
8. **Shadow Fields**: Attempt to add `isAdmin: true` to a user profile.
9. **Query Scraping**: Attempt to list all passwords in the database.
10. **Orphaned Writes**: Attempt to create a password for a non-existent user (app logic ensures user exists).
11. **Malicious IDs**: Attempt to use a password ID containing characters like `../../../etc/passwd`.
12. **Brute Force**: Attempt to login 100 times in a minute (handled by middleware).

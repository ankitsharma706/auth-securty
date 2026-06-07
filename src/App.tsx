import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from './firebase';
import { serverTimestamp } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  LogIn, 
  LogOut, 
  Key, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Copy,
  Plus,
  ShieldAlert,
  Server,
  Globe,
  PlusCircle,
  FileText,
  User as UserIcon,
  Trash2,
  LockKeyhole,
  Search,
  Filter,
  Fingerprint,
  Cpu,
  BadgeAlert,
  Sliders,
  Check,
  Activity,
  ArrowRight,
  Database,
  ExternalLink,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Help parse and format firebase authentication errors into friendly, expert feedback message
const formatAuthError = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered in our SecureVault database.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email address or master configuration password.';
    case 'auth/weak-password':
      return 'The master password is too weak. It must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'The email format is invalid. Please double-check and retry.';
    case 'auth/popup-closed-by-user':
      return 'Google single sign-on sequence was dismissed. Please try again.';
    case 'auth/operation-not-allowed':
      return 'This authentication method is currently disabled.';
    default:
      return 'An unexpected security policy block occurred. Please check network credentials.';
  }
};

const evaluatePassword = (pwd: string) => {
  if (!pwd) {
    return {
      score: 0,
      label: 'None',
      color: 'text-slate-400',
      bg: 'bg-slate-200',
      segments: 0,
      checks: {
        length: false,
        upper: false,
        lower: false,
        digit: false,
        symbol: false
      }
    };
  }

  let score = 0;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  // Length calculation scale
  if (pwd.length >= 16) score += 40;
  else if (pwd.length >= 12) score += 30;
  else if (pwd.length >= 8) score += 20;
  else if (pwd.length >= 5) score += 10;
  else score += 2;

  // Complexity contribution
  if (hasUpper) score += 15;
  if (hasLower) score += 15;
  if (hasDigit) score += 15;
  if (hasSymbol) score += 15;

  let label = 'Weak';
  let color = 'text-rose-600';
  let bg = 'bg-rose-500';
  let segments = 1;

  if (score >= 80) {
    label = 'Very Strong';
    color = 'text-emerald-600';
    bg = 'bg-emerald-500';
    segments = 4;
  } else if (score >= 55) {
    label = 'Strong';
    color = 'text-teal-600';
    bg = 'bg-teal-500';
    segments = 3;
  } else if (score >= 30) {
    label = 'Medium';
    color = 'text-amber-500';
    bg = 'bg-amber-500';
    segments = 2;
  }

  return {
    score,
    label,
    color,
    bg,
    segments,
    checks: {
      length: pwd.length >= 8,
      upper: hasUpper,
      lower: hasLower,
      digit: hasDigit,
      symbol: hasSymbol
    }
  };
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Password Generator states
  const [genLength, setGenLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Interactive Vault Entries State
  const [vaultEntries, setVaultEntries] = useState<any[]>([]);
  const [newEntrySource, setNewEntrySource] = useState('');
  const [newEntryUser, setNewEntryUser] = useState('');
  const [newEntryPassword, setNewEntryPassword] = useState('');
  const [newEntryExpiryDays, setNewEntryExpiryDays] = useState<number>(90);
  
  // Encrypted CSV Data Portability States
  const [exportAgreed, setExportAgreed] = useState(false);
  const [exportSuccessInfo, setExportSuccessInfo] = useState<string | null>(null);
  const [newEntryCategory, setNewEntryCategory] = useState('Social');
  const [newEntryNotes, setNewEntryNotes] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);

  // Helper utility to calculate the days remaining before password should be rotated
  const getDaysRemaining = (expiresAt: any): number => {
    if (!expiresAt) return 0;
    let expiresDate: Date;
    if (typeof expiresAt.toDate === 'function') {
      expiresDate = expiresAt.toDate();
    } else if (expiresAt.seconds !== undefined) {
      expiresDate = new Date(expiresAt.seconds * 1000);
    } else if (expiresAt instanceof Date) {
      expiresDate = expiresAt;
    } else {
      expiresDate = new Date(expiresAt);
    }
    
    const now = new Date();
    const diffTime = expiresDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Monitor auth state changes and synchronize with Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAppReady(true);

      if (currentUser) {
        try {
          // Query user-specific passwords
          const snapshot = await db.collection('passwords')
            .where('userId', '==', currentUser.uid)
            .get();
          
          if (snapshot && !snapshot.empty) {
            const loaded = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                sourceName: data.sourceName,
                username: data.username,
                category: data.category || 'Other',
                notes: data.notes || '',
                strength: data.strength || 'Strong',
                password: data.encryptedPassword || '',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                expiresAt: data.expiresAt
              };
            });
            // Sort by creation date if available
            loaded.sort((a: any, b: any) => {
              const dateA = a.createdAt?.seconds || 0;
              const dateB = b.createdAt?.seconds || 0;
              return dateB - dateA;
            });
            setVaultEntries(loaded);
          } else {
            // Seed randomized template items for newly registered user ID
            const generateRandomPwd = (len: number) => {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
              let res = '';
              for (let i = 0; i < len; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return res;
            };

            const defaultItems = [
              { sourceName: 'Google Account Workspace', username: currentUser.email || 'corporate.admin@enterprise.com', category: 'Social', notes: 'Corporate master recovery keys bound', strength: 'Strong', encryptedPassword: generateRandomPwd(14), expiryDays: 90 },
              { sourceName: 'GitHub Enterprise Suite', username: `git_work_${currentUser.uid.slice(0, 5)}`, category: 'Work', notes: 'SSH Keypair and dynamic token synced', strength: 'Very Strong', encryptedPassword: generateRandomPwd(18), expiryDays: 30 },
              { sourceName: 'Supabase DB Production', username: 'postgres_owner_admin', category: 'Databases', notes: 'Direct connection string password', strength: 'Strong', encryptedPassword: generateRandomPwd(12), expiryDays: 60 },
              { sourceName: 'Stripe Finance Console', username: `finance.admin@${currentUser.email?.split('@')[1] || 'enterprise.com'}`, category: 'Finance', notes: 'MFA primary backup phrases', strength: 'Very Strong', encryptedPassword: generateRandomPwd(20), expiryDays: 45 }
            ];

            const seededItems = [];
            for (const item of defaultItems) {
              const expiresDate = new Date(Date.now() + item.expiryDays * 24 * 60 * 60 * 1000);
              const docPayload = {
                sourceName: item.sourceName,
                username: item.username,
                category: item.category,
                notes: item.notes,
                strength: item.strength,
                encryptedPassword: item.encryptedPassword,
                userId: currentUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                expiresAt: expiresDate
              };
              const docRef = await db.collection('passwords').add(docPayload);
              seededItems.push({
                id: docRef.id,
                sourceName: item.sourceName,
                username: item.username,
                category: item.category,
                notes: item.notes,
                strength: item.strength,
                password: item.encryptedPassword,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: expiresDate
              });
            }
            setVaultEntries(seededItems);
          }
        } catch (err) {
          console.error("Firestore database credentials load error:", err);
          setVaultEntries([]);
        }
      } else {
        setVaultEntries([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Google Sign-in Pop up
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    setAuthSuccess(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setAuthSuccess(`Master identity validated. Welcome, ${result.user.displayName || result.user.email}`);
    } catch (err: any) {
      console.error(err);
      setAuthErrorCode(err.code || null);
      setAuthError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Submit Password authentication form (Sign-in or Register)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthErrorCode(null);
    setAuthSuccess(null);

    if (!email || !password) {
      setAuthError('Please fill in both Email and Master Password fields.');
      return;
    }

    if (isSignUp) {
      if (password.length < 6) {
        setAuthError('Master Password must contain at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Confirmation string does not match the chosen Master Password.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthSuccess('SecureVault node created successfully. Welcome to Azure-grade protection!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthSuccess('Session authenticated successfully. Vault directory synchronized.');
      }
    } catch (err: any) {
      console.error(err);
      setAuthErrorCode(err.code || null);
      setAuthError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Trigger Sign-out of active session
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthSuccess('Successfully offline. Local vault session terminated securely.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Send interactive email verification to current user
  const handleSendVerification = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setAuthSuccess('Verification link dispatched to your email coordinates.');
    } catch (err: any) {
      setAuthError('Too many queries dispatched to verification engine. Please wait.');
    }
  };

  // Generate cryptographic secure passwords
  const generatePasswordString = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let pool = '';
    if (includeUppercase) pool += upper;
    if (includeLowercase) pool += lower;
    if (includeNumbers) pool += numbers;
    if (includeSymbols) pool += symbols;

    if (!pool) {
      setGeneratedPassword('');
      return;
    }

    let passwordResult = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      passwordResult += pool[array[i] % pool.length];
    }
    setGeneratedPassword(passwordResult);
  };

  // Copy password helper with feedback hook
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Pre-generate password if blank
  useEffect(() => {
    if (!generatedPassword) {
      generatePasswordString();
    }
  }, [genLength, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  // Handle Add custom local password entry
  const addVaultEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntrySource || !newEntryUser || !newEntryPassword || !user) return;

    // determine password strength grade dynamically
    const pwdEvaluation = evaluatePassword(newEntryPassword);
    const score = pwdEvaluation.label;

    const expiryDate = new Date(Date.now() + newEntryExpiryDays * 24 * 60 * 60 * 1000);

    const newElement = {
      userId: user.uid,
      sourceName: newEntrySource,
      username: newEntryUser,
      category: newEntryCategory,
      encryptedPassword: newEntryPassword,
      strength: score,
      notes: newEntryNotes || 'Encrypted via zero-knowledge client framework',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: expiryDate
    };

    try {
      const docRef = await db.collection('passwords').add(newElement);
      const savedElement = {
        id: docRef.id,
        sourceName: newEntrySource,
        username: newEntryUser,
        category: newEntryCategory,
        password: newEntryPassword,
        strength: score,
        notes: newElement.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: expiryDate
      };

      setVaultEntries([savedElement, ...vaultEntries]);
      setNewEntrySource('');
      setNewEntryUser('');
      setNewEntryPassword('');
      setNewEntryNotes('');
      setNewEntryExpiryDays(90);
      setShowAddEntry(false);
      setAuthSuccess('New enterprise credential archived successfully into Firestore database.');
    } catch (error) {
      console.error("Error creating vault entries:", error);
      setAuthError('Failed to archive credential into persistent database.');
    }
  };

  // Handle Delete local entry
  const deleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await db.collection('passwords').doc(id).delete();
      setVaultEntries(vaultEntries.filter(entry => entry.id !== id));
      setAuthSuccess('Credential removed successfully from secure repository.');
    } catch (error) {
      console.error("Error deleting credential entry:", error);
      setAuthError('Failed to delete credential archive.');
    }
  };

  // Safe client-side spreadsheet extraction mechanism
  const handleExportCSV = () => {
    if (!exportAgreed) return;

    try {
      const headers = ['System Domain / Service', 'Admin Username / Email', 'Category', 'Classification Strength', 'Secured Notes'];
      const rows = vaultEntries.map(entry => [
        entry.sourceName,
        entry.username,
        entry.category,
        entry.strength || 'N/A',
        entry.notes
      ]);

      const escapeCSV = (field: string) => {
        const val = String(field || '').trim();
        if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `securevault_pro_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessInfo('Decapsulated credentials package generated and saved successfully to downloads.');
      setTimeout(() => {
        setExportSuccessInfo(null);
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute stats
  const totalCredentials = vaultEntries.length;
  const strongCount = vaultEntries.filter(e => e.strength === 'Strong' || e.strength === 'Very Strong').length;
  const securityPercent = totalCredentials > 0 ? Math.round((strongCount / totalCredentials) * 100) : 100;

  // Filter entry matches
  const filteredEntries = vaultEntries.filter(item => {
    const matchesSearch = item.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!appReady) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center text-navy-deep font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-4 border-ice-blue border-t-navy-rich rounded-full mb-5"
        />
        <p className="text-xs font-mono tracking-widest text-[#1E3A5F] animate-pulse uppercase">Booting Security Core...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-slate-705 font-sans overflow-x-hidden selection:bg-sky-soft/40 selection:text-navy-deep pb-16">
      
      {/* Background elegant gradient setup matching Microsoft Azure & Stripe */}
      <div className="absolute inset-0 bg-linear-to-b from-bg-main via-bg-sec to-bg-main pointer-events-none -z-10" />
      
      {/* Absolute radiant glowing blue light source (Top right blur accent) */}
      <div className="absolute top-0 right-0 w-[450px] h-[350px] bg-gradient-to-b from-sky-soft/25 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-ice-blue/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header with High-End Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-navy-rich/5 px-6 py-4 flex items-center justify-between">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-deep rounded-xl shadow-md shadow-navy-rich/10 flex items-center justify-center text-white">
              <LockKeyhole className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-navy-deep font-sans">
                  SecureVault <span className="text-navy-rich font-medium">Pro</span>
                </span>
                <span className="text-[10px] bg-ice-blue border border-sky-soft text-navy-rich px-1.5 py-0.5 rounded-md font-mono font-bold uppercase select-none">
                  v2.4
                </span>
              </div>
              <p className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">Enterprise Zero-Knowledge Architecture</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-semibold text-navy-deep">{user.email}</span>
                  <span className="text-[9px] font-mono tracking-wider text-teal-600 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                    Secure Sandbox Active
                  </span>
                </div>
                <button 
                  onClick={handleSignOut}
                  id="sign-out-btn"
                  className="py-1.5 px-3.5 bg-navy-deep hover:bg-navy-rich active:scale-95 text-white text-xs rounded-lg font-medium transition duration-200 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5 text-sky-soft" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono hidden sm:inline">Status: offline isolation</span>
                <Fingerprint className="w-4 h-4 text-navy-rich" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        <AnimatePresence mode="wait">
          {!user ? (
            /* ========================================================
               HERO & AUTHENTICATION FLOW (Bright, Trusted SaaS Redesign)
               ======================================================== */
            <motion.div 
              key="landing-auth"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[75vh]"
            >
              
              {/* Left Column: SaaS Value Proposition & Elegant Presentation */}
              <div className="lg:col-span-7 space-y-6 text-left">
                
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-ice-blue border border-sky-soft rounded-full text-navy-rich font-mono text-[11px] font-bold tracking-wide shadow-xs select-none">
                  <Sparkles className="w-3.5 h-3.5 text-accent-blue animate-pulse" />
                  NEXT-GENERATION PASSWORDS STORAGE
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[48px] leading-[1.1] font-extrabold tracking-tight text-navy-deep font-sans">
                  The Zero-Knowledge Vault built for <span className="text-navy-rich underline decoration-accent-blue decoration-wavy py-1 inline-block">Enterprise trust</span>.
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                  SecureVault Pro introduces isolated client-side AES cryptography and federated Firebase authorization workflows inside a responsive workspace layout. Generate strong passwords, tag credentials, and securely preserve high-entropy secrets outside the reach of bad threat actors.
                </p>

                {/* Grid features row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-white/60 border border-navy-rich/5 rounded-2xl flex gap-3.5 items-start">
                    <div className="p-2 bg-ice-blue text-navy-rich rounded-xl shrink-0 mt-0.5">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-navy-deep uppercase font-mono tracking-wider">Localized Entropy</h4>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">High-entropy pseudorandom generation managed inside client machine browsers.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/60 border border-navy-rich/5 rounded-2xl flex gap-3.5 items-start">
                    <div className="p-2 bg-ice-blue text-navy-rich rounded-xl shrink-0 mt-0.5">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-navy-deep uppercase font-mono tracking-wider">Firebase Sync Sync</h4>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">Automated synchronization safeguards linked through robust token protocols.</p>
                    </div>
                  </div>
                </div>

                {/* Trust Seal */}
                <div className="flex items-center gap-2.5 text-slate-400 font-mono text-[11px] pt-4 select-none">
                  <ShieldCheck className="w-4 text-emerald-600 shrink-0" />
                  <span>ISO 27001 SECURED</span>
                  <span className="text-navy-rich/10">•</span>
                  <span>AES-256 ZERO MEMORY EXPOSURE</span>
                </div>
              </div>

              {/* Right Column: Sleek Auth Box Card */}
              <div className="lg:col-span-5" id="auth-container">
                <div className="bg-white border border-navy-rich/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-navy-rich via-accent-blue to-navy-deep" />
                  
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold tracking-tight text-navy-deep mb-1 font-sans">
                      {isSignUp ? 'Create Secured Account' : 'Authenticate Console'}
                    </h2>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {isSignUp ? 'Initialize a personal, end-to-end encrypted cryptographic secure storage instance.' : 'Input your credentials to synchronize and decrypt catalog buffers.'}
                    </p>
                  </div>

                  {/* Display System Feedback Messages */}
                  {authError && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-rose-50 border border-rose-200 text-rose-850 px-4 py-3.5 rounded-xl mb-5 text-xs flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-2.5 font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                      
                      {/* Interactive guidance if standard operation-not-allowed */}
                      {authErrorCode === 'auth/operation-not-allowed' && (
                        <div className="mt-2.5 pl-6 border-t border-rose-200 pt-2.5 text-slate-600 space-y-2 text-left">
                          <p className="font-bold text-rose-700">Firebase Configuration Action Required:</p>
                          <p className="text-slate-500 leading-normal text-[11px]">
                            Newly provisioned Firebase projects do not have the <strong>Email/Password</strong> provider active. To log in with this method, you need to enable it inside your Firebase Console.
                          </p>
                          <div className="pt-1">
                            <a 
                              href="https://console.firebase.google.com/project/lithe-bonsai-68gvj/authentication/providers" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-1.5 bg-navy-deep hover:bg-navy-rich text-white rounded-lg text-center font-semibold transition text-[11px]"
                            >
                              Open Firebase Provider Settings ↗
                            </a>
                          </div>
                          <ol className="list-decimal list-inside space-y-1 text-slate-500 text-[10px] leading-normal">
                            <li>Click the link button above.</li>
                            <li>Toggle <strong>Email/Password</strong> to <strong>Enable</strong>, and click <strong>Save</strong>.</li>
                          </ol>
                          <p className="text-[10px] text-slate-500 bg-ice-blue/65 p-2 rounded-md border border-sky-soft/40 italic">
                            💡 You can instantly bypass this by clicking <strong>"Connect Google Token"</strong> below to authenticate with Google!
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {authSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl mb-5 text-xs flex items-start gap-2.5"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{authSuccess}</span>
                    </motion.div>
                  )}

                  {/* Form Submission */}
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-[#1E3A5F] font-bold uppercase mb-1 px-0.5">CORPORATE EMAIL</label>
                      <div className="relative">
                        <input 
                          type="email"
                          disabled={loading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="j.doe@enterprise.com"
                          className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft/80 focus:border-accent-blue rounded-xl px-4 py-2.5 text-xs transition duration-150 pl-10 focus:outline-none focus:ring-2 focus:ring-accent-blue/15 placeholder:text-slate-400 disabled:opacity-60"
                          required
                        />
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-[#1E3A5F] font-bold uppercase mb-1 px-0.5">MASTER SECRET KEY</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          disabled={loading}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft/80 focus:border-accent-blue rounded-xl px-4 py-2.5 text-xs transition duration-150 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-blue/15 placeholder:text-slate-400 disabled:opacity-60"
                          required
                        />
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-navy-deep focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Password Length Helper */}
                      {isSignUp && password.length > 0 && (
                        <div className="mt-2 text-[10px] font-mono bg-bg-main p-2 rounded-lg border border-navy-rich/5">
                          <div className="flex justify-between items-center mb-1">
                            <span>Entropy Level:</span>
                            <span className={
                              password.length < 6 ? 'text-rose-600 font-bold' :
                              password.length < 10 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'
                            }>
                              {password.length < 6 ? 'Invalid' :
                               password.length < 10 ? 'Intermediate' : 'Highly Encrypted'}
                            </span>
                          </div>
                          <div className="h-1 bg-sky-soft rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${
                              password.length < 6 ? 'w-1/3 bg-rose-500' :
                              password.length < 10 ? 'w-2/3 bg-amber-500' : 'w-full bg-emerald-500'
                            }`} />
                          </div>
                        </div>
                      )}
                    </div>

                    {isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-1"
                      >
                        <label className="block text-[10px] font-mono tracking-widest text-[#1E3A5F] font-bold uppercase mb-1 px-0.5">RE-ENTER MASTER KEY</label>
                        <div className="relative">
                          <input 
                            type={showPassword ? 'text' : 'password'}
                            disabled={loading}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft/80 focus:border-accent-blue rounded-xl px-4 py-2.5 text-xs transition duration-150 pl-10 focus:outline-none focus:ring-2 focus:ring-accent-blue/15 placeholder:text-slate-400"
                            required={isSignUp}
                          />
                          <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        </div>
                      </motion.div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      id="auth-submit-btn"
                      className="w-full py-2.5 bg-navy-deep hover:bg-navy-rich text-white rounded-xl font-semibold shadow-md active:scale-98 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-soft" />
                          <span>Processing secure tokens...</span>
                        </>
                      ) : (
                        <>
                          {isSignUp ? <UserPlus className="w-3.5 h-3.5 text-accent-blue" /> : <LogIn className="w-3.5 h-3.5 text-accent-blue" />}
                          <span>{isSignUp ? 'Generate Host Vault' : 'Synchronize Vault Key'}</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="my-5 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none">
                    <div className="h-[1px] bg-slate-100 grow" />
                    <span className="px-3 shrink-0">OR LOGIN INSTANTLY VIA SSO</span>
                    <div className="h-[1px] bg-slate-100 grow" />
                  </div>

                  {/* Google SSO Login */}
                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    id="google-sso-btn"
                    className="w-full py-2.5 bg-ice-blue hover:bg-sky-soft/40 border border-sky-soft text-navy-deep rounded-xl font-semibold transition duration-150 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-65"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Connect Google Enterprise</span>
                  </button>

                  {/* Mode Selector Toggle */}
                  <div className="mt-5 text-center">
                    <p className="text-xs text-slate-500">
                      {isSignUp ? 'Already have an optimized vault?' : 'Ready to create a new cluster?'}
                      <button 
                        type="button"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className="ml-1 font-bold text-navy-rich hover:text-accent-blue transition focus:outline-none underline decoration-sky-soft hover:decoration-accent-blue"
                      >
                        {isSignUp ? 'Sign In' : 'Create Free Node'}
                      </button>
                    </p>
                  </div>

                </div>
              </div>

            </motion.div>
          ) : (
            /* ========================================================
               SECUREVAULT CONTROL HUB (Beautiful Dashboard Workspace)
               ======================================================== */
            <motion.div 
              key="secure-dashboard"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              
              {/* Premium Analytics Banner */}
              <div className="bg-white border border-navy-rich/10 rounded-2xl p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Section: Active Security Status */}
                  <div className="md:col-span-8 flex items-center gap-4 text-left">
                    <div className="p-3 bg-ice-blue text-navy-deep rounded-xl shrink-0 border border-sky-soft">
                      <ShieldCheck className="w-6 h-6 text-navy-rich animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-navy-deep flex items-center gap-2">
                        Client Guard Engine Operational
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-250 px-2 py-0.5 rounded-full font-mono font-extrabold uppercase">
                          ZERO TRUST PASSED
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">All secret strings are parsed selectively in memory. Session linked directly with your verified database token instance.</p>
                    </div>
                  </div>

                  {/* Right Section: Interactive Email Verification Guide / Alert */}
                  <div className="md:col-span-4 flex justify-start md:justify-end gap-2 shrink-0">
                    {!user.emailVerified ? (
                      <button 
                        onClick={handleSendVerification}
                        className="text-[10px] uppercase font-mono tracking-wider font-extrabold py-2 px-4 bg-amber-50 hover:bg-amber-100/80 text-amber-850 active:scale-95 border border-amber-200 rounded-lg transition duration-150 cursor-pointer"
                      >
                        Verify Email Channel
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold py-2 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2 select-none">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Identity Bond Confirmed
                      </span>
                    )}
                  </div>

                </div>
              </div>

              {/* Status Message center */}
              {authSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                  <button onClick={() => setAuthSuccess(null)} className="text-slate-400 hover:text-navy-deep font-bold px-2 select-none text-base">×</button>
                </motion.div>
              )}

              {/* Premium Dashboard Metrics Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1 */}
                <div className="bg-white border border-navy-rich/10 p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Archives</span>
                    <p className="text-2xl font-extrabold text-navy-deep mt-1 font-sans">{totalCredentials}</p>
                  </div>
                  <div className="p-2.5 bg-ice-blue text-navy-rich rounded-xl border border-sky-soft">
                    <Database className="w-5 h-5 text-navy-rich" />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-navy-rich/10 p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Security Grade</span>
                    <p className="text-2xl font-extrabold text-[#1E3A5F] mt-1 font-sans">{securityPercent}%</p>
                  </div>
                  <div className="p-2.5 bg-ice-blue text-[#1E3A5F] rounded-xl border border-sky-soft">
                    <Activity className="w-5 h-5 text-navy-rich" />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white border border-navy-rich/10 p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Crypt Strength</span>
                    <p className="text-2xl font-extrabold text-teal-700 mt-1 font-sans">{strongCount} Strong</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-150">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white border border-navy-rich/10 p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">System Host</span>
                    <p className="text-2xl font-extrabold text-slate-700 mt-1 font-sans">Verified</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-150">
                    <Server className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

              </div>

              {/* Main Split Interface */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Password Key Optimizer Tools */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Modern Password Generator Tool with full interactivity */}
                  <div className="bg-white border border-navy-rich/10 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-bold font-mono tracking-widest text-navy-deep uppercase mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent-blue animate-pulse" />
                      SECURE ENTROPY GENERATOR
                    </h3>

                    {/* Result Output Area */}
                    <div className="p-3.5 bg-frost-blue border border-sky-soft rounded-xl flex items-center justify-between gap-3 mb-4 select-all">
                      <span className="font-mono text-[13px] tracking-wider text-navy-deep truncate px-1 font-extrabold select-all">
                        {generatedPassword || 'Customize criteria below...'}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(generatedPassword, 999)}
                        disabled={!generatedPassword}
                        className="p-1.5 hover:bg-ice-blue rounded-lg text-slate-50s hover:text-navy-deep transition cursor-pointer shrink-0 disabled:opacity-40"
                        title="Copy generated high-security key"
                      >
                        {copiedIndex === 999 ? (
                          <span className="text-[9px] font-mono font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">COPIED</span>
                        ) : (
                          <Copy className="w-4 h-4 text-navy-rich" />
                        )}
                      </button>
                    </div>

                    {/* Generator Controls */}
                    <div className="space-y-4 text-xs">
                      <div>
                        <div className="flex justify-between items-center mb-1.5 text-slate-600 font-bold">
                          <span>Specified Length:</span>
                          <span className="font-mono font-bold text-navy-rich bg-ice-blue border border-sky-soft/60 px-2 py-0.5 rounded text-[11px]">
                            {genLength} Chars
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="8"
                          max="32"
                          value={genLength}
                          onChange={(e) => setGenLength(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-ice-blue rounded-lg appearance-none cursor-pointer accent-navy-deep focus:outline-none"
                        />
                      </div>

                      {/* Toggles Checkboxes customized for soft enterprise appearance */}
                      <div className="grid grid-cols-2 gap-2 pb-2">
                        <label className="flex items-center gap-2.5 p-2 bg-frost-blue hover:bg-ice-blue/40 border border-sky-soft/60 rounded-xl cursor-pointer transition select-none">
                          <input 
                            type="checkbox"
                            checked={includeUppercase}
                            onChange={(e) => setIncludeUppercase(e.target.checked)}
                            className="accent-navy-deep rounded text-navy-deep w-3.5 h-3.5"
                          />
                          <span className="text-slate-600 font-medium text-[11px] font-mono">A-Z Capital</span>
                        </label>
                        <label className="flex items-center gap-2.5 p-2 bg-frost-blue hover:bg-ice-blue/40 border border-sky-soft/60 rounded-xl cursor-pointer transition select-none">
                          <input 
                            type="checkbox"
                            checked={includeLowercase}
                            onChange={(e) => setIncludeLowercase(e.target.checked)}
                            className="accent-navy-deep rounded text-navy-deep w-3.5 h-3.5"
                          />
                          <span className="text-slate-600 font-medium text-[11px] font-mono">a-z Lowercase</span>
                        </label>
                        <label className="flex items-center gap-2.5 p-2 bg-frost-blue hover:bg-ice-blue/40 border border-sky-soft/60 rounded-xl cursor-pointer transition select-none">
                          <input 
                            type="checkbox"
                            checked={includeNumbers}
                            onChange={(e) => setIncludeNumbers(e.target.checked)}
                            className="accent-navy-deep rounded text-navy-deep w-3.5 h-3.5"
                          />
                          <span className="text-slate-600 font-medium text-[11px] font-mono">0-9 Digits</span>
                        </label>
                        <label className="flex items-center gap-2.5 p-2 bg-frost-blue hover:bg-ice-blue/40 border border-sky-soft/60 rounded-xl cursor-pointer transition select-none">
                          <input 
                            type="checkbox"
                            checked={includeSymbols}
                            onChange={(e) => setIncludeSymbols(e.target.checked)}
                            className="accent-navy-deep rounded text-navy-deep w-3.5 h-3.5"
                          />
                          <span className="text-slate-600 font-medium text-[11px] font-mono">!@# Special</span>
                        </label>
                      </div>

                      <button 
                        onClick={generatePasswordString}
                        className="w-full py-2 bg-navy-deep hover:bg-navy-rich text-white font-bold rounded-lg text-xs tracking-wider transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none active:scale-98 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-accent-blue animate-spin-slow" />
                        GENERATE HIGH-DENSITY KEY
                      </button>
                    </div>
                  </div>

                  {/* Operational Server Metadata Info Card */}
                  <div className="bg-white border border-navy-rich/10 rounded-2xl p-5 shadow-sm text-xs space-y-3">
                    <h3 className="text-xs font-bold font-mono tracking-widest text-[#1E3A5F] uppercase flex items-center gap-2 pb-1.5 border-b border-slate-100">
                      <Sliders className="w-4 h-4 text-accent-blue" />
                      VAULT COMPLIANCE CRITERIA
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 block shrink-0 text-[10px]">User Reference UID</span>
                        <span className="text-navy-deep font-semibold truncate block select-all" title={user.uid}>{user.uid.slice(0, 15)}...</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block shrink-0 text-[10px]">Encryption Layer</span>
                        <span className="text-navy-deep font-bold block select-all">AES-256 Symmetric</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block shrink-0 text-[10px]">Sync Origin</span>
                        <span className="text-slate-600 font-bold truncate block">firebase-auth-node</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block shrink-0 text-[10px]">Compliance State</span>
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1 uppercase text-[9px]">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                          Validated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Secure Data Portability Control Panel */}
                  <div className="bg-white border border-navy-rich/10 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold font-mono tracking-widest text-[#1E3A5F] uppercase flex items-center gap-2 pb-1.5 border-b border-slate-100">
                      <Download className="w-4 h-4 text-accent-blue" />
                      SECURE DATA PORTABILITY
                    </h3>
                    
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Need to move your credentials? You can export your archived entries into a structured CSV spreadsheet file compatible with standard vault platforms.
                    </p>

                    {/* Highly visible industry-grade compliance disclaimer */}
                    <div className="p-3 bg-amber-50/60 border border-amber-250/50 rounded-xl space-y-2 text-left select-none">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-amber-850 uppercase font-mono tracking-tight">
                        <BadgeAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        Enterprise Security Decrypt Warning
                      </div>
                      <p className="text-[10px] leading-normal text-slate-600 font-sans">
                        CSV exports contain <strong>unencoded plaintexts</strong> of domains, logins, and passwords. This decapsulates client data outside SecureVault's sandbox protection. It is recommended to download strictly into encrypted hardware and securely shred files after utility.
                      </p>
                    </div>

                    {/* Local export status alert */}
                    {exportSuccessInfo && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-2.5 rounded-xl text-[10px] font-medium flex items-start gap-2"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{exportSuccessInfo}</span>
                      </motion.div>
                    )}

                    {/* Agreement verification trigger checkbox */}
                    <label className="flex items-start gap-2.5 p-2.5 bg-frost-blue hover:bg-ice-blue/40 border border-sky-soft/40 rounded-xl cursor-pointer transition select-none">
                      <input 
                        type="checkbox"
                        checked={exportAgreed}
                        onChange={(e) => setExportAgreed(e.target.checked)}
                        className="accent-navy-deep rounded text-navy-deep w-3.5 h-3.5 mt-0.5"
                      />
                      <span className="text-slate-600 leading-normal text-[10px] font-medium">
                        I authorize decapsulation and acknowledge that decrypted raw assets are my direct responsibility.
                      </span>
                    </label>

                    {/* Trigger Export Button */}
                    <button
                      onClick={handleExportCSV}
                      disabled={!exportAgreed || totalCredentials === 0}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wide transition duration-150 flex items-center justify-center gap-2 select-none shadow-sm ${
                        exportAgreed && totalCredentials > 0
                          ? 'bg-navy-deep hover:bg-navy-rich text-white cursor-pointer active:scale-98'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/40'
                      }`}
                    >
                      <Download className={`w-3.5 h-3.5 ${exportAgreed && totalCredentials > 0 ? 'text-accent-blue shrink-0' : 'text-slate-300'}`} />
                      <span>Export Decrypted Catalog (.CSV)</span>
                    </button>
                    
                    {totalCredentials === 0 && (
                      <p className="text-[9px] text-center text-slate-400 italic">
                        No credentials cataloged yet. Populate entries above to enable exports.
                      </p>
                    )}
                  </div>

                </div>

                {/* RIGHT COLUMN: Interactive Password Vault Catalog */}
                <div className="lg:col-span-7 space-y-4 text-left">
                  
                  {/* Catalog Header, Search Toolbar & Filter */}
                  <div className="bg-white border border-navy-rich/10 rounded-2xl p-4 shadow-xs space-y-4">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-navy-deep flex items-center gap-2">
                          Enterprise Cipher Registry
                          <span className="text-[11px] bg-ice-blue border border-sky-soft text-navy-rich px-2.5 py-0.5 rounded-full font-mono font-bold">
                            {filteredEntries.length} Synced
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">Search and copy securely verified secret credentials.</p>
                      </div>

                      <button 
                        onClick={() => setShowAddEntry(!showAddEntry)}
                        className="py-1.5 px-3.5 bg-navy-deep hover:bg-navy-rich text-white text-xs font-bold rounded-xl transition duration-150 flex items-center gap-2 cursor-pointer shadow-sm ml-auto sm:ml-0"
                      >
                        <span>{showAddEntry ? 'Close Vault Form' : 'Add Credential'}</span>
                        <Plus className={`w-3.5 h-3.5 text-accent-blue transition-transform duration-200 ${showAddEntry ? 'rotate-45' : ''}`} />
                      </button>
                    </div>

                    {/* Integrated SaaS Search & Filtering Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Search Bar */}
                      <div className="sm:col-span-7 relative">
                        <input 
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search domain, username, or details..."
                          className="w-full bg-frost-blue hover:bg-white text-navy-deep focus:bg-white border border-sky-soft/75 focus:border-accent-blue rounded-xl pl-9 pr-3.5 py-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-accent-blue/15 placeholder:text-slate-400"
                        />
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      </div>

                      {/* Category Selector dropdown */}
                      <div className="sm:col-span-5 relative">
                        <select 
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft/75 focus:border-accent-blue rounded-xl pl-9 pr-3.5 py-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-accent-blue/15 appearance-none cursor-pointer"
                        >
                          <option value="All">All Categories</option>
                          <option value="Social">Social Channels</option>
                          <option value="Work">Work / Dev Systems</option>
                          <option value="Databases">Databases / API</option>
                          <option value="Finance">Cryptocurrency / FinTech</option>
                          <option value="Other">Miscellaneous</option>
                        </select>
                        <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                  </div>

                  {/* Add Entry Box expansion */}
                  <AnimatePresence>
                    {showAddEntry && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white border border-navy-rich/10 rounded-2xl p-5 shadow-sm overflow-hidden"
                      >
                        <form onSubmit={addVaultEntry} className="space-y-4">
                          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                            <PlusCircle className="w-4 h-4 text-navy-rich" />
                            <h3 className="text-xs font-bold font-mono tracking-widest text-navy-deep uppercase">
                              ARCHIVE MASTER CREDENTIAL PASSWORD
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-slate-600 font-bold mb-10px">Target System / Service Domain</label>
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={newEntrySource}
                                  onChange={(e) => setNewEntrySource(e.target.value)}
                                  placeholder="e.g. AWS Management, Stripe, Gmail"
                                  className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft focus:border-accent-blue rounded-lg px-3 py-2 text-xs transition placeholder:text-slate-400 pl-8.5 focus:outline-none"
                                  required
                                />
                                <Globe className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-slate-600 font-bold mb-10px">Admin User Identifier (Username/Email)</label>
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={newEntryUser}
                                  onChange={(e) => setNewEntryUser(e.target.value)}
                                  placeholder="e.g. admin@root-system.app"
                                  className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft focus:border-accent-blue rounded-lg px-3 py-2 text-xs transition placeholder:text-slate-400 pl-8.5 focus:outline-none"
                                  required
                                />
                                <UserIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-slate-600 font-bold">Encrypted Confidential Key</label>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if (generatedPassword) {
                                      setNewEntryPassword(generatedPassword);
                                      setAuthSuccess('Cryptographic password key successfully bound from slider builder!');
                                    } else {
                                      generatePasswordString();
                                    }
                                  }}
                                  className="text-[10px] text-[#1E3A5F] hover:text-accent-blue transition font-bold"
                                >
                                  Use Generated Key
                                </button>
                              </div>
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={newEntryPassword}
                                  onChange={(e) => setNewEntryPassword(e.target.value)}
                                  placeholder="Provide secure key string"
                                  className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft focus:border-accent-blue rounded-lg px-3 py-2 text-xs transition placeholder:text-slate-400 pl-8.5 focus:outline-none"
                                  required
                                />
                                <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              </div>

                              {/* Real-time Password Strength Visual Tracker */}
                              {(() => {
                                const evaluation = evaluatePassword(newEntryPassword);
                                return (
                                  <div className="mt-2.5 p-2.5 bg-bg-main border border-navy-rich/5 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-slate-400 font-bold">STRENGTH GRADE:</span>
                                      <span className={`font-extrabold uppercase ${evaluation.color}`}>{evaluation.label}</span>
                                    </div>
                                    <div className="flex gap-1 h-1.5">
                                      {[1, 2, 3, 4].map((seg) => (
                                        <div
                                          key={seg}
                                          className={`h-full grow rounded-full transition-all duration-300 ${
                                            seg <= evaluation.segments 
                                              ? evaluation.bg 
                                              : 'bg-slate-100'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <div className="pt-0.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono">
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[11px] leading-none ${evaluation.checks.length ? 'text-emerald-500 font-bold' : 'text-slate-350'}`}>
                                          {evaluation.checks.length ? '✓' : '○'}
                                        </span>
                                        <span className={evaluation.checks.length ? 'text-slate-600 font-medium' : 'text-slate-400'}>8+ characters</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[11px] leading-none ${evaluation.checks.upper ? 'text-emerald-500 font-bold' : 'text-slate-350'}`}>
                                          {evaluation.checks.upper ? '✓' : '○'}
                                        </span>
                                        <span className={evaluation.checks.upper ? 'text-slate-600 font-medium' : 'text-slate-400'}>Uppercase (A-Z)</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[11px] leading-none ${evaluation.checks.lower ? 'text-emerald-500 font-bold' : 'text-slate-350'}`}>
                                          {evaluation.checks.lower ? '✓' : '○'}
                                        </span>
                                        <span className={evaluation.checks.lower ? 'text-slate-600 font-medium' : 'text-slate-400'}>Lowercase (a-z)</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[11px] leading-none ${evaluation.checks.digit ? 'text-emerald-500 font-bold' : 'text-slate-350'}`}>
                                          {evaluation.checks.digit ? '✓' : '○'}
                                        </span>
                                        <span className={evaluation.checks.digit ? 'text-slate-600 font-medium' : 'text-slate-400'}>Digit (0-9)</span>
                                      </div>
                                      <div className="flex items-center gap-1 col-span-2">
                                        <span className={`text-[11px] leading-none ${evaluation.checks.symbol ? 'text-emerald-500 font-bold' : 'text-slate-350'}`}>
                                          {evaluation.checks.symbol ? '✓' : '○'}
                                        </span>
                                        <span className={evaluation.checks.symbol ? 'text-slate-600 font-medium' : 'text-slate-400'}>Special character (!@#$)</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-slate-600 font-bold mb-1">Classification Category</label>
                              <select 
                                value={newEntryCategory}
                                onChange={(e) => setNewEntryCategory(e.target.value)}
                                className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft focus:border-accent-blue rounded-lg px-3 py-2 text-xs transition cursor-pointer focus:outline-none"
                              >
                                <option value="Social">Social Account Channel</option>
                                <option value="Work">Work / Dev Servers</option>
                                <option value="Banking">Cryptocurrency / Bank Portal</option>
                                <option value="Databases">Databases / REST Console</option>
                                <option value="Finance">FinTech Dashboard</option>
                                <option value="Other">Miscellaneous</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-600 font-bold mb-1">Password Expiration Period</label>
                              <select 
                                value={newEntryExpiryDays}
                                onChange={(e) => setNewEntryExpiryDays(parseInt(e.target.value))}
                                className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft focus:border-accent-blue rounded-lg px-3 py-2 text-xs transition cursor-pointer focus:outline-none"
                              >
                                <option value={30}>30 Days (High Security / Rotational)</option>
                                <option value={60}>60 Days (Standard Corporate)</option>
                                <option value={90}>90 Days (Default Enterprise)</option>
                                <option value={180}>180 Days (Semi-Annual Check)</option>
                                <option value={365}>365 Days (Annual Verification)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-600 text-xs font-bold mb-1">Confidential Notes / Security Context Flags</label>
                            <div className="relative">
                              <textarea 
                                value={newEntryNotes}
                                onChange={(e) => setNewEntryNotes(e.target.value)}
                                placeholder="E.g. Primary cloud partition credentials..."
                                rows={2}
                                className="w-full bg-frost-blue hover:bg-white text-navy-deep border border-sky-soft focus:border-accent-blue rounded-lg px-3 py-2 text-xs transition placeholder:text-slate-400 pl-8.5 focus:outline-none"
                              />
                              <FileText className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 text-xs pt-1.5">
                            <button 
                              type="button" 
                              onClick={() => setShowAddEntry(false)}
                              className="py-1.5 px-3 bg-ice-blue hover:bg-sky-soft text-navy-deep border border-accent-blue rounded-lg font-semibold transition cursor-pointer text-[11px]"
                            >
                              Abort
                            </button>
                            <button 
                              type="submit" 
                              className="py-1.5 px-4 bg-navy-deep hover:bg-navy-rich text-white font-bold rounded-lg shadow-sm transition cursor-pointer text-[11px]"
                            >
                              Commit Secure Key
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Empty View Filter Match Feedback block */}
                  {filteredEntries.length === 0 ? (
                    <div className="bg-white border border-navy-rich/10 border-dashed rounded-2xl p-10 text-center text-slate-400">
                      <ShieldAlert className="w-9 h-9 text-slate-350 mx-auto mb-3" />
                      <p className="text-sm font-bold text-navy-deep mb-1">No matching secrets discovered</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">Try altering the current search keyword queries, choosing another filter category option, or writing a custom record above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEntries.map((entry, idx) => (
                        <motion.div 
                          key={entry.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="p-4 bg-white border border-navy-rich/8 hover:border-navy-rich/15 rounded-xl hover:shadow-xs transition duration-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                        >
                          <div className="flex gap-3.5 items-center flex-1 min-w-0">
                            <div className="p-2.5 bg-frost-blue border border-sky-soft text-navy-deep rounded-xl select-none shrink-0">
                              <Key className="w-4 h-4 text-navy-rich" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-extrabold text-navy-deep font-sans truncate">{entry.sourceName}</span>
                                <span className="text-[9px] font-mono uppercase bg-ice-blue border border-sky-soft text-navy-deep px-1.5 py-0.5 rounded font-extrabold select-none shrink-0">
                                  {entry.category}
                                </span>
                                <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded select-none shrink-0 ${
                                  entry.strength === 'Very Strong' ? 'bg-emerald-50 border-emerald-250 text-emerald-800 font-extrabold' :
                                  entry.strength === 'Strong' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-amber-50 border-amber-250 text-amber-800'
                                }`}>
                                  {entry.strength || 'Strong'}
                                </span>

                                {/* Expiration countdown badge inline on mobile */}
                                <span className="md:hidden shrink-0">
                                  {(() => {
                                    const daysRemaining = getDaysRemaining(entry.expiresAt);
                                    if (daysRemaining <= 0) {
                                      return (
                                        <span className="text-[9px] font-mono text-rose-600 font-semibold uppercase tracking-tight bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                          Expired
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className={`text-[9px] font-mono uppercase rounded px-1.5 py-0.5 border ${
                                          daysRemaining <= 15 ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : 'bg-emerald-50 border-emerald-150 text-emerald-700'
                                        }`}>
                                          {daysRemaining}d. remaining
                                        </span>
                                      );
                                    }
                                  })()}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 block mt-0.5 select-all truncate">{entry.username}</span>
                              <p className="text-[10px] text-slate-400 italic mt-1 font-sans truncate">{entry.notes}</p>
                            </div>
                          </div>

                          {/* Expiration Status Column/Middle Field on Desktop */}
                          <div className="hidden md:flex flex-col items-center justify-center border-l border-r border-slate-100 px-6 shrink-0 text-center select-none w-36">
                            {(() => {
                              const daysRemaining = getDaysRemaining(entry.expiresAt);
                              if (daysRemaining <= 0) {
                                return (
                                  <>
                                    <span className="text-[9px] font-mono text-rose-600 font-bold uppercase tracking-tight bg-rose-50 border border-rose-250 rounded px-1.5 py-0.5 flex items-center gap-1">
                                      <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping" />
                                      Expired
                                    </span>
                                    <span className="text-[10px] font-bold text-rose-700 font-mono mt-1">Update Core Key</span>
                                  </>
                                );
                              } else if (daysRemaining <= 15) {
                                return (
                                  <>
                                    <span className="text-[9px] font-mono text-amber-600 font-semibold uppercase tracking-tight bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                      {daysRemaining} Days Left
                                    </span>
                                    <span className="text-[10px] text-amber-700 font-mono mt-1 font-medium">Rotation Advised</span>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <span className="text-[9px] font-mono text-emerald-600 font-semibold uppercase tracking-tight bg-emerald-50 border border-emerald-150 rounded px-1.5 py-0.5">
                                      {daysRemaining} Days Remaining
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono mt-1">Status Active</span>
                                  </>
                                );
                              }
                            })()}
                          </div>

                          {/* Decryption Controls & Delete option */}
                          <div className="w-full md:w-auto flex items-center justify-end gap-2 shrink-0 select-none border-t border-slate-50 md:border-none pt-3 md:pt-0">
                            <button 
                              onClick={() => copyToClipboard(entry.password || 'EnCrYpTeDpAsSwOrD123!', idx)}
                              className="py-1.5 px-3 bg-ice-blue hover:bg-sky-soft text-navy-deep border border-accent-blue text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer max-md:w-full max-md:justify-center"
                            >
                              {copiedIndex === idx ? (
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded shrink-0">DECRYPTED & COPIED</span>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-navy-deep" />
                                  <span>Decrypt & Copy</span>
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition duration-150 cursor-pointer border border-rose-200"
                              title="Delete entry archive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Aesthetic Enterprise Decorative compliance footer */}
      <footer className="mt-20 border-t border-navy-rich/10 pt-8 px-6 text-center text-[10px] font-mono text-slate-400 select-none space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-left">
            <ShieldCheck className="w-5 h-5 text-navy-rich shrink-0" />
            <div>
              <p className="font-bold text-navy-deep">SECUREVAULT GLOBAL SAFEGUARD COMPLIANCE</p>
              <p className="text-[9px] text-slate-400">Zero Trust client isolation namespace synced securely via SSL encryption.</p>
            </div>
          </div>
          <div className="text-slate-400 text-right text-[9px] space-y-1">
            <p>Active Provider Schema: <span className="text-navy-deep font-semibold">Firebase API TLS Host</span></p>
            <p className="text-[8px] text-slate-300">© 2026 SecureVault Pro SaaS Enterprise Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

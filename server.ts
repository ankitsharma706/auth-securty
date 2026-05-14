import express from "express";
import path from "path";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import { db } from "./config/firebase.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // View engine setup
  app.set("view engine", "ejs");
  app.set("views", path.join(process.cwd(), "views"));

  // Body parsing and session
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secure-vault-pro-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
    })
  );

  // Static files
  app.use(express.static(path.join(process.cwd(), "public")));

  // API and Web Routes
  app.use("/", authRoutes);
  app.use("/passwords", passwordRoutes);

  app.get("/dashboard", async (req: any, res) => {
    if (!req.session.userId) return res.redirect("/login");
    
    try {
      // Get user info for 2FA status
      const userDoc = await db.collection("users").doc(req.session.userId).get();
      const userData = userDoc.data();

      const passwordsSnapshot = await db.collection("passwords")
        .where("userId", "==", req.session.userId)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();
      
      const recentPasswords: any[] = [];
      passwordsSnapshot.forEach(doc => recentPasswords.push({ id: doc.id, ...doc.data() }));

      const totalSnapshot = await db.collection("passwords")
        .where("userId", "==", req.session.userId)
        .count()
        .get();
      
      const totalCount = totalSnapshot.data().count;

      res.render("dashboard/index", { 
        user: { 
          email: req.session.email,
          twoFactorEnabled: userData?.twoFactorEnabled 
        },
        totalCount,
        recentPasswords
      });
    } catch (error) {
      console.error(error);
      res.render("dashboard/index", { 
        user: { email: req.session.email, twoFactorEnabled: false },
        totalCount: 0,
        recentPasswords: [],
        error: "Failed to load dashboard data"
      });
    }
  });

  app.get("/", (req, res) => {
    res.redirect("/login");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed from "spa" to "custom" for EJS
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SecureVault Pro running on http://localhost:${PORT}`);
  });
}

startServer();

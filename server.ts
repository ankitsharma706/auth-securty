import express from "express";
import path from "path";
import fs from "fs";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import { db } from "./src/firebase.js";

async function seedDemoUser() {
  try {
    const demoEmail = "admin@securevault.pro";
    const demoPassword = "Password123!";
    
    const userQuery = await db.collection("users").where("email", "==", demoEmail).get();
    if (userQuery.empty) {
      const passwordHash = await bcrypt.hash(demoPassword, 10);
      const newUser = {
        email: demoEmail,
        passwordHash,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("users").add(newUser);
      console.log(`Demo user successfully seeded. Email: ${demoEmail}, Password: ${demoPassword}`);
    } else {
      console.log(`Demo user ${demoEmail} already exists.`);
    }
  } catch (error) {
    console.error("Error seeding demo user:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy for secure cookies over HTTPS behind proxy layers
  app.set("trust proxy", 1);

  // View engine setup
  app.set("view engine", "ejs");
  app.set("views", path.join(process.cwd(), "views"));

  // Body parsing and session
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  
  app.use(
    session({
      name: "sec_vault_session",
      secret: process.env.SESSION_SECRET || "secure-vault-pro-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        httpOnly: true,
        secure: true, 
        sameSite: "none",
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
      },
    })
  );

  // Expose session user details to all views automatically
  app.use((req: any, res: any, next) => {
    if (req.session && req.session.userId) {
      res.locals.user = {
        email: req.session.email
      };
    } else {
      res.locals.user = null;
    }
    next();
  });

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
        .get();
      
      const totalCount = totalSnapshot.size;

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

  let vite: any = null;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed from "spa" to "custom" for EJS
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }

  // Serve React SPA on root or /app (or unmatched routes)
  app.get(["/", "/app", "/app/*"], async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "production" && vite) {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        return res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } else {
        return res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      }
    } catch (e) {
      next(e);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SecureVault Pro running on http://localhost:${PORT}`);
    // Run seeding non-blockingly after the server has successfully started
    seedDemoUser().catch(err => {
      console.error("Non-blocking seed error:", err);
    });
  });
}

startServer();

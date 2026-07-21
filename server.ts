import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function getResponsiveEmailTemplate(subject: string, message: string, customHtml?: string) {
  const content = customHtml || `<p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>`;
  
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
  <style type="text/css">
    #outlook a {padding:0;}
    body{width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0;}
    .ExternalClass {width:100%;}
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%;}
    #backgroundTable {margin:0; padding:0; width:100% !important; line-height: 100% !important;}
    img {outline:none; text-decoration:none; -ms-interpolation-mode: bicubic;}
    a img {border:none;}
    .image_fix {display:block;}
    p {margin: 1em 0;}
    h1, h2, h3, h4, h5, h6 {color: #111827 !important;}
    table td {border-collapse: collapse;}
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    a {color: #2563eb; text-decoration: none;}
    a:hover {text-decoration: underline;}
  </style>
</head>
<body style="background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px 0; margin: 0;">
  <table cellpadding="0" cellspacing="0" border="0" id="backgroundTable" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background-color: #0f172a; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Parodorshhi</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px; font-weight: 500; tracking-wide: 0.1em;">Educational Portal</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 32px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; font-family: system-ui, -apple-system, sans-serif;">${subject}</h2>
        <div style="font-size: 15px; color: #334155; line-height: 1.6;">
          ${content}
        </div>
        <div style="margin-top: 36px; text-align: center;">
          <a href="https://educationalportal.org" style="background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Go to Dashboard</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">You are receiving this update because you subscribed to our newsletter on the Parodorshhi Educational Portal.</p>
        <p style="color: #64748b; font-size: 11px; margin: 12px 0 0 0; font-weight: 600;">© 2026 Parodorshhi. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Parser Middleware
  // JSON Parser Middleware
  app.use(express.json({ limit: "15mb" }));

  // ==========================================
  // CONFIGURABLE RATE LIMITING ENGINE
  // ==========================================
  const RATE_LIMIT_CONFIG = {
    // Auth routes limits (stricter)
    authIpMax: Number(process.env.RATE_LIMIT_AUTH_IP_MAX) || 5, // Stricter limit per IP
    authIpWindowMs: Number(process.env.RATE_LIMIT_AUTH_IP_WINDOW_MS) || 60000, // 1 minute
    authAccountMax: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX) || 3, // Max free attempts before backoff kicks in
    authAccountBaseBackoffMs: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_BASE_BACKOFF_MS) || 2000, // 2s base backoff
    authAccountMaxBackoffMs: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX_BACKOFF_MS) || 300000, // 5 mins max backoff
    
    // Public routes limits (moderate)
    publicMax: Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 30, 
    publicWindowMs: Number(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS) || 60000, // 1 minute
    
    // Authenticated actions limits (looser)
    authActionMax: Number(process.env.RATE_LIMIT_AUTH_ACTION_MAX) || 100, 
    authActionWindowMs: Number(process.env.RATE_LIMIT_AUTH_ACTION_WINDOW_MS) || 60000, // 1 minute
  };

  // In-memory token/IP stores
  const publicIpStore = new Map<string, { count: number; resetTime: number }>();
  const authActionStore = new Map<string, { count: number; resetTime: number }>();
  const authIpStore = new Map<string, { count: number; resetTime: number }>();
  const authAccountStore = new Map<string, { attempts: number; lastAttemptTime: number }>();

  // Extract client IP address safely
  function getClientIp(req: express.Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  // Extract account identifier for auth requests
  function getAccountIdentifier(req: express.Request): string | null {
    if (req.body) {
      const email = req.body.email || req.body.username || req.body.phone || req.body.userId;
      if (email) {
        return String(email).trim().toLowerCase();
      }
    }
    return null;
  }

  // Helper to reset auth account attempt counters on success
  function resetAuthAccountAttempts(accountId: string) {
    const normalized = accountId.trim().toLowerCase();
    authAccountStore.delete(normalized);
  }

  // 1. STRICT Auth Route Rate Limiter (IP + Account combined with Exponential Backoff)
  function authRouteRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = getClientIp(req);
    const now = Date.now();
    
    // 1a. IP check
    let ipRecord = authIpStore.get(ip);
    if (!ipRecord || now > ipRecord.resetTime) {
      ipRecord = { count: 1, resetTime: now + RATE_LIMIT_CONFIG.authIpWindowMs };
      authIpStore.set(ip, ipRecord);
    } else {
      ipRecord.count++;
    }
    
    if (ipRecord.count > RATE_LIMIT_CONFIG.authIpMax) {
      const secondsToWait = Math.ceil((ipRecord.resetTime - now) / 1000);
      res.setHeader("Retry-After", secondsToWait);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Too many authentication attempts from this IP address. Please wait before retrying.",
        retryAfterSeconds: secondsToWait,
        limitType: "ip"
      });
    }
    
    // 1b. Account check with exponential backoff
    const accountId = getAccountIdentifier(req);
    if (accountId) {
      let accountRecord = authAccountStore.get(accountId);
      if (!accountRecord) {
        accountRecord = { attempts: 1, lastAttemptTime: now };
        authAccountStore.set(accountId, accountRecord);
      } else {
        if (accountRecord.attempts > RATE_LIMIT_CONFIG.authAccountMax) {
          const excess = accountRecord.attempts - RATE_LIMIT_CONFIG.authAccountMax;
          const backoffDelay = Math.min(
            RATE_LIMIT_CONFIG.authAccountBaseBackoffMs * Math.pow(2, excess - 1),
            RATE_LIMIT_CONFIG.authAccountMaxBackoffMs
          );
          
          const timeElapsed = now - accountRecord.lastAttemptTime;
          if (timeElapsed < backoffDelay) {
            const secondsToWait = Math.ceil((backoffDelay - timeElapsed) / 1000);
            res.setHeader("Retry-After", secondsToWait);
            return res.status(429).json({
              error: "Too Many Requests",
              message: "This account has experienced too many failed login attempts. Please wait to prevent unauthorized access.",
              retryAfterSeconds: secondsToWait,
              backoffActive: true,
              attemptsCount: accountRecord.attempts,
              limitType: "account"
            });
          }
        }
        
        // Advance attempts count
        accountRecord.attempts++;
        accountRecord.lastAttemptTime = now;
        authAccountStore.set(accountId, accountRecord);
      }
    }
    
    next();
  }

  // 2. MODERATE Public Route Rate Limiter
  function publicRouteRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = getClientIp(req);
    const now = Date.now();
    
    let record = publicIpStore.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + RATE_LIMIT_CONFIG.publicWindowMs };
      publicIpStore.set(ip, record);
    } else {
      record.count++;
    }
    
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CONFIG.publicMax);
    const remaining = Math.max(0, RATE_LIMIT_CONFIG.publicMax - record.count);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
    
    if (record.count > RATE_LIMIT_CONFIG.publicMax) {
      const secondsToWait = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", secondsToWait);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Public endpoint limit reached. Please wait a moment.",
        retryAfterSeconds: secondsToWait
      });
    }
    
    next();
  }

  // 3. LOOSER Authenticated User Action Rate Limiter
  function authActionRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = getClientIp(req);
    const now = Date.now();
    
    let record = authActionStore.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + RATE_LIMIT_CONFIG.authActionWindowMs };
      authActionStore.set(ip, record);
    } else {
      record.count++;
    }
    
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CONFIG.authActionMax);
    const remaining = Math.max(0, RATE_LIMIT_CONFIG.authActionMax - record.count);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
    
    if (record.count > RATE_LIMIT_CONFIG.authActionMax) {
      const secondsToWait = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", secondsToWait);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "You have exceeded the rate limit for authenticated user actions. Please slow down.",
        retryAfterSeconds: secondsToWait
      });
    }
    
    next();
  }

  // --- AUTHENTICATION ENDPOINTS (STRICT LIMITS WITH EXPONENTIAL BACKOFF) ---
  
  // Proxy Login Endpoint
  app.post("/api/auth/login", authRouteRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    try {
      const SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co";
      const SUPABASE_PUBLIC_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii";
      const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Reset the account backoff count on successful authentication
      resetAuthAccountAttempts(email);

      return res.json({ success: true, session: data.session, user: data.user });
    } catch (err: any) {
      console.error("Login proxy error:", err);
      return res.status(500).json({ error: "Internal server authentication error." });
    }
  });

  // Proxy Signup Endpoint
  app.post("/api/auth/signup", authRouteRateLimiter, async (req, res) => {
    const { email, password, options } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    try {
      const SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co";
      const SUPABASE_PUBLIC_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii";
      const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      resetAuthAccountAttempts(email);
      return res.json({ success: true, user: data.user, session: data.session });
    } catch (err: any) {
      console.error("Signup proxy error:", err);
      return res.status(500).json({ error: "Internal server signup error." });
    }
  });

  // Proxy Password Reset Endpoint
  app.post("/api/auth/password-reset", authRouteRateLimiter, async (req, res) => {
    const { email, redirectTo } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    try {
      const SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co";
      const SUPABASE_PUBLIC_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii";
      const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${process.env.APP_URL || 'http://localhost:3000'}/reset-password`,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      resetAuthAccountAttempts(email);
      return res.json({ success: true, message: "Password reset instructions sent." });
    } catch (err: any) {
      console.error("Password reset proxy error:", err);
      return res.status(500).json({ error: "Internal server password reset error." });
    }
  });

  // API Route to dynamically serve parodorshi-logo.png if captured, otherwise fallback to parodorshi-logo.svg (MODERATE LIMITS)
  app.get("/api/logo.png", publicRouteRateLimiter, (req, res) => {
    try {
      const pngPath = path.join(process.cwd(), "src", "assets", "logo", "parodorshi-logo.png");
      const svgPath = path.join(process.cwd(), "src", "assets", "logo", "parodorshi-logo.svg");

      if (fs.existsSync(pngPath)) {
        res.setHeader("Content-Type", "image/png");
        return res.sendFile(pngPath);
      } else if (fs.existsSync(svgPath)) {
        res.setHeader("Content-Type", "image/svg+xml");
        return res.sendFile(svgPath);
      } else {
        return res.status(404).send("Logo not found");
      }
    } catch (err: any) {
      console.error("Error serving logo image:", err);
      return res.status(500).send("Internal server error");
    }
  });

  // API Route to receive a Base64-encoded logo image and write it directly to the local filesystem (LOOSER LIMITS)
  app.post("/api/save-logo", authActionRateLimiter, (req, res) => {
    try {
      const { base64 } = req.body;
      if (!base64) {
        return res.status(400).json({ error: "Missing base64 data" });
      }

      // Extract the raw base64 data
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Malformed base64 representation" });
      }

      const imageBuffer = Buffer.from(matches[2], "base64");
      const targetPath = path.join(process.cwd(), "src", "assets", "logo", "parodorshi-logo.png");
      
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, imageBuffer);

      console.log("==> SUCCESS: Saved original high-quality logo image to filesystem:", targetPath);
      return res.json({ success: true, path: targetPath });
    } catch (err: any) {
      console.error("Failed to write logo to file:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API routes
  app.get("/api/health", publicRouteRateLimiter, (req, res) => {
    res.json({ status: "ok" });
  });

  // GET Newsletter Subscriber Count (MODERATE LIMITS)
  app.get("/api/newsletter/count", publicRouteRateLimiter, async (req, res) => {
    try {
      const SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co";
      const SUPABASE_PUBLIC_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii";
      const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      // Fetch length of the newsletter_subscribers directly 
      const { data, error } = await client
        .from('newsletter_subscribers')
        .select('id');

      if (error) {
        console.warn("[Server newsletter list fetch error]", error);
        return res.json({ count: 0 });
      }
      return res.json({ count: data?.length || 0 });
    } catch (err: any) {
      console.error("newsletter/count router crashed:", err);
      return res.json({ count: 0 });
    }
  });

  // POST Dispatch Newsletter Emails via Resend API
  app.post("/api/newsletter/send", authActionRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header token." });
    }

    const { subject, message, htmlContent } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message contents are required." });
    }

    try {
      const token = authHeader.split(" ")[1];
      const SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co";
      const SUPABASE_PUBLIC_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii";

      // Create Supabase client and load caller credentials
      const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });

      // Authorize that the active session matches a real member
      const { data: { user }, error: authErr } = await client.auth.getUser();
      if (authErr || !user) {
        return res.status(401).json({ error: "Access denied. Invalid session credentials." });
      }

      // Assert user role is strictly "admin" in profiles database
      const { data: profile, error: profileErr } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile || profile.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin portal roles required." });
      }

      // Fetch list of target addresses inside public.newsletter_subscribers
      const { data: subscribers, error: subsErr } = await client
        .from('newsletter_subscribers')
        .select('email');

      if (subsErr) {
        return res.status(500).json({ error: "Failed to grab newsletter subscribers list.", details: subsErr.message });
      }

      if (!subscribers || subscribers.length === 0) {
        return res.json({
          success: true,
          message: "No newsletter subscribers signed up currently.",
          stats: { total: 0, sent: 0, duplicates: 0, failed: 0 }
        });
      }

      const resendKey = process.env.RESEND_API_KEY || "re_Cbytb2DD_8nrtvCVsAvGdEHKJNGwrj2oY";
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      let sentCount = 0;
      let duplicateCount = 0;
      let failedCount = 0;

      // Iterate cleanly in single-pass with error catching and rate limits cushion
      for (const subscriber of subscribers) {
        const emailAddress = subscriber.email?.trim().toLowerCase();
        if (!emailAddress) continue;

        // Prevent duplicate sending: verify whether this subscriber received this subject already
        const { data: duplicateRecords, error: dupCheckErr } = await client
          .from('newsletter_email_logs')
          .select('id')
          .eq('subscriber_email', emailAddress)
          .eq('subject', subject)
          .limit(1);

        if (!dupCheckErr && duplicateRecords && duplicateRecords.length > 0) {
          console.log(`Skipping duplicate newsletter packet delivery to ${emailAddress}`);
          duplicateCount++;
          continue;
        }

        const responsiveHtml = getResponsiveEmailTemplate(subject, message, htmlContent);

        try {
          console.log(`Delivering premium newsletter to: ${emailAddress}`);

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Parodorshhi <onboarding@resend.dev>",
              to: emailAddress,
              subject: subject,
              html: responsiveHtml
            })
          });

          if (response.ok) {
            sentCount++;
            // Write database log indicating success
            await client.from('newsletter_email_logs').insert([{
              subscriber_email: emailAddress,
              subject,
              message,
              status: 'sent',
              sent_at: new Date().toISOString()
            }]);
          } else {
            const errorDetails = await response.text();
            console.error(`Resend API dispatch failed for subscriber ${emailAddress}:`, errorDetails);
            failedCount++;

            // Log delivery attempt failing
            await client.from('newsletter_email_logs').insert([{
              subscriber_email: emailAddress,
              subject,
              message: `${message}\n\n[Resend Error: ${errorDetails}]`,
              status: 'failed',
              sent_at: new Date().toISOString()
            }]);
          }
        } catch (deliveryEx: any) {
          console.error(`Resend service threw a physical crash on subscriber ${emailAddress}:`, deliveryEx);
          failedCount++;

          // Log transaction as failure
          await client.from('newsletter_email_logs').insert([{
            subscriber_email: emailAddress,
            subject,
            message: `${message}\n\n[Delivery exception: ${deliveryEx.message || deliveryEx}]`,
            status: 'failed',
            sent_at: new Date().toISOString()
          }]);
        }

        // Space out deliveries by 150ms to strictly comply with Resend default rate boundaries safely
        await delay(150);
      }

      return res.json({
        success: true,
        stats: {
          total: subscribers.length,
          sent: sentCount,
          duplicates: duplicateCount,
          failed: failedCount
        }
      });

    } catch (e: any) {
      console.error("Central send-newsletter endpoint failure:", e);
      return res.status(500).json({ error: "Failed to dispatch newsletters", details: e.message });
    }
  });

  app.get("/api/youtube/playlist/:playlistId", publicRouteRateLimiter, async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId) {
      return res.status(400).json({ error: "Playlist ID is required" });
    }

    try {
      console.log(`Scraping YouTube playlist page for ID: ${playlistId}`);
      let html = "";
      let response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });

      if (response.ok) {
        html = await response.text();
      } else {
        console.warn(`YouTube playlist page fetch failed with status ${response.status}, trying embed series page...`);
      }

      // Fall back to the embed videoseries URL if main page load failed or returned empty/blocked
      if (!html || html.length < 5000 || html.includes("consent.youtube.com")) {
        console.log(`Main playlist HTML is short/redirected, fetching embed series format...`);
        const embedResponse = await fetch(`https://www.youtube.com/embed/videoseries?list=${playlistId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          }
        });
        if (embedResponse.ok) {
          html = await embedResponse.text();
        }
      }

      let ytInitialData: any = null;

      // Extract ytInitialData safely inside braces to override regular expression memory overflow
      const startStr = "ytInitialData =";
      const startIndex = html.indexOf(startStr);
      if (startIndex !== -1) {
        const dataStart = startIndex + startStr.length;
        let braceCount = 0;
        let jsonStr = "";
        let foundStart = false;
        
        for (let i = dataStart; i < html.length; i++) {
          const char = html[i];
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
          }
          
          if (foundStart) {
            jsonStr += char;
            if (braceCount === 0) {
              break;
            }
          }
        }
        
        if (jsonStr) {
          try {
            ytInitialData = JSON.parse(jsonStr);
          } catch (e) {
            console.error("Failed to parse braced JSON:", e);
          }
        }
      }

      let videos: any[] = [];
      if (ytInitialData) {
        // Recursive walk to list out all playlist videos safely
        function findVideos(obj: any) {
          if (!obj || typeof obj !== 'object') return;
          
          if (obj.playlistVideoRenderer) {
            const r = obj.playlistVideoRenderer;
            const videoId = r.videoId;
            if (videoId) {
              const title = r.title?.runs?.[0]?.text || r.title?.simpleText || "Untitled video";
              const lengthSeconds = r.lengthSeconds;
              let duration = r.lengthText?.simpleText || "";
              if (!duration && lengthSeconds) {
                const seconds = parseInt(lengthSeconds, 10);
                if (!isNaN(seconds)) {
                  const h = Math.floor(seconds / 3600);
                  const m = Math.floor((seconds % 3600) / 60);
                  const s = seconds % 60;
                  duration = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
                }
              }
              const thumbnail = r.thumbnail?.thumbnails?.[r.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
              const description = r.descriptionSnippet?.runs?.[0]?.text || "";
              videos.push({
                title,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                description,
                thumbnail,
                duration
              });
            }
            return;
          }
          
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              findVideos(obj[key]);
            }
          }
        }
        findVideos(ytInitialData);
      }

      // Regex matching as immediate fallback
      if (videos.length === 0) {
        console.log("No videos parsed via ytInitialData recursive crawl. Slicing with raw regex matches...");
        const videoIdRegex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
        const uniqueIds = new Set<string>();
        let regexMatch;
        while ((regexMatch = videoIdRegex.exec(html)) !== null) {
          uniqueIds.add(regexMatch[1]);
        }
        
        videos = Array.from(uniqueIds).map(id => ({
          title: `Video Class (${id})`,
          url: `https://www.youtube.com/watch?v=${id}`,
          description: "Video lecture.",
          thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
          duration: ""
        }));
      }

      console.log(`Found ${videos.length} videos from scrape proxy`);
      res.json(videos.slice(0, 100));
    } catch (err: any) {
      console.error("Server API YouTube scraper failed error:", err);
      res.status(500).json({ error: "Failed to load YouTube playlist", details: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

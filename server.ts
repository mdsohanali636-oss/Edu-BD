import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // GET Newsletter Subscriber Count
  app.get("/api/newsletter/count", async (req, res) => {
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
  app.post("/api/newsletter/send", async (req, res) => {
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

  app.get("/api/youtube/playlist/:playlistId", async (req, res) => {
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

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

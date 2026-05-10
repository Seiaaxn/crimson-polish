import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import FormData from "form-data";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV, 
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });
});

// Use memory storage for multer as we'll just proxy the file
const upload = multer({ storage: multer.memoryStorage() });

// API Routes
app.get("/api/proxy/:endpoint*", async (req: any, res: any) => {
  try {
    const endpoint = req.params.endpoint + (req.params[0] || "");
    const targetUrl = new URL(`https://api.nefusoft.cloud/v1/${endpoint}`);
    
    // Pass all query parameters
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, String(req.query[key]));
    });

    console.log(`[Proxy Request] ${req.method} ${targetUrl.toString()}`);

    // Use native fetch (Node 18+) with improved headers
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Cache-Control': 'no-cache',
        'Origin': 'https://nefusoft.cloud',
        'Referer': 'https://nefusoft.cloud/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    });

    const body = await response.text();
    
    if (!response.ok) {
       console.error(`[Proxy Error] API returned ${response.status}: ${body.substring(0, 200)}`);
       return res.status(response.status).json({ success: false, status: response.status, error: "Upstream API Error" });
    }
    
    try {
      const data = JSON.parse(body);
      res.json(data);
    } catch (parseError) {
      console.error("[Proxy Error] Failed to parse JSON response");
      res.status(500).json({ success: false, error: "Invalid JSON from upstream API" });
    }
  } catch (error: any) {
    console.error("[Proxy Critical Error]:", error.message);
    res.status(500).json({ success: false, message: "Internal Proxy Error" });
  }
});

app.get("/api/backup-proxy/:endpoint*", async (req: any, res: any) => {
  try {
    const endpoint = req.params.endpoint + (req.params[0] || "");
    const targetUrl = new URL(`https://api.hsoft.eu.cc/api/${endpoint}`);
    
    // Pass all query parameters
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, String(req.query[key]));
    });

    console.log(`[Backup Proxy Request] ${req.method} ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 OPR/95.0.0.0',
        'Origin': 'https://hsoft.eu.cc',
        'Referer': 'https://hsoft.eu.cc/',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const body = await response.text();
    
    if (!response.ok) {
       console.error(`[Backup Proxy Error] API returned ${response.status}: ${body.substring(0, 200)}`);
       return res.status(response.status).json({ success: false, status: response.status, error: "Upstream API Error" });
    }
    
    try {
      const data = JSON.parse(body);
      res.json(data);
    } catch (parseError) {
      console.error("[Backup Proxy Error] Failed to parse JSON response");
      res.status(500).json({ success: false, error: "Invalid JSON from upstream API" });
    }
  } catch (error: any) {
    console.error("[Backup Proxy Critical Error]:", error.message);
    res.status(500).json({ success: false, message: "Internal Proxy Error" });
  }
});

app.get("/api/dev-proxy/:endpoint*", async (req: any, res: any) => {
  try {
    const endpoint = req.params.endpoint || "search";
    const targetUrl = new URL(`https://dev.nefusoft.cloud/${endpoint}`);
    
    // Pass all query parameters
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, String(req.query[key]));
    });

    console.log(`[Dev Proxy Request] ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://dev.nefusoft.cloud/',
        'Origin': 'https://dev.nefusoft.cloud'
      }
    });

    const body = await response.text();
    
    if (!response.ok) {
        console.error(`[Dev Proxy Error] status ${response.status}: ${body.substring(0, 200)}`);
        return res.status(response.status).json({ success: false, error: "Upstream Dev API Error" });
    }

    try {
      const data = JSON.parse(body);
      res.json(data);
    } catch (parseError) {
      console.error(`[Dev Proxy Error]: Failed to parse JSON. Body starts with: ${body.substring(0, 100)}`);
      res.status(500).json({ 
        success: false, 
        message: "Invalid JSON from Upstream Dev API",
        debug_body_preview: body.substring(0, 200)
      });
    }
  } catch (error: any) {
    console.error("[Dev Proxy Critical Error]:", error.message);
    res.status(500).json({ success: false, message: "Internal Dev Proxy Error" });
  }
});

app.get("/api/sanka-proxy/:endpoint*", async (req: any, res: any) => {
  try {
    const endpoint = req.params.endpoint + (req.params[0] || "");
    const targetUrl = new URL(`https://www.sankavollerei.com/anime/animasu/${endpoint}`);
    
    // Pass all query parameters
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, String(req.query[key]));
    });

    console.log(`[Sanka Proxy Request] ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.sankavollerei.com/',
        'Origin': 'https://www.sankavollerei.com'
      }
    });

    const body = await response.text();
    
    if (!response.ok) {
        console.error(`[Sanka Proxy Error] status ${response.status}: ${body.substring(0, 200)}`);
        return res.status(response.status).json({ success: false, error: "Upstream Sanka API Error" });
    }

    try {
      const data = JSON.parse(body);
      res.json(data);
    } catch (parseError) {
      console.error(`[Sanka Proxy Error]: Failed to parse JSON. Body starts with: ${body.substring(0, 100)}`);
      res.status(500).json({ 
        success: false, 
        message: "Invalid JSON from Upstream Sanka API",
        debug_body_preview: body.substring(0, 200)
      });
    }
  } catch (error: any) {
    console.error("[Sanka Proxy Critical Error]:", error.message);
    res.status(500).json({ success: false, message: "Internal Sanka Proxy Error" });
  }
});

app.get("/api/comic-proxy/:endpoint*", async (req: any, res: any) => {
  try {
    const endpoint = req.params.endpoint + (req.params[0] || "");
    const targetUrl = new URL(`https://www.sankavollerei.com/comic/${endpoint}`);
    
    // Pass all query parameters
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, String(req.query[key]));
    });

    console.log(`[Comic Proxy Request] ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.sankavollerei.com/',
        'Origin': 'https://www.sankavollerei.com'
      }
    });

    const body = await response.text();
    
    if (!response.ok) {
        console.error(`[Comic Proxy Error] status ${response.status}: ${body.substring(0, 200)}`);
        return res.status(response.status).json({ success: false, error: "Upstream Comic API Error" });
    }

    try {
      const data = JSON.parse(body);
      res.json(data);
    } catch (parseError) {
      console.error(`[Comic Proxy Error]: Failed to parse JSON. Body starts with: ${body.substring(0, 100)}`);
      res.status(500).json({ 
        success: false, 
        message: "Invalid JSON from Upstream Comic API",
        debug_body_preview: body.substring(0, 200)
      });
    }
  } catch (error: any) {
    console.error("[Comic Proxy Critical Error]:", error.message);
    res.status(500).json({ success: false, message: "Internal Comic Proxy Error" });
  }
});

app.get("/api/image-proxy", async (req: any, res: any) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("No URL provided");

    let decodedUrl = decodeURIComponent(url as string);
    if (!decodedUrl.startsWith('http')) return res.status(400).send("Invalid URL");

    // Normalize: remove double slashes in path (e.g. domain//assets -> domain/assets)
    try {
      const urlObj = new URL(decodedUrl);
      urlObj.pathname = urlObj.pathname.replace(/\/+/g, '/');
      decodedUrl = urlObj.toString();
    } catch (e) {
      // If URL is invalid, just use decoded
    }

    // console.log(`[Image Proxy] Fetching: ${decodedUrl}`);
    
    // Choose referer based on domain
    let referer = 'https://nefusoft.cloud/';
    if (decodedUrl.includes('animasu')) referer = 'https://v5.animasu.cc/';
    if (decodedUrl.includes('animein.net')) referer = 'https://animein.net/';
    if (decodedUrl.includes('animekita.org')) referer = 'https://animekita.org/';
    if (decodedUrl.includes('otakudesu')) referer = 'https://otakudesu.blog/';
    if (decodedUrl.includes('komiku.id') || decodedUrl.includes('komiku.org')) referer = 'https://komiku.id/';

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      timeout: 20000
    });

    if (!response.ok) {
      // console.error(`[Image Proxy] Failed to fetch ${decodedUrl}: ${response.status} ${response.statusText}`);
      // Fallback: If proxy fails, we can't do much here but send the error
      return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await response.buffer();
    res.send(buffer);
  } catch (error: any) {
    // console.error("[Image Proxy Critical Error]:", error.message);
    res.status(500).send("Error proxying image: " + error.message);
  }
});

app.post("/api/proxy-upload", upload.single("file"), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // For file uploads we might still need node-fetch if native fetch has issues with form-data in older Node 18
    // But let's try native fetch first. If it fails, I'll recommend axios.
    const response = await fetch("https://cdn.dinzid.my.id/api/upload", {
      method: "POST",
      body: formData as any,
      headers: (formData as any).getHeaders ? (formData as any).getHeaders() : {}
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    console.error("Proxy Upload Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to inject meta tags
async function getDynamicMeta(reqPath: string): Promise<string> {
  const defaultMeta = `
    <title>DinzStream - Nobar Anime Anime Seru</title>
    <meta name="description" content="Nonton anime bareng teman secara real-time dengan sinkronisasi otomatis!" />
    <meta property="og:title" content="DinzStream - Nobar Anime Seru" />
    <meta property="og:description" content="Gabung room nobar dan nikmati anime favorit bersama teman-teman." />
    <meta property="og:image" content="https://url.dinzid.my.id/buzJJc8" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="DinzStream - Nobar Anime Seru" />
    <meta name="twitter:description" content="Nonton bareng anime favorit real-time!" />
    <meta name="twitter:image" content="https://url.dinzid.my.id/buzJJc8" />
  `;

  // Check if it's a room path or has a roomId in query
  let roomId = "";
  const roomMatch = reqPath.match(/^\/nobar\/([A-Z0-9_\-]+)$/);
  if (roomMatch) {
    roomId = roomMatch[1];
  } else {
    // Try to find room parameter in URL
    const urlParts = reqPath.split('?');
    if (urlParts.length > 1) {
       const params = new URLSearchParams(urlParts[1]);
       roomId = params.get('room') || "";
    }
  }

  if (roomId) {
    try {
      // Fetch room data from Firestore REST API
      const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
      const projectId = firebaseConfig.projectId;
      const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
      
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/rooms/${roomId}`;
      const response = await fetch(firestoreUrl);
      
      if (response.ok) {
        const data = await response.json();
        const fields = data.fields;
        
        const animeTitle = fields.animeTitle?.stringValue || "Nobar Anime";
        const animeImage = fields.animeImage?.stringValue || fields.animeBanner?.stringValue || "https://url.dinzid.my.id/buzJJc8";
        const hostName = fields.hostName?.stringValue || "Temanmu";
        
        // Return custom meta for the room
        return `
          <title>${animeTitle} - Nobar Bareng ${hostName}</title>
          <meta name="description" content="Ayo nonton ${animeTitle} bareng ${hostName} di DinzStream! Klik untuk bergabung." />
          <meta property="og:title" content="Nobar ${animeTitle} - DinzStream" />
          <meta property="og:description" content="Ayo nonton ${animeTitle} bareng ${hostName} di DinzStream! Klik untuk bergabung." />
          <meta property="og:image" content="${animeImage}" />
          <meta property="og:type" content="video.other" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Nobar ${animeTitle} - DinzStream" />
          <meta name="twitter:description" content="Nonton anime bareng ${hostName} secara real-time!" />
          <meta name="twitter:image" content="${animeImage}" />
        `;
      }
    } catch (error) {
      console.error("[Meta Injector] Error fetching room info:", error);
    }
  }

  return defaultMeta;
}

// Vite middleware / Static files
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  
  // In development, we can still intercept HTML
  app.use("*", async (req, res, next) => {
    if (req.originalUrl.includes('.') || req.originalUrl.startsWith('/api/')) return next();
    
    try {
      let html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
      
      const dynamicMeta = await getDynamicMeta(req.originalUrl);
      html = html.replace(/<!-- DYNAMIC_META_START -->[\s\S]*<!-- DYNAMIC_META_END -->/, dynamicMeta);
      
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath, { index: false })); // Disable default index serving

  app.get("*", async (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not Found' });
    
    try {
      let html = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
      const dynamicMeta = await getDynamicMeta(req.path);
      html = html.replace(/<!-- DYNAMIC_META_START -->[\s\S]*<!-- DYNAMIC_META_END -->/, dynamicMeta);
      
      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (error) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}

// Only listen if not in a Vercel-like environment
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

# Willow — Backend Proxy

Netlify serverless function that proxies Google Places API requests.
Keeps your API key server-side and handles CORS for the Willow frontend.

---

## Deploy in 5 steps

### 1. Push this repo to GitHub

```bash
cd willow-proxy
git init
git add .
git commit -m "Initial Willow proxy"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/willow-proxy.git
git push -u origin main
```

### 2. Connect to Netlify

1. Log in at **netlify.com**
2. Click **"Add new site" → "Import an existing project"**
3. Choose **GitHub** and select the `willow-proxy` repo
4. Build settings will auto-detect from `netlify.toml` — leave as-is
5. Click **Deploy site**

### 3. Add your Google API key as an environment variable

1. In Netlify, go to **Site settings → Environment variables**
2. Click **"Add a variable"**
3. Key: `GOOGLE_API_KEY`
4. Value: your Google API key (e.g. `AIzaSyB_xxxxxxxxxxxxxxxxxxxx`)
5. Click **Save** — then **Trigger deploy** to redeploy with the new variable

### 4. Note your Netlify URL

It'll be something like `https://willowapp.netlify.app`
(You can set a custom subdomain in Site settings → Domain management)

### 5. Update the Willow frontend

In `willow.html`, find this line near the top of the `<script>` section:

```js
const PROXY = localStorage.getItem('willow_proxy') || '';
```

Replace with:

```js
const PROXY = 'https://YOUR-SITE.netlify.app';
```

Or — even simpler — open your browser console on the Willow page and run:

```js
localStorage.setItem('willow_proxy', 'https://YOUR-SITE.netlify.app')
```

That's it. Live Google Places results will now load in Willow.

---

## Test your proxy is working

Visit this URL in your browser (replace with your Netlify domain):

```
https://YOUR-SITE.netlify.app/api/places?q=gluten+free+restaurant+Norwich&dietary=gluten+free
```

You should get back a JSON array of venues. If you see an error, check:
- The `GOOGLE_API_KEY` env variable is set correctly in Netlify
- The **Places API** is enabled in your Google Cloud Console
- You've redeployed after adding the env variable

---

## Project structure

```
willow-proxy/
├── netlify/
│   └── functions/
│       └── places.js       ← the proxy function
├── public/
│   └── index.html          ← placeholder page
├── netlify.toml            ← routes /api/* to the function
├── package.json
└── README.md
```

---

## Google Cloud setup checklist

- [ ] Created a Google Cloud project
- [ ] Enabled **Places API**
- [ ] Enabled **Maps JavaScript API**  
- [ ] Created an API key
- [ ] Restricted API key to those two APIs
- [ ] Added key to Netlify environment variables

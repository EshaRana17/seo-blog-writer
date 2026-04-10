# SEO Blog Writer — Complete Setup Guide

## How to Open Terminal in VS Code

1. Open VS Code
2. Press **Ctrl + ` ** (that's Control + backtick — the key above Tab)
   OR go to menu: **View → Terminal**
3. A terminal panel opens at the bottom of VS Code
4. Navigate to your project folder:
   - Type: `cd ` (with a space after cd)
   - Then drag your project folder into the terminal — the path appears automatically
   - Press Enter

---

## Step 1 — Install Node.js (one time only)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (big green button)
3. Install it — click Next through everything
4. To verify it worked, in your VS Code terminal type:
   ```
   node --version
   ```
   You should see something like `v20.11.0`

---

## Step 2 — Set Up the Project

Open VS Code terminal inside the project folder, then type these commands **one at a time**, press Enter after each:

```
npm install
```
Wait for it to finish (it downloads packages — takes 1-2 minutes).

---

## Step 3 — Add Your API Keys

1. In the project folder, find the file called `.env.example`
2. **Make a copy** of it and name the copy `.env.local`
   (In VS Code: right-click the file → Copy → right-click → Paste → rename to `.env.local`)
3. Open `.env.local` and fill in your keys:

```
GROK_API_KEY=your_api_key_here
FIRECRAWL_API_KEY=your_api_key_here
```

4. Save the file (Ctrl+S)

---

## Step 4 — Run the App

In VS Code terminal:

```
npm run dev
```

You'll see something like:
```
▲ Next.js 14.2.5
- Local: http://localhost:3000
```

Open your browser and go to: **http://localhost:3000**

The app is running! 🎉

To stop the app: press **Ctrl + C** in the terminal.

---

## Step 5 — Deploy on Vercel (Share with Anyone)

### 5a — Push to GitHub

1. Create a free account at **https://github.com**
2. Click **"New"** → create a repo called `seo-blog-writer` (set to Private)
3. In VS Code terminal, type these commands one by one:

```
git init
```
```
git add .
```
```
git commit -m "first commit"
```
```
git branch -M main
```
```
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/seo-blog-writer.git
```
(Replace YOUR_GITHUB_USERNAME with your actual GitHub username)
```
git push -u origin main
```

### 5b — Deploy on Vercel

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Find `seo-blog-writer` → click **"Import"**
4. Before clicking Deploy, scroll down to **"Environment Variables"**
5. Add these two variables:
   - Name: `GROK_API_KEY` → Value: your Grok key
   - Name: `FIRECRAWL_API_KEY` → Value: your Firecrawl key
6. Click **"Deploy"**

Done! You get a live URL like `https://seo-blog-writer-abc.vercel.app`

---

## Updating the App Later

If you make changes:
```
git add .
git commit -m "update"
git push
```
Vercel automatically redeploys.

---

## Something Not Working?

**"npm is not recognized"** → Node.js isn't installed. Do Step 1 again.

**"Cannot find module"** → Run `npm install` again.

**"Invalid API Key"** → Check `.env.local` exists (not `.env.example`), no spaces around `=`.

**App is slow** → Normal! Each blog makes ~15 web requests + AI calls. Takes 3-6 minutes.

**Vercel timeout** → Go to Vercel → Project Settings → Functions → set Max Duration to 300.

**Image doesn't load** → Pollinations.ai sometimes takes 20-30 seconds. Refresh after a minute.

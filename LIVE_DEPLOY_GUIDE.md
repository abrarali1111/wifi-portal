# How to Make Your Project Live (FREE) / Project ko Live karne ka Tarika

Follow these 3 easy steps to put your project on the internet.

---

### Step 1: Upload to GitHub (GitHub par upload karein)
1. Go to [GitHub.com](https://github.com) and create a New Repository named `wifi-portal`.
2. Open your `WIFI` folder on your computer.
3. On GitHub, click the link that says **"uploading an existing file"**.
4. **Drag and drop ALL files** from your folder into the GitHub box.
5. Click **Commit changes** at the bottom.

### Step 2: Connect to Render (Render se connect karein)
1. Go to [Render.com](https://render.com) and Login with GitHub.
2. Click **"New +"** and select **"Web Service"**.
3. Select your `wifi-portal` repository.
4. Use these settings:
   - **Name**: `wifi-portal`
   - **Region**: (Any)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Deploy Web Service**.

### Step 3: Your Live Link (Aapka Live Link)
Wait 2-3 minutes. Once it says "Live", Render will give you a link like:
`https://wifi-portal.onrender.com`

**Mubarak ho!** Aapka project live ho gaya!

---

> [!IMPORTANT]
> **Data Loss Note**: Since this is a free host, if nobody visits your site for a while, it "sleeps". When it wakes up, all data in `db.json` (new users/complaints) might be deleted. 
> *Temporary solution*: Download the "Excel" from your Admin panel regularily to keep a backup.

---

# 🚀 Ultimate Guide: Lifetime Free Hosting with Safe Data

Aapka system ab **MongoDB** ke liye tayyar hai. Iska matlab hai ke aapka data (Users/Billings) **Hamesha Safe** rahega, chahe server restart ho ya band ho jaye.

---

### Step 1: Get Free Database (MongoDB Atlas)
1.  **[mongodb.com/atlas](https://www.mongodb.com/atlas/database)** par jayen aur **"Try Free"** par click karein.
2.  Sign up karein (Google se kar lein).
3.  **"Create a Cluster"** (Free Shared) select karein.
4.  **"Database Access"** mein ja kar ek User banayen (Username: `admin`, Password: koi yaad rakhne wala).
5.  **"Network Access"** mein ja kar "Add IP Address" dabayen aur **"Allow Access from Anywhere" (0.0.0.0/0)** select karein.
6.  **"Connect"** button dabayen > **"Connect your application"**.
7.  Aapko ek link milega, usay copy karein.
    *   Example: `mongodb+srv://admin:parsword123@cluster0.mongodb.net/?retryWrites=true&w=majority`
    *   Is link mein `<password>` ki jagah apna asli password likhna mat bhoolna!

### Step 2: Upload Code to GitHub
1.  **[github.com](https://github.com/)** par New Repository banayen (Name: `wifi-portal`).
2.  Is folder ki saari files wahan upload karein.

### Step 3: Deploy on Render (Free Hosting)
1.  **[render.com](https://render.com/)** par account banayen.
2.  **"New +"** > **"Web Service"**.
3.  Github se `wifi-portal` select karein.
4.  **Settings:**
    *   **Runtime:** Node
    *   **Build Command:** `npm install`
    *   **Start Command:** `node server.js`
5.  **IMPORTANT (Environment Variables):**
    *   Niche "Environment Variables" section mein "Add Environment Variable" dabayen.
    *   **Key:** `MONGODB_URI`
    *   **Value:** (Wahi MongoDB wala link jo Step 1 mein copy kiya tha)
6.  **"Create Web Service"** dabayen.

🎉 **Mubarak ho!** Aapka WiFi Portal ab poori duniya mein live hai aur lifetime free data save karega.

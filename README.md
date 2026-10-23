# BasxAuth Service PRO (KeyAuth Compatible Authentication System)

A production-grade, full-stack License Key Authentication & Application Management Dashboard built with **React 19**, **Tailwind CSS**, and **Express.js**. Fully compatible with standard **KeyAuth v1.0 / v1.2 / v1.3 SDKs** (C++, C#, Python, etc.).

---

## 🌟 Key Features

- **100% KeyAuth SDK Compatibility:**
  - Standard endpoints: `/api/1.2/`, `/api/1.0/`, `/api/client`, `/api/v1/client`.
  - Supports `type=init`, `type=license`, `type=login`, `type=register`, `type=upgrade`, `type=var`, `type=setvar`, `type=getvar`, `type=checkblacklist`, `type=log`, `type=fetchOnline`.
- **Advanced HWID Locking (Hardware Identification):**
  - **HWID Affected Toggle**: Enable 1:1 hardware ID binding or turn it off for multi-device keys.
  - Automatic hardware mismatch detection (`HWID Doesn't Match`).
  - Owner HWID Reset capability directly from the dashboard.
- **Granular Expiry Times:**
  - Generate keys with custom durations: **Seconds, Minutes, Hours, Days, Weeks, Months, Years, or Lifetime**.
  - Precise timestamp calculations upon first client activation.
- **Security & DDoS Protection:**
  - In-memory rate limiting & burst protection.
  - IP and HWID blacklisting system.
  - Application-level pause switch to instantly halt unauthorized requests.
  - Password hashing with Bcrypt.
- **Full Dashboard Management:**
  - Applications overview & credentials (Name, Owner ID, Secret, Version).
  - License Key Manager with instant copy, pause, delete, and HWID reset.
  - User Accounts Manager with subscriptions and hardware IDs.
  - Global Application Variables & User Variables.
  - Real-time Active Sessions & Event Audit Logs.
  - Discord / Custom Webhook integration for login & security events.

---

## 🚀 Quick Start

### 1. Installation
Clone or download the repository, then install dependencies:
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The server will start on port `3000` (e.g. `http://localhost:3000`).

### 3. Production Build
```bash
npm run build
npm start
```

---

## 🔑 Application Credentials (Default)

- **Application Name:** `BASXApp1`
- **Account Owner ID:** `basx-admin-owner`
- **Application Secret:** `4e6584416bcc4698b97fbab5661d8ed35865f965d2094e8680711fe3a1c0bdb1`
- **Version:** `1.0`

---

## 💻 Client Integration Examples

### Python (KeyAuth SDK)
```python
from keyauth import api

keyauthapp = api(
    name = "BASXApp1",
    ownerid = "basx-admin-owner",
    secret = "4e6584416bcc4698b97fbab5661d8ed35865f965d2094e8680711fe3a1c0bdb1",
    version = "1.0",
    hash_to_check = ""
)

keyauthapp.init()

license_key = input("Enter your License Key: ")
keyauthapp.license(license_key)
print("Welcome! Logged in successfully.")
```

### C# / .NET (KeyAuth SDK)
```csharp
public static api KeyAuthApp = new api(
    name: "BASXApp1",
    ownerid: "basx-admin-owner",
    secret: "4e6584416bcc4698b97fbab5661d8ed35865f965d2094e8680711fe3a1c0bdb1",
    version: "1.0"
);

KeyAuthApp.init();

Console.Write("Enter your License Key: ");
string key = Console.ReadLine();
KeyAuthApp.license(key);

if (KeyAuthApp.response.success) {
    Console.WriteLine("Logged in successfully!");
} else {
    Console.WriteLine("Error: " + KeyAuthApp.response.message);
}
```

### C++ (KeyAuth SDK)
```cpp
using namespace KeyAuth;

std::string name = "BASXApp1";
std::string ownerid = "basx-admin-owner";
std::string secret = "4e6584416bcc4698b97fbab5661d8ed35865f965d2094e8680711fe3a1c0bdb1";
std::string version = "1.0";
std::string url = "https://your-domain.run.app/api/1.2/";

api KeyAuthApp(name, ownerid, secret, version, url);
KeyAuthApp.init();

std::cout << "Enter key: ";
std::string key;
std::cin >> key;
KeyAuthApp.license(key);
```

---

## 📦 Project Structure

```text
├── src/                    # Frontend React 19 application
│   ├── components/         # Dashboard tabs (Keys, Users, Apps, Logs, etc.)
│   ├── context/            # Auth & Application state providers
│   ├── pages/              # Login & Dashboard views
│   ├── App.tsx             # Main router & theme layout
│   └── main.tsx            # Application entrypoint
├── server/                 # Backend Express & KeyAuth API
│   ├── routes/
│   │   ├── client.ts       # KeyAuth client API router (/api/1.2/)
│   │   ├── auth.ts         # Owner login & seller authentication
│   │   └── api.ts          # Dashboard CRUD API
│   ├── middleware/         # Security & rate limiting
│   └── db.ts               # Local persistent database store
├── server.ts               # Full-stack server entry
├── package.json
└── vite.config.ts
```

---

## 📄 License
MIT License

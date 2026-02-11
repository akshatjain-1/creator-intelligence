# **MVP \-1: The "Walking Skeleton" Strategy**

**Objective:** Validate the YouTube Data Ingestion Pipeline & OAuth Lifecycle.

**Goal:** Prove we can extract, store, and refresh data without crashing or getting banned.

**Timeline:** 5 Days.

## **1\. The Philosophy: "No UI, Just Data"**

We are not building a frontend. We are building a backend that *works*. If the database has data, we win. If the database is empty, we fail. The "Interface" for MVP \-1 is the database console and a simple swagger endpoint.

## **2\. Scope of Work**

### **IN SCOPE (The "Must Haves")**

* **OAuth 2.0 Flow:** successfully exchanging an Authorization Code for an Access Token \+ Refresh Token.  
* **Token Management:** Encrypting the Refresh Token in the DB and successfully generating a *new* Access Token after 1 hour (when the old one dies).  
* **Data Ingestion (Vertical Slice):**  
  * Fetch **1 Channel Profile** (Identity).  
  * Fetch **Last 5 Videos** (Metadata).  
  * Fetch **Analytics for 1 Video** (Retention/Views).  
* **Storage:** Verify data lands in PostgreSQL tables creators, videos, and analytics\_snapshots.

### **OUT OF SCOPE (The Distractions)**

* **Frontend/Dashboard:** (Use Swagger UI or Postman).  
* **AI/Gemini Integration:** (Not needed for plumbing).  
* **Complex Math:** (No "Hook Score" yet, just raw numbers).  
* **Multi-User Support:** (Hardcode for 1 Admin User).  
* **Cloud Deployment:** (Run on Localhost).

## **3\. Technical Implementation Plan**

### **3.1 Stack (Simplified)**

* **Language:** Python 3.11+  
* **Framework:** FastAPI (for endpoints).  
* **Database:** PostgreSQL (running locally via Docker).  
* **ORM:** SQLAlchemy or SQLModel.  
* **Auth Client:** google-auth-oauthlib and google-api-python-client.

### **3.2 Key Endpoints to Build**

1. GET /auth/login: Redirects to Google's OAuth consent screen.  
2. GET /auth/callback: Receives the code, exchanges for tokens, saves to DB.  
3. GET /test/ingest/{channel\_id}: Manually triggers the ingestion logic for a specific channel.  
4. GET /test/quota: Returns the current estimated quota usage.

### **3.3 The "Pass/Fail" Tests**

| Test Case | Success Criteria | Why It Matters |
| :---- | :---- | :---- |
| **The "One Hour" Test** | Wait 61 minutes after login. Trigger an API call. | Proves the **Refresh Token** logic works. If this fails, the app breaks every hour. |
| **The "Private Data" Test** | Fetch averageViewDuration for a video. | Proves we have the correct **Scopes** (yt-analytics.readonly). |
| **The "Duplicate" Test** | Run the ingest command twice in a row. | Database should update the *existing* row, not create a duplicate. |

## **4\. Execution Steps (For Antigravity)**

**Day 1: The Environment**

* Set up local Postgres in Docker.  
* Create models.py with the 3 core tables (creators, videos, analytics).  
* Get client\_secret.json from Google Cloud Console.

**Day 2: The Handshake**

* Build the OAuth endpoints.  
* Successfully log in and see the refresh\_token stored as an encrypted string in the DB.

**Day 3: The Plumbing**

* Write the YouTubeClient class.  
* Implement fetch\_channel\_stats() and fetch\_recent\_videos().  
* Run it and check Postgres: SELECT \* FROM videos;.

**Day 4: The Hard Part (Analytics)**

* Implement fetch\_video\_analytics().  
* **Crucial:** Handle the "Day Delay." YouTube API might return nothing for today. Logic must default to "Yesterday."

**Day 5: Validation**

* Run the "One Hour Test".  
* Document the exact JSON structure returned by the API (it often differs from documentation).

## **5\. Transition to MVP**

Once MVP \-1 passes:

1. We know the data schema is valid.  
2. We know we won't get locked out of accounts.  
3. **Then** we build the Next.js Frontend to visualize this stable data.
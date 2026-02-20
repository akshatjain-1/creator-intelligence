# **Phase 2.5: Secure Multi-Tenant & Multi-Channel Architecture**

**Objective:** Transform the MVP into an enterprise-grade SaaS.

1. **Security:** Isolate user data using Firebase Authentication.  
2. **Multi-Channel:** Allow one user to connect multiple YouTube channels (1-to-Many relationship).  
3. **Separation of Concerns:** Strictly separate App Identity (who logs in) from Platform Integration (which YouTube data is fetched).

## **1\. Database Schema (Unified Entity Relationship)**

We are permanently moving away from a single-tenant design. The schema must enforce strict hierarchical ownership.

### **Table: users (The Human / Identity)**

* id (UUID, Primary Key)  
* firebase\_uid (String, Unique, Indexed) \- Maps to Firebase Auth.  
* email (String)  
* created\_at (Timestamp)

### **Table: youtube\_channels (The Integrations / Assets)**

* id (UUID, Primary Key)  
* user\_id (UUID, Foreign Key \-\> users.id) \- **CRITICAL: The 1-to-Many Link**  
* youtube\_channel\_id (String, Unique, Indexed)  
* channel\_name (String) \- e.g., "MrBeast Gaming"  
* channel\_avatar\_url (String)  
* access\_token (Encrypted String)  
* refresh\_token (Encrypted String)  
* is\_active (Boolean, Default: True)

### **Table: videos & analytics\_snapshots**

* Update foreign keys: These tables must now link to youtube\_channels.youtube\_channel\_id.

## **2\. Backend Security & Logic (FastAPI)**

We no longer trust the frontend. Every API request must prove *who* is asking and prove they *own* the channel they are asking about.

### **2.1 Firebase JWT Middleware (dependencies.py)**

1. Install firebase-admin.  
2. Create get\_current\_user(token: str \= Depends(oauth2\_scheme)).  
3. **Logic:** Verify the incoming Bearer token \-\> Extract firebase\_uid \-\> Fetch/Create the user in the users table \-\> Return User object.

### **2.2 The OAuth Callback Refactor**

The Google OAuth flow must now be context-aware of the logged-in user.

1. Frontend requests the Google Auth URL from the backend, passing the Firebase JWT.  
2. When Google redirects back to GET /auth/callback with the code, the backend exchanges it for tokens.  
3. Backend pings YouTube Data API (/youtube/v3/channels?mine=true) to get the channel details.  
4. **Upsert Logic:** \* Check if youtube\_channel\_id exists in youtube\_channels.  
   * If YES: Update tokens. Verify user\_id matches the current logged-in user.  
   * If NO: Insert a new row linking this youtube\_channel\_id and the tokens to the current\_user.id.

### **2.3 Strict Endpoint Scoping**

Endpoints must require a channel\_id and verify ownership against the current\_user.

* **Pattern:** GET /api/channels/{channel\_id}/videos  
* **Security Check:**

channel \= session.query(YouTubeChannel).filter(  
    YouTubeChannel.youtube\_channel\_id \== channel\_id,  
    YouTubeChannel.user\_id \== current\_user.id \# PREVENTS DATA LEAKS  
).first()  
if not channel:  
    raise HTTPException(status\_code=403, detail="Unauthorized access to channel")

## **3\. Frontend UI/UX (Next.js)**

### **3.1 App Authentication (Firebase)**

* Initialize Firebase Client SDK.  
* Create /login page with "Sign in with Google" (Firebase popup).  
* Protect all /dashboard routes—redirect unauthenticated users to /login.

### **3.2 Global HTTP Interceptor**

* Create an Axios/Fetch interceptor.  
* Before *every* API call, execute await firebase.auth().currentUser.getIdToken().  
* Attach to headers: Authorization: Bearer \<token\>.

### **3.3 The "Workspace Switcher" & Onboarding**

* **Global State:** Maintain an activeChannelId (React Context/Zustand).  
* **Onboarding:** On first login, if backend returns \[\] for user's channels, show a full-screen "Connect your first YouTube Channel" button.  
* **The Switcher:** The top navigation must contain a dropdown listing all channels owned by the user.  
* **Add Channel:** The last option in the dropdown is always "+ Connect another Channel", which triggers the Google OAuth flow.  
* **Reactivity:** Changing the dropdown updates activeChannelId, causing all charts/tables to re-fetch data passing ?channel\_id=NEW\_ID.

## **4\. Implementation Steps for AI Coder**

1. **DB Migration:** Rewrite models.py based on Section 1\. Generate and apply Alembic migrations.  
2. **Auth Gateway:** Implement dependencies.py for Firebase verification.  
3. **OAuth Overhaul:** Refactor the Google OAuth endpoints to support the 1-to-Many upsert logic linked to the Firebase User.  
4. **Endpoint Lockdown:** Go through every existing route in ingest.py and dashboard.py. Add Depends(get\_current\_user) and ensure DB queries filter by user\_id and channel\_id.  
5. **Frontend Shell:** Build the Next.js Firebase login, HTTP interceptor, and the Channel Switcher dropdown.
# **Product Requirements Document: Creator Intelligence Engine**

## **1\. Product Vision**

A "Decision Engine" for YouTube Creators that uses internal logic and AI to transform raw analytics into actionable growth strategies. Unlike YouTube Studio (which displays data), this product explains *why* the data looks that way and *what* to do next.

## **2\. Platform Strategy**

* **Type:** Responsive Web Application (SaaS).  
* **Core Device:** Desktop (primary), Mobile (secondary/view-only).  
* **Target Audience:** Mid-sized YouTubers (10k \- 500k subscribers) who have data but lack analysis skills.

## **3\. Tech Stack (Strict Enforcement)**

* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI (for components), Recharts (for visualization).  
* **Backend:** Python (FastAPI). Chosen for superior data processing (Pandas) and AI integration.  
* **Database:** PostgreSQL (Cloud SQL) \+ TimescaleDB extension (for time-series analytics).  
* **Queue/Workers:** Redis \+ Celery (or BullMQ if Node) for handling background ingestion.  
* **AI Provider:** Google Gemini 1.5 Flash (Analysis), Gemini 1.5 Pro (Strategy).  
* **Auth:** Firebase Authentication (handles Google Sign-In).  
* **Infrastructure:** Google Cloud Run (Serverless Container).

## **4\. Architecture: The "Tiered Ingestion" Model**

To prevent API Quota exhaustion (YouTube API Limit: 10,000 units/day), the system must strictly adhere to this ingestion logic:

### **Service A: The Watchtower (Low Frequency)**

* **Trigger:** PubSubHubbub (Push) or 6-hour polling.  
* **Action:** Detects *new* video uploads.  
* **API Cost:** Minimal.

### **Service B: The Metadata Sync (Medium Frequency)**

* **Trigger:** On new video detection \+ daily sync.  
* **Action:** Fetches public metadata (Title, Thumbnails, Public View Count).  
* **Source:** YouTube Data API v3.  
* **Storage:** Updates videos table.

### **Service C: The Deep Dive (Once per 24h)**

* **Trigger:** Nightly Cron Job (staggered per user).  
* **Action:** Fetches private analytics (Retention, Demographics, CTR).  
* **Source:** YouTube Analytics API.  
* **Constraint:** NEVER fetch analytics for videos older than 90 days unless explicitly requested.  
* **Storage:** Updates video\_analytics\_snapshots (Time-series).

## **5\. Functional Requirements**

### **5.1 Authentication & Onboarding**

* **Req 1.1:** User logs in via Google (Firebase Auth).  
* **Req 1.2:** App requests specific OAuth 2.0 Scopes (Incremental Auth):  
  * https://www.googleapis.com/auth/userinfo.email (Identity)  
  * https://www.googleapis.com/auth/youtube.readonly (Public Data)  
  * https://www.googleapis.com/auth/yt-analytics.readonly (Private Analytics)  
* **Req 1.3:** If user denies Analytics scope, app acts in "Public Mode" (competitor tracking only).

### **5.2 The Dashboard (UI)**

* **Req 2.1:** "The Pulse" \- A widget showing the *Velocity* of the latest video compared to the channel's 10-video average.  
* **Req 2.2:** "Hook Score" \- A calculated metric: (Retention @ 30s) / (Retention @ 0s). Visualized as a Gauge Chart.  
* **Req 2.3:** "Conversion Funnel" \- Visualizes Impressions \-\> CTR \-\> Views \-\> Avg View Duration.

### **5.3 The Insight Engine (Logic \+ AI)**

* **Req 3.1:** **Rule-Based Pre-Processing**: Python backend must calculate deviations *before* calling AI.  
  * *Example:* If current\_ctr \< (avg\_ctr \- 10%), tag as LOW\_CTR.  
* **Req 3.2:** **Gemini Integration**:  
  * Input: JSON summary of specific deviations.  
  * Prompt Structure: "You are a strategist. The data shows \[Trend\]. Explain \[Cause\] in 1 sentence."  
  * **Constraint:** Temperature set to 0.2 (Low creativity, high accuracy).

## **6\. Data Schema Specifications (Postgres)**

### **Table: creators**

* id (UUID)  
* channel\_id (String, Indexed)  
* access\_token (Encrypted)  
* refresh\_token (Encrypted)  
* next\_analytics\_sync (Timestamp)

### **Table: videos**

* id (UUID)  
* youtube\_video\_id (String, Unique)  
* title (String)  
* published\_at (Timestamp)  
* duration\_seconds (Int)

### **Table: analytics\_snapshots (Time-Series)**

* video\_id (FK)  
* date (Date)  
* views (Int)  
* watch\_time\_minutes (Int)  
* average\_view\_duration (Int)  
* retention\_at\_30s (Float)  
* ctr (Float)

## **7\. Non-Functional Requirements**

* **Rate Limiting:** Application must internally track quota usage. If quota \> 90%, stop all background workers.  
* **Latency:** Dashboard must load from DB (Cached), never from live API. Load time \< 200ms.  
* **Security:** OAuth Refresh Tokens must be encrypted at rest using Fernet (Python cryptography).

## **8\. Phased Execution Timeline**

### **Phase 1: The Foundation (Weeks 1-4)**

* **Goal:** Secure, reliable data ingestion. No UI.  
* **Deliverables:**  
  * FastAPI Backend scaffolded.  
  * OAuth flow working with Refresh Token rotation.  
  * "Service C" (Deep Dive) worker fetching and storing data in Postgres.  
  * Basic "Admin" view to inspect raw database rows.

### **Phase 2: The Logic Core (Weeks 5-7)**

* **Goal:** Transform raw numbers into "Signals".  
* **Deliverables:**  
  * Implementation of "Hook Score" and "Velocity" math.  
  * API Endpoints serving JSON data to the frontend.  
  * Basic Next.js Dashboard (Read-only charts).

### **Phase 3: The Intelligence (Weeks 8-10)**

* **Goal:** Gemini Integration & UX Polish.  
* **Deliverables:**  
  * Integration of Gemini 1.5 Flash for text summaries.  
  * "Insight Feed" UI component.  
  * Deployment to Google Cloud Run.

### **Phase 4: Hardening (Weeks 11-12)**

* **Goal:** Production readiness.  
* **Deliverables:**  
  * Redis Caching layer implementation.  
  * Quota management "Kill switch".  
  * Error handling for API failures (403, 429).
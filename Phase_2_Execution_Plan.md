# **Phase 2: The Logic Core & Intelligence Layer**

**Current State:** MVP-1 Complete (Data Ingestion & Auth working).

**Objective:** Transform raw database rows into "Proprietary Signals" and actionable insights.

**Philosophy:** We are NOT building an AI Wrapper. We are building a **Math Engine** that uses AI for *synthesis*, not *analysis*.

## **1\. Architecture: The "Signal" Pipeline**

Data flows in this strict order. **Do not skip steps.**

1. **Raw Data (Postgres):** views, retention, publish\_date (Already exists from MVP-1).  
2. **The Math Engine (Python):** Calculates *derived metrics* (Hook Score, Velocity, Baseline deviations). **\<-- THIS IS THE MOAT.**  
3. **The Context Assembler:** Bundles the derived metrics \+ Channel Averages into a structured JSON payload.  
4. **The AI Layer (Gemini):** Receives the JSON payload and translates it into *human advice*.  
5. **The UI (Next.js):** Visualizes the Math (Charts) and displays the Advice (Text).

## **2\. Backend Requirements (The Logic)**

### **2.1 The Scoring Service (backend/app/services/scoring\_service.py)**

This service must run *after* every ingestion sync. It updates the database with derived metrics.

**Required Formulas (Implement Strictly):**

* **Metric A: Hook Score**  
  * *Concept:* How good is the intro?  
  * *Formula:* (Retention\_at\_30s / Retention\_at\_0s) \* 100  
  * *Constraint:* Cap at 100\. If Retention\_at\_0s is 0, Score is 0\.  
* **Metric B: Growth Velocity**  
  * *Concept:* How fast is it moving *right now*?  
  * *Formula:* Current\_Views / Hours\_Since\_Publish  
  * *Constraint:* If Hours\_Since\_Publish \< 1, use 1 to avoid division by zero.  
* **Metric C: The "Baseline" (Crucial for Context)**  
  * *Concept:* Is this video good *relative to the channel*?  
  * *Formula:* Average of Hook Score and Velocity for the last 10 videos (excluding the current one).  
  * *Output:* performance\_delta \= (Current\_Score \- Baseline\_Score) / Baseline\_Score.

### **2.2 The Intelligence Service (backend/app/services/intelligence.py)**

**Integration:** Google Gemini 1.5 Flash.

**The Prompt Strategy (Context Injection):**

Do *not* ask the AI to calculate anything. Feed it the calculations.

* **Input Payload Structure:**  
  {  
    "video\_title": "My New Camera",  
    "hook\_score": 45,  
    "channel\_avg\_hook": 60,  
    "velocity": 100,  
    "channel\_avg\_velocity": 50,  
    "primary\_issue": "retention\_drop\_early"  
  }

* **System Instruction:**  
  "You are a YouTube Strategist. You receive structured performance metrics. Your job is to write a **single, brutal, actionable sentence** for the creator.  
  * If Hook Score \< Average: Blame the intro.  
  * If Velocity \> Average: Congratulate the topic choice.  
  * Tone: Professional, concise, data-backed."

## **3\. Frontend Requirements (The Experience)**

**Framework:** Next.js 14 (App Router) \+ Tailwind CSS \+ Lucide Icons.

### **3.1 The Dashboard Page (/dashboard)**

* **Layout:** Sidebar navigation (Overview, Videos, Settings). Main content area.  
* **State Management:** Use SWR or React Query to fetch data from the backend APIs.

### **3.2 Key Components**

1. **MetricCard**:  
   * Displays a metric (e.g., "Avg Hook Score").  
   * **Crucial:** Must show a green/red badge: \+12% vs last week.  
2. **VideoPerformanceRow**:  
   * A table row for a video.  
   * Columns: Thumbnail, Title, Views, Hook Score (Color-coded: Red \< 40, Yellow \< 60, Green \> 60), AI Insight Button.  
3. **InsightGenerator (The Magic Button):**  
   * When the user clicks "Analyze" on a video, call the GET /api/insight/{video\_id} endpoint.  
   * Show a skeleton loader while Gemini thinks.  
   * Display the result in a distinct "Insight Box".

## **4\. API Endpoints to Build (FastAPI)**

1. GET /api/dashboard/stats: Returns aggregated channel stats (Total views, Avg Hook Score across all videos).  
2. GET /api/videos: Returns list of videos with their *calculated* scores (from the DB).  
3. POST /api/videos/{id}/analyze: Triggers the Gemini service to generate specific advice for *one* video.

## **5\. Implementation Instructions for Antigravity**

**Step-by-Step Execution Order:**

1. **Database Migration:** Update models.py to add columns: hook\_score (Float), velocity (Float), last\_analyzed\_at (DateTime). Generate and run the migration.  
2. **The Math:** Implement scoring.py. Create a script recalc\_scores.py to backfill scores for the existing videos in the DB.  
3. **The API:** Create the routers/dashboard.py endpoints to serve this data.  
4. **The Frontend:** Scaffold the Next.js project in frontend/. Install lucide-react, recharts, axios.  
5. **The Connection:** Connect the Frontend MetricCards to the GET /api/dashboard/stats endpoint.

**Constraints:**

* **No Hallucinations:** If a video has no analytics data (because it's too new), the Hook Score must be null, not 0\.  
* **Error Handling:** If Gemini API fails, return a fallback string: "AI analysis unavailable, but your Hook Score is X%."
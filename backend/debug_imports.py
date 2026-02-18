import sys
import os
sys.path.append(os.getcwd())
try:
    from app.routers import ingest
    print("Ingest imported successfully")
except Exception as e:
    import traceback
    traceback.print_exc()

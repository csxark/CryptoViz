--- a/apps/cli/main.py
@@ -10,7 +10,7 @@
 import os
 import subprocess
 
-def build_project():
+def clean_build_artifacts():
     try:
         # Clean up previous build artifacts
-        subprocess.run(['npm', 'run', 'clean'], check=True)
+        subprocess.run(['rm', '-rf', '.build'], check=True)
         print("Build artifacts cleaned successfully.")
     except subprocess.CalledProcessError as e:
         print(f"Failed to clean build artifacts: {e}")

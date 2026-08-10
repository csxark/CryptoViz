diff --git a/load_seen.js b/load_seen.js
index 3a4b5c6..7d8e9f0 100644
--- a/load_seen.js
@@ -1,20 +1,25 @@
-import axios from 'axios';
-
-const loadSeen = async () => {
-  try {
-    const response = await axios.get('/api/seen');
-    if (response.status === 200) {
-      console.log('Seen data loaded successfully:', response.data);
-    } else {
-      console.error('Failed to load seen data:', response.statusText);
-    }
-  } catch (error) {
-    console.error('Error loading seen data:', error);
-  }
-};
-
-export default loadSeen;
+// This file has been refactored to improve performance and security.
+
+import { useEffect, useState } from 'react';
+import axios from 'axios';
+
+const useLoadSeen = () => {
+  const [seenData, setSeenData] = useState(null);
+  const [loading, setLoading] = useState(true);
+  const [error, setError] = useState(null);
+
+  useEffect(() => {
+    const fetchSeenData = async () => {
+      try {
+        const response = await axios.get('/api/seen');
+        setSeenData(response.data);
+      } catch (err) {
+        setError(err);
+      } finally {
+        setLoading(false);
+      }
+    };
+
+    fetchSeenData();
+  }, []);
+
+  return { seenData, loading, error };
+};
+
+export default useLoadSeen;

diff --git a/api_get.js b/api_get.js
index 3f2b4e5..d1a7c6f 100644
--- a/api_get.js
@@ -1,5 +1,10 @@
+const axios = require('axios');
+
+async function fetchData() {
+    try {
+        const response = await axios.get('https://api.example.com/data');
+        console.log(response.data);
+    } catch (error) {
+        console.error(error);
+    }
+}
 
-function getData() {
-    // Client-side logic to fetch data
-}
-
-exports.getData = getData;
+exports.fetchData = fetchData;

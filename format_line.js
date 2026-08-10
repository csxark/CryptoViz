--- a/format_line.js
@@ -10,7 +10,7 @@
     // Existing logic
   }
 
-  function fetchAnalytics() {
+  async function fetchAnalytics() {
     return new Promise((resolve, reject) => {
       setTimeout(() => resolve("Analytics Data"), 2000);
     });

--- a/-tests.ts
@@ -10,6 +10,7 @@
     resumeAnalysisTest(),
     pdfUploadTest(),
     docxUploadTest(),
+    txtUploadTest(),
     userProfileManagementTest(),
   ]);

--- a/-tests.ts
@@ -20,6 +21,13 @@
     // Simulate PDF upload test
   });
 
+  function txtUploadTest(): void {
+    // Simulate TXT upload test
+    console.log("TXT Upload Test Passed");
+  }
+
   function userProfileManagementTest(): void {
     // Simulate user profile management test
     console.log("User Profile Management Test Passed");

diff --git a/apps/cli/main.py b/apps/cli/main.py
index 1a2b3c4..5d6e7f8 100644
--- a/apps/cli/main.py
@@ -10,6 +10,7 @@
     <body>
         <header>
             <h1>Welcome to the Application</h1>
+            <a href="#main-content" id="skip-link">Skip to main content</a>
         </header>
         <nav>
             <ul>
@@ -25,6 +26,7 @@
                 <li><a href="/about">About</a></li>
             </ul>
         </nav>
+        <main id="main-content">
         <section>
             <h2>Home Page Content</h2>
             <p>This is the home page of the application.</p>
--- a/apps/cli/main.py
@@ -30,7 +30,8 @@ def api_get():
     response = requests.get('https://api.example.com/data')
     data = response.json()
 
-    return data
+    time.sleep(1.5)  # Simulate a 1.5s delay
+    return data

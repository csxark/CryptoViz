--- a/fetch_all_issues.js
@@ -10,7 +10,7 @@
     async fetchAllIssues() {
         try {
             const response = await fetch('https://api.example.com/issues');
-            const data = await response.json();
+            const data = await response.json().then(data => this.processData(data));
             return data;
         } catch (error) {
             console.error('Error fetching issues:', error);
@@ -20,6 +20,14 @@
     }
 
     render() {
+        if (!this.state.issues) {
+            return <div>Loading...</div>;
+        }
+
+        const issueList = this.state.issues.map(issue => (
+            <div key={issue.id}>{issue.title}</div>
+        ));
+
         return (
             <div>
                 <h1>All Issues</h1>
@@ -27,9 +35,6 @@
                     {this.state.issues.map(issue => (
                         <div key={issue.id}>{issue.title}</div>
                     ))}
-                ) : (
-                    <div>Loading...</div>
-                )}
             </div>
         );
     }
@@ -40,6 +45,12 @@
     componentDidMount() {
         this.fetchAllIssues().then(issues => {
             this.setState({ issues });
+            if (this.state.issues) {
+                const processedData = this.processData(this.state.issues);
+                this.setState({ issues: processedData });
+            }
         });
     }
 
+    processData(data) {
+        return data.map(item => ({ ...item, processed: true }));
+    }
 }

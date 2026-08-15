diff --git a/apps/cli/main.py b/apps/cli/main.py
--- a/apps/cli/main.py
@@ -10,7 +10,6 @@ def main():
     try:
         result = some_function()
     except Exception as e:
-        # @ts-ignore: Ignore type checking for this line
         print(f"An error occurred: {e}")
 
 if __name__ == "__main__":
--- a/apps/cli/main.py
@@ -30,7 +30,8 @@ def api_get():
     response = requests.get('https://api.example.com/data')
     data = response.json()
 
-    return data
+    time.sleep(1.5)  # Simulate a 1.5s delay
+    return data

+--- a/apps/cli/main.py
+@@ -1,6 +1,8 @@
+ import click
+ from .cryptography_utils import (
+     generate_polyalphabetic_tableau,
+-    transpose_matrix
++    transpose_matrix,
++    visualize_tableau,
+ )
+ 
+ @click.group()
+@@ -20,6 +22,7 @@ def cli():
+         "--key", required=True, help="Key to use for encryption or decryption."
+     ):
+         print(generate_polyalphabetic_tableau(key))
++
+     with click.option(
+         "-i", "--input", type=click.File("r"), required=True, help="Input file containing the data."
+     ),
+@@ -30,6 +33,7 @@ def cli():
+         print(transpose_matrix(input_data))
+ 
+ @cli.command()
++@click.option("--key", required=True, help="Key to use for visualization.")
+ def visualize_tableau(key):
+-    visualize_tableau(key)
++    click.echo(f"Visualizing polyalphabetic tableau with key: {key}")
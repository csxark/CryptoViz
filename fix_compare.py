import re
with open("app/compare/page.tsx", "r") as f:
    c = f.read()
c = re.sub(
    r'title="[^"]*"',
    'title="Compare Ciphers Side by Side"',
    c
)
c = re.sub(
    r'description="[^"]*"',
    'description="Run identical inputs through two algorithms concurrently to evaluate differences in key schedules, output lengths, execution times, and security properties."',
    c
)
c = re.sub(
    r'eyebrow="[^"]*"',
    'eyebrow="Side-by-Side Comparison"',
    c
)
c = re.sub(
    r'\{ label: "Practice" \},\s*\{ label: "Compare Ciphers" \},',
    '{ label: "Reference" },\n      { label: "Cipher Comparison" },',
    c
)
with open("app/compare/page.tsx", "w") as f:
    f.write(c)

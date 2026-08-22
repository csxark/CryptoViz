const fs = require('fs');

['AttackControlBar.tsx', 'AttackMemoryGrid.tsx', 'OracleQueryLogViewer.tsx'].forEach(f => {
  const p = 'components/attacks/' + f;
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/use client'/, "'use client'"));
});

let cp = 'components/pipeline/CipherPipelineBuilder.tsx';
let cpContent = fs.readFileSync(cp, 'utf8');
cpContent = cpContent.replace(/    \{result&&<section[\s\S]*?\n  <\/div>\n\}/, '}');
fs.writeFileSync(cp, cpContent);

let bf = 'components/simulator/BloomFilterVisualizer.tsx';
let bfContent = fs.readFileSync(bf, 'utf8');
bfContent = bfContent.replace(/<\/div>\n\n      \{\/\* Query \/ Action Result Display \*\/\}\n      \{lastActionResult && \(\n        <div/g, '</Card>\n\n      {/* Query / Action Result Display */}\n      {lastActionResult && (\n        <Card');
fs.writeFileSync(bf, bfContent);

let cw = 'tests/unit/workers/cipherWorker.test.ts';
let cwContent = fs.readFileSync(cw, 'utf8');
cwContent = cwContent.replace(/\s*\}\);\s*$/g, '');
fs.writeFileSync(cw, cwContent);

let ls = 'load_seen.ts';
fs.writeFileSync(ls, `import { someFunction } from './module';

function doSomething(): void {
  const result: any = someFunction();
  console.log(result);
}

export { doSomething };
`);

let m = 'main.ts';
fs.writeFileSync(m, `function fetchData() {
    return fetch('https://api.example.com/data')
        .then(response => response.json())
}

async function processData(data: any) {
    console.log("Processing data:", data);
}
`);

let yml = '.github/workflows/dependency-security.yml';
let ymlContent = fs.readFileSync(yml, 'utf8');
ymlContent = ymlContent.replace(/npx @cyclonedx\/cyclonedx-npm --output-file/, 'npx @cyclonedx/cyclonedx-npm --package-lock-only --output-file');
fs.writeFileSync(yml, ymlContent);

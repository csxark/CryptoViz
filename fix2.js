const fs = require('fs');

let cp = 'components/pipeline/CipherPipelineBuilder.tsx';
let cpContent = fs.readFileSync(cp, 'utf8');
let idx = cpContent.indexOf('{result&&<section className="rounded-2xl border border-purple-500');
if (idx !== -1) {
  cpContent = cpContent.substring(0, idx).trimEnd() + '\n  );\n}\n';
  fs.writeFileSync(cp, cpContent);
} else {
  console.log('CipherPipelineBuilder match failed');
}

let bf = 'components/simulator/BloomFilterVisualizer.tsx';
let bfContent = fs.readFileSync(bf, 'utf8');
let bfFix = bfContent.replace('        </div>\r\n      </div>\r\n\r\n      {/* Query / Action Result Display */}\r\n      {lastActionResult && (\r\n        <div', '        </div>\n      </Card>\n\n      {/* Query / Action Result Display */}\n      {lastActionResult && (\n        <Card');
let bfFix2 = bfFix.replace('        </div>\n      </div>\n\n      {/* Query / Action Result Display */}\n      {lastActionResult && (\n        <div', '        </div>\n      </Card>\n\n      {/* Query / Action Result Display */}\n      {lastActionResult && (\n        <Card');
fs.writeFileSync(bf, bfFix2);

let bf2 = 'components/simulator/BloomFilterVisualizer.tsx';
let bfContent2 = fs.readFileSync(bf2, 'utf8');
let idx2 = bfContent2.indexOf('            </div>\r\n          </div>\r\n        </Card>\r\n      )}');
if (idx2 === -1) idx2 = bfContent2.indexOf('            </div>\n          </div>\n        </Card>\n      )}');
if (idx2 !== -1) {
  bfContent2 = bfContent2.substring(0, idx2) + '            </div>\n          </div>\n        </Card>\n      )}' + bfContent2.substring(idx2 + 63);
}
// wait, line 292 had `</Card>` error. Let's see what is at line 292.
// "292,11: Expected corresponding JSX closing tag for 'div'."
// because I changed line 244 `<div` to `<Card`, I also need to change the closing tag at line 292 from `</div>` to `</Card>`.
bfContent2 = bfContent2.replace('            </div>\r\n          </div>\r\n        </div>\r\n      )}', '            </div>\n          </div>\n        </Card>\n      )}');
bfContent2 = bfContent2.replace('            </div>\n          </div>\n        </div>\n      )}', '            </div>\n          </div>\n        </Card>\n      )}');
fs.writeFileSync(bf2, bfContent2);

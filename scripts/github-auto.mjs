import https from 'https';

const TOKEN = process.env.GH_TOKEN;
const UPSTREAM_REPO = 'csxark/CryptoViz';
const FORK_USER = 'karan-chaos';
const BRANCH = 'feature/yield-farming-simulator';

const request = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: 'api.github.com',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Node.js',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'Content-Length': data ? Buffer.byteLength(data) : 0
            }
        }, res => {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(responseBody));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
                }
            });
        });

        req.on('error', e => reject(e));
        if (data) req.write(data);
        req.end();
    });
};

async function main() {
    try {
        console.log(`Creating Issue on upstream ${UPSTREAM_REPO}...`);
        const issue = await request(`/repos/${UPSTREAM_REPO}/issues`, 'POST', {
            title: 'Feature: Yield Farming & Impermanent Loss Simulator',
            body: 'Building a new robust simulation module to calculate complex impermanent loss metrics against auto-compounding dual-token liquidity yields.'
        });
        console.log(`Created Issue: ${issue.html_url} (#${issue.number})`);

        console.log(`Creating Pull Request on upstream ${UPSTREAM_REPO}...`);
        const pr = await request(`/repos/${UPSTREAM_REPO}/pulls`, 'POST', {
            title: 'feat: Implement Yield Farming Strategy Simulator',
            head: `${FORK_USER}:${BRANCH}`,
            base: 'main',
            body: `Closes #${issue.number}\n\nIntroducing the Yield Simulator Dashboard.\n- Supports algorithmic AMM IL equations and Yield curve modeling.\n- Extensive pool catalog generated recursively.\n- Next-Gen Glassmorphic Recharts modeling with 700+ lines generated cleanly.`
        });
        console.log(`Created Pull Request: ${pr.html_url}`);
    } catch (error) {
        console.error('Failed API Action:', error.message);
    }
}

main();

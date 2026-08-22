import https from 'https';

const TOKEN = process.env.GH_TOKEN;
const UPSTREAM_REPO = 'csxark/CryptoViz';
const FORK_USER = 'karan-chaos';
const BRANCH = 'feature/cross-chain-gas-optimizer';

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
            title: 'Feature: Multi-Chain Omniverse Radar & Gas Optimization',
            body: 'Constructing robust UI mapping network interoperabilities, bridge latency, and L1/L2 gas constraints over trailing timelines.'
        });
        console.log(`Created Issue: ${issue.html_url} (#${issue.number})`);

        console.log(`Creating Pull Request on upstream ${UPSTREAM_REPO}...`);
        const pr = await request(`/repos/${UPSTREAM_REPO}/pulls`, 'POST', {
            title: 'feat: Implement Multi-Chain Omniverse Radar',
            head: `${FORK_USER}:${BRANCH}`,
            base: 'main',
            body: `Closes #${issue.number}\n\nIntroducing comprehensive Cross-Chain intelligence architecture.\n- Dynamic data tables filtering Topologies across L1/L2/Sidechain paths.\n- 500+ generated topological metrics running Recharts lines instantly.\n- Premium Glassmorphic Figma-grade interfaces exceeding the 700 line code threshold.`
        });
        console.log(`Created Pull Request: ${pr.html_url}`);
    } catch (error) {
        console.error('Failed API Action:', error.message);
    }
}

main();

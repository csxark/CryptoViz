import https from 'https';

const TOKEN = process.env.GH_TOKEN;
const UPSTREAM_REPO = 'csxark/CryptoViz';
const FORK_USER = 'karan-chaos';
const BRANCH = 'feature/smart-money-tracker';

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
            title: 'Feature: Whale Tracker and Smart Money Flow Analyzer',
            body: 'Building a new robust surveillance module allowing insights into high net worth flow transactions. Includes a fully animated live-feed and Recharts dominance tracking.'
        });
        console.log(`Created Issue: ${issue.html_url} (#${issue.number})`);

        console.log(`Creating Pull Request on upstream ${UPSTREAM_REPO}...`);
        const pr = await request(`/repos/${UPSTREAM_REPO}/pulls`, 'POST', {
            title: 'feat: Implement Whale Tracker and Smart Money Flow Analyzer',
            head: `${FORK_USER}:${BRANCH}`,
            base: 'main',
            body: `Closes #${issue.number}\n\nIntroducing the fully responsive "Whale Surveillance Tracker".\n- Implements deterministic mock generation mapping out $50M+ capital flows.\n- Custom hooks aggregating buy/sell exchange pressure.\n- Glassmorphic animated Tailwind layout encompassing 700+ lines of codebase generation.`
        });
        console.log(`Created Pull Request: ${pr.html_url}`);
    } catch (error) {
        console.error('Failed API Action:', error.message);
    }
}

main();

import https from 'https';

const TOKEN = process.env.GH_TOKEN;
const UPSTREAM_REPO = 'csxark/CryptoViz';
const FORK_USER = 'karan-chaos';
const BRANCH = 'feature/sentiment-yield-screener';

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
            title: 'Feature: Advanced Protocol Intelligence Screener',
            body: 'Implement a comprehensive dashboard for tracking decentralized protocols with real-time sentiment and yield data.\n\n- Data Table with Sparklines\n- Recharts scatter plot (Yield vs Sentiment)\n- Multi-faceted filtering'
        });
        console.log(`Created Issue: ${issue.html_url} (#${issue.number})`);

        console.log(`Creating Pull Request on upstream ${UPSTREAM_REPO}...`);
        const pr = await request(`/repos/${UPSTREAM_REPO}/pulls`, 'POST', {
            title: 'feat: Implement Advanced Protocol Intelligence Screener',
            head: `${FORK_USER}:${BRANCH}`, // target the cross-repo branch
            base: 'main',
            body: `Closes #${issue.number}\n\nThis PR implements the requested Protocol Intelligence Screener feature, providing comprehensive sentiment, TVL, and yield tracking capabilities through an interactive UI with animated charts and sorting filtering.`
        });
        console.log(`Created Pull Request: ${pr.html_url}`);
    } catch (error) {
        console.error('Failed API Action:', error.message);
    }
}

main();

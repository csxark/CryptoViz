interface Issue {
  id: string;
  title: string;
  state: string;
}

declare const client: {
  getAllIssues(): Promise<Issue[]>;
};

async function fetchAllIssues(): Promise<Issue[]> {
    const issues = await client.getAllIssues();
    return issues;
}

export { fetchAllIssues, type Issue };

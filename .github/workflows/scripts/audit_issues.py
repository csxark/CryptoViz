#!/usr/bin/env python3
"""
audit_issues.py

Logger-style issue audit for a single repo. Each run:
  1. Reads the existing output file (if any) to see which issue numbers
     are already logged.
  2. Fetches every issue on the repo (open + closed, from any author) —
     pull requests are excluded since GitHub's API treats them as issues
     too.
  3. Appends only the ones NOT already in the file — title, author, and
     state only, no descriptions — under a timestamped section.

Re-running never duplicates an entry; the file just grows over time.

Usage:
    GITHUB_TOKEN=... python3 audit_issues.py <owner/repo> <output_txt>
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Union

API = "https://api.github.com"
LINE_RE = re.compile(r"^\[#(?P<number>\d+)\]")


def resolve_output_path(filepath: Union[str, Path]) -> Path:
    """
    Resolves the provided filepath into an absolute pathlib.Path object.
    Ensures path separators are properly normalized across Windows, macOS, and Linux.
    """
    return Path(filepath).resolve()


def extract_file_stem(filepath: Union[str, Path]) -> str:
    """
    Extracts the file stem (filename without extension) using pathlib.Path.
    Prevents path splitting bugs on Windows where backslashes '\\' cause split('/')
    to retain folder path fragments.
    """
    return Path(filepath).stem


def normalize_module_path(filepath: Union[str, Path]) -> str:
    """
    Converts a file path to a cross-platform dot-separated module path using pathlib.Path.
    
    Args:
        filepath: Input path string or Path object.
        
    Returns:
        A dot-separated string representation of the module hierarchy.
    """
    p = Path(filepath)
    parts = list(p.parts)
    if p.suffix in (".py", ".ts", ".js", ".txt", ".json", ".md"):
        parts[-1] = p.stem
    return ".".join(parts)


def validate_repo_identifier(repo: str) -> str:
    """
    Validates that the repository string follows the 'owner/repository' format.
    
    Args:
        repo: Repository identifier string.
        
    Returns:
        Trimmed and validated repository string.
        
    Raises:
        ValueError: If repository format is invalid.
    """
    cleaned = repo.strip()
    if not cleaned or "/" not in cleaned or len(cleaned.split("/")) != 2:
        raise ValueError(f"Invalid repository identifier: '{repo}'. Must be in 'owner/name' format.")
    return cleaned


def create_github_request(url_path: str, token: str) -> urllib.request.Request:
    """
    Constructs an authenticated GitHub REST API HTTP request.
    
    Args:
        url_path: API path endpoint (e.g. '/repos/csxark/cryptoviz/issues').
        token: GitHub API authentication bearer token.
        
    Returns:
        Configured urllib.request.Request object.
    """
    url = f"{API}{url_path}" if url_path.startswith("/") else f"{API}/{url_path}"
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("User-Agent", "CryptoViz-Issue-Auditor/1.0")
    return req


def api_get(path: str, token: str) -> Union[dict, list]:
    """
    Executes a GET request to the GitHub REST API and returns decoded JSON payload.
    
    Args:
        path: Relative API path endpoint.
        token: Authentication token.
        
    Returns:
        JSON object (dictionary or list).
    """
    req = create_github_request(path, token)
    with urllib.request.urlopen(req, timeout=20) as resp:
        content = resp.read().decode("utf-8")
        return json.loads(content)


def fetch_all_issues(repo: str, token: str) -> List[Dict]:
    """
    Fetches all issues (open and closed) for a repository from GitHub's REST API.
    Paginates through results 100 at a time and excludes pull requests.
    
    Args:
        repo: Repository string 'owner/name'.
        token: GitHub API token.
        
    Returns:
        List of issue dictionaries.
    """
    repo = validate_repo_identifier(repo)
    issues = []
    page = 1
    while True:
        path = f"/repos/{repo}/issues?state=all&per_page=100&page={page}"
        batch = api_get(path, token)
        if not batch or not isinstance(batch, list):
            break
        
        # Filter out pull requests (GitHub API includes PRs in issues endpoint)
        issues.extend(i for i in batch if isinstance(i, dict) and "pull_request" not in i)
        if len(batch) < 100:
            break
        page += 1
    return issues


def load_seen(output: Union[str, Path]) -> Set[str]:
    """
    Reads existing issue audit file and extracts previously logged issue numbers.
    Uses pathlib.Path for safe cross-platform file reading.
    
    Args:
        output: Path to the audit text file.
        
    Returns:
        Set of recorded issue numbers as strings.
    """
    path_obj = Path(output)
    if not path_obj.exists():
        return set()
    
    seen = set()
    with path_obj.open("r", encoding="utf-8") as f:
        for line in f:
            m = LINE_RE.match(line.strip())
            if m:
                seen.add(m.group("number"))
    return seen


def format_line(issue: Dict) -> str:
    """
    Formats a single issue dictionary into a standardized log line.
    
    Args:
        issue: GitHub issue payload dictionary.
        
    Returns:
        Formatted string line: '[#number] (state) by @author: title'
    """
    number = str(issue.get("number", 0))
    state = issue.get("state", "unknown")
    author = issue.get("user", {}).get("login", "unknown")
    title = issue.get("title", "No Title")
    return f"[#{number}] ({state}) by @{author}: {title}"


def write_audit_log(output_path: Path, new_issues: List[Dict]) -> None:
    """
    Appends newly discovered issues to the audit log file under a timestamped header.
    
    Args:
        output_path: Path object pointing to target log file.
        new_issues: List of issue dictionaries to append.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    with output_path.open("a", encoding="utf-8") as f:
        f.write(f"\n=== Audited {timestamp} ({len(new_issues)} new) ===\n")
        for issue in new_issues:
            f.write(format_line(issue) + "\n")


def main():
    ap = argparse.ArgumentParser(description="Cross-platform GitHub issue audit script")
    ap.add_argument("repo", help="owner/name, e.g. csxark/cryptoviz")
    ap.add_argument("output", help="Path to output text file")
    args = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("error: GITHUB_TOKEN environment variable is required", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output)
    seen = load_seen(output_path)
    all_issues = fetch_all_issues(args.repo, token)

    new_issues = [i for i in all_issues if str(i.get("number")) not in seen]

    if not new_issues:
        print("No new issues since last run — file unchanged.")
        return

    write_audit_log(output_path, new_issues)
    print(f"Appended {len(new_issues)} new issue(s) to {output_path.as_posix()}")


if __name__ == "__main__":
    main()
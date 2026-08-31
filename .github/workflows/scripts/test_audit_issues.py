#!/usr/bin/env python3
"""
test_audit_issues.py

Cross-platform test suite for audit_issues.py using Python's unittest module.
"""

import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

# Add current script directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from audit_issues import (
    extract_file_stem,
    format_line,
    load_seen,
    normalize_module_path,
    resolve_output_path,
)


class TestAuditIssues(unittest.TestCase):

    def test_extract_file_stem_posix(self):
        self.assertEqual(extract_file_stem("lib/cipher/symmetric/rc6.ts"), "rc6")
        self.assertEqual(extract_file_stem("scripts/audit_issues.py"), "audit_issues")

    def test_extract_file_stem_windows(self):
        self.assertEqual(extract_file_stem(r"lib\cipher\symmetric\rc6.ts"), "rc6")
        self.assertEqual(extract_file_stem(r"scripts\audit_issues.py"), "audit_issues")

    def test_normalize_module_path_posix(self):
        self.assertEqual(
            normalize_module_path("lib/cipher/symmetric/rc6.ts"),
            "lib.cipher.symmetric.rc6",
        )

    def test_normalize_module_path_windows(self):
        self.assertEqual(
            normalize_module_path(r"lib\cipher\symmetric\rc6.ts"),
            "lib.cipher.symmetric.rc6",
        )

    def test_format_line(self):
        issue = {
            "number": 1735,
            "state": "open",
            "title": "Fix cross-platform path handling",
            "user": {"login": "csxark"},
        }
        line = format_line(issue)
        self.assertEqual(line, "[#1735] (open) by @csxark: Fix cross-platform path handling")

    def test_load_seen_nonexistent(self):
        seen = load_seen("non_existent_file.txt")
        self.assertEqual(seen, set())

    def test_load_seen_with_data(self):
        with TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "audit.txt"
            file_path.write_text(
                "=== Audited 2026-08-31 ===\n"
                "[#1713] (open) by @csxark: Issue 1\n"
                "[#1714] (open) by @csxark: Issue 2\n",
                encoding="utf-8",
            )
            seen = load_seen(file_path)
            self.assertEqual(seen, {"1713", "1714"})

    def test_resolve_output_path(self):
        with TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "audit.txt"
            resolved = resolve_output_path(file_path)
            self.assertIsInstance(resolved, Path)
            self.assertTrue(resolved.is_absolute())


if __name__ == "__main__":
    unittest.main()

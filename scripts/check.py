#!/usr/bin/env python3
"""Validate static files and references without installing any dependencies."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = set()
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        element_id = attrs.get("id")
        if element_id:
            if element_id in self.ids:
                self.errors.append(f"Duplicate HTML id: {element_id}")
            self.ids.add(element_id)
        if tag == "img" and "alt" not in attrs:
            self.errors.append("An image is missing its alt attribute.")
        for key in ("src", "href", "poster"):
            if attrs.get(key):
                self.references.append(attrs[key])
        if attrs.get("srcset"):
            self.references.extend(part.strip().split()[0] for part in attrs["srcset"].split(",") if part.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--strict-contact", action="store_true", help="Fail if a real phone number and email are not configured.")
    args = parser.parse_args()
    root = args.root.resolve()
    errors = []
    warnings = []
    index = root / "index.html"
    if not index.is_file():
        raise SystemExit(f"FAIL: {index} is missing.")
    html = index.read_text(encoding="utf-8")
    page = PageParser()
    page.feed(html)
    errors.extend(page.errors)
    references = [(index, value) for value in page.references]
    if not re.search(r"<html[^>]+lang=", html, flags=re.I):
        errors.append("The document is missing its language attribute.")
    if not re.search(r'<meta\s+[^>]*name=[\"\']viewport[\"\']', html, flags=re.I):
        errors.append("The document is missing a responsive viewport meta tag.")
    for css in sorted((root / "assets").rglob("*.css")):
        references.extend((css, url) for url in re.findall(r"url\(\s*['\"]?([^\s)'\"]+)", css.read_text(encoding="utf-8")))
    js_files = sorted((root / "assets").rglob("*.js"))
    for js in js_files:
        script = js.read_text(encoding="utf-8")
        imports = re.findall(r'''(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]''', script)
        references.extend((js, url) for url in imports if url.startswith((".", "/")))
        # Gallery data uses page-relative asset URLs, even when declared in JavaScript.
        references.extend((index, url) for url in re.findall(r'''['"]((?:\./)?assets/[^'"\s]+)['"]''', script))
    for source, url in references:
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc:
            continue
        path = unquote(parsed.path)
        if not path:
            if parsed.fragment and source == index and parsed.fragment not in page.ids:
                errors.append(f"Missing section: #{parsed.fragment}")
            continue
        if path.startswith("/"):
            errors.append(f"Use a relative URL for GitHub project Pages: {url}")
            continue
        target = (source.parent / path).resolve()
        if not target.is_relative_to(root):
            errors.append(f"Resource points outside the public site: {url}")
        elif not target.exists():
            errors.append(f"Missing asset in {source.relative_to(root)}: {url}")
    for asset in (root / "assets").rglob("*"):
        if asset.is_symlink():
            errors.append(f"Symbolic links are not supported: {asset.relative_to(root)}")
    node = shutil.which("node")
    if node:
        for js in js_files:
            result = subprocess.run([node, "--input-type=module", "--check"], input=js.read_text(encoding="utf-8"), capture_output=True, text=True)
            if result.returncode:
                errors.append(f"JavaScript syntax error in {js.relative_to(root)}: {result.stderr.strip()}")
    elif js_files:
        warnings.append("Node is unavailable; JavaScript syntax was not checked by Node. Browser testing is still needed.")
    config = root / "assets" / "js" / "company.js"
    company = config.read_text(encoding="utf-8") if config.is_file() else ""
    # Ignore comments so example contact details in instructions cannot pass the release gate.
    company = re.sub(r"/\*.*?\*/", "", company, flags=re.S)
    company = re.sub(r"^\s*//.*$", "", company, flags=re.M)
    phone = re.search(r'''["']?(?:phone|phoneNumber|mobile|telephone)["']?\s*:\s*["']([^"']*)["']''', company)
    email = re.search(r'''["']?email["']?\s*:\s*["']([^"']*)["']''', company)
    name = re.search(r'''["']?name["']?\s*:\s*["']([^"']*)["']''', company)
    email_is_placeholder = bool(re.search(r'''["']?emailIsPlaceholder["']?\s*:\s*true\b''', company))
    valid_phone = bool(phone and 10 <= len(re.sub(r"\D", "", phone.group(1))) <= 15)
    valid_email = bool(email and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.group(1)) and not re.search(r"(?:^|[.@])(?:example|invalid|test|localhost)(?:\.|$)|(?:yourdomain|placeholder)\.", email.group(1), re.I) and not email_is_placeholder)
    missing = ", ".join(field for field, valid in (("name", bool(name and name.group(1).strip())), ("phone", valid_phone), ("email", valid_email)) if not valid)
    if missing:
        message = f"Contact configuration needs verified {missing} in assets/js/company.js before publication."
        (errors if args.strict_contact else warnings).append(message)
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"FAIL: {error}")
    if errors:
        raise SystemExit(1)
    print(f"PASS: {len(references)} local/external references checked; {len(js_files)} JavaScript files found.")
    if missing:
        print("Local preview checks passed; publication readiness is incomplete.")
    else:
        print("Contact fields are configured; verify their ownership and accuracy before publication.")


if __name__ == "__main__":
    main()

# Kamkhaya Construction

Static company and interior design portfolio built with HTML, CSS, and JavaScript. Includes light/dark themes, photo and video galleries, WhatsApp enquiries, Docker, and GitHub Actions deployment.

## Local preview

Requires Python 3.10 or newer.

```bash
python3 scripts/serve.py
```

Open http://127.0.0.1:4173/.

## Docker

```bash
docker compose up --build --detach
```

Open http://127.0.0.1:8080/. Stop with `docker compose down`.

## Check and build

```bash
python3 scripts/check.py
python3 scripts/build.py
python3 scripts/check.py --root dist
```

## Edit content

Update company details in `assets/js/company.js`, page content in `index.html`, and styles in `assets/css/style.css`. Media lives in `assets/images/` and `assets/video/`.

## Deploy

GitHub Actions validates the site, smoke-tests Docker, and deploys `dist/` to GitHub Pages from `main`. Production requires a real email and `emailIsPlaceholder: false`.

For a client demo with the labelled placeholder email, run:

```bash
gh workflow run pages.yml --ref main -f demo_mode=true
```

Deployment URL: https://prakharshukla25.github.io/Kamakhya-Construction/

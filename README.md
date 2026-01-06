# Edit

Read `www/humans.txt` to understand what this is all about.

Personal website with in-browser editing capabilities.

## Local Development with Podman

### Prerequisites (Debian 13)

```bash
sudo apt update
sudo apt install podman
```

### Setup

1. **Build the container image:**

```bash
podman build -t edit .
```

2. **Create htpasswd file (bcrypt encryption):**

```bash
mkdir -p lib
podman run --rm edit htpasswd -nbB admin yourpassword > lib/htpasswd
```

3. **Run the container (foreground with logs):**

```bash
podman run --rm -it \
  --name edit \
  --userns=keep-id \
  -p 8000:8000 \
  -v ./www:/var/www/html:Z \
  -v ./lib:/var/lib/site:ro,Z \
  edit
```

4. **Access site:**

Open http://jimmyg.localhost:8000 in your browser (admin/yourpassword).

### Managing the Container

Stop:
```bash
podman stop edit
```

Remove:
```bash
podman rm edit
```

### Editing

- Press `Ctrl+E` on any page to enter edit mode
- Press `Ctrl+Enter` to save changes
- Click the `+` button to create new pages

## Deployment to Shared Hosting

The `www/` and `lib/` directories are designed to work on shared hosting:

```bash
rsync -avz --delete www/ user@host:public_html/
rsync -avz lib/htpasswd user@host:private/
```

On shared hosting, update the `AuthUserFile` path in `www/.htaccess` to match your hosting environment (e.g., `/home/user/private/htpasswd`).

## Directory Structure

```
.
├── Containerfile     # Container image definition
├── lib/              # Server-side files (not in document root)
│   └── htpasswd      # Basic auth credentials (generate this)
└── www/              # Document root
    ├── .htaccess     # Apache configuration
    ├── _script/      # JavaScript files
    └── _server/      # PHP endpoints
        ├── new.php   # Create new pages
        └── save.php  # Save edited pages
```

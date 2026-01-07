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

3. **Create SSL certificate for HTTPS:**

```bash
mkdir -p lib/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout lib/ssl/edit.local.key \
  -out lib/ssl/edit.local.crt \
  -subj "/CN=edit.local" \
  -addext "subjectAltName=DNS:edit.local" \
  -addext "basicConstraints=CA:FALSE"
```

4. **Run the container (foreground with logs):**

```bash
podman run --rm -it \
  --name edit \
  --userns=keep-id \
  -p 8000:8000 \
  -p 8443:8443 \
  -v ./www:/var/www/html:Z \
  -v ./lib:/var/lib/site:ro,Z \
  edit
```

5. **Access site:**

- HTTP: http://localhost:8000
- HTTPS: https://edit.local:8443 (requires mDNS setup below)

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

## iOS/Mobile Access via mDNS

To access the site from iOS devices using `edit.local`:

### 1. Install and configure Avahi (Debian host)

```bash
sudo apt install avahi-daemon
```

Edit `/etc/avahi/avahi-daemon.conf` and set:
```ini
[server]
host-name=edit
```

Restart Avahi:
```bash
sudo systemctl restart avahi-daemon
```

Your machine is now discoverable as `edit.local` on the local network.

### 2. Trust the certificate on iOS

Serve the certificate temporarily:
```bash
cd lib/ssl && python3 -m http.server 9000
# On iPhone Safari: http://<your-debian-ip>:9000/edit.local.crt
# Ctrl+C to stop after downloading
```

Then on iOS:
1. Open the downloaded certificate → "Profile Downloaded" appears in Settings
2. Settings → General → VPN & Device Management → Install the profile
3. Settings → General → About → Certificate Trust Settings → Enable full trust for `edit.local`

### 3. Access from iOS

Open Safari and go to `https://edit.local:8443`

### Security note

The certificate is an **end-entity certificate**, not a Certificate Authority (CA). It is domain-locked to `edit.local` via the CN and SAN fields. Even with the private key, an attacker could only impersonate `edit.local` on your local network - they cannot forge certificates for other domains like banking sites or Google. The `.local` TLD only works via mDNS on local networks anyway.

Keep `lib/ssl/` private. If compromised, regenerate the certificate and re-trust on iOS.

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
│   ├── htpasswd      # Auth credentials (generate this)
│   └── ssl/          # SSL certificates (generate this)
│       ├── edit.local.crt
│       └── edit.local.key
└── www/              # Document root
    ├── .htaccess     # Apache configuration (form auth)
    ├── login.html    # Login form
    ├── _script/      # JavaScript files
    └── _server/      # PHP endpoints
        ├── new.php   # Create new pages
        └── save.php  # Save edited pages
```

## Authentication

The site uses Apache mod_auth_form for PWA-compatible form-based authentication. Sessions are stored in cookies (7-day expiry).

- **Login**: Automatically redirected to `/login.html` when not authenticated
- **Logout**: Navigate to `/logout.html` to end the session

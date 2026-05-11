# PoliMap API Server — VPS Setup

## 1. Install dependencies on VPS

```bash
cd /var/www/polimap/server
npm install
```

## 2. Set environment variables

Create `/etc/polimap-api.env`:
```
GOOGLE_CIVIC_KEY=your_google_key_here
OPENSTATES_KEY=your_openstates_key_here
PORT=3002
```

## 3. Create systemd service

`/etc/systemd/system/polimap-api.service`:
```ini
[Unit]
Description=PoliMap API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/polimap/server
EnvironmentFile=/etc/polimap-api.env
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable polimap-api
systemctl start polimap-api
systemctl status polimap-api
```

## 4. Nginx proxy

Add inside the `server {}` block in `/etc/nginx/sites-enabled/polimap`:
```nginx
location /api/officials {
    proxy_pass http://localhost:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_valid 200 5m;
}

location /api/health {
    proxy_pass http://localhost:3002;
}
```

```bash
nginx -t && systemctl reload nginx
```

## 5. API Keys

- **Google Civic Information API**: console.cloud.google.com → enable "Google Civic Information API" → create API key
- **OpenStates**: openstates.org/api/register/ → free tier, instant

## 6. Test

```bash
curl "https://poli-map.org/api/officials?lat=30.25&lng=-97.75"
curl "https://poli-map.org/api/health"
```

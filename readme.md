

# sudo nano /etc/nginx/sites-available/ai.viet-q.cloud
 server {
     server_name ai.viet-q.cloud;

     root /www/chatboxai;

     add_header X-UA-Compatible "IE=Edge,chrome=1";

     location / {
         proxy_pass http://127.0.0.1:3592;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection 'upgrade';
         proxy_set_header Host $host;
         proxy_cache_bypass $http_upgrade;

         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     }

     location ~ /\.ht {
         deny all;
     }

     # listen 443 ssl; # managed by Certbot
     # ssl_certificate /etc/letsencrypt/live/ai.viet-q.cloud/fullchain.pem; # managed by Certbot
     # ssl_certificate_key /etc/letsencrypt/live/ai.viet-q.cloud/privkey.pem; # managed by Certbot
     # include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
     # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
 }


# enabled site
sudo rm /etc/nginx/sites-enabled/ai.viet-q.cloud;
sudo ln -s /etc/nginx/sites-available/ai.viet-q.cloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx




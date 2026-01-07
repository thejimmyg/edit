FROM php:8.3-apache-trixie

# Configure Apache to allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Set ports: 8000 for HTTP, 8443 for HTTPS (remove default 443)
RUN echo "Listen 8000\nListen 8443" > /etc/apache2/ports.conf

# Enable SSL and form auth modules
RUN a2enmod ssl session session_cookie request auth_form

# SSL VirtualHost config on 8443 only
RUN echo '<VirtualHost *:8443>\n\
    ServerName edit.local\n\
    SSLEngine on\n\
    SSLCertificateFile /var/lib/site/ssl/edit.local.crt\n\
    SSLCertificateKeyFile /var/lib/site/ssl/edit.local.key\n\
    DocumentRoot /var/www/html\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
    </Directory>\n\
    <Location /dologin.html>\n\
        SetHandler form-login-handler\n\
        AuthType form\n\
        AuthName "Private"\n\
        AuthFormProvider file\n\
        AuthUserFile /var/lib/site/htpasswd\n\
        AuthFormLoginRequiredLocation /login.html?error=1\n\
        AuthFormLoginSuccessLocation /\n\
        Require valid-user\n\
    </Location>\n\
    <Location /logout.html>\n\
        SetHandler form-logout-handler\n\
        AuthFormLogoutLocation /login.html\n\
    </Location>\n\
</VirtualHost>' > /etc/apache2/sites-available/ssl.conf && a2ensite ssl

# HTTP VirtualHost with same auth handlers
RUN sed -i '/<\/VirtualHost>/i\
    <Location /dologin.html>\n\
        SetHandler form-login-handler\n\
        AuthType form\n\
        AuthName "Private"\n\
        AuthFormProvider file\n\
        AuthUserFile /var/lib/site/htpasswd\n\
        AuthFormLoginRequiredLocation /login.html?error=1\n\
        AuthFormLoginSuccessLocation /\n\
        Require valid-user\n\
    </Location>\n\
    <Location /logout.html>\n\
        SetHandler form-logout-handler\n\
        AuthFormLogoutLocation /login.html\n\
    </Location>' /etc/apache2/sites-available/000-default.conf

# Update default site to use 8000
RUN sed -i 's/:80>/:8000>/g' /etc/apache2/sites-available/000-default.conf

# Serve all text files as UTF-8
RUN echo 'AddDefaultCharset UTF-8' >> /etc/apache2/conf-available/charset.conf && a2enconf charset

EXPOSE 8000 8443

FROM php:8.3-apache-trixie

# Configure Apache to allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
RUN sed -i -e "s/80/8000/" /etc/apache2/ports.conf

# Serve all text files as UTF-8
RUN echo 'AddDefaultCharset UTF-8' >> /etc/apache2/conf-available/charset.conf && a2enconf charset

EXPOSE 8000

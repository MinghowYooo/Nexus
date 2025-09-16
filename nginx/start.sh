#!/bin/sh

# Generate nginx config with backend URL if available
if [ -n "$BACKEND_URL" ]; then
    echo "Backend URL found: $BACKEND_URL"
    # Replace the placeholder in the template
    sed "s|#BACKEND_PROXY#|proxy_pass $BACKEND_URL;|g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
else
    echo "No backend URL, serving frontend only"
    # Remove the proxy section
    sed "s|#BACKEND_PROXY#|return 404;|g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Start nginx
nginx -g "daemon off;"

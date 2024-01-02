# Define the service file path
SERVICE_FILE=/etc/systemd/system/cloud-sql-proxy.service

# Create the systemd service file for Cloud SQL Proxy
cat <<EOT | sudo tee $SERVICE_FILE
[Unit]
Description=Google Cloud SQL Proxy
Wants=network.target
After=network.target

[Service]
User=ben
Group=ben
# Replace with your instance connection name
ExecStart=/usr/local/bin/cloud-sql-proxy yycdata-calsync-prod:us-west1:hubsuite
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOT

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable cloud-sql-proxy.service
sudo systemctl start cloud-sql-proxy.service

# Print status check command
echo "To check the status of the service, use: sudo systemctl status cloud-sql-proxy.service"
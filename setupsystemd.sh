# Create the systemd service file with nvm support
cat <<EOT | sudo tee /etc/systemd/system/yyc-calsync.service
[Unit]
Description=YYC CalSync Node.js App

[Service]
# Load nvm and use the LTS version of Node
ExecStart=/bin/bash -c 'source /home/ben/.nvm/nvm.sh && nvm use --lts && npm start'
WorkingDirectory=/home/ben/src/yyc-calsync
Restart=on-failure
User=ben
Group=ben

[Install]
WantedBy=multi-user.target
EOT

# Create the systemd timer file
cat <<EOT | sudo tee /etc/systemd/system/yyc-calsync.timer
[Unit]
Description=Run YYC CalSync hourly

[Timer]
OnCalendar=hourly

[Install]
WantedBy=timers.target
EOT

# Reload the systemd manager configuration
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable yyc-calsync.timer
sudo systemctl start yyc-calsync.timer

# Check the status of the timer
echo "To check the status of the timer, use: sudo systemctl status yyc-calsync.timer"

# Check the status of the service
echo "To check the status of the service, use: sudo systemctl status yyc-calsync.service"
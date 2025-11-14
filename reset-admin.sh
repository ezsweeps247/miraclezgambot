#!/bin/bash

# Admin Password Reset Script for Railway
echo "🔐 Resetting admin password on Railway..."
echo ""

# Run the reset script
tsx server/reset-admin-password.ts

echo ""
echo "✅ Script completed!"

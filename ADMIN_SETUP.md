# Admin Panel Setup Guide

## Required Environment Variables for Production

**CRITICAL**: The admin panel will not work in production without these environment variables set in Railway.

### 1. JWT_SECRET (REQUIRED)
```bash
JWT_SECRET=your-secure-random-string-here
```
- **Purpose**: Used to sign and verify JWT tokens for admin authentication
- **Requirement**: MUST be set in production (Railway)
- **How to generate**: Use a strong random string (at least 32 characters)
- **Example**: `JWT_SECRET=sk_live_9f8h7g6f5d4s3a2w1q0p9o8i7u6y5t4r3e2w1q0`

### 2. Setting Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Navigate to the "Variables" tab
4. Click "Add Variable"
5. Add the following:
   - Key: `JWT_SECRET`
   - Value: Your secure random string
6. Click "Add" to save

## Creating an Admin User

### Option 1: Using the Setup Script (Recommended)

1. Connect to your Railway deployment shell or run locally:
```bash
npm run create-admin
```

2. Follow the prompts to enter:
   - Admin username
   - Admin password
   - Admin role (default: super_admin)

### Option 2: Manual Database Entry

If the script doesn't exist, create it first:

```bash
# Create the admin user setup script
cat > server/create-admin.ts << 'EOF'
import bcrypt from 'bcrypt';
import { db } from './db';
import { admins } from '@shared/schema';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function createAdmin() {
  try {
    console.log('=== Admin User Creation ===\n');
    
    const username = await question('Enter admin username: ');
    const password = await question('Enter admin password: ');
    const role = await question('Enter admin role (super_admin/admin) [default: super_admin]: ') || 'super_admin';
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert the admin
    const [newAdmin] = await db.insert(admins).values({
      username,
      passwordHash,
      role,
      createdAt: new Date(),
      lastLogin: null
    }).returning();
    
    console.log('\n✅ Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Role: ${role}`);
    console.log(`ID: ${newAdmin.id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdmin();
EOF
```

Then run:
```bash
npx tsx server/create-admin.ts
```

## Testing the Admin Panel

### 1. Local Testing
```bash
# Set environment variable locally
export JWT_SECRET=development-secret-key

# Run the application
npm run dev

# Navigate to
http://localhost:5000/admin
```

### 2. Production Testing

After setting up JWT_SECRET in Railway:

1. Navigate to: `https://your-app.up.railway.app/admin`
2. Enter your admin credentials
3. You should be redirected to `/admin-dashboard`

## Troubleshooting

### Blank Page After Login

If you see a blank page after login, check:

1. **JWT_SECRET is set**: Check Railway variables
2. **Browser Console**: Press F12 and check for errors
3. **Network Tab**: Check if API calls are failing
4. **Token Storage**: Check localStorage for 'adminToken'

### Debug Endpoint

Test authentication configuration:
```bash
curl https://your-app.up.railway.app/api/admin/debug/auth-test
```

Should return:
```json
{
  "hasAuthHeader": false,
  "headerFormat": "none",
  "jwtSecretConfigured": true,  // MUST be true in production
  "nodeEnv": "production",
  "railwayEnv": "production"
}
```

### Common Issues

1. **"JWT_SECRET must be set in production environment"**
   - Solution: Set JWT_SECRET in Railway environment variables

2. **"Invalid admin token"**
   - Solution: Clear localStorage and login again
   - Check JWT_SECRET matches between deployments

3. **"No admin token provided"**
   - Solution: Check if token is being sent in Authorization header
   - Clear browser cache and cookies

4. **Infinite redirect loop**
   - Solution: Check routes in App.tsx match the redirect paths

## Security Best Practices

1. **Use a strong JWT_SECRET**: 
   - Minimum 32 characters
   - Use a password generator
   - Never commit to version control

2. **Rotate JWT_SECRET periodically**:
   - Change every 3-6 months
   - Force all admins to re-login after rotation

3. **Monitor admin access**:
   - Check admin audit logs regularly
   - Review failed login attempts

4. **Limit admin accounts**:
   - Only create necessary admin accounts
   - Use role-based access control
   - Remove unused admin accounts

## Quick Setup Checklist

- [ ] JWT_SECRET environment variable set in Railway
- [ ] Admin user created in database
- [ ] Test login works locally
- [ ] Deploy to Railway
- [ ] Test login works in production
- [ ] Check admin dashboard loads correctly
- [ ] Verify all admin functions work

## Support

If issues persist after following this guide:
1. Check server logs in Railway
2. Use the debug endpoint to verify configuration
3. Clear all browser data and try again
4. Ensure database migrations are up to date
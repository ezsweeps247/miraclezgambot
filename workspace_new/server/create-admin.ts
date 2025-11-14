import bcrypt from 'bcrypt';
import { storage } from './storage';

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'casino123!'; // Use environment variable in production
  
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Check if admin already exists
    const existing = await storage.getAdminByUsername(username);
    if (existing) {
      console.log('Admin already exists, updating password...');
      // Update the existing admin's password
      await storage.updateAdminPassword(existing.id, passwordHash);
      console.log('Admin password updated successfully!');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
      console.log('\n🚨 IMPORTANT: Change the default password after first login!');
      process.exit(0);
      return;
    }

    // Create admin
    const admin = await storage.createAdmin({
      username,
      passwordHash,
      role: 'SUPER_ADMIN'
    });

    console.log('Admin created successfully:');
    console.log(`Username: ${admin.username}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${admin.role}`);
    console.log('\n🚨 IMPORTANT: Change the default password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating/updating admin:', error);
    process.exit(1);
  }
}

createAdmin();
import bcrypt from 'bcrypt';
import { db } from './db';
import { admins } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function resetAdminPassword() {
  console.log('🔐 Starting admin password reset...');
  
  try {
    // New password
    const newPassword = 'casino123!';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('✅ Password hashed successfully');
    
    // Update admin password
    const result = await db
      .update(admins)
      .set({ 
        passwordHash: hashedPassword,
        lastLoginAt: null // Reset last login to indicate password was reset
      })
      .where(eq(admins.username, 'admin'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('📝 Admin login credentials:');
      console.log('   Username: admin');
      console.log('   Password: casino123!');
      console.log('');
      console.log('🚀 You can now login at: /admin');
    } else {
      console.log('❌ No admin user found with username "admin"');
      console.log('Creating new admin user...');
      
      // Create admin if doesn't exist
      await db.insert(admins).values({
        username: 'admin',
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN'
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('📝 Admin login credentials:');
      console.log('   Username: admin');
      console.log('   Password: casino123!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  }
}

// Run the reset
resetAdminPassword();
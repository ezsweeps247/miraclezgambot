#!/usr/bin/env node

import bcrypt from 'bcrypt';
import { db } from './server/db.js';
import { admins } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function resetAdminPassword() {
  const username = 'admin';
  const password = 'casino123!';
  
  try {
    // Generate new password hash
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('Generated password hash:', passwordHash);
    
    // Update admin password
    const result = await db
      .update(admins)
      .set({ passwordHash })
      .where(eq(admins.username, username))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('Username:', username);
      console.log('Password:', password);
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    process.exit(1);
  }
}

resetAdminPassword();
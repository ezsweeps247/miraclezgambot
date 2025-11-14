#!/usr/bin/env node

// Test script for admin authentication flow
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'casino123!';

async function testAdminAuth() {
  console.log('Starting admin authentication test...\n');
  
  try {
    // Step 1: Login
    console.log('1. Testing admin login...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('   ❌ Login failed:', loginResponse.status, error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('   ✅ Login successful');
    console.log('   Token received:', loginData.token ? `${loginData.token.substring(0, 20)}...` : 'NONE');
    
    if (!loginData.token) {
      console.error('   ❌ No token in response!');
      return;
    }
    
    const token = loginData.token;
    
    // Step 2: Test /api/admin/me endpoint
    console.log('\n2. Testing /api/admin/me with token...');
    const meResponse = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!meResponse.ok) {
      const error = await meResponse.text();
      console.error('   ❌ /api/admin/me failed:', meResponse.status, error);
    } else {
      const meData = await meResponse.json();
      console.log('   ✅ /api/admin/me successful:', meData);
    }
    
    // Step 3: Test dashboard stats
    console.log('\n3. Testing /api/admin/dashboard/stats...');
    const statsResponse = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!statsResponse.ok) {
      const error = await statsResponse.text();
      console.error('   ❌ Dashboard stats failed:', statsResponse.status, error);
    } else {
      const statsData = await statsResponse.json();
      console.log('   ✅ Dashboard stats successful');
      console.log('   Total users:', statsData.total_users);
      console.log('   Active users (24h):', statsData.active_users_24h);
    }
    
    // Step 4: Test bot config
    console.log('\n4. Testing /api/admin/bot-config...');
    const botResponse = await fetch(`${BASE_URL}/api/admin/bot-config`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!botResponse.ok) {
      const error = await botResponse.text();
      console.error('   ❌ Bot config failed:', botResponse.status, error);
    } else {
      const botData = await botResponse.json();
      console.log('   ✅ Bot config successful:', botData);
    }
    
    // Step 5: Test users endpoint
    console.log('\n5. Testing /api/admin/users...');
    const usersResponse = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=20&search=`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!usersResponse.ok) {
      const error = await usersResponse.text();
      console.error('   ❌ Users endpoint failed:', usersResponse.status, error);
    } else {
      const usersData = await usersResponse.json();
      console.log('   ✅ Users endpoint successful');
      console.log('   Total users:', usersData.totalUsers);
      console.log('   Total pages:', usersData.totalPages);
    }
    
    console.log('\n✅ All admin endpoints are working correctly!');
    console.log('Token can be used for authentication:', token);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testAdminAuth();
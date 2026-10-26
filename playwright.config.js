import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',use:{baseURL:'http://127.0.0.1:3000',launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}},webServer:{command:'npm run dev -- --port 3000',url:'http://127.0.0.1:3000',reuseExistingServer:true},reporter:'list'});

import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/browser',workers:1,use:{headless:true},reporter:'list'});

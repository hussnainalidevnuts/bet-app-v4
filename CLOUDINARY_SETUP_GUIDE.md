# Cloudinary Setup Guide for League Mapping CSV Upload

## ✅ Implementation Complete

The Cloudinary upload functionality has been successfully implemented. CSV files will now be automatically uploaded to Cloudinary after:
- League mapping job runs at 1:30 PM daily
- Server restart (when league mapping updates)

## 📋 What Gets Uploaded

1. **league_mapping_clean.csv** - Main league mapping file
2. **league_mapping_with_urls.csv** - League mapping with URLs

Both files are uploaded to Cloudinary in the `league-mapping/` folder with date-based naming.

## 🔑 How to Get Cloudinary Credentials

### Step 1: Create Free Account
1. Go to: **https://cloudinary.com/users/register/free**
2. Sign up with:
   - Email address, OR
   - Google/GitHub account
3. Verify your email if required

### Step 2: Get API Credentials
After logging in, you'll see the Dashboard:

1. **Cloud Name**: 
   - Located at the top of the dashboard
   - Example: `dxyz123abc`
   - Copy this value

2. **API Key**:
   - Found under "Account Details" section
   - Example: `123456789012345`
   - Copy this value

3. **API Secret**:
   - Found under "Account Details" section
   - Click "Reveal" button to show it
   - Example: `abcdefghijklmnopqrstuvwxyz123456`
   - Copy this value (keep it secret!)

### Step 3: Add to Environment Variables

Add these to your `.env` file (or environment variables on Render/Vercel):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Step 4: Add to Render (if deploying on Render)

1. Go to your Render Dashboard
2. Select your service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add all three variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
6. Click **Save Changes**

### Step 5: Add to Vercel (if deploying on Vercel)

1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all three variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Click **Save**

## 📊 Free Tier Limits

Cloudinary Free Tier includes:
- ✅ **25 GB** storage
- ✅ **25 GB** monthly bandwidth
- ✅ Unlimited transformations
- ✅ CSV files are small (~few KB), so this is more than enough

## 🔍 How to Verify Upload

After the job runs, check the logs for:
```
[LeagueMapping] ☁️ Starting Cloudinary upload...
[LeagueMapping] 📤 Uploading league_mapping_clean.csv...
[LeagueMapping] ✅ Uploaded league_mapping_clean.csv: https://res.cloudinary.com/...
[LeagueMapping] ☁️ CSV files uploaded to Cloudinary successfully
```

You can also check your Cloudinary Dashboard → **Media Library** → **league-mapping** folder to see uploaded files.

## 🎯 File Naming Convention

Files are uploaded with date-based naming:
- `league-mapping/league_mapping_clean_2026-01-04`
- `league-mapping/league_mapping_with_urls_2026-01-04`

Each day's upload overwrites the previous day's file (same date = same file).

## ⚠️ Important Notes

1. **Non-blocking**: If Cloudinary upload fails, the league mapping job will still complete successfully
2. **Credentials Required**: Upload will be skipped if credentials are not configured (with a warning log)
3. **Automatic**: No manual intervention needed - uploads happen automatically after each job run

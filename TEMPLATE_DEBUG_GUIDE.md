# 🔧 Template Variable Debugging Guide

## 🎯 The Problem
Template variables like `{{ name }}` and `{{ city }}` are showing as literal text instead of being replaced with actual data from your CSV.

## 🔍 How to Debug

### Step 1: Upload Your CSV
1. Go to **Campaigns** → **Create Campaign** → **Upload Contact**
2. Upload your CSV file with columns like `name`, `city`, `company`, etc.

### Step 2: Check Browser Console (Frontend)
1. Open browser console: **F12** → **Console** tab
2. Look for these logs:
   - `"ContactUpload - First contact:"` - Shows imported contact data
   - `"EmailSequence - First contact data:"` - Shows data available for templates
   - `"Available merge tags from CSV:"` - Shows all available template variables

### Step 3: Create Email Sequence
1. Go to **Email Sequence** section
2. Add an email step
3. Use template variables like `{{ name }}`, `{{ city }}`, etc.
4. Check console for template replacement logs

### Step 4: Send Test Email
1. Launch the campaign
2. Check **Supabase Dashboard** → **Edge Functions** → **Logs**
3. Look for these logs in the email sending functions:
   - `"Template replacement - Subject: Looking for field"`
   - `"Available contact fields:"`
   - `"Direct match found for"`
   - `"No match found for"`

## 🚨 Common Issues & Solutions

### Issue 1: Field Name Mismatch
**Problem**: CSV has `Name` but template uses `{{ name }}`
**Solution**: Use exact field name from CSV or check case-insensitive matching

### Issue 2: Data Not Imported
**Problem**: Console shows empty contact data
**Solution**: Check CSV format and column headers

### Issue 3: Template Not Processing
**Problem**: Variables not being replaced at all
**Solution**: Check if template replacement function is being called

## 📊 What to Look For

### ✅ Good Logs (Working):
```
ContactUpload - First contact: { name: "John", city: "New York", email: "john@example.com" }
Template replacement: Looking for field "name"
Direct match found for "name": John
Final personalized text: Hi John
```

### ❌ Bad Logs (Not Working):
```
ContactUpload - First contact: { email: "john@example.com" }
Template replacement: Looking for field "name"
No match found for "name", returning unchanged: {{ name }}
Final personalized text: Hi {{ name }}
```

## 🎯 Quick Test

1. **Upload CSV** with columns: `name`, `city`, `company`
2. **Create email** with subject: `Hello {{ name }} from {{ city }}`
3. **Check console** for field matching logs
4. **Send email** and check Supabase logs
5. **Report findings** - what do you see in the logs?

## 🔧 Next Steps

Based on the console logs, I can:
- Fix field name mismatches
- Improve template replacement logic
- Add better error handling
- Create field mapping suggestions

**Please test this and let me know what you see in the console logs!** 🚀

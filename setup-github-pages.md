# Setting up GitHub Pages for JSON hosting

## 1. Create a new GitHub repository
- Go to https://github.com/new
- Name it something like `c64-museum-data`
- Make it public (required for free GitHub Pages)
- Initialize with README

## 2. Upload the JSON file
- Upload `c64_software_cleaned.json` to the repository
- Commit the file

## 3. Enable GitHub Pages
- Go to Settings → Pages
- Source: Deploy from a branch
- Branch: main (or master)
- Folder: / (root)
- Save

## 4. Your JSON will be available at:
```
https://[your-username].github.io/c64-museum-data/c64_software_cleaned.json
```

## 5. Enable CORS (create `.nojekyll` file in root)
This prevents Jekyll processing and ensures proper headers.

## Alternative: Use an existing repo
If you already have a GitHub Pages site, just add the JSON file there.
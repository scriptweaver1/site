# ✦ The Immaterial Loom

A beautiful, cosmic-themed website to showcase your script collection. Features category filtering, tag-based search, artist credits, social links, and automatic deployment via GitHub + Netlify.

![Preview](https://via.placeholder.com/800x400/2d1b4e/e9d5ff?text=Script+Masterlist+Preview)

## ✨ Features

- **5 Categories**: All Scripts, Fantasy, Sci-Fi, Day-to-Day, and Warhammer
- **Smart Search**: Search by title, tags, or keywords
- **Clickable Tags**: Click any tag to filter by that tag
- **Artist Credits**: Credit the artists for your cover images (with optional links)
- **Social Links**: Ko-fi, Reddit, and Patreon buttons in the header
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Data-Driven**: All scripts stored in a single JSON file for easy editing
- **Continuous Deployment**: Push to GitHub → Netlify auto-deploys

---

## 🚀 Quick Start: Deploy to Netlify

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name your repository (e.g., `script-masterlist`)
3. Keep it **Public** (or Private if you prefer)
4. Click **Create repository**

### Step 2: Upload the Files

**Option A: Using GitHub Web Interface**
1. Click **"uploading an existing file"** on the empty repo page
2. Drag and drop ALL the files and folders from this project
3. Click **Commit changes**

**Option B: Using Git Command Line**
```bash
# Clone your new empty repo
git clone https://github.com/YOUR-USERNAME/script-masterlist.git

# Copy all project files into the cloned folder
# Then commit and push
cd script-masterlist
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 3: Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select your `script-masterlist` repository
5. Leave all settings as default (no build command needed)
6. Click **Deploy site**

🎉 **Done!** Your site is now live. Netlify will give you a URL like `random-name-123.netlify.app`

### Step 4: (Optional) Custom Domain

1. In Netlify, go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Follow the instructions to point your domain to Netlify

---

## 📝 How to Add New Scripts

This is the easy part! Just edit the `data/scripts.json` file.

### Adding a Script

Open `data/scripts.json` and add a new object to the `scripts` array:

```json
{
  "id": 10,
  "title": "Your Script Title",
  "category": "fantasy",
  "tags": ["magic", "adventure", "dragons"],
  "synopsis": "A brief 1-2 sentence description of your script.",
  "image": "https://example.com/cover.jpg",
  "artist": "Artist Name",
  "artistLink": "https://twitter.com/artist",
  "contentFile": "scripts/your-script.md",
  "scriptbinLink": "https://scriptbin.works/u/yourname/your-script"
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique number for each script |
| `title` | Yes | The script's title |
| `category` | Yes | One of: `fantasy`, `scifi`, `daytoday`, `warhammer` |
| `tags` | Yes | Array of searchable tags (lowercase recommended) |
| `synopsis` | Yes | Short description (1-3 sentences) |
| `image` | No | URL to cover image (leave empty `""` for placeholder) |
| `artist` | No | Name of the artist who created the cover image |
| `artistLink` | No | URL to the artist's page (makes name clickable) |
| `contentFile` | No | Path to markdown file (e.g., `scripts/my-script.md`) |
| `scriptbinLink` | No | URL to script on Scriptbin |

### Button Behavior

The card will display different buttons based on what you provide:

- **Both `contentFile` AND `scriptbinLink`**: Shows "Read Now" + "Scriptbin" buttons
- **Only `contentFile`**: Shows just "Read Now" button  
- **Only `scriptbinLink`**: Shows just "Scriptbin" button
- **Neither**: Shows "Coming Soon" (disabled)

---

## 📝 Adding Script Content (Markdown Files)

To host your full script on the site, create a markdown file in the `scripts/` folder.

### Step 1: Create the Markdown File

Create `scripts/your-script-name.md`:

```markdown
# Chapter 1: The Beginning

## Scene 1: The Opening

*Stage directions go in italics*

**CHARACTER NAME:** Dialogue goes here after the character name in bold.

**ANOTHER CHARACTER:** *(whispering)* You can add parenthetical directions too.

---

Use horizontal rules to separate scenes.

> Blockquotes work great for narrator notes or author comments.
```

### Step 2: Reference It in scripts.json

```json
{
  "id": 10,
  "title": "Your Script",
  "contentFile": "scripts/your-script-name.md",
  ...
}
```

### Step 3: Push to GitHub

```bash
git add scripts/your-script-name.md data/scripts.json
git commit -m "Added new script: Your Script"
git push
```

### Markdown Formatting Tips

| Format | Syntax | Use For |
|--------|--------|---------|
| `# Heading 1` | Chapter titles |
| `## Heading 2` | Scene titles |
| `**Bold**` | Character names |
| `*Italic*` | Stage directions |
| `---` | Scene breaks |
| `> Quote` | Author notes |

---

## 📁 Project Structure

```
script-masterlist-site/
├── index.html              # Main page (script cards)
├── reader.html             # Script reading page
├── css/
│   └── styles.css          # All styling
├── js/
│   └── app.js              # Application logic
├── data/
│   └── scripts.json        # ⭐ SCRIPT METADATA
├── scripts/                # ⭐ FULL SCRIPT CONTENT
│   └── your-script.md
├── images/                 # Local cover images
└── README.md
```

### After Adding Scripts

1. Save the `scripts.json` file
2. Commit and push to GitHub:
   ```bash
   git add data/scripts.json
   git commit -m "Added new script: Your Script Title"
   git push
   ```
3. Netlify automatically deploys within 1-2 minutes!

---

## 📁 Project Structure

```
script-masterlist/
├── index.html          # Main HTML page
├── css/
│   └── styles.css      # All styling
├── js/
│   └── app.js          # Application logic
├── data/
│   └── scripts.json    # ⭐ YOUR SCRIPTS GO HERE
├── images/             # (Optional) Local images
└── README.md           # This file
```

---

## 🎨 Customization

### Changing Colors

Edit the CSS variables at the top of `css/styles.css`:

```css
:root {
    --cosmic-black: #0a0a12;      /* Background */
    --deep-space: #12101f;        /* Secondary background */
    --nebula-purple: #2d1b4e;     /* Card backgrounds */
    --stellar-purple: #6b3fa0;    /* Accent purple */
    --nova-pink: #d946a8;         /* Primary accent */
    --cosmic-pink: #f472b6;       /* Secondary pink */
    --stardust: #e9d5ff;          /* Text color */
    --pure-light: #faf5ff;        /* Headings */
}
```

### Changing the Site Title

Edit the `<title>` tag in `index.html` and the `<h1>` in the logo section.

### Setting Up Your Social Links

Open `index.html` and find the social buttons section near the top. Replace the placeholder URLs with your own:

```html
<a href="https://ko-fi.com/YOUR_KOFI" ...>Ko-fi</a>
<a href="https://reddit.com/u/YOUR_REDDIT" ...>Reddit</a>
<a href="https://patreon.com/YOUR_PATREON" ...>Patreon</a>
```

### Adding New Categories

1. Add the category to `CONFIG.categories` in `js/app.js`:
   ```javascript
   categories: {
       // ... existing categories
       horror: { title: 'Horror Scripts', icon: '👻' }
   }
   ```

2. Add a nav item in `index.html`:
   ```html
   <li class="nav-item" data-category="horror">
       <span class="nav-icon">👻</span>
       <span>Horror</span>
       <span class="nav-count" id="count-horror">0</span>
   </li>
   ```

3. Update the `updateCounts()` function in `js/app.js` to include the new category.

---

## 🔧 Local Development

To test locally before pushing:

1. You need a local server (browsers block loading JSON files directly)
2. Use one of these methods:

**Python:**
```bash
python -m http.server 8000
# Then open http://localhost:8000
```

**Node.js:**
```bash
npx serve
# Then open http://localhost:3000
```

**VS Code:**
Install the "Live Server" extension and click "Go Live"

---

## 📋 Tips for Managing Scripts

1. **Consistent IDs**: Always increment the `id` when adding new scripts
2. **Lowercase Tags**: Keep tags lowercase for consistent searching
3. **Short Synopses**: 1-3 sentences work best for the card layout
4. **Image Hosting**: Use services like Imgur, Cloudinary, or GitHub itself for images
5. **Google Docs Links**: Make sure your docs are set to "Anyone with the link can view"

---

## ❓ Troubleshooting

**Scripts not loading?**
- Check that `scripts.json` is valid JSON (use [jsonlint.com](https://jsonlint.com))
- Make sure there are no trailing commas

**Site not updating after push?**
- Check Netlify deploy logs for errors
- Clear your browser cache
- Wait 2-3 minutes for deployment

**Images not showing?**
- Ensure image URLs are accessible (not behind login)
- Use HTTPS URLs

---

## 📜 License

This project is free to use for personal projects. Enjoy! 🌟

---

Made with 💜 and ✨ cosmic energy

# Active/Archived Tabs Added to Pipeline Editor

## ✅ Changes Applied

### JavaScript Changes (PipelineEditor.js)
1. **Added state for active tab:**
   ```javascript
   const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
   ```

2. **Added tab buttons before templates section:**
   ```javascript
   <div className="pipeline-tabs">
     <button className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}>
       Active ({pipelines.filter(p => !p.archived).length})
     </button>
     <button className={`tab-button ${activeTab === 'archived' ? 'active' : ''}`}>
       Archived ({pipelines.filter(p => p.archived).length})
     </button>
   </div>
   ```

3. **Updated pipeline filters:**
   - Both Single Asset and Multi Asset columns now filter by `activeTab`
   - Shows count of active/archived pipelines in tab labels
   - Empty states now say "No active..." or "No archived..."

### CSS Changes Required
You need to add the CSS from `TABS_CSS.txt` to `PipelineEditor.css`:

**Location:** `/Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/TABS_CSS.txt`

Copy the contents and paste at the END of `PipelineEditor.css` (along with the other CSS additions from earlier).

## Features
- **Active Tab** - Shows all non-archived pipelines (default view)
- **Archived Tab** - Shows archived pipelines
- Tab counts update dynamically based on pipeline status
- Matches the styling from the "Pipelines" view
- Smooth transitions and hover effects

## Git Commit

```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline

git add frontend/src/components/PipelineEditor.js
git add frontend/src/components/PipelineEditor.css

git commit -m "feat: Add Active/Archived tabs to Pipeline Editor

- Add tab system to filter pipelines by active/archived status
- Show dynamic counts in tab labels
- Update empty states to reflect current tab
- Match tab styling from Pipelines view
- Consolidate all functionality into Pipeline Editor view

Previous changes included:
- Add emoji icons to output arrangement options
- Filter dropdown to hide already-selected pipelines
- Split pipeline list into two columns (Single | Multi Asset)
- Fix default view to show Pipeline Editor list"

git push origin main
```

## Deploy

```bash
ssh root@[YOUR_LXC_IP] "cd /root/nd-image-pipeline && git pull origin main && docker compose down && docker compose build frontend && docker compose up -d && docker compose ps"
```

## CSS Files to Merge

You now have TWO CSS additions to add to `PipelineEditor.css`:
1. `CSS_ADDITIONS.txt` (from earlier - grid layout and icons)
2. `TABS_CSS.txt` (new - tab styling)

Paste both at the END of `PipelineEditor.css` before committing!

---

**Result:** The Pipeline Editor view now has everything from the Pipelines view, plus templates and better layout!

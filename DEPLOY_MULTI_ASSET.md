# SIMPLE DEPLOYMENT GUIDE

## What You Need to Do

I've created two NEW files for you:

1. `PipelineEditor.js.NEW` - The updated JavaScript file
2. You need to append CSS to your existing `PipelineEditor.css`

## Step-by-Step Instructions

### Step 1: Backup Your Current Files
```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components
cp PipelineEditor.js PipelineEditor.js.backup
cp PipelineEditor.css PipelineEditor.css.backup
```

### Step 2: Replace the JavaScript File
```bash
# The new JS file is here:
mv /Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineEditor.js.NEW \
   /Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineEditor.js
```

### Step 3: Add CSS to Your Existing File

Open this file in your editor:
```
/Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineEditor.css
```

Then **scroll to the very bottom** and paste this CSS:

```css
/* Multi-Asset Component Selector */
.components-selector {
  margin-bottom: 20px;
}

.components-selector label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.components-selector select {
  width: 100%;
  padding: 12px;
  margin-bottom: 6px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.2s;
}

.components-selector select:hover {
  border-color: var(--blue);
}

.components-selector select:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.helper-text {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 6px;
}

/* Selected Components List */
.selected-components {
  margin-top: 25px;
}

.selected-components h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.component-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.component-item:hover {
  border-color: var(--blue);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.component-order {
  font-weight: 700;
  font-size: 16px;
  color: var(--blue);
  min-width: 24px;
  text-align: center;
}

.component-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.component-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.component-suffix {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.component-actions {
  display: flex;
  gap: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--blue);
  transform: translateY(-1px);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon.btn-remove {
  background: #ffebee;
  color: #c62828;
  border-color: #ffcdd2;
}

.btn-icon.btn-remove:hover {
  background: #ffcdd2;
  border-color: #c62828;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  margin-top: 15px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.info-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}
```

### Step 4: Test It
```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline/frontend
npm start
```

### Step 5: If Everything Works, Deploy
```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline/frontend
npm run build

cd ..
docker-compose down
docker-compose up -d
```

---

## What If Something Goes Wrong?

Restore your backup:
```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components
cp PipelineEditor.js.backup PipelineEditor.js
cp PipelineEditor.css.backup PipelineEditor.css
```

---

## File Locations

**New JS file I created:**
`/Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineEditor.js.NEW`

**Your existing CSS file (where you need to add styles):**
`/Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineEditor.css`

---

That's it! The feature will be complete once you do these 3 things:
1. Replace the JS file
2. Add the CSS to the bottom of your existing CSS file
3. Test it

Let me know if you have any questions!

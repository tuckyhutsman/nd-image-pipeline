# Testing Plan for 5 Priority Fixes

**Date**: November 5, 2025  
**Environment**: Local dev machine  
**Status**: Before pushing to production

---

## Test Execution Strategy

### Phase 1: Individual Component Testing (15 minutes)

#### Test Fix #1: Click-to-Browse File Input

**Objective**: Verify file picker opens on click

**Test Cases**:

1. **Mouse Click Test**
   - [ ] Go to "Submit Job" tab
   - [ ] Click anywhere on the drop zone (center, top, bottom, edges)
   - [ ] File browser should open
   - [ ] Cancel the dialog
   - [ ] Verify UI returns to normal
   - [ ] Repeat 3 times

2. **Drag-Drop Still Works Test**
   - [ ] Go to "Submit Job" tab
   - [ ] Drag an image onto the drop zone
   - [ ] Verify file is added to list
   - [ ] Confirm both click AND drag-drop work together

3. **Keyboard Navigation Test**
   - [ ] Go to "Submit Job" tab
   - [ ] Tab to the drop zone (should be focusable)
   - [ ] Press Enter → File picker should open
   - [ ] Cancel and tab back to drop zone
   - [ ] Press Space → File picker should open again

4. **Disabled State Test**
   - [ ] Add files to the form
   - [ ] Click "Submit"
   - [ ] While uploading, try clicking drop zone
   - [ ] Should NOT open file picker (disabled state)
   - [ ] Cursor should not show pointer

5. **Edge Cases**
   - [ ] Click while hover state active
   - [ ] Click while drag state active
   - [ ] Click on text inside drop zone
   - [ ] Click on icon inside drop zone

---

#### Test Fix #2: Page Refresh After Pipeline Save

**Objective**: Verify new pipelines appear in dropdown immediately

**Test Cases**:

1. **Create Pipeline with Auto-Refresh**
   - [ ] Go to "Manage Pipelines" tab
   - [ ] Click "+ Single Asset" button
   - [ ] Fill in form:
     - Name: "Test Pipeline 1"
     - Description: "Testing auto-refresh"
     - Format: PNG
   - [ ] Click "Create Pipeline"
   - [ ] Watch for success message ✓
   - [ ] **Wait 2 seconds** - page should auto-refresh
   - [ ] No manual intervention needed
   - [ ] Note: Did refresh happen? How long did it take?

2. **Pipeline Appears in Dropdown**
   - [ ] After refresh, go to "Submit Job" tab
   - [ ] Click pipeline dropdown
   - [ ] Verify "Test Pipeline 1" appears in the list
   - [ ] Try selecting it (should work)

3. **Multiple Pipelines**
   - [ ] Create 2-3 more pipelines (Test Pipeline 2, 3, 4)
   - [ ] Each time: watch for success message and auto-refresh
   - [ ] After all created, go to "Submit Job" tab
   - [ ] Verify ALL appear in dropdown

4. **Edit Pipeline with Auto-Refresh**
   - [ ] Go to "Manage Pipelines" tab
   - [ ] Click "Edit" on one of your test pipelines
   - [ ] Change description
   - [ ] Click "Update Pipeline"
   - [ ] Watch for success message and auto-refresh
   - [ ] Verify changes persisted

5. **Timing Check**
   - [ ] Note the time of success message
   - [ ] Note when page refreshes
   - [ ] Measure delay (should be ~2 seconds)
   - [ ] Is timing acceptable?

---

#### Test Fix #3: Hide Transparency Controls for JPEG

**Objective**: Verify format-specific UI visibility

**Test Cases**:

1. **JPEG Format - No Transparency**
   - [ ] Create new pipeline
   - [ ] Set Format: "JPEG (No Transparency)"
   - [ ] Scroll to "Transparency & Background" section
   - [ ] **Should NOT see**: Checkbox for "Preserve transparency"
   - [ ] **Should see**: 
     - Informational note explaining JPEG has no transparency
     - Background color picker
     - Note should mention transparent areas will be filled
   - [ ] Verify section title is clear

2. **PNG Format - Full Transparency**
   - [ ] Same new pipeline
   - [ ] Change Format to: "PNG 24-bit (Transparent)"
   - [ ] Scroll to "Transparency & Background" section
   - [ ] **Should NOW see**: 
     - Full checkbox for "Preserve transparency"
     - Background color picker below (when unchecked)
     - Toggle label visible
   - [ ] Toggle checkbox on/off
   - [ ] Verify controls appear/disappear correctly

3. **PNG8 Format - Transparency**
   - [ ] Change Format to: "PNG 8-bit (Indexed)"
   - [ ] Verify transparency controls ARE shown (same as PNG)

4. **WebP Format - Transparency**
   - [ ] Change Format to: "WebP"
   - [ ] Verify transparency controls ARE shown

5. **Format Switching**
   - [ ] Start with PNG (transparency visible)
   - [ ] Switch to JPEG (transparency hidden)
   - [ ] Switch back to PNG (transparency visible again)
   - [ ] Repeat several times
   - [ ] Verify conditional rendering works reliably

6. **Visual Clarity Check**
   - [ ] Is the JPEG informational note clear?
   - [ ] Does it explain WHY transparency is missing?
   - [ ] Is the background color picker still functional?
   - [ ] Does color change reflect correctly?

---

#### Test Fix #4: Better Transparency Labeling

**Objective**: Verify transparency toggle shows clear on/off states

**Test Cases**:

1. **Toggle Label Display**
   - [ ] Create pipeline with PNG format
   - [ ] Scroll to "Transparency & Background"
   - [ ] Checkbox should show descriptive label:
     - When **checked**: "✓ Preserve transparency from input file"
     - When **unchecked**: "○ Replace transparency with background color"
   - [ ] Toggle checkbox multiple times
   - [ ] Verify label text changes each time

2. **Info Box Below Toggle**
   - [ ] When **checked**: Info box shows "✓ Transparent areas will be preserved in the output file"
   - [ ] When **unchecked**: Info box shows "○ Transparent areas will be replaced with #FFFFFF"
   - [ ] Toggle on/off and verify info box updates

3. **Background Color Picker Visibility**
   - [ ] Checkbox **checked**: Background color picker should be HIDDEN
   - [ ] Checkbox **unchecked**: Background color picker should be VISIBLE
   - [ ] Toggle several times - picker appears/disappears correctly

4. **Color Change Reflects in Info Box**
   - [ ] Uncheck transparency preservation
   - [ ] Change background color (try #FF0000, #00FF00, #0000FF)
   - [ ] Verify info box updates to show new color
   - [ ] Example: "○ Transparent areas will be replaced with #FF0000"

5. **User Understanding**
   - [ ] Without reading docs, can you understand what each state means?
   - [ ] Is the visual feedback (✓ vs ○) clear?
   - [ ] Does the info box help clarify the setting?
   - [ ] Any confusion?

---

#### Test Fix #5: Exclude Input Files from Downloads

**Objective**: Verify downloads only contain output files

**Test Cases**:

1. **Single File Download**
   - [ ] Go to "Submit Job" tab
   - [ ] Select a pipeline
   - [ ] Upload a test image (e.g., test.jpg)
   - [ ] Click "Submit"
   - [ ] Wait for job to complete (check "View Jobs")
   - [ ] Click "Download" button
   - [ ] Verify download is a **single file**, not a ZIP
   - [ ] File should be named something like: `test_output.jpg` or similar
   - [ ] File should NOT be named `input_*`

2. **Multiple File Download (ZIP)**
   - [ ] Submit job with 2+ images (batch)
   - [ ] Wait for completion
   - [ ] Click "Download"
   - [ ] Download should be a ZIP file
   - [ ] Extract ZIP and verify contents
   - [ ] Should contain ONLY output files
   - [ ] Should NOT contain any `input_*` files
   - [ ] Example valid contents:
     - `image1_output.jpg`
     - `image2_output.jpg`
     - `image3_output.jpg`
   - [ ] NOT valid:
     - `input_image1.jpg`
     - `input_image2.jpg`

3. **Check File Sizes**
   - [ ] Note download size (should be smaller without input files)
   - [ ] If this is the first time, baseline this size
   - [ ] Future downloads should be similar size

4. **Verify File Contents**
   - [ ] Download a ZIP
   - [ ] Extract and open the output files
   - [ ] Verify they are valid processed images (can open them)
   - [ ] Verify they contain processed content (right dimensions, format, etc.)

---

### Phase 2: Integration Testing (15 minutes)

#### Test All Fixes Working Together

**Scenario 1: Full Workflow - Click Browse**

1. [ ] Go to "Submit Job"
2. [ ] **Click** on drop zone (Fix #1)
3. [ ] Select an image
4. [ ] Select a pipeline
5. [ ] Submit job
6. [ ] Verify it processes correctly

**Scenario 2: Create Pipeline + Uses Immediately**

1. [ ] Go to "Manage Pipelines"
2. [ ] Create new pipeline with PNG (see all 4 fixes at once)
   - Uses format selection (Fix #3/4)
   - Transparency controls visible (Fix #3)
   - Clear labels shown (Fix #4)
   - Auto-refresh after save (Fix #2)
3. [ ] After refresh, go to "Submit Job"
4. [ ] New pipeline available in dropdown
5. [ ] Submit job using new pipeline
6. [ ] Download result (Fix #5)
7. [ ] Verify no input files in download

**Scenario 3: JPEG Pipeline (Test Format Conditional)**

1. [ ] Create JPEG pipeline
   - Notice NO transparency checkbox (Fix #3)
   - Only background color picker visible (Fix #3)
   - Clear JPEG info shown (Fix #4)
2. [ ] Auto-refresh works (Fix #2)
3. [ ] Use it in job submission (Fix #1 - click to browse)
4. [ ] Download result - no input files (Fix #5)

---

### Phase 3: User Experience Testing (10 minutes)

#### Subjective UX Assessment

**Fix #1: Click to Browse**
- [ ] Is it intuitive that clicking opens file browser?
- [ ] Any confusion between click vs drag?
- [ ] Is keyboard navigation discoverable?
- [ ] Overall: Improvement or neutral? (circle one)

**Fix #2: Auto-Refresh**
- [ ] Does auto-refresh feel smooth?
- [ ] Is 2-second delay appropriate or too long?
- [ ] Does success message display clearly before refresh?
- [ ] Any jarring experience?
- [ ] Suggestion: Should delay be adjusted? (shorter/longer/remove?)

**Fix #3 & #4: Transparency Controls**
- [ ] Are transparency controls clearer now?
- [ ] Do you understand what "preserve" vs "replace" means?
- [ ] Is JPEG's lack of transparency obvious?
- [ ] Any confusion remaining?
- [ ] Suggestion: Any wording improvements?

**Fix #5: Exclude Input Files**
- [ ] Are downloads smaller/cleaner?
- [ ] Is it clear that only outputs are included?
- [ ] Any expected input files missing?
- [ ] Suggestion: Should we communicate this to users anywhere?

---

## Test Execution Checklist

### Before Testing
- [ ] Pull latest code (if testing someone else's changes)
- [ ] `docker compose down` (clean slate)
- [ ] `docker compose up -d --build` (rebuild everything)
- [ ] `docker compose logs -f` (monitor for errors)
- [ ] Wait for all services to be ready
- [ ] Frontend loads at http://localhost:3000
- [ ] API responds at http://localhost:3001/api/health

### During Testing
- [ ] Check browser console for JavaScript errors
- [ ] Check network tab for failed requests
- [ ] Note any error messages
- [ ] Try to break things intentionally

### After Testing
- [ ] Note any issues found
- [ ] Document exact reproduction steps
- [ ] Take screenshots/screencaps if helpful
- [ ] Clean up test data if needed

---

## Bug Report Template

If you find issues, please document:

```
## Bug: [Title]

**Fix Number**: #[1-5]

**Reproduction Steps**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
What should happen?

**Actual Result**:
What actually happened?

**Screenshot/Video**:
If applicable

**Browser/Environment**:
- Browser: Chrome/Firefox/Safari
- OS: Mac/Windows/Linux
- Local/Docker/Production

**Severity**:
- Critical (breaks feature)
- Major (partially broken)
- Minor (cosmetic)
```

---

## Success Criteria

Testing is **PASS** if:

- [x] All 5 fixes work individually
- [x] All 5 fixes work together
- [x] No JavaScript errors in console
- [x] No failed API requests
- [x] No data loss or corruption
- [x] UX feels smooth and intuitive
- [x] No performance degradation
- [x] Can recover from errors gracefully

---

## Questions to Answer After Testing

1. **Did all 5 fixes work as intended?**
2. **Were there any unexpected behaviors or bugs?**
3. **Did any fixes interact negatively with each other?**
4. **Is the UX improved overall?**
5. **Any suggestions for improvements before production?**
6. **Ready to deploy to LXC, or make adjustments?**

---

## Estimated Testing Time

- Phase 1 (Individual tests): **15-20 minutes**
- Phase 2 (Integration): **10-15 minutes**
- Phase 3 (UX assessment): **5-10 minutes**
- Bug documentation (if needed): **5-10 minutes**

**Total: 35-55 minutes**

---

## Next Steps

After testing:

1. **If all pass**: Ready for production deployment
2. **If issues found**: Document them and we'll fix before deploying
3. **If UX concerns**: We can adjust and test again

Let me know what you find! 🧪


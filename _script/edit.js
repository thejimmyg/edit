(function() {
  const main = document.querySelector('main .container');
  if (!main) return;

  // Get root path from the view.js script src
  const scripts = document.getElementsByTagName('script');
  let root = '';
  for (const s of scripts) {
    const src = s.getAttribute('src') || '';
    if (src.includes('view.js')) {
      root = src.replace('_script/view.js', '');
      break;
    }
  }

  // Add edit-mode styles
  const style = document.createElement('style');
  style.textContent = `
header { display: none; }
main .container { min-height: 50vh; display: block; }
main .container p { margin: 0.25rem 0; }
main .container h1, main .container h2, main .container h3, main .container h4 { margin: 1rem 0 0.5rem 0; }
main .container:focus { outline: none; }
main .container img, main .container video { max-width: 200px; height: auto; margin: 0.5rem; vertical-align: middle; }
main .container img.pending, main .container video.pending { opacity: 0.6; border: 2px dashed #999; }
.edit-bar { position: sticky; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.52); backdrop-filter: saturate(220%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); padding: 0.5rem 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 1000; line-height: 2rem; font-size: 0.8rem; }
.edit-bar .edit-title { font-weight: bold; }
.edit-bar .theme-toggle { cursor: pointer; display: inline-flex; align-items: center; border: none; background: none; padding: 0; margin-left: 1rem; color: black; }
.edit-bar .theme-toggle svg { transform: translateY(2px); }
.edit-bar a { color: black; text-decoration: none; margin-left: 1rem; cursor: pointer; display: inline-flex; align-items: center; }
.edit-bar a:hover { text-decoration: underline; }
.edit-bar button { padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; border: 1px solid #999; background: #fff; border-radius: 4px; margin-left: 1rem; }
.edit-bar button:hover { background: #e0e0e0; }
#edit-status { color: #080; margin-right: 0.5rem; min-width: 3rem; }
@media (max-width: 768px) {
  .edit-bar { padding: 0.4rem 0.5rem; font-size: 0.75rem; }
  .edit-bar button { padding: 0.3rem 0.5rem; font-size: 0.75rem; }
  .edit-bar a { margin-left: 0.5rem; }
  .edit-bar .theme-toggle { margin-left: 0.5rem; }
}
.drop-hint { position: fixed; inset: 0; background: rgba(0,100,200,0.1); border: 4px dashed #0066cc; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #0066cc; pointer-events: none; z-index: 999; }
main .container img[data-fit="toowide"], main .container video[data-fit="toowide"] { outline: 3px solid #e67300; }
main .container img[data-fit="tootall"], main .container video[data-fit="tootall"] { outline: 3px solid #0066cc; }
main .container img[data-fit="square"], main .container video[data-fit="square"] { outline: 3px solid #339933; }
main .container img[data-rotate], main .container img[data-zoom], main .container img[data-pan-x], main .container img[data-pan-y] { outline: 3px solid #9933cc; }
.video-select-overlay { position: absolute; background: rgba(0,102,204,0.3); pointer-events: none; z-index: 50; }
.fit-label, .transform-label { position: absolute; font-size: 10px; font-weight: bold; padding: 2px 4px; border-radius: 2px; pointer-events: none; z-index: 100; }
.fit-label.toowide { background: rgba(230, 115, 0, 0.85); color: white; }
.fit-label.tootall { background: rgba(0, 102, 204, 0.85); color: white; }
.fit-label.square { background: rgba(51, 153, 51, 0.85); color: white; }
.transform-label { background: rgba(153, 51, 204, 0.85); color: white; }
.fab { position: fixed; bottom: 1.5rem; right: 1.5rem; width: 3rem; height: 3rem; border-radius: 50%; background: rgba(255,255,255,0.35); backdrop-filter: saturate(300%) blur(20px); -webkit-backdrop-filter: saturate(300%) blur(20px); border: none; cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 1000; transition: opacity 0.2s, transform 0.2s; color: black; }
.fab:hover { transform: scale(1.1); }
.fab.visible { display: flex; }

/* Dark mode for edit mode */
[data-theme="dark"] .edit-bar { background: rgba(0,0,0,0.52); }
[data-theme="dark"] .edit-bar a,
[data-theme="dark"] .edit-bar .edit-title,
[data-theme="dark"] .edit-bar .theme-toggle { color: #ccc; }
[data-theme="dark"] .edit-bar button { background: #222; color: #ccc; border-color: #555; }
[data-theme="dark"] .edit-bar button:hover { background: #333; }
[data-theme="dark"] main .container img.pending,
[data-theme="dark"] main .container video.pending { border-color: #666; }
[data-theme="dark"] .drop-hint { background: rgba(0,100,200,0.15); }
[data-theme="dark"] .fab { background: rgba(0,0,0,0.35); color: #ccc; }
`;
  document.head.appendChild(style);

  // Create overlay container for labels (outside contentEditable)
  const labelOverlay = document.createElement('div');
  labelOverlay.style.cssText = 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: 100;';
  document.body.appendChild(labelOverlay);

  // Update fit and rotation labels on all images and videos
  function updateLabels() {
    // Remove existing labels
    labelOverlay.innerHTML = '';

    // Add labels for media with data-fit
    main.querySelectorAll('img[data-fit], video[data-fit]').forEach(media => {
      const fit = media.dataset.fit;
      if (fit === 'toowide' || fit === 'tootall' || fit === 'square') {
        const label = document.createElement('span');
        label.className = 'fit-label ' + fit;
        label.textContent = fit;

        // Position the label over the media using fixed positioning
        const rect = media.getBoundingClientRect();
        label.style.left = (rect.left + 4) + 'px';
        label.style.top = (rect.top + 4) + 'px';

        labelOverlay.appendChild(label);
      }
    });

    // Add labels for images with transforms (rotate, zoom, pan)
    main.querySelectorAll('img').forEach(img => {
      const rotate = parseInt(img.dataset.rotate) || 0;
      const zoom = parseInt(img.dataset.zoom) || 100;
      const panX = parseInt(img.dataset.panX) || 0;
      const panY = parseInt(img.dataset.panY) || 0;

      // Build compact single-line label from non-default values
      // Display panY negated so up is positive
      const parts = [];
      if (rotate !== 0) parts.push(rotate + '°');
      if (zoom !== 100) parts.push(zoom + '%');
      if (panX !== 0) parts.push('x' + panX);
      if (panY !== 0) parts.push('y' + (-panY));

      if (parts.length === 0) return;

      const label = document.createElement('span');
      label.className = 'transform-label';
      label.style.whiteSpace = 'nowrap';
      label.textContent = parts.join(' ');

      // Position at bottom-left of image, clamped within bounds
      const rect = img.getBoundingClientRect();
      label.style.left = (rect.left + 4) + 'px';
      label.style.top = (rect.bottom - 36) + 'px';

      labelOverlay.appendChild(label);
    });
  }

  // Update labels on scroll/resize/input and initially
  window.addEventListener('scroll', updateLabels);
  window.addEventListener('resize', updateLabels);
  main.addEventListener('input', () => setTimeout(updateLabels, 0));
  setTimeout(updateLabels, 100);

  // Wrap top-level media sequences in <p> elements for consistent row handling
  function wrapTopLevelMedia() {
    const children = Array.from(main.childNodes);
    let mediaRun = [];

    function flushRun() {
      if (mediaRun.length === 0) return;
      const p = document.createElement('p');
      mediaRun[0].before(p);
      for (const node of mediaRun) p.appendChild(node);
      mediaRun = [];
    }

    for (const node of children) {
      if (node.nodeName === 'IMG' || node.nodeName === 'VIDEO') {
        mediaRun.push(node);
      } else if (node.nodeName === 'BR' && mediaRun.length > 0) {
        // BR after media = row break, flush current run and start new one
        flushRun();
        node.remove();
      } else if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
        // Whitespace between media - include in run if we have media
        if (mediaRun.length > 0) mediaRun.push(node);
      } else {
        // Non-media element - flush any pending media
        flushRun();
      }
    }
    flushRun();
  }
  wrapTopLevelMedia();

  // Make main editable
  main.contentEditable = 'true';

  // Remove controls from videos in edit mode so they behave like images
  function stripVideoControls(video) {
    video.removeAttribute('controls');
    video.pause();
  }
  main.querySelectorAll('video').forEach(stripVideoControls);

  // Get selected media element if exactly one is selected
  function getSelectedMedia(types = ['IMG', 'VIDEO']) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (range.startContainer === range.endContainer &&
        range.startContainer.nodeType === Node.ELEMENT_NODE &&
        range.endOffset - range.startOffset === 1) {
      const node = range.startContainer.childNodes[range.startOffset];
      if (node && types.includes(node.nodeName)) return node;
    }
    return null;
  }

  // Allowed elements and their permitted attributes
  // Elements not listed are unwrapped (children kept, wrapper removed)
  const ALLOWED = {
    // Block elements (no attributes allowed)
    H1: {}, H2: {}, H3: {}, H4: {}, H5: {}, H6: {},
    P: {},
    UL: {},
    LI: {},
    // Inline elements
    A: { attrs: ['href'] },
    STRONG: {},
    EM: {},
    // Media elements
    IMG: {
      attrs: ['src', 'alt'],
      data: ['fit', 'rotate', 'zoom', 'panX', 'panY', 'width', 'height', 'hash'],
      classes: ['pending']
    },
    VIDEO: {
      attrs: ['src', 'alt', 'poster'],
      data: ['fit', 'width', 'height', 'duration', 'hash'],
      classes: ['pending']
    }
  };

  // Block elements that should unwrap when inside LI (LI content is inline)
  const UNWRAP_IN_LI = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'];

  // Clean DOM: normalize tags, enforce allowed elements/attributes
  function cleanDOM(root) {
    const scrollY = window.scrollY;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const elements = [];
    while (walker.nextNode()) elements.push(walker.currentNode);

    for (const el of elements.reverse()) {
      let tag = el.tagName;

      // Normalize: B→STRONG, I→EM
      if (tag === 'B' || tag === 'I') {
        const replacement = document.createElement(tag === 'B' ? 'STRONG' : 'EM');
        replacement.append(...el.childNodes);
        el.replaceWith(replacement);
        continue;
      }

      const spec = ALLOWED[tag];

      // Unknown element: unwrap
      if (!spec) {
        el.replaceWith(...el.childNodes);
        continue;
      }

      // Block elements inside LI: unwrap
      if (UNWRAP_IN_LI.includes(tag) && el.closest('li')) {
        el.replaceWith(...el.childNodes);
        continue;
      }

      // Clean attributes: remove all, then restore allowed ones
      const allowedAttrs = spec.attrs || [];
      const allowedData = spec.data || [];
      const allowedClasses = spec.classes || [];

      // Save allowed values before clearing
      const savedAttrs = {};
      for (const attr of allowedAttrs) {
        if (el.hasAttribute(attr)) savedAttrs[attr] = el.getAttribute(attr);
      }
      const savedData = {};
      for (const key of allowedData) {
        if (el.dataset[key] !== undefined) savedData[key] = el.dataset[key];
      }
      const savedClass = allowedClasses.find(c => el.classList.contains(c));

      // Remove all attributes
      while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);

      // Restore allowed attributes
      for (const [attr, value] of Object.entries(savedAttrs)) {
        el.setAttribute(attr, value);
      }
      for (const [key, value] of Object.entries(savedData)) {
        el.dataset[key] = value;
      }
      if (savedClass) el.className = savedClass;
    }

    root.normalize();

    // Remove all BRs - gallery rows are now separate <p> elements, no BR needed
    root.querySelectorAll('br').forEach(br => br.remove());

    root.querySelectorAll('strong:empty, em:empty, a:empty, p:empty').forEach(e => e.remove());

    // Fix media URLs - convert absolute to relative _gallery/ paths
    root.querySelectorAll('img, video').forEach(el => {
      for (const attr of ['src', 'poster']) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        // Match URL containing _gallery/HASH[variant].ext anywhere in path
        // Handles: HASH.jpg, HASH-800.jpg, HASH-poster.jpg, HASH.mp4, HASH-540p.mp4
        const match = val.match(/_gallery\/([a-f0-9]{12}(?:-[a-z0-9]+)?\.(?:jpg|mp4))(?:\?.*)?$/);
        if (match && !val.startsWith('_gallery/') && !val.startsWith('data:') && !val.startsWith('blob:')) {
          el.setAttribute(attr, '_gallery/' + match[1]);
        }
      }
    });

    // Restore scroll position after DOM modifications
    window.scrollTo(0, scrollY);
  }

  // Watch for new videos and strip controls (URL fixing is done in cleanDOM)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeName === 'VIDEO') {
          stripVideoControls(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('video').forEach(stripVideoControls);
        }
      });
    });
  });
  observer.observe(main, { childList: true, subtree: true });

  // Overlay container for video selection highlights
  const videoSelectOverlay = document.createElement('div');
  videoSelectOverlay.style.cssText = 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: 50;';
  document.body.appendChild(videoSelectOverlay);

  // Update video selection overlay based on current selection
  function updateVideoSelection() {
    // Clear previous
    main.querySelectorAll('video.selected').forEach(v => v.classList.remove('selected'));
    videoSelectOverlay.innerHTML = '';

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Find all videos that intersect with selection
    main.querySelectorAll('video').forEach(video => {
      const range = selection.getRangeAt(0);
      if (range.intersectsNode(video)) {
        video.classList.add('selected');
        // Add overlay
        const rect = video.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.className = 'video-select-overlay';
        overlay.style.left = rect.left + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        videoSelectOverlay.appendChild(overlay);
      }
    });
  }

  // Listen for selection changes
  document.addEventListener('selectionchange', updateVideoSelection);
  window.addEventListener('scroll', updateVideoSelection);
  window.addEventListener('resize', updateVideoSelection);

  // Click on video to select it (images do this naturally, videos don't)
  main.addEventListener('click', (e) => {
    if (e.target.nodeName === 'VIDEO') {
      e.preventDefault();
      const range = document.createRange();
      range.selectNode(e.target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      // updateVideoSelection will be called by selectionchange event
    }
  });

  // Create top bar with Edit title and actions
  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML = `
    <div>
      <span class="edit-title">Edit Mode</span>
    </div>
    <div style="display:flex;align-items:center">
      <span id="edit-status"></span>
      <a id="shortcuts-link">Shortcuts</a>
      <a id="edit-download" href="#" download="index.html">Download</a>
      <a id="edit-copy">Copy</a>
      ${location.protocol !== 'file:' ? '<button id="edit-save">Save</button>' : ''}
      <button class="theme-toggle" aria-label="Toggle theme"></button>
      <a id="edit-view" href="${location.pathname}" title="Exit edit mode"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M2 2l10 10M12 2l-10 10"/></svg></a>
    </div>
  `;

  document.body.prepend(bar);

  // Setup theme toggle button
  const themeToggle = bar.querySelector('.theme-toggle');
  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    // Sun icon for dark mode (click to go light), moon icon for light mode (click to go dark)
    themeToggle.innerHTML = isDark
      ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="2"/><line x1="8" y1="14" x2="8" y2="15"/><line x1="1" y1="8" x2="2" y2="8"/><line x1="14" y1="8" x2="15" y2="8"/><line x1="2.5" y1="2.5" x2="3.2" y2="3.2"/><line x1="12.8" y1="12.8" x2="13.5" y2="13.5"/><line x1="12.8" y1="2.5" x2="13.5" y2="3.2"/><line x1="2.5" y1="12.8" x2="3.2" y2="13.5"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 5.3 14A6.5 6.5 0 0 1 5.3 2 8 8 0 0 0 8 0z"/></svg>';
  }
  updateThemeIcon();
  themeToggle.onclick = function() {
    if (window.toggleTheme) {
      window.toggleTheme();
      updateThemeIcon();
    }
  };

  // Track unsaved changes
  let hasUnsavedChanges = false;
  main.addEventListener('input', () => { hasUnsavedChanges = true; });

  // View link confirms if unsaved changes
  document.getElementById('edit-view').addEventListener('click', (e) => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Leave anyway?')) {
      e.preventDefault();
    }
  });

  // Shortcuts link click handler - show alert with formatted shortcuts
  document.getElementById('shortcuts-link').addEventListener('click', () => {
    const shortcuts = [
      'Drag & Drop\t\tAdd images/videos',
      'Ctrl+2/3/4\t\tHeading',
      'Ctrl+0\t\t\tParagraph',
      'Ctrl+L\t\t\tList',
      'Tab\t\t\t\tIndent',
      'Ctrl+K\t\t\tLink',
      'Ctrl+B\t\t\tBold',
      'Ctrl+I\t\t\tItalic / Alt text',
      'Ctrl+J\t\t\tFit mode',
      'Ctrl+.\t\t\tRotate 90°',
      'Ctrl+[ / ]\t\t\tRotate ±1°',
      'Ctrl+, / /\t\t\tZoom ±1%',
      'Ctrl+Arrow\t\tPan ±1%',
      'Ctrl+Enter\t\tSave'
    ];
    alert(shortcuts.join('\n'));
  });


  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter to save (only when save button exists)
    if (e.key === 'Enter' && e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const saveBtn = document.getElementById('edit-save');
      if (saveBtn) saveBtn.click();
      return;
    }
    // Enter always creates a new paragraph (gallery rows are now <p> elements)
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      document.execCommand('insertParagraph');
    }
    // Ctrl+number for headings/paragraph
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const key = e.key;
      if (key >= '0' && key <= '4') {
        e.preventDefault();
        const tag = key === '0' ? 'p' : 'h' + key;
        document.execCommand('formatBlock', false, '<' + tag + '>');
      }
      // Ctrl+K for links
      if (key === 'k') {
        e.preventDefault();
        const selection = window.getSelection();
        const text = selection.toString();
        let existingHref = '';
        // Check if selection is inside a link
        let node = selection.anchorNode;
        while (node && node !== main) {
          if (node.nodeName === 'A') {
            existingHref = node.href || '';
            break;
          }
          node = node.parentNode;
        }
        // Require text selection unless already in a link
        if (!text && !existingHref) {
          alert('Please select some text first');
          return;
        }
        const url = prompt('Link URL:', existingHref);
        if (url !== null) {
          if (url === '') {
            document.execCommand('unlink');
          } else {
            document.execCommand('createLink', false, url);
          }
        }
      }
      // Ctrl+L for bulleted list
      if (key === 'l') {
        e.preventDefault();
        document.execCommand('insertUnorderedList');
      }
      // Ctrl+B for bold/strong
      if (key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }
      // Ctrl+I for italic/em or image/video alt text
      if (key === 'i') {
        e.preventDefault();
        const media = getSelectedMedia();
        if (media) {
          const label = media.nodeName === 'IMG' ? 'Image' : 'Video';
          const alt = prompt(label + ' alt text:', media.alt || '');
          if (alt !== null) {
            media.alt = alt;
          }
        } else if (window.getSelection().toString()) {
          document.execCommand('italic');
        }
      }
      // Ctrl+J for media fit mode toggle
      if (key === 'j') {
        e.preventDefault();
        const media = getSelectedMedia();
        if (media) {
          const currentFit = media.dataset.fit || 'none';
          const fitModes = ['none', 'toowide', 'tootall', 'square'];
          const nextFit = fitModes[(fitModes.indexOf(currentFit) + 1) % fitModes.length];
          if (nextFit === 'none') {
            delete media.dataset.fit;
          } else {
            media.dataset.fit = nextFit;
          }
          updateLabels();
        }
      }
    }
    // Ctrl+. for image rotation
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '.') {
      e.preventDefault();
      const img = getSelectedMedia(['IMG']);
      if (img) {
        const nextRotate = ((parseInt(img.dataset.rotate) || 0) + 90) % 360;
        if (nextRotate === 0) {
          delete img.dataset.rotate;
        } else {
          img.dataset.rotate = nextRotate;
        }
        updateLabels();
      }
    }
    // Ctrl+[ and Ctrl+] for fine rotation (+/-1 degree)
    if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === '[' || e.key === ']')) {
      e.preventDefault();
      const img = getSelectedMedia(['IMG']);
      if (img) {
        const current = parseInt(img.dataset.rotate) || 0;
        const next = ((current + (e.key === ']' ? 1 : -1)) % 360 + 360) % 360;
        if (next === 0) {
          delete img.dataset.rotate;
        } else {
          img.dataset.rotate = next;
        }
        updateLabels();
      }
    }
    // Ctrl+, and Ctrl+/ for zoom (-/+ 2%)
    if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === ',' || e.key === '/')) {
      e.preventDefault();
      const img = getSelectedMedia(['IMG']);
      if (img) {
        const current = parseInt(img.dataset.zoom) || 100;
        const next = Math.max(100, Math.min(200, current + (e.key === '/' ? 2 : -2)));
        if (next === 100) {
          delete img.dataset.zoom;
        } else {
          img.dataset.zoom = next;
        }
        updateLabels();
      }
    }
    // Ctrl+Arrow for pan (+/- 1%)
    if (e.ctrlKey && !e.shiftKey && !e.altKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const img = getSelectedMedia(['IMG']);
      if (img) {
        let panX = parseInt(img.dataset.panX) || 0;
        let panY = parseInt(img.dataset.panY) || 0;
        if (e.key === 'ArrowLeft') panX = Math.max(-50, panX - 1);
        if (e.key === 'ArrowRight') panX = Math.min(50, panX + 1);
        if (e.key === 'ArrowUp') panY = Math.max(-50, panY - 1);
        if (e.key === 'ArrowDown') panY = Math.min(50, panY + 1);
        if (panX === 0) {
          delete img.dataset.panX;
        } else {
          img.dataset.panX = panX;
        }
        if (panY === 0) {
          delete img.dataset.panY;
        } else {
          img.dataset.panY = panY;
        }
        updateLabels();
      }
    }
    // Tab/Shift+Tab for list indent/dedent
    if (e.key === 'Tab') {
      const selection = window.getSelection();
      let node = selection.anchorNode;
      // Check if we're in a list item
      while (node && node !== main) {
        if (node.nodeName === 'LI') {
          e.preventDefault();
          if (e.shiftKey) {
            document.execCommand('outdent');
          } else {
            document.execCommand('indent');
          }
          return;
        }
        node = node.parentNode;
      }
    }
  });

  // Clean pasted content after browser completes paste
  main.addEventListener('paste', () => {
    setTimeout(() => { cleanDOM(main); updateLabels(); }, 0);
  });

  // Compute SHA256 hash of file, return first 12 hex chars
  async function hashFile(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.slice(0, 12);
  }

  // Drag and drop handling
  let dragCounter = 0;
  const dropHint = document.createElement('div');
  dropHint.className = 'drop-hint';
  dropHint.textContent = 'Drop images or videos here';
  dropHint.style.display = 'none';
  document.body.appendChild(dropHint);

  document.addEventListener('dragenter', (e) => {
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter++;
      dropHint.style.display = 'flex';
    }
  });

  document.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter === 0) {
      dropHint.style.display = 'none';
    }
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropHint.style.display = 'none';

    const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    const videoFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (imageFiles.length === 0 && videoFiles.length === 0) return;

    // Get selection/cursor position or append to main
    const selection = window.getSelection();
    let insertPoint = null;

    if (selection.rangeCount > 0 && main.contains(selection.anchorNode)) {
      insertPoint = selection.getRangeAt(0);
    }

    // Handle images
    for (const file of imageFiles) {
      const img = document.createElement('img');
      const hash = await hashFile(file);
      img.className = 'pending';
      img.dataset.hash = hash;

      // Show preview using data URL and capture dimensions
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
        img.onload = () => {
          img.dataset.width = img.naturalWidth;
          img.dataset.height = img.naturalHeight;
        };
      };
      reader.readAsDataURL(file);

      if (insertPoint) {
        insertPoint.insertNode(img);
        insertPoint.setStartAfter(img);
      } else {
        main.appendChild(img);
      }
    }

    // Handle videos
    for (const file of videoFiles) {
      const video = document.createElement('video');
      const hash = await hashFile(file);
      video.className = 'pending';
      video.dataset.hash = hash;
      // No controls in edit mode - video behaves like image for selection

      // Show preview using object URL and capture dimensions/duration
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        video.dataset.width = video.videoWidth;
        video.dataset.height = video.videoHeight;
        video.dataset.duration = video.duration;
      };

      if (insertPoint) {
        insertPoint.insertNode(video);
        insertPoint.setStartAfter(video);
      } else {
        main.appendChild(video);
      }
    }
  });

  // Format text: 4-space indent, sentences on new lines
  function formatText(text) {
    // Split on sentence endings followed by space (but not abbreviations)
    // Keep the punctuation with the sentence
    return text
      .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n    ')
      .trim();
  }

  // Get image tag with hash handling
  function imgTag(node) {
    let src = node.getAttribute('src') || '';
    if (node.className === 'pending' || src.startsWith('data:')) {
      src = '_gallery/' + (node.dataset.hash || '') + '.jpg';
    }
    let tag = '<img src="' + src + '"';
    if (node.alt) tag += ' alt="' + node.alt.replace(/"/g, '&quot;') + '"';
    if (node.dataset.fit) tag += ' data-fit="' + node.dataset.fit + '"';
    if (node.dataset.rotate) tag += ' data-rotate="' + node.dataset.rotate + '"';
    if (node.dataset.zoom && node.dataset.zoom !== '100') tag += ' data-zoom="' + node.dataset.zoom + '"';
    if (node.dataset.panX && node.dataset.panX !== '0') tag += ' data-pan-x="' + node.dataset.panX + '"';
    if (node.dataset.panY && node.dataset.panY !== '0') tag += ' data-pan-y="' + node.dataset.panY + '"';
    if (node.dataset.width) tag += ' data-width="' + node.dataset.width + '"';
    if (node.dataset.height) tag += ' data-height="' + node.dataset.height + '"';
    tag += '>';
    return tag;
  }

  // Get video tag with hash handling
  function videoTag(node) {
    let src = node.getAttribute('src') || '';
    if (node.className === 'pending' || src.startsWith('blob:')) {
      src = '_gallery/' + (node.dataset.hash || '') + '.mp4';
    }
    const hash = (src.match(/_gallery\/([a-f0-9]{12})\.mp4$/) || [])[1] || node.dataset.hash || '';
    const poster = hash ? '_gallery/' + hash + '-poster.jpg' : '';
    let tag = '<video src="' + src + '"';
    if (poster) tag += ' poster="' + poster + '"';
    if (node.alt) tag += ' alt="' + node.alt.replace(/"/g, '&quot;') + '"';
    if (node.dataset.fit) tag += ' data-fit="' + node.dataset.fit + '"';
    if (node.dataset.width) tag += ' data-width="' + node.dataset.width + '"';
    if (node.dataset.height) tag += ' data-height="' + node.dataset.height + '"';
    if (node.dataset.duration) tag += ' data-duration="' + node.dataset.duration + '"';
    tag += ' controls>';
    tag += '</video>';
    return tag;
  }

  // Get inline content (text, links, images, videos, strong, em) from an element
  function inlineContent(el) {
    let result = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'a') {
          result += '<a href="' + (node.getAttribute('href') || '') + '">' + inlineContent(node) + '</a>';
        } else if (tag === 'strong' || tag === 'b') {
          result += '<strong>' + inlineContent(node) + '</strong>';
        } else if (tag === 'em' || tag === 'i') {
          result += '<em>' + inlineContent(node) + '</em>';
        } else if (tag === 'img') {
          result += imgTag(node);
        } else if (tag === 'video') {
          result += videoTag(node);
        } else if (tag === 'ul') {
          // skip (handled separately in formatList)
        } else {
          result += inlineContent(node); // recurse into spans, etc.
        }
      }
    }
    return result;
  }

  // Format a list
  function formatList(ul, indent = 1) {
    const items = Array.from(ul.children).filter(el => el.tagName === 'LI');
    if (items.length === 0) return '';

    const ind = '    '.repeat(indent);
    let result = '<ul>\n';
    for (const li of items) {
      result += ind + '<li>' + inlineContent(li);
      // Check for nested list (inlineContent skips it)
      const nestedUl = li.querySelector(':scope > ul');
      if (nestedUl) {
        result += '\n' + formatList(nestedUl, indent + 1);
      }
      result += '</li>\n';
    }
    result += '</ul>';
    return result;
  }

  // Output images/videos from a container (each <p> is one row)
  function formatMedia(container) {
    let result = '';
    for (const node of container.childNodes) {
      if (node.nodeName === 'IMG') {
        result += imgTag(node);
      } else if (node.nodeName === 'VIDEO') {
        result += videoTag(node);
      }
    }
    return result;
  }

  // Convert DOM to formatted HTML
  function formatElement(el) {
    let result = '';

    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          result += '<p>\n    ' + formatText(text) + '\n</p>';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        if (tag === 'img') {
          // Top-level media (legacy support)
          result += imgTag(node);
        } else if (tag === 'video') {
          result += videoTag(node);
        } else if (/^h[1-6]$/.test(tag)) {
          const text = node.textContent.trim();
          if (text) {
            result += '<' + tag + '>\n    ' + formatText(text) + '\n</' + tag + '>';
          }
        } else if (tag === 'p' || tag === 'div') {
          // Check if contains only media (no text content)
          const text = node.textContent.trim();
          const media = node.querySelectorAll('img, video');
          if (!text && media.length > 0) {
            // Media-only row: output media tags followed by newline
            result += formatMedia(node);
            result += '\n';
          } else {
            const content = inlineContent(node).trim();
            if (content) {
              result += '<p>\n    ' + formatText(content) + '\n</p>';
            }
          }
        } else if (tag === 'ul') {
          result += formatList(node);
        } else if (tag === 'a') {
          result += '<a href="' + (node.getAttribute('href') || '') + '">' + node.textContent + '</a>';
        }
      }
    }

    return result;
  }

  // Generate complete HTML
  function generateHTML() {
    cleanDOM(main);
    updateLabels();
    const content = formatElement(main);
    return '<!DOCTYPE html><script src="' + root + '_script/view.js"><\/script>' +
      '<noscript><p><a href="' + root + 'sitemap/index.html">Sitemap</a></p></noscript>' +
      content + '\n';
  }

  // Copy to clipboard functionality
  document.getElementById('edit-copy').addEventListener('click', async (e) => {
    e.preventDefault();
    const html = generateHTML();
    const status = document.getElementById('edit-status');
    try {
      await navigator.clipboard.writeText(html);
      status.textContent = 'Copied';
      setTimeout(() => status.textContent = '', 2000);
    } catch (err) {
      status.textContent = 'Failed';
      setTimeout(() => status.textContent = '', 2000);
    }
  });

  // Download link - update href on hover so right-click "Save As" works
  const downloadLink = document.getElementById('edit-download');
  let blobUrl = null;

  downloadLink.addEventListener('mouseenter', () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    blobUrl = URL.createObjectURL(blob);
    downloadLink.href = blobUrl;
  });

  // Save button - POST to server (only exists when not file://)
  const saveBtn = document.getElementById('edit-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const html = generateHTML();
      const status = document.getElementById('edit-status');
      try {
        const response = await fetch(location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'text/html' },
          body: html
        });
        if (response.ok) {
          status.textContent = 'Saved';
          hasUnsavedChanges = false;
          setTimeout(() => status.textContent = '', 2000);
        } else {
          throw new Error(response.statusText);
        }
      } catch (err) {
        status.textContent = 'Error';
        console.error('Save failed:', err);
        setTimeout(() => status.textContent = '', 2000);
      }
    });
  }

  // Floating action button (FAB) - scroll to top
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Scroll to top');
  fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15V5M5 10l5-5 5 5"/></svg>';
  fab.onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  document.body.appendChild(fab);

  // Show/hide FAB based on scroll
  function updateFAB() {
    const hasScrollbar = document.body.scrollHeight > window.innerHeight;
    const scrolledDown = window.scrollY > 200;
    if (hasScrollbar && scrolledDown) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
  }
  window.addEventListener('scroll', updateFAB);
  window.addEventListener('resize', updateFAB);
  updateFAB();

})();

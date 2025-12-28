(function() {
  const main = document.querySelector('main');
  if (!main) return;

  // Get root path from the jimmyg.js script src
  const scripts = document.getElementsByTagName('script');
  let root = '';
  for (const s of scripts) {
    const src = s.getAttribute('src') || '';
    if (src.includes('jimmyg.js')) {
      root = src.replace('_script/jimmyg.js', '');
      break;
    }
  }

  // Add edit-mode styles
  const style = document.createElement('style');
  style.textContent = `
main { min-height: 50vh; }
main:focus { outline: none; }
main img { max-width: 200px; height: auto; margin: 0.25rem; vertical-align: middle; }
main img.pending { opacity: 0.6; border: 2px dashed #999; }
.edit-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #f5f5f5; border-top: 1px solid #ccc; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 1000; }
.edit-bar button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 4px; }
.edit-bar button:hover { background: #e0e0e0; }
.edit-bar a { padding: 0.5rem 1rem; }
#edit-status { color: #080; min-width: 4rem; }
.edit-instructions { font-size: 0.85rem; color: #666; }
.edit-instructions kbd { background: #e0e0e0; padding: 0.1rem 0.4rem; border-radius: 3px; font-family: inherit; }
.drop-hint { position: fixed; inset: 0; background: rgba(0,100,200,0.1); border: 4px dashed #0066cc; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #0066cc; pointer-events: none; z-index: 999; }
`;
  document.head.appendChild(style);

  // Make main editable
  main.contentEditable = 'true';

  // Create bottom bar with instructions and save button
  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML = `
    <div class="edit-instructions">
      <kbd>Ctrl+2</kbd>/<kbd>3</kbd>/<kbd>4</kbd> Heading &nbsp;
      <kbd>Ctrl+0</kbd> Paragraph &nbsp;
      Drag images to add
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem">
      <button id="edit-save">Copy HTML</button>
      <span id="edit-status"></span>
      <a href="${location.pathname}">View</a>
    </div>
  `;
  document.body.appendChild(bar);

  // Add padding to body so content isn't hidden behind bar
  document.body.style.paddingBottom = '4rem';

  // Keyboard shortcuts for headings
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const key = e.key;
      if (key >= '0' && key <= '4') {
        e.preventDefault();
        const tag = key === '0' ? 'p' : 'h' + key;
        document.execCommand('formatBlock', false, '<' + tag + '>');
      }
    }
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
  dropHint.textContent = 'Drop images here';
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

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    // Get selection/cursor position or append to main
    const selection = window.getSelection();
    let insertPoint = null;

    if (selection.rangeCount > 0 && main.contains(selection.anchorNode)) {
      insertPoint = selection.getRangeAt(0);
    }

    for (const file of files) {
      const img = document.createElement('img');
      const hash = await hashFile(file);
      img.className = 'pending';
      img.dataset.hash = hash;

      // Show preview using data URL
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      if (insertPoint) {
        insertPoint.insertNode(img);
        insertPoint.setStartAfter(img);
      } else {
        main.appendChild(img);
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

  // Convert DOM to formatted HTML
  function formatElement(el, indent) {
    const ind = '    '.repeat(indent);
    let result = '';

    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          result += ind + formatText(text) + '\n';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        // Handle images specially - just output the tag
        if (tag === 'img') {
          let src = node.getAttribute('src') || '';
          // Use hash for pending images
          if (node.className === 'pending' || src.startsWith('data:')) {
            const hash = node.dataset.hash || '';
            src = '_gallery/' + hash + '.jpg';
          }
          result += '<img src="' + src + '">';
          continue;
        }

        // Block elements: h1-h6, p, div
        if (/^(h[1-6]|p|div)$/.test(tag)) {
          const innerText = node.textContent.trim();
          if (innerText) {
            result += '<' + tag + '>\n';
            result += ind + formatText(innerText) + '\n';
            result += '</' + tag + '>';
          }
        } else if (tag === 'br') {
          result += '<br>';
        } else if (tag === 'a') {
          result += '<a href="' + (node.getAttribute('href') || '') + '">' + node.textContent + '</a>';
        } else {
          // Other inline elements - just get text
          result += node.textContent;
        }
      }
    }

    return result;
  }

  // Save functionality
  document.getElementById('edit-save').addEventListener('click', async () => {
    // Generate formatted HTML
    const content = formatElement(main, 1);

    // Build complete HTML
    const html = '<script src="' + root + '_script/jimmyg.js"><\/script>' +
      '<noscript><p><a href="' + root + 'sitemap/index.html">Sitemap</a></p></noscript>' +
      content + '\n';

    // Copy to clipboard
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

})();

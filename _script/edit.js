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
main .container { min-height: 50vh; }
main .container:focus { outline: none; }
main .container img { max-width: 200px; height: auto; margin: 0.25rem; vertical-align: middle; }
main .container img.pending { opacity: 0.6; border: 2px dashed #999; }
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
      Drag and Drop images
      <kbd>Ctrl+2/3/4</kbd> Heading
      <kbd>Ctrl+0</kbd> Paragraph
      <kbd>Ctrl+L</kbd> List
      <kbd>Tab</kbd> Indent
      <kbd>Ctrl+K</kbd> Link
      <kbd>Ctrl+B</kbd> Bold
      <kbd>Ctrl+I</kbd> Italic/Alt
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem">
      <span id="edit-status"></span>
      <button id="edit-copy">Copy HTML</button>
      <a id="edit-save" href="#" download="index.html">Save</a>
      <a href="${location.pathname}">View</a>
    </div>
  `;
  document.body.appendChild(bar);

  // Add padding to body so content isn't hidden behind bar
  document.body.style.paddingBottom = '4rem';

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
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
      // Ctrl+I for italic/em or image alt text
      // Selection API: text selection has toString(), image selection brackets the node
      if (key === 'i') {
        e.preventDefault();
        const selection = window.getSelection();
        const text = selection.toString();

        // Check if an image is selected (range brackets exactly one element node)
        let img = null;
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.startContainer === range.endContainer &&
              range.startContainer.nodeType === Node.ELEMENT_NODE &&
              range.endOffset - range.startOffset === 1) {
            const selectedNode = range.startContainer.childNodes[range.startOffset];
            if (selectedNode && selectedNode.nodeName === 'IMG') {
              img = selectedNode;
            }
          }
        }

        if (img) {
          // Image selected: edit alt text
          const alt = prompt('Image alt text:', img.alt || '');
          if (alt !== null) {
            img.alt = alt;
          }
        } else if (text) {
          // Text selected: apply italic/em
          document.execCommand('italic');
        }
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
    if (node.dataset.width) tag += ' data-width="' + node.dataset.width + '"';
    if (node.dataset.height) tag += ' data-height="' + node.dataset.height + '"';
    tag += '>';
    return tag;
  }

  // Get inline content (text, links, images, strong, em) from an element
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
        } else if (tag === 'br') {
          // ignore
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
      result += ind + '<li>';
      for (const node of li.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent.trim();
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();
          if (tag === 'a') {
            result += '<a href="' + (node.getAttribute('href') || '') + '">' + node.textContent + '</a>';
          } else if (tag === 'ul') {
            result += '\n' + formatList(node, indent + 1);
          } else if (tag === 'img') {
            result += imgTag(node);
          }
        }
      }
      result += '</li>\n';
    }
    result += '</ul>';
    return result;
  }

  // Output images from a container, respecting BR elements as row breaks
  function formatImages(container) {
    let result = '';
    for (const node of container.childNodes) {
      if (node.nodeName === 'IMG') {
        result += imgTag(node);
      } else if (node.nodeName === 'BR') {
        result += '\n';
      }
      // Ignore other nodes (whitespace text, etc.)
    }
    return result;
  }

  // Convert DOM to formatted HTML
  function formatElement(el) {
    let result = '';
    let lastWasImage = false;

    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          result += '<p>\n    ' + formatText(text) + '\n</p>';
          lastWasImage = false;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        if (tag === 'img') {
          result += imgTag(node);
          lastWasImage = true;
        } else if (tag === 'br') {
          // BR after images = new row
          if (lastWasImage) {
            result += '\n';
          }
        } else if (/^h[1-6]$/.test(tag)) {
          const text = node.textContent.trim();
          if (text) {
            result += '<' + tag + '>\n    ' + formatText(text) + '\n</' + tag + '>';
          }
          lastWasImage = false;
        } else if (tag === 'p' || tag === 'div') {
          // Check if contains only images (no text content)
          const text = node.textContent.trim();
          const images = node.querySelectorAll('img');
          if (!text && images.length > 0) {
            // Output images with BR handling, then add newline for next row
            result += formatImages(node);
            result += '\n';
            lastWasImage = true;
          } else {
            const content = inlineContent(node).trim();
            if (content) {
              result += '<p>\n    ' + formatText(content) + '\n</p>';
            }
            lastWasImage = false;
          }
        } else if (tag === 'ul') {
          result += formatList(node);
          lastWasImage = false;
        } else if (tag === 'a') {
          result += '<a href="' + (node.getAttribute('href') || '') + '">' + node.textContent + '</a>';
          lastWasImage = false;
        } else {
          lastWasImage = false;
        }
      }
    }

    return result;
  }

  // Generate complete HTML
  function generateHTML() {
    const content = formatElement(main);
    return '<!DOCTYPE html><script src="' + root + '_script/view.js"><\/script>' +
      '<noscript><p><a href="' + root + 'sitemap/index.html">Sitemap</a></p></noscript>' +
      content + '\n';
  }

  // Copy to clipboard functionality
  document.getElementById('edit-copy').addEventListener('click', async () => {
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

  // Save link - update href on hover so right-click "Save As" works
  const saveLink = document.getElementById('edit-save');
  let blobUrl = null;

  saveLink.addEventListener('mouseenter', () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    blobUrl = URL.createObjectURL(blob);
    saveLink.href = blobUrl;
  });

})();

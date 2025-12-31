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
main .container p { margin: 0.5rem 0; }
main .container h1, main .container h2, main .container h3, main .container h4 { margin: 1rem 0 0.5rem 0; }
main .container:focus { outline: none; }
main .container img, main .container video { max-width: 200px; height: auto; margin: 0.25rem; vertical-align: middle; }
main .container img.pending, main .container video.pending { opacity: 0.6; border: 2px dashed #999; }
.edit-bar { position: sticky; top: 0; left: 0; right: 0; background: #f5f5f5; border-bottom: 1px solid #ccc; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 1000; }
.edit-bar button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 4px; }
.edit-bar button:hover { background: #e0e0e0; }
.edit-bar a { padding: 0.5rem 1rem; }
#edit-status { color: #080; min-width: 4rem; }
.edit-instructions { font-size: 0.85rem; color: #666; }
.edit-instructions kbd { background: #e0e0e0; padding: 0.1rem 0.4rem; border-radius: 3px; font-family: inherit; }
.edit-instructions .shortcuts-full { display: inline; }
.edit-instructions .shortcuts-link { display: none; color: #0066cc; cursor: pointer; text-decoration: underline; }
@media (max-width: 768px) {
  .edit-instructions .shortcuts-full { display: none; }
  .edit-instructions .shortcuts-link { display: inline; }
  .edit-bar { padding: 0.4rem 0.5rem; font-size: 0.75rem; }
  .edit-bar button { padding: 0.3rem 0.5rem; font-size: 0.75rem; }
  .edit-bar a { padding: 0.3rem 0.4rem; }
  .edit-bar > div { gap: 0.25rem !important; }
}
.drop-hint { position: fixed; inset: 0; background: rgba(0,100,200,0.1); border: 4px dashed #0066cc; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #0066cc; pointer-events: none; z-index: 999; }
main .container img[data-fit="toowide"], main .container video[data-fit="toowide"] { outline: 3px solid #e67300; }
main .container img[data-fit="tootall"], main .container video[data-fit="tootall"] { outline: 3px solid #0066cc; }
main .container img[data-rotate] { outline: 3px solid #9933cc; }
.video-select-overlay { position: absolute; background: rgba(0,102,204,0.3); pointer-events: none; z-index: 50; }
.fit-label, .rotate-label { position: absolute; font-size: 10px; font-weight: bold; padding: 2px 4px; border-radius: 2px; pointer-events: none; z-index: 100; }
.fit-label.toowide { background: rgba(230, 115, 0, 0.85); color: white; }
.fit-label.tootall { background: rgba(0, 102, 204, 0.85); color: white; }
.rotate-label { background: rgba(153, 51, 204, 0.85); color: white; }
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
      if (fit === 'toowide' || fit === 'tootall') {
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

    // Add labels for rotated images
    main.querySelectorAll('img[data-rotate]').forEach(img => {
      const rotate = img.dataset.rotate;
      const label = document.createElement('span');
      label.className = 'rotate-label';
      label.textContent = rotate + '°';

      // Position at bottom-left of image
      const rect = img.getBoundingClientRect();
      label.style.left = (rect.left + 4) + 'px';
      label.style.top = (rect.bottom - 36) + 'px';

      labelOverlay.appendChild(label);
    });
  }

  // Update labels on scroll/resize and initially
  window.addEventListener('scroll', updateLabels);
  window.addEventListener('resize', updateLabels);
  setTimeout(updateLabels, 100);

  // Make main editable
  main.contentEditable = 'true';

  // Remove controls from videos in edit mode so they behave like images
  function stripVideoControls(video) {
    video.removeAttribute('controls');
    video.pause();
  }
  main.querySelectorAll('video').forEach(stripVideoControls);

  // Watch for new videos (e.g., pasted) and strip their controls
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeName === 'VIDEO') stripVideoControls(node);
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

  // Create bottom bar with instructions and save button
  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML = `
    <div class="edit-instructions">
      <span class="shortcuts-full">
        Drag and Drop images/videos
        <kbd>Ctrl+2/3/4</kbd> Heading
        <kbd>Ctrl+0</kbd> Paragraph
        <kbd>Ctrl+L</kbd> List
        <kbd>Tab</kbd> Indent
        <kbd>Ctrl+K</kbd> Link
        <kbd>Ctrl+B</kbd> Bold
        <kbd>Ctrl+I</kbd> Italic/Alt
        <kbd>Ctrl+J</kbd> Fit
        <kbd>Ctrl+.</kbd> Rotate
      </span>
      <span class="shortcuts-link" id="shortcuts-link">Shortcuts</span>
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem">
      <span id="edit-status"></span>
      <button id="edit-copy">Copy</button>
      ${location.protocol !== 'file:' ? '<button id="edit-save">Save</button>' : ''}
      <a id="edit-download" href="#" download="index.html">Download</a>
      <a href="${location.pathname}">View</a>
    </div>
  `;
  document.body.prepend(bar);

  // Mobile shortcuts link click handler
  document.getElementById('shortcuts-link').addEventListener('click', () => {
    const text = document.querySelector('.shortcuts-full').textContent.trim().replace(/\s+/g, ' ');
    alert(text);
  });


  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Enter creates a new paragraph (not just a line break)
    // Exception: when media is selected, allow default behavior for gallery row breaks
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Check if we're selecting a media element (range brackets exactly one node)
        const isMediaSelected = range.startContainer === range.endContainer &&
              range.startContainer.nodeType === Node.ELEMENT_NODE &&
              range.endOffset - range.startOffset === 1 &&
              (range.startContainer.childNodes[range.startOffset]?.nodeName === 'IMG' ||
               range.startContainer.childNodes[range.startOffset]?.nodeName === 'VIDEO');
        if (!isMediaSelected) {
          e.preventDefault();
          document.execCommand('insertParagraph');
        }
      }
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
      // Selection API: text selection has toString(), media selection brackets the node
      if (key === 'i') {
        e.preventDefault();
        const selection = window.getSelection();
        const text = selection.toString();

        // Check if media is selected (range brackets exactly one element node)
        let media = null;
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.startContainer === range.endContainer &&
              range.startContainer.nodeType === Node.ELEMENT_NODE &&
              range.endOffset - range.startOffset === 1) {
            const selectedNode = range.startContainer.childNodes[range.startOffset];
            if (selectedNode && (selectedNode.nodeName === 'IMG' || selectedNode.nodeName === 'VIDEO')) {
              media = selectedNode;
            }
          }
        }

        if (media) {
          // Media selected: edit alt text
          const label = media.nodeName === 'IMG' ? 'Image' : 'Video';
          const alt = prompt(label + ' alt text:', media.alt || '');
          if (alt !== null) {
            media.alt = alt;
          }
        } else if (text) {
          // Text selected: apply italic/em
          document.execCommand('italic');
        }
      }
      // Ctrl+J for media fit mode toggle
      if (key === 'j') {
        e.preventDefault();
        const selection = window.getSelection();

        // Check if media is selected
        let media = null;
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.startContainer === range.endContainer &&
              range.startContainer.nodeType === Node.ELEMENT_NODE &&
              range.endOffset - range.startOffset === 1) {
            const selectedNode = range.startContainer.childNodes[range.startOffset];
            if (selectedNode && (selectedNode.nodeName === 'IMG' || selectedNode.nodeName === 'VIDEO')) {
              media = selectedNode;
            }
          }
        }

        if (media) {
          // Cycle through fit modes: none -> toowide -> tootall -> none
          const currentFit = media.dataset.fit || 'none';
          const fitModes = ['none', 'toowide', 'tootall'];
          const currentIndex = fitModes.indexOf(currentFit);
          const nextIndex = (currentIndex + 1) % fitModes.length;
          const nextFit = fitModes[nextIndex];

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
      const selection = window.getSelection();

      // Check if an image is selected (rotation only for images, not video)
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
        // Cycle through rotations: 0 -> 90 -> 180 -> 270 -> 0
        const currentRotate = parseInt(img.dataset.rotate) || 0;
        const nextRotate = (currentRotate + 90) % 360;

        if (nextRotate === 0) {
          delete img.dataset.rotate;
        } else {
          img.dataset.rotate = nextRotate;
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
          } else if (tag === 'video') {
            result += videoTag(node);
          }
        }
      }
      result += '</li>\n';
    }
    result += '</ul>';
    return result;
  }

  // Output images/videos from a container, respecting BR elements as row breaks
  function formatMedia(container) {
    let result = '';
    for (const node of container.childNodes) {
      if (node.nodeName === 'IMG') {
        result += imgTag(node);
      } else if (node.nodeName === 'VIDEO') {
        result += videoTag(node);
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
    let lastWasMedia = false;

    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          result += '<p>\n    ' + formatText(text) + '\n</p>';
          lastWasMedia = false;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        if (tag === 'img') {
          result += imgTag(node);
          lastWasMedia = true;
        } else if (tag === 'video') {
          result += videoTag(node);
          lastWasMedia = true;
        } else if (tag === 'br') {
          // BR after media = new row
          if (lastWasMedia) {
            result += '\n';
          }
        } else if (/^h[1-6]$/.test(tag)) {
          const text = node.textContent.trim();
          if (text) {
            result += '<' + tag + '>\n    ' + formatText(text) + '\n</' + tag + '>';
          }
          lastWasMedia = false;
        } else if (tag === 'p' || tag === 'div') {
          // Check if contains only media (no text content)
          const text = node.textContent.trim();
          const media = node.querySelectorAll('img, video');
          if (!text && media.length > 0) {
            // Output media with BR handling, then add newline for next row
            result += formatMedia(node);
            result += '\n';
            lastWasMedia = true;
          } else {
            const content = inlineContent(node).trim();
            if (content) {
              result += '<p>\n    ' + formatText(content) + '\n</p>';
            }
            lastWasMedia = false;
          }
        } else if (tag === 'ul') {
          result += formatList(node);
          lastWasMedia = false;
        } else if (tag === 'a') {
          result += '<a href="' + (node.getAttribute('href') || '') + '">' + node.textContent + '</a>';
          lastWasMedia = false;
        } else {
          lastWasMedia = false;
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

})();

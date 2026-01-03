(function() {
  // Theme management - runs early to prevent flash
  function getInitialTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply theme immediately
  applyTheme(getInitialTheme());

  // Make toggleTheme available globally
  window.toggleTheme = toggleTheme;

  const scripts = document.getElementsByTagName('script');
  const src = scripts[scripts.length - 1].getAttribute('src');
  const expectedSuffix = '_script/view.js';
  if (!src.endsWith(expectedSuffix)) {
    console.error('view.js: unexpected script src "' + src + '", expected suffix "' + expectedSuffix + '"');
  }
  const root = src.replace(expectedSuffix, '');
  const depth = (src.match(/\.\.\//g) || []).length;
  const path = depth > 0 ? window.location.pathname.split('/').filter(p => p && p !== 'index.html').slice(-depth).join('/') : '';
  const editMode = new URLSearchParams(location.search).has('edit');

  // Load sitemap.js synchronously (works on file://)
  document.write('<script src="' + root + '_script/sitemap.js"><\/script>');

  // Viewport meta
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  document.head.appendChild(viewport);

  // Layout constants
  const containerMax = 1000; // px
  const containerPad = 0.6; // rem
  const galleryMax = 100; // vh

  // Inline styles
  const style = document.createElement('style');
  style.textContent = `
html, body { margin: 0; padding: 0; }
html {  }
body { background: #fff; }
main { background: #eee; color: #000; }
body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 18px; line-height: 1.8rem; }
h1, h2, h3, h4, h5, h6 { line-height: 1.3; }
@media (max-width: 600px) { body { font-size: 14px; line-height: 1.5rem; } }
.container { max-width: ${containerMax}px; margin: 0 auto; padding: 0 ${containerPad}rem; }
header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.52); backdrop-filter: saturate(220%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); line-height: 2rem; font-size: 0.8rem; display: flex; align-items: center; gap: 1rem; padding: 0.5rem 1rem; }
header .theme-toggle { margin-left: auto; cursor: pointer; display: flex; align-items: center; border: none; background: none; padding: 0; color: black; }
header .new-page { cursor: pointer; display: flex; align-items: center; border: none; background: none; padding: 0; color: black; }
header .edit-link { cursor: pointer; display: flex; align-items: center; border: none; background: none; padding: 0; color: black; text-decoration: none; }
header .site-title { font-weight: bold; }
header a, header a:visited, header a:hover { color: black; }
header a, header a:visited { text-decoration: none; }
header a:hover { text-decoration: underline; }
header nav a, header nav span { margin-right: 0.25rem; margin-left: 0.25rem }
main .container { padding-top: 1rem; padding-bottom: 1rem; display: flex; flex-direction: column; align-items: center; }
.fab { position: fixed; bottom: 1.5rem; right: 1.5rem; width: 3rem; height: 3rem; border-radius: 50%; background: rgba(255,255,255,0.35); backdrop-filter: saturate(300%) blur(20px); -webkit-backdrop-filter: saturate(300%) blur(20px); border: none; cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 1000; transition: opacity 0.2s, transform 0.2s; color: black; }
.fab:hover { transform: scale(1.1); }
.fab.visible { display: flex; }
main .container > *:not(.gallery) { align-self: stretch; }
main .container > p { margin: 0; padding: 0.5rem 0 0.5rem 0; }
main .container video { max-width: 100%; height: auto; }
.gallery { table-layout: fixed; width: min(calc(110vh - 3.5rem), calc(100% + ${containerPad * 2}rem)); border-spacing: ${containerPad}rem; margin: 0.5rem -${containerPad}rem; }
.gallery td { padding: 0; border: 0; vertical-align: top; }
.gallery a { display: block; }
.gallery img, .gallery video { display: block; width: 100%; max-height: 85vh; object-fit: contain; }
.gallery img[data-fit="tootall"], .gallery img[data-fit="toowide"] { width: auto; max-width: 100%; }
.gallery img[data-fit="square"] { max-height: none; }
.gallery .rotate-wrapper:has(img[data-fit="square"]) { max-height: 85vh; max-width: 85vh; margin: 0 auto; }
.gallery video { cursor: pointer; }
.gallery .rotate-wrapper { position: relative; overflow: hidden; width: 100%; }
.gallery .rotate-wrapper a { position: absolute; inset: 0; }
.gallery .rotate-wrapper img { position: absolute; left: 50%; top: 50%; max-height: none; max-width: none; }

/* Dark mode - inverted color scheme */
[data-theme="dark"] body { background: #000; }
[data-theme="dark"] main { background: #111; color: #ccc; }
[data-theme="dark"] header { background: rgba(0,0,0,0.52); }
[data-theme="dark"] header a,
[data-theme="dark"] header a:visited,
[data-theme="dark"] header a:hover,
[data-theme="dark"] header span { color: #ccc; }
[data-theme="dark"] header .theme-toggle,
[data-theme="dark"] header .new-page,
[data-theme="dark"] header .edit-link { color: #ccc; }
[data-theme="dark"] .fab { background: rgba(0,0,0,0.35); color: #ccc; }
`;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function() {
    const h1 = document.querySelector('h1');
    if (h1) document.title = h1.textContent;

    // Wrap content in main
    const main = document.createElement('main');
    while (document.body.firstChild) main.appendChild(document.body.firstChild);

    // If sitemap failed to load, show fallback link
    if (typeof sitemap === 'undefined') {
      const header = document.createElement('header');
      const nav = document.createElement('nav');
      nav.innerHTML = '<a href="' + root + 'sitemap/index.html">Sitemap</a>';
      header.appendChild(nav);
      document.body.innerHTML = '';
      document.body.appendChild(header);
      document.body.appendChild(main);
      return;
    }

    // Helper: get direct children of a path
    function getChildren(p) {
      const prefix = p ? p + '/' : '';
      const targetDepth = (p ? p.split('/').length : 0) + 1;
      return Object.keys(sitemap).filter(sp => {
        if (!sp || !sp.startsWith(prefix)) return false;
        return sp.split('/').length === targetDepth;
      });
    }

    // Helper: check if path has children
    function hasChildren(p) {
      return getChildren(p).length > 0;
    }

    // Find nearest ancestor in sitemap (for pages not in sitemap)
    let navPath = path;
    while (navPath && !(navPath in sitemap)) {
      navPath = navPath.split('/').slice(0, -1).join('/');
    }

    // Leaf pages use parent as section, sections use self
    const isLeaf = !hasChildren(navPath);
    const section = isLeaf && navPath ? navPath.split('/').slice(0, -1).join('/') : navPath;

    // Site title (bold, links to home, uses first sitemap entry)
    const siteTitle = document.createElement('a');
    siteTitle.href = root + 'index.html';
    siteTitle.className = 'site-title';
    siteTitle.textContent = sitemap[''] || 'Home';

    // Breadcrumbs: path to section (excluding root)
    const crumbs = [];
    if (section) section.split('/').forEach((_, i, parts) => crumbs.push(parts.slice(0, i + 1).join('/')));
    const breadcrumbNav = document.createElement('nav');
    if (crumbs.length > 0) {
      breadcrumbNav.innerHTML = crumbs.map((p, i) => {
        const title = sitemap[p] || p;
        if (i === crumbs.length - 1 && !isLeaf) return '<span>' + title + '</span>';
        return '<a href="' + root + p + '/index.html">' + title + '</a>';
      }).join('/');
    }

    // Section nav: children of section, current page as plain text
    const children = getChildren(section);
    const sectionNav = document.createElement('nav');
    sectionNav.innerHTML = children.map(p => {
      const title = sitemap[p];
      const isSection = hasChildren(p);
      if (p === path) return '<span>' + title + '</span>';
      const arrow = ''; //isSection ? '<span class="section-arrow">&rarr;</span>' : '';
      return '<a href="' + root + p + '/index.html">' + title + '</a>' + arrow;
    }).join('');

    // Header (full width, no container)
    const header = document.createElement('header');
    header.appendChild(siteTitle);
    if (crumbs.length > 0) header.appendChild(breadcrumbNav);
    header.appendChild(sectionNav);

    // Theme toggle button (sun/moon icon)
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle theme');
    themeToggle.setAttribute('title', 'Toggle dark/light theme');
    function updateThemeIcon() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      // Sun icon for dark mode (click to go light), moon icon for light mode (click to go dark)
      themeToggle.innerHTML = isDark
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="2"/><line x1="8" y1="14" x2="8" y2="15"/><line x1="1" y1="8" x2="2" y2="8"/><line x1="14" y1="8" x2="15" y2="8"/><line x1="2.5" y1="2.5" x2="3.2" y2="3.2"/><line x1="12.8" y1="12.8" x2="13.5" y2="13.5"/><line x1="12.8" y1="2.5" x2="13.5" y2="3.2"/><line x1="2.5" y1="12.8" x2="3.2" y2="13.5"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 8.77a6.5 6.5 0 1 1-7.27-7.27A5.5 5.5 0 1 0 14 8.77z"/></svg>';
    }
    updateThemeIcon();
    themeToggle.onclick = function() {
      toggleTheme();
      updateThemeIcon();
    };
    header.appendChild(themeToggle);

    // New page button (+ icon) - only show when not on file:// protocol
    if (location.protocol !== 'file:') {
      const newPageBtn = document.createElement('button');
      newPageBtn.className = 'new-page';
      newPageBtn.setAttribute('aria-label', 'Create new page');
      newPageBtn.setAttribute('title', 'Create new page');
      newPageBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>';
      newPageBtn.onclick = async function() {
        // Get current directory (remove /index.html if present)
        const currentDir = location.pathname.replace('/index.html', '').replace(/\/$/, '');
        const defaultPath = currentDir || '/';

        const newPath = prompt('Enter new page path:\nExample: "' + defaultPath + '/new-page"', defaultPath + '/');
        if (!newPath) return;

        // Validate path
        const trimmed = newPath.trim();
        if (!trimmed) {
          alert('Path cannot be empty');
          return;
        }

        // Check if same as current path
        const normalizedNew = trimmed.replace('/index.html', '').replace(/\/$/, '');
        if (normalizedNew === currentDir) {
          alert('New path cannot be the same as the current page');
          return;
        }

        // Check for leading underscore in any path segment
        const segments = trimmed.split('/').filter(s => s);
        if (segments.some(seg => seg.startsWith('_'))) {
          alert('Path segments cannot start with underscore (_)');
          return;
        }

        // Check for path traversal attempts
        if (trimmed.includes('..')) {
          alert('Path cannot contain ".." (parent directory references)');
          return;
        }

        // Send POST request to /new endpoint
        try {
          const response = await fetch('/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newPath: trimmed
            })
          });

          if (response.ok) {
            const result = await response.json();
            // Redirect to edit mode for new page
            window.location.href = result.newPagePath + '?edit';
          } else {
            const error = await response.text();
            alert('Error creating page: ' + error);
          }
        } catch (err) {
          alert('Failed to create page: ' + err.message);
        }
      };
      header.appendChild(newPageBtn);
    }

    // Edit button on far right (pencil icon)
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-link';
    editBtn.setAttribute('aria-label', 'Edit page');
    editBtn.setAttribute('title', 'Edit page');
    editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M11 1l2 2-9 9-2.5.5.5-2.5L11 1z"/></svg>';
    editBtn.onclick = function() {
      window.location.href = location.pathname + '?edit';
    };
    header.appendChild(editBtn);

    // Floating action button (FAB) - scroll to top
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Scroll to top');
    fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15V5M5 10l5-5 5 5"/></svg>';
    fab.onclick = function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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

    // Check if node is media (image or video)
    function isMedia(node) {
      return node.nodeName === 'IMG' || node.nodeName === 'VIDEO';
    }

    // Wrap consecutive images/videos in gallery table rows and add srcset
    function wrapMediaRows(container) {
      const children = Array.from(container.childNodes);
      let i = 0;

      // Helper: greatest common divisor
      function gcd(a, b) { return b ? gcd(b, a % b) : a; }
      // Helper: least common multiple
      function lcm(a, b) { return a * b / gcd(a, b); }

      while (i < children.length) {
        const node = children[i];
        if (isMedia(node)) {
          // Collect all consecutive media rows (separated by non-media nodes that are whitespace-only text)
          const rows = [];
          while (i < children.length) {
            if (isMedia(children[i])) {
              const row = [];
              while (i < children.length && isMedia(children[i])) {
                row.push(children[i]);
                i++;
              }
              rows.push(row);
            } else if (children[i].nodeType === Node.TEXT_NODE && !children[i].textContent.trim()) {
              i++; // Skip whitespace
            } else {
              break; // Non-media, non-whitespace content ends the table
            }
          }

          if (rows.length === 0) continue;

          // Calculate LCM of all row lengths for colspan
          const cols = rows.map(r => r.length).reduce(lcm);

          // Create table
          const table = document.createElement('table');
          table.className = 'gallery';
          rows[0][0].parentNode.insertBefore(table, rows[0][0]);

          for (const row of rows) {
            const tr = document.createElement('tr');
            table.appendChild(tr);
            const colspan = cols / row.length;

            for (const media of row) {
              const td = document.createElement('td');
              td.colSpan = colspan;
              tr.appendChild(td);

              if (media.nodeName === 'IMG') {
                // Add srcset for gallery images - let browser choose size
                const srcAttr = media.getAttribute('src') || '';
                const match = srcAttr.match(/_gallery\/([a-f0-9]{12})\.jpg$/);
                const rotate = parseInt(media.dataset.rotate) || 0;
                const zoom = parseInt(media.dataset.zoom) || 100;
                const panX = parseInt(media.dataset.panX) || 0;
                const panY = parseInt(media.dataset.panY) || 0;
                const w = parseInt(media.dataset.width) || 1;
                const h = parseInt(media.dataset.height) || 1;
                const imgAspect = w / h;

                // Determine if we need wrapper (for rotations near 90°/270°)
                const nearestRight = Math.round(rotate / 90) * 90;
                const needsWrapper = (nearestRight === 90 || nearestRight === 270);
                const hasTransform = rotate !== 0 || zoom !== 100 || panX !== 0 || panY !== 0;

                if (match) {
                  const hash = match[1];
                  const base = srcAttr.replace(/[a-f0-9]{12}\.jpg$/, '');
                  const srcsetSizes = [400, 800, 1600, 2400];
                  media.src = base + hash + '-800.jpg';
                  media.srcset = srcsetSizes.map(s => base + hash + '-' + s + '.jpg ' + s + 'w').join(', ');
                  const baseDisplaySize = Math.round(containerMax / row.length);

                  // Wrap in link to highest res
                  const link = document.createElement('a');
                  link.href = base + hash + '-2400.jpg';

                  if (needsWrapper) {
                    // Create wrapper with swapped aspect ratio
                    const wrapper = document.createElement('div');
                    wrapper.className = 'rotate-wrapper';
                    wrapper.style.aspectRatio = h + '/' + w;

                    // Calculate auto-scale for rotation + user zoom
                    // Use offset from nearest 90° (e.g., 89° → 1°, 91° → 1°)
                    const rotationOffset = Math.abs(rotate - nearestRight);
                    const containerAspect = h / w; // swapped for wrapper
                    const autoScale = getRotationScale(rotationOffset, h / w, containerAspect);
                    const totalScale = autoScale * (zoom / 100);

                    // Update sizes hint for higher resolution when scaled
                    // Add 20% buffer to encourage browser to pick higher res
                    media.sizes = Math.round(baseDisplaySize * totalScale * 1.2) + 'px';

                    // Clamp pan to prevent showing edges
                    const maxPan = totalScale > 1 ? ((totalScale - 1) / totalScale) * 50 : 0;
                    const clampedPanX = Math.max(-maxPan, Math.min(maxPan, panX));
                    const clampedPanY = Math.max(-maxPan, Math.min(maxPan, panY));

                    // Build transform
                    const translateX = -50 + clampedPanX;
                    const translateY = -50 + clampedPanY;
                    media.style.width = (w / h * 100 * totalScale) + '%';
                    media.style.height = 'auto';
                    media.style.transform = `translate(${translateX}%, ${translateY}%) rotate(${rotate}deg)`;

                    link.appendChild(media);
                    wrapper.appendChild(link);
                    td.appendChild(wrapper);
                  } else if (hasTransform) {
                    // Non-wrapper transforms (0°, 180°, or small rotations near 0°/180°)
                    const wrapper = document.createElement('div');
                    wrapper.className = 'rotate-wrapper';
                    wrapper.style.aspectRatio = w + '/' + h;

                    // Calculate auto-scale for rotation + user zoom
                    // Use offset from nearest 90° (e.g., 2° → 2°, 178° → 2°)
                    const rotationOffset = Math.abs(rotate - nearestRight);
                    const autoScale = getRotationScale(rotationOffset, imgAspect, imgAspect);
                    const totalScale = autoScale * (zoom / 100);

                    // Update sizes hint for higher resolution when scaled
                    // Add 20% buffer to encourage browser to pick higher res
                    media.sizes = Math.round(baseDisplaySize * totalScale * 1.2) + 'px';

                    // Clamp pan
                    const maxPan = totalScale > 1 ? ((totalScale - 1) / totalScale) * 50 : 0;
                    const clampedPanX = Math.max(-maxPan, Math.min(maxPan, panX));
                    const clampedPanY = Math.max(-maxPan, Math.min(maxPan, panY));

                    const translateX = -50 + clampedPanX;
                    const translateY = -50 + clampedPanY;
                    media.style.width = (100 * totalScale) + '%';
                    media.style.height = 'auto';
                    media.style.transform = `translate(${translateX}%, ${translateY}%) rotate(${rotate}deg)`;

                    link.appendChild(media);
                    wrapper.appendChild(link);
                    td.appendChild(wrapper);
                  } else {
                    media.sizes = baseDisplaySize + 'px';
                    link.appendChild(media);
                    td.appendChild(link);
                  }
                } else {
                  // No hash match - still handle transforms
                  if (needsWrapper || hasTransform) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'rotate-wrapper';
                    wrapper.style.aspectRatio = needsWrapper ? (h + '/' + w) : (w + '/' + h);

                    // Use offset from nearest 90° for auto-scale calculation
                    const rotationOffset = Math.abs(rotate - nearestRight);
                    const containerAspect = needsWrapper ? (h / w) : imgAspect;
                    const effectiveImgAspect = needsWrapper ? (h / w) : imgAspect;
                    const autoScale = getRotationScale(rotationOffset, effectiveImgAspect, containerAspect);
                    const totalScale = autoScale * (zoom / 100);

                    const maxPan = totalScale > 1 ? ((totalScale - 1) / totalScale) * 50 : 0;
                    const clampedPanX = Math.max(-maxPan, Math.min(maxPan, panX));
                    const clampedPanY = Math.max(-maxPan, Math.min(maxPan, panY));

                    const translateX = -50 + clampedPanX;
                    const translateY = -50 + clampedPanY;
                    const baseWidth = needsWrapper ? (w / h * 100) : 100;
                    media.style.width = (baseWidth * totalScale) + '%';
                    media.style.height = 'auto';
                    media.style.transform = `translate(${translateX}%, ${translateY}%) rotate(${rotate}deg)`;

                    wrapper.appendChild(media);
                    td.appendChild(wrapper);
                  } else {
                    td.appendChild(media);
                  }
                }
              } else if (media.nodeName === 'VIDEO') {
                // Handle gallery videos
                const srcAttr = media.getAttribute('src') || '';
                const match = srcAttr.match(/_gallery\/([a-f0-9]{12})\.mp4$/);
                if (match) {
                  const hash = match[1];
                  const base = srcAttr.replace(/[a-f0-9]{12}\.mp4$/, '');
                  // Pick 360p or 540p based on display width
                  const displayWidth = Math.min(containerMax, window.innerWidth) / row.length;
                  const size = displayWidth > 400 ? 540 : 360;
                  media.src = base + hash + '-' + size + 'p.mp4';
                  // Add controls attribute
                  media.controls = true;
                }
                td.appendChild(media);
              }
            }
          }
        } else {
          i++;
        }
      }
    }
    // Helper: get effective dimensions accounting for rotation
    function getEffectiveDimensions(el) {
      let w = parseInt(el.dataset.width) || el.naturalWidth || el.videoWidth;
      let h = parseInt(el.dataset.height) || el.naturalHeight || el.videoHeight;
      const rotate = parseInt(el.dataset.rotate) || 0;
      // For rotations near 90° or 270°, swap dimensions
      const nearestRight = Math.round(rotate / 90) * 90;
      if (nearestRight === 90 || nearestRight === 270) {
        [w, h] = [h, w];
      }
      return { width: w, height: h };
    }

    // Helper: calculate scale needed to fill container after rotation (no whitespace)
    function getRotationScale(angleDeg, imgAspect, containerAspect) {
      if (angleDeg === 0) return 1;
      const rad = angleDeg * Math.PI / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      // Bounding box of rotated image relative to original
      const boundingWidth = cos + sin / imgAspect;
      const boundingHeight = sin + cos * imgAspect;
      // Scale to fill container (cover, not contain)
      return Math.max(boundingWidth, boundingHeight / containerAspect);
    }

    // Apply fit constraints to media marked tootall, toowide, or square
    // Uses percentage-based widths so it's responsive without resize handlers
    function applyFitConstraints(container) {
      const tables = container.querySelectorAll('.gallery');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td'));
          const mediaList = cells.map(td => td.querySelector('img') || td.querySelector('video'));

          mediaList.forEach((media, idx) => {
            if (!media) return;
            const fit = media.dataset.fit;
            if (fit !== 'tootall' && fit !== 'toowide' && fit !== 'square') return;

            const rotate = parseInt(media.dataset.rotate) || 0;
            const wrapper = media.closest('.rotate-wrapper');

            const zoom = parseInt(media.dataset.zoom) || 100;
            const panX = parseInt(media.dataset.panX) || 0;
            const panY = parseInt(media.dataset.panY) || 0;
            const nearestRight = Math.round(rotate / 90) * 90;

            // Get target aspect ratio (1 for square, or from reference image)
            let targetAspect = 1;
            if (fit !== 'square') {
              // Find reference media for toowide/tootall
              let refMedia = null;
              const order = [];
              for (let j = idx - 1; j >= 0; j--) order.push(j);
              for (let j = idx + 1; j < mediaList.length; j++) order.push(j);
              for (const j of order) {
                const candidate = mediaList[j];
                if (candidate && (!candidate.dataset.fit || candidate.dataset.fit === 'none')) {
                  refMedia = candidate;
                  break;
                }
              }
              if (!refMedia) return;
              const ref = getEffectiveDimensions(refMedia);
              if (!ref.width || !ref.height) return;
              targetAspect = ref.width / ref.height;
            }

            const w = parseInt(media.dataset.width) || 1;
            const h = parseInt(media.dataset.height) || 1;

            if (wrapper) {
              // Set target aspect ratio (1 for square, reference aspect for toowide/tootall)
              wrapper.style.aspectRatio = targetAspect === 1 ? '1 / 1' : targetAspect.toFixed(4) + ' / 1';

              // Calculate scales: cover (fill wrapper) + rotation (avoid corner gaps) + user zoom
              const rotationOffset = Math.abs(rotate - nearestRight);
              const effectiveAspect = (nearestRight === 90 || nearestRight === 270) ? (h / w) : (w / h);
              const coverScale = Math.max(1, effectiveAspect / targetAspect);
              const autoScale = getRotationScale(rotationOffset, effectiveAspect, targetAspect);
              const totalScale = coverScale * autoScale * (zoom / 100);

              // Clamp pan based on zoom
              const maxPan = totalScale > 1 ? ((totalScale - 1) / totalScale) * 50 : 0;
              const clampedPanX = Math.max(-maxPan, Math.min(maxPan, panX));
              const clampedPanY = Math.max(-maxPan, Math.min(maxPan, panY));

              // Apply transform
              const baseWidth = (nearestRight === 90 || nearestRight === 270) ? (w / h * 100) : 100;
              media.style.width = (baseWidth * totalScale) + '%';
              media.style.height = 'auto';
              media.style.transform = `translate(${-50 + clampedPanX}%, ${-50 + clampedPanY}%) rotate(${rotate}deg)`;

              // Update srcset sizes hint
              const currentSizes = parseInt(media.sizes) || containerMax / cells.length;
              media.sizes = Math.round(currentSizes * totalScale * 1.2) + 'px';
            } else {
              // No wrapper - use objectFit approach
              const maxPan = zoom > 100 ? ((zoom - 100) / zoom) * 50 : 0;
              const clampedPanX = Math.max(-maxPan, Math.min(maxPan, panX));
              const clampedPanY = Math.max(-maxPan, Math.min(maxPan, panY));
              media.style.width = '100%';
              media.style.aspectRatio = targetAspect.toString();
              media.style.objectFit = 'cover';
              media.style.objectPosition = `${50 + clampedPanX}% ${50 + clampedPanY}%`;
              if (zoom > 100) media.style.transform = `scale(${zoom / 100})`;
            }
          });
        });
      });
    }

    // Select appropriate video resolution based on viewport
    function selectVideoResolution(container) {
      container.querySelectorAll('video').forEach(video => {
        const srcAttr = video.getAttribute('src') || '';
        const match = srcAttr.match(/_gallery\/([a-f0-9]{12})\.mp4$/);
        if (match) {
          const hash = match[1];
          const base = srcAttr.replace(/[a-f0-9]{12}\.mp4$/, '');
          // Pick 360p or 540p based on viewport width
          const size = window.innerWidth > 500 ? 540 : 360;
          video.src = base + hash + '-' + size + 'p.mp4';
          video.controls = true;
        }
      });
    }

    if (!editMode) {
      selectVideoResolution(main);
      wrapMediaRows(main);
      applyFitConstraints(main);
    } else {
      // In edit mode, convert newlines between media to BR elements
      const children = Array.from(main.childNodes);
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('\n')) {
          // Check if between media elements
          const prev = children[i - 1];
          const next = children[i + 1];
          if ((prev && isMedia(prev)) || (next && isMedia(next))) {
            const br = document.createElement('br');
            node.parentNode.replaceChild(br, node);
          }
        }
      }
    }

    // Wrap main content in container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'container';
    while (main.firstChild) mainContainer.appendChild(main.firstChild);
    main.appendChild(mainContainer);

    // Assemble
    document.body.innerHTML = '';
    document.body.appendChild(header);
    document.body.appendChild(main);
    if (!editMode) document.body.appendChild(fab);

    updateFAB();

    // Load edit script if in edit mode
    if (editMode) {
      const editScript = document.createElement('script');
      editScript.src = root + '_script/edit.js';
      document.head.appendChild(editScript);
    }

    // Ctrl+E to enter edit mode
    if (!editMode) {
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'e' && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          location.search = 'edit';
        }
      });
    }
  });
})();

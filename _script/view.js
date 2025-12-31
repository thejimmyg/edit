(function() {
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
body { background: #eee; font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 18px; line-height: 1.8rem; }
h1, h2, h3, h4, h5, h6 { line-height: 1.3; }
@media (max-width: 600px) { body { font-size: 14px; line-height: 1.5rem; } }
.container { max-width: ${containerMax}px; margin: 0 auto; padding: 0 ${containerPad}rem; }
header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.52); backdrop-filter: saturate(220%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); line-height: 2rem; font-size: 0.8rem; display: flex; gap: 1rem; padding: 0.5rem 1rem; }
header .edit-link { margin-left: auto; }
header .site-title { font-weight: bold; }
header a, header a:visited, header a:hover { color: black; }
header a, header a:visited { text-decoration: none; }
header a:hover { text-decoration: underline; }
header nav a, header nav span { margin-right: 0.25rem; margin-left: 0.25rem }
footer { text-align: right; }
footer .container { padding-top: 1rem; padding-bottom: 1rem; }
main .container { padding-top: 1rem; padding-bottom: 1rem; display: flex; flex-direction: column; align-items: center; }
main .container > *:not(.gallery) { align-self: stretch; }
main .container > p { margin: 0; padding: 0.5rem 0 0.5rem 0; }
main .container video { max-width: 100%; height: auto; }
.gallery { padding-top: 0.5rem; padding-bottom: 0.5rem }
.gallery { table-layout: fixed; width: 100%; width: min(105vh, calc(100% + ${containerPad * 2}rem)); border-spacing: ${containerPad}rem; margin: -${containerPad}rem -cacl(2*${containerPad}rem) 0 -${containerPad}rem; }
.gallery td { padding: 0; margin: 0; border: 0; vertical-align: top; }
.gallery a { display: block; padding: 0; margin: 0; border: 0; }
.gallery img, .gallery video { display: block; width: 100%; max-height: 90vh; padding: 0; margin: 0; border: 0; object-fit: contain; }
.gallery img[data-fit="tootall"], .gallery img[data-fit="toowide"] { width: auto; max-width: 100%; }
.gallery video { cursor: pointer; }
.gallery .rotate-wrapper { position: relative; overflow: hidden; width: 100%; }
.gallery .rotate-wrapper a { position: absolute; inset: 0; }
.gallery .rotate-wrapper img { position: absolute; left: 50%; top: 50%; max-height: none; max-width: none; }
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

    // Edit link on far right
    const editLink = document.createElement('a');
    editLink.href = location.pathname + '?edit';
    editLink.className = 'edit-link';
    editLink.textContent = 'Edit';
    header.appendChild(editLink);

    // Footer with container and Top link (hidden initially)
    const footer = document.createElement('footer');
    const footerContainer = document.createElement('div');
    footerContainer.className = 'container';
    const topLink = document.createElement('a');
    topLink.href = '#';
    topLink.textContent = 'Top \u2191';
    topLink.style.display = 'none';
    footerContainer.appendChild(topLink);
    footer.appendChild(footerContainer);

    // Show/hide Top link based on scroll
    function updateTopLink() {
      const hasScrollbar = document.body.scrollHeight > window.innerHeight;
      const atTop = window.scrollY < 50;
      topLink.style.display = (hasScrollbar && !atTop) ? '' : 'none';
    }
    window.addEventListener('scroll', updateTopLink);
    window.addEventListener('resize', updateTopLink);

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
                const w = parseInt(media.dataset.width) || 1;
                const h = parseInt(media.dataset.height) || 1;

                if (match) {
                  const hash = match[1];
                  const base = srcAttr.replace(/[a-f0-9]{12}\.jpg$/, '');
                  const sizes = [400, 800, 1600, 2400];
                  media.src = base + hash + '-800.jpg';
                  media.srcset = sizes.map(s => base + hash + '-' + s + '.jpg ' + s + 'w').join(', ');
                  media.sizes = Math.round(containerMax / row.length) + 'px';

                  // Wrap in link to highest res
                  const link = document.createElement('a');
                  link.href = base + hash + '-2400.jpg';

                  if (rotate === 90 || rotate === 270) {
                    // Create wrapper with swapped aspect ratio
                    const wrapper = document.createElement('div');
                    wrapper.className = 'rotate-wrapper';
                    wrapper.style.aspectRatio = h + '/' + w;

                    // Size image to fill wrapper when rotated
                    // After rotation, image visual dims are h x w
                    // Wrapper dims are h x w (via aspect-ratio)
                    // Set image width = wrapper height ratio, height = wrapper width
                    media.style.width = (w / h * 100) + '%';
                    media.style.height = '100%';
                    media.style.transform = 'translate(-50%, -50%) rotate(' + rotate + 'deg)';

                    link.appendChild(media);
                    wrapper.appendChild(link);
                    td.appendChild(wrapper);
                  } else if (rotate === 180) {
                    media.style.transform = 'rotate(180deg)';
                    link.appendChild(media);
                    td.appendChild(link);
                  } else {
                    link.appendChild(media);
                    td.appendChild(link);
                  }
                } else {
                  // No hash match - still handle rotation
                  if (rotate === 90 || rotate === 270) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'rotate-wrapper';
                    wrapper.style.aspectRatio = h + '/' + w;
                    media.style.width = (w / h * 100) + '%';
                    media.style.height = '100%';
                    media.style.transform = 'translate(-50%, -50%) rotate(' + rotate + 'deg)';
                    wrapper.appendChild(media);
                    td.appendChild(wrapper);
                  } else if (rotate === 180) {
                    media.style.transform = 'rotate(180deg)';
                    td.appendChild(media);
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
      // Swap dimensions for 90° or 270° rotation
      if (rotate === 90 || rotate === 270) {
        [w, h] = [h, w];
      }
      return { width: w, height: h };
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

            // Square mode: force 1:1 aspect ratio (no reference needed)
            if (fit === 'square') {
              if (wrapper && (rotate === 90 || rotate === 270)) {
                // Rotated square: wrapper becomes square
                wrapper.style.aspectRatio = 'auto';
                wrapper.style.paddingBottom = '100%';
                // Scale image to fill after rotation
                media.style.width = '100%';
                media.style.height = 'auto';
                media.style.aspectRatio = '1';
                media.style.objectFit = 'cover';
              } else {
                // Non-rotated square
                media.style.width = '100%';
                media.style.aspectRatio = '1';
                media.style.objectFit = 'cover';
              }
              return;
            }

            // toowide/tootall: find reference media
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

            // Get effective dimensions (accounting for rotation)
            const ref = getEffectiveDimensions(refMedia);
            const med = getEffectiveDimensions(media);

            if (!ref.width || !ref.height || !med.width || !med.height) return;

            const refAspect = ref.width / ref.height;

            if (wrapper && (rotate === 90 || rotate === 270)) {
              // For rotated images, adjust the wrapper's aspect ratio
              // Use padding-bottom trick instead of aspect-ratio property
              // because aspect-ratio doesn't work reliably in table cells
              // padding-bottom % is relative to WIDTH, so it creates aspect ratio
              wrapper.style.aspectRatio = 'auto';  // Clear any existing
              wrapper.style.paddingBottom = (ref.height / ref.width * 100) + '%';

              // Make image large enough to definitely fill wrapper after rotation
              // Use aspect-ratio: 1 to force square based on width (since height % may not work)
              // The wrapper clips to the correct shape via overflow: hidden
              const scale = Math.max(1 / refAspect, refAspect);
              media.style.width = (scale * 100) + '%';
              media.style.height = 'auto';
              media.style.aspectRatio = '1';  // Force square based on width
              media.style.objectFit = 'cover';

              // Update sizes hint for srcset - scaled image needs larger source
              const currentSizes = parseInt(media.sizes) || containerMax / cells.length;
              media.sizes = Math.round(currentSizes * scale) + 'px';
            } else {
              // Both tootall and toowide: crop to match reference aspect ratio
              media.style.width = '100%';
              media.style.aspectRatio = refAspect;
              media.style.objectFit = 'cover';
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
    if (!editMode) document.body.appendChild(footer);

    updateTopLink();

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

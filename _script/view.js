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
body { background: #fafafa; font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 18px; line-height: 1.8rem; }
h1, h2, h3, h4, h5, h6 { line-height: 1.3; }
@media (max-width: 600px) { body { font-size: 14px; line-height: 1.5rem; } }
.container { max-width: ${containerMax}px; margin: 0 auto; padding: 0 ${containerPad}rem; }
header { position: sticky; top: 0; background: rgba(255,255,255,0.72); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid #efefef; line-height: 2rem; font-size: 0.8rem;}
header .container { display: flex; gap: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem; }
header .site-title { font-weight: bold; color: inherit; text-decoration: none; }
header nav a, header nav span { margin-right: 0.25rem; margin-left: 0.25rem }
footer { text-align: right; }
footer .container { padding-top: 1rem; padding-bottom: 1rem; }
main .container { padding-top: 1rem; padding-bottom: 1rem; display: flex; flex-direction: column; align-items: center; }
main .container > *:not(.gallery) { align-self: stretch; }
main .container > p { margin: 0; padding: 0.5rem 0 0.5rem 0; }
.gallery { padding-top: 0.5rem; padding-bottom: 0.5rem }
.gallery { table-layout: fixed; width: 100%; width: min(105vh, calc(100% + ${containerPad * 2}rem)); border-spacing: ${containerPad}rem; margin: -${containerPad}rem -cacl(2*${containerPad}rem) 0 -${containerPad}rem; }
.gallery td { padding: 0; margin: 0; border: 0; vertical-align: top; }
.gallery a { display: block; padding: 0; margin: 0; border: 0; }
.gallery img { display: block; width: 100%; max-height: 90vh; padding: 0; margin: 0; border: 0; object-fit: contain; }
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

    // Header with container
    const header = document.createElement('header');
    const headerContainer = document.createElement('div');
    headerContainer.className = 'container';
    headerContainer.appendChild(siteTitle);
    if (crumbs.length > 0) headerContainer.appendChild(breadcrumbNav);
    headerContainer.appendChild(sectionNav);
    header.appendChild(headerContainer);

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

    // Wrap consecutive images in gallery table rows and add srcset
    function wrapImageRows(container) {
      const children = Array.from(container.childNodes);
      let i = 0;

      // Helper: greatest common divisor
      function gcd(a, b) { return b ? gcd(b, a % b) : a; }
      // Helper: least common multiple
      function lcm(a, b) { return a * b / gcd(a, b); }

      while (i < children.length) {
        const node = children[i];
        if (node.nodeName === 'IMG') {
          // Collect all consecutive image rows (separated by non-IMG nodes that are whitespace-only text)
          const rows = [];
          while (i < children.length) {
            if (children[i].nodeName === 'IMG') {
              const row = [];
              while (i < children.length && children[i].nodeName === 'IMG') {
                row.push(children[i]);
                i++;
              }
              rows.push(row);
            } else if (children[i].nodeType === Node.TEXT_NODE && !children[i].textContent.trim()) {
              i++; // Skip whitespace
            } else {
              break; // Non-image, non-whitespace content ends the table
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

            for (const img of row) {
              const td = document.createElement('td');
              td.colSpan = colspan;
              tr.appendChild(td);

              // Add srcset and link for gallery images
              const srcAttr = img.getAttribute('src') || '';
              const match = srcAttr.match(/_gallery\/([a-f0-9]{12})\.jpg$/);
              if (match) {
                const hash = match[1];
                const base = srcAttr.replace(/[a-f0-9]{12}\.jpg$/, '');
                // Pick smallest size >= display width * device pixel ratio
                const sizes = [400, 800, 1600, 2400];
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const displayWidth = Math.min(containerMax, window.innerWidth) / row.length;
                const needed = displayWidth * dpr;
                const size = sizes.find(s => s >= needed) || 2400;
                img.src = base + hash + '-' + size + '.jpg';
                // Wrap in link to highest res
                const link = document.createElement('a');
                link.href = base + hash + '-2400.jpg';
                link.appendChild(img);
                td.appendChild(link);
              } else {
                td.appendChild(img);
              }
            }
          }
        } else {
          i++;
        }
      }
    }
    if (!editMode) {
      wrapImageRows(main);
    } else {
      // In edit mode, convert newlines between images to BR elements
      const children = Array.from(main.childNodes);
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('\n')) {
          // Check if between images
          const prev = children[i - 1];
          const next = children[i + 1];
          if ((prev && prev.nodeName === 'IMG') || (next && next.nodeName === 'IMG')) {
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

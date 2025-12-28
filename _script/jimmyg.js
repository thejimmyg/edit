(function() {
  const scripts = document.getElementsByTagName('script');
  const src = scripts[scripts.length - 1].getAttribute('src');
  const root = src.replace('_script/jimmyg.js', '');
  const depth = (src.match(/\.\.\//g) || []).length;
  const path = depth > 0 ? window.location.pathname.split('/').filter(p => p && p !== 'index.html').slice(-depth).join('/') : '';

  // Load sitemap.js synchronously (works on file://)
  document.write('<script src="' + root + '_script/sitemap.js"><\/script>');

  // Viewport meta
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  document.head.appendChild(viewport);

  // Inline styles
  const style = document.createElement('style');
  style.textContent = `
body { margin: 0; padding: 0 1rem; }
header { position: sticky; top: 0; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid #f5f5f5; padding: 0.5rem 1rem; margin: 0 -1rem; display: flex; gap: 1rem; }
header nav a, header nav span { margin-right: 0.5rem; }
header nav a.section { font-weight: bold; }
footer { text-align: right; padding: 2rem 0 1rem; }
main { padding: 1rem 0; }
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

    // Leaf pages use parent as section, sections use self
    const isLeaf = !hasChildren(path);
    const section = isLeaf && path ? path.split('/').slice(0, -1).join('/') : path;

    // Breadcrumbs: path to section
    const crumbs = [''];
    if (section) section.split('/').forEach((_, i, parts) => crumbs.push(parts.slice(0, i + 1).join('/')));
    const breadcrumbNav = document.createElement('nav');
    breadcrumbNav.innerHTML = crumbs.map((p, i) => {
      const title = sitemap[p] || p;
      if (i === crumbs.length - 1 && !isLeaf) return '<span>' + title + '</span>';
      return '<a href="' + root + (p ? p + '/' : '') + 'index.html">' + title + '</a>';
    }).join('&gt; ');

    // Section nav: children of section, current page as plain text
    const children = getChildren(section);
    const sectionNav = document.createElement('nav');
    sectionNav.innerHTML = children.map(p => {
      const title = sitemap[p];
      const isSection = hasChildren(p);
      if (p === path) return '<span>' + title + '</span>';
      return '<a href="' + root + p + '/index.html"' + (isSection ? ' class="section"' : '') + '>' + title + '</a>';
    }).join('');

    // Header
    const header = document.createElement('header');
    header.appendChild(breadcrumbNav);
    header.appendChild(sectionNav);

    // Footer with Top link (hidden initially)
    const footer = document.createElement('footer');
    const topLink = document.createElement('a');
    topLink.href = '#';
    topLink.textContent = 'Top';
    topLink.style.display = 'none';
    footer.appendChild(topLink);

    // Show/hide Top link based on scroll
    function updateTopLink() {
      const hasScrollbar = document.body.scrollHeight > window.innerHeight;
      const atTop = window.scrollY < 50;
      topLink.style.display = (hasScrollbar && !atTop) ? '' : 'none';
    }
    window.addEventListener('scroll', updateTopLink);
    window.addEventListener('resize', updateTopLink);

    // Assemble
    document.body.innerHTML = '';
    document.body.appendChild(header);
    document.body.appendChild(main);
    document.body.appendChild(footer);

    updateTopLink();
  });
})();

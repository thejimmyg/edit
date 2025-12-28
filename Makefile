.PHONY: sitemap

sitemap: _script/sitemap.js

_script/sitemap.js: sitemap/index.html
	@echo "const sitemap = {" > $@
	@grep '<li>' sitemap/index.html | grep -oP 'href="\.\./\K[^"]+' | while read href; do \
		key=$$(echo "$$href" | sed 's|/\?index\.html$$||'); \
		title=$$(grep -oP 'href="\.\./'"$$href"'">\K[^<]+' sitemap/index.html | head -1); \
		echo "  '$$key': '$$title'," >> $@; \
	done
	@echo "};" >> $@
	@echo "Generated $@"

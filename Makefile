.PHONY: all sitemap index gallery

PICTURE_INDEX := $(HOME)/.cache/picture-index
SIZES := 300 600 1200 2400

all: sitemap index gallery

sitemap: _script/sitemap.js

_script/sitemap.js: sitemap/index.html
	@echo "const sitemap = {" > $@
	@grep '<li>' $< | grep -oP 'href="\.\./\K[^"]+' | while read href; do \
		key=$$(echo "$$href" | sed 's|/\?index\.html$$||'); \
		title=$$(grep -oP 'href="\.\./'"$$href"'">\K[^<]+' $< | head -1); \
		echo "  '$$key': '$$title'," >> $@; \
	done
	@echo "};" >> $@
	@echo "Generated $@"

# Build index of all images in ~/Pictures (hash -> path)
index:
	@mkdir -p $$(dirname $(PICTURE_INDEX))
	@touch $(PICTURE_INDEX)
	@echo "Indexing ~/Pictures..."
	@before=$$(wc -l < $(PICTURE_INDEX)); \
	find ~/Pictures -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.gif' -o -iname '*.webp' -o -iname '*.heic' -o -iname '*.heif' \) | while read f; do \
		if ! grep -qF "	$$f" $(PICTURE_INDEX); then \
			hash=$$(sha256sum "$$f" | cut -c1-12); \
			echo "$$hash	$$f" >> $(PICTURE_INDEX); \
			printf '.'; \
		fi; \
	done; \
	echo ""; \
	after=$$(wc -l < $(PICTURE_INDEX)); \
	echo "Indexed $$((after - before)) new images ($$after total)"

# Generate gallery thumbnails from indexed images
gallery:
	@mkdir -p _gallery
	@# Find all hash references in HTML files
	@grep -rhoP '_gallery/[a-f0-9]{12}\.jpg' --include='*.html' . | \
		sed 's|_gallery/||; s|\.jpg||' | sort -u | while read hash; do \
		src=$$(grep "^$$hash	" $(PICTURE_INDEX) | cut -f2); \
		if [ -n "$$src" ]; then \
			for size in $(SIZES); do \
				out="_gallery/$${hash}-$${size}.jpg"; \
				if [ ! -f "$$out" ]; then \
					echo "Generating $$out from $$src"; \
					convert "$$src" -resize $${size}x$${size}\> -quality 85 "$$out"; \
				fi; \
			done; \
			if [ ! -f "_gallery/$${hash}.jpg" ]; then \
				ln -s "$${hash}-1200.jpg" "_gallery/$${hash}.jpg"; \
			fi; \
		else \
			echo "Warning: No source found for hash $$hash"; \
		fi; \
	done
	@echo "Gallery complete"

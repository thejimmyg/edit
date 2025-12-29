.PHONY: all sitemap index gallery import serve

PICTURE_INDEX := $(HOME)/.cache/picture-index
SIZES := 400 800 1600 2400

all: sitemap index gallery

serve: sitemap
	ip addr | grep inet
	python3 -m http.server -b 0.0.0.0

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

import:
	rsync -aHxv /run/user/1000/gvfs/gphoto2\:host\=04cb_FUJIFILM_X-M5_5935373630312504142A5310122E5A/ /home/james/Pictures/

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
					convert "$$src" -auto-orient -resize $${size}x$${size}\> -sharpen 0x1 -strip -interlace Plane -quality 75 "$$out"; \
				fi; \
			done; \
			if [ ! -f "_gallery/$${hash}.jpg" ]; then \
				ln -s "$${hash}-800.jpg" "_gallery/$${hash}.jpg"; \
			fi; \
		else \
			echo "Warning: No source found for hash $$hash"; \
		fi; \
	done
	@echo "Gallery complete"

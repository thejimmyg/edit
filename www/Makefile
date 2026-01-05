.PHONY: all sitemap index gallery videos import serve unused clean-symlinks

PICTURE_INDEX := $(HOME)/.cache/picture-index
SIZES := 400 800 1600 2400
VIDEO_SIZES := 360 540

all: sitemap index gallery videos

serve: sitemap
	ip addr | grep inet
	python3 serve.py 0.0.0.0 8083

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

# Build index of all images and videos in ~/Pictures (hash -> path)
index:
	@mkdir -p $$(dirname $(PICTURE_INDEX))
	@touch $(PICTURE_INDEX)
	@echo "Indexing ~/Pictures..."
	@before=$$(wc -l < $(PICTURE_INDEX)); \
	find ~/Pictures -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.gif' -o -iname '*.webp' -o -iname '*.heic' -o -iname '*.heif' -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' -o -iname '*.webm' -o -iname '*.avi' \) | while read f; do \
		if ! grep -qF "	$$f" $(PICTURE_INDEX); then \
			hash=$$(sha256sum "$$f" | cut -c1-12); \
			echo "$$hash	$$f" >> $(PICTURE_INDEX); \
			printf '.'; \
		fi; \
	done; \
	echo ""; \
	after=$$(wc -l < $(PICTURE_INDEX)); \
	echo "Indexed $$((after - before)) new files ($$after total)"

# Generate gallery thumbnails from indexed images (relative to each HTML file)
gallery:
	@for html in $$(grep -rlP '_gallery/[a-f0-9]{12}\.jpg' --include='index.html' .); do \
		dir=$$(dirname "$$html"); \
		mkdir -p "$$dir/_gallery"; \
		grep -oP '_gallery/[a-f0-9]{12}\.jpg' "$$html" | \
			sed 's|_gallery/||; s|\.jpg||' | sort -u | while read hash; do \
			src=$$(grep "^$$hash	" $(PICTURE_INDEX) | cut -f2); \
			if [ -n "$$src" ]; then \
				for size in $(SIZES); do \
					out="$$dir/_gallery/$${hash}-$${size}.jpg"; \
					if [ ! -f "$$out" ]; then \
						echo "Generating $$out from $$src"; \
						convert "$$src" -auto-orient -resize $${size}x$${size}\> -sharpen 0x1 -strip -interlace Plane -quality 75 "$$out"; \
					fi; \
				done; \
				if [ ! -f "$$dir/_gallery/$${hash}.jpg" ]; then \
					ln -s "$${hash}-800.jpg" "$$dir/_gallery/$${hash}.jpg"; \
				fi; \
			else \
				echo "Warning: No source found for hash $$hash in $$html"; \
			fi; \
		done; \
	done
	@echo "Gallery complete"

# Generate video transcodes from indexed videos (relative to each HTML file)
videos:
	@for html in $$(grep -rlP '_gallery/[a-f0-9]{12}\.mp4' --include='index.html' .); do \
		dir=$$(dirname "$$html"); \
		mkdir -p "$$dir/_gallery"; \
		grep -oP '_gallery/[a-f0-9]{12}\.mp4' "$$html" | \
			sed 's|_gallery/||; s|\.mp4||' | sort -u | while read hash; do \
			src=$$(grep "^$$hash	" $(PICTURE_INDEX) | cut -f2); \
			if [ -n "$$src" ]; then \
				for size in $(VIDEO_SIZES); do \
					out="$$dir/_gallery/$${hash}-$${size}p.mp4"; \
					if [ ! -f "$$out" ]; then \
						echo "Transcoding $$out from $$src"; \
						ffmpeg -i "$$src" -vf "scale=-2:$$size" -c:v libx264 -profile:v main -level 4.0 -preset slow -crf 26 -c:a aac -b:a 96k -movflags +faststart -y "$$out"; \
					fi; \
				done; \
				poster="$$dir/_gallery/$${hash}-poster.jpg"; \
				if [ ! -f "$$poster" ]; then \
					echo "Extracting poster $$poster"; \
					ffmpeg -i "$$src" -frames:v 1 -q:v 2 -update 1 -y "$$poster"; \
				fi; \
				if [ ! -f "$$dir/_gallery/$${hash}.mp4" ]; then \
					ln -s "$${hash}-540p.mp4" "$$dir/_gallery/$${hash}.mp4"; \
				fi; \
			else \
				echo "Warning: No source found for hash $$hash in $$html"; \
			fi; \
		done; \
	done
	@echo "Videos complete"

# Delete unused files from _gallery directories
# Removes: files with unreferenced hashes, and obsolete size variants
unused:
	@for gallery in $$(find . -type d -name '_gallery'); do \
		html="$$(dirname "$$gallery")/index.html"; \
		if [ -f "$$html" ]; then \
			for file in "$$gallery"/*; do \
				[ -f "$$file" ] || continue; \
				base=$$(basename "$$file"); \
				hash=$$(echo "$$base" | grep -oP '^[a-f0-9]{12}' || true); \
				[ -n "$$hash" ] || continue; \
				if ! grep -q "$$hash" "$$html"; then \
					echo "Removing unused hash: $$file"; \
					rm -f "$$file"; \
				elif echo "$$base" | grep -qP '\-[0-9]+p\.mp4$$'; then \
					size=$$(echo "$$base" | grep -oP '[0-9]+(?=p\.mp4$$)'); \
					if ! echo " $(VIDEO_SIZES) " | grep -q " $$size "; then \
						echo "Removing obsolete video size: $$file"; \
						rm -f "$$file"; \
					fi; \
				elif echo "$$base" | grep -qP '\-[0-9]+\.jpg$$'; then \
					size=$$(echo "$$base" | grep -oP '[0-9]+(?=\.jpg$$)'); \
					if ! echo " $(SIZES) " | grep -q " $$size "; then \
						echo "Removing obsolete image size: $$file"; \
						rm -f "$$file"; \
					fi; \
				fi; \
			done; \
		fi; \
	done
	@echo "Unused cleanup complete"

# Delete symlinks in _gallery directories (so they can be recreated)
clean-symlinks:
	@find . -path '*/_gallery/*' -type l -print -delete
	@echo "Symlinks removed - run 'make gallery videos' to recreate"

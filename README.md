# Leonardo Borgioli — research portfolio

Recruiter-facing research portfolio covering video foundation models, multimodal scientific AI, surgical robotics, datasets, retrieval, and exploratory world models.

**Website:** https://borgioli.github.io/Portfolio/

The static site contains 18 self-hosted MP4 demonstrations, project summaries, a searchable video library, and a downloadable CV. Videos load only when selected. The site has no runtime dependencies, analytics, cookies, or external font requests.

## Preview locally

```sh
python3 -m http.server 8043
```

Open http://localhost:8043/.

## Edit

- `index.html`: profile, project descriptions, and links.
- `style.css`: responsive styles.
- `media.js`: video titles, descriptions, topics, and asset locations.
- `app.js`: library filtering and accessible video-dialog controls.
- `background.js`: image-coloured particles that morph with scroll position; WebGL with a Canvas fallback.
- `assets/fonts/`: self-hosted Montserrat (400/500/600), used throughout; SIL Open Font License included.
- `assets/`: videos, preview images, and CV.

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, then **gh-pages / (root)**. The main and gh-pages branches contain the same buildless static website.

After editing and checking the main branch, publish with:

```sh
git push origin main
git push origin main:gh-pages
```

## Media and content

The portfolio incorporates all three embedded videos from the supplied OmniRAS / T-JEPA slides and all three video clips plus six unique animated examples from the supplied surgical-research presentation. Six additional project videos cover the glove interface, automated dissection, retrieval visualizations, representation-transfer research, and an OmniRAS animation. Animated GIF examples are converted to browser-compatible looping MP4 files; the original materials are preserved separately.

Project context comes from the research presentations and Leonardo Borgioli’s 2026 CV. Research directions and exploratory visualizations are labeled accordingly. The portfolio does not claim clinical validation for these demonstrations.

The research and video content retain their respective authorship and rights. This repository does not grant a separate license to the underlying research media.

## Motion design

The continuous particle backdrop is inspired by [Motion’s photo-to-globe example](https://motion.dev/examples/js-three-tsl), implemented independently without runtime libraries. Scroll position morphs a laboratory-image point cloud through a globe, helix, and torus. Motion pauses while a video is open or the tab is hidden, respects reduced-motion preferences, and can be disabled using the footer control.

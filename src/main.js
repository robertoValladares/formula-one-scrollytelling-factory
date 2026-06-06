import Lenis from 'lenis';
import gsap from 'gsap/dist/gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

const storyChapters = [
  { progress: 0, kicker: 'Garage Exterior', headline: 'PRECISION.' },
  { progress: 0.18, kicker: 'Entering Garage', headline: 'ENTER THE WORKS.' },
  { progress: 0.38, kicker: 'Formula One Hero Shot', headline: 'ENGINEERED FOR SPEED.' },
  { progress: 0.58, kicker: 'Pit Lane Exit', headline: 'EVERY MILLISECOND MATTERS.' },
  { progress: 0.76, kicker: 'Pit Lane', headline: 'THE MOMENT BEFORE IMPACT.' },
  { progress: 0.92, kicker: 'Starting Grid', headline: 'HOLD THE LINE.' },
];

const detailSections = [
  {
    label: 'Section 01',
    title: 'The Machine',
    copy: 'Carbon, airflow, combustion and grip folded into one controlled object.',
  },
  {
    label: 'Section 02',
    title: 'Engineering',
    copy: 'Every surface exists to solve pressure, temperature and milliseconds.',
  },
  {
    label: 'Section 03',
    title: 'Performance',
    copy: 'Acceleration is treated as a design language, not a statistic.',
  },
  {
    label: 'Section 04',
    title: 'Track Technology',
    copy: 'Data becomes instinct before the lights go out.',
  },
];

document.querySelector('#app').innerHTML = `
  <header class="site-header" aria-label="Formula One scrollytelling header">
    <a class="brand" href="#top" aria-label="Go to start">F1 / FACTORY</a>
    <nav class="nav" aria-label="Sequence chapters">
      ${storyChapters.map((chapter, index) => `<a href="#chapter-${index + 1}">0${index + 1}</a>`).join('')}
    </nav>
  </header>

  <main id="top">
    <section class="sequence-shell" aria-label="Formula One cinematic scroll sequence">
      <canvas class="sequence-canvas" width="1920" height="1080"></canvas>
      <div class="vignette" aria-hidden="true"></div>
      <div class="progress-rail" aria-hidden="true"><span></span></div>
      <div class="sequence-copy">
        ${storyChapters
          .map(
            (chapter, index) => `
              <article class="chapter" id="chapter-${index + 1}" data-progress="${chapter.progress}">
                <p>${chapter.kicker}</p>
                <h1>${chapter.headline}</h1>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>

    <section class="after-sequence" aria-label="Formula One details">
      <div class="intro-line">
        <p>Beyond the reveal</p>
        <h2>Built where silence ends and telemetry begins.</h2>
      </div>
      <div class="detail-grid">
        ${detailSections
          .map(
            (section) => `
              <article class="detail-card">
                <span>${section.label}</span>
                <h3>${section.title}</h3>
                <p>${section.copy}</p>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>

    <section class="final-cta" aria-label="Final call to action">
      <p>Final Call To Action</p>
      <h2>Own the lap before it starts.</h2>
      <a href="#top">Replay Sequence</a>
    </section>
  </main>
`;

class CanvasSequence {
  constructor(canvas, manifestUrl) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.manifestUrl = manifestUrl;
    this.frames = [];
    this.images = new Map();
    this.currentIndex = -1;
    this.variant = null;
    this.manifest = null;
    this.ready = false;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async init() {
    const response = await fetch(this.manifestUrl);
    this.manifest = await response.json();
    this.variant = window.matchMedia('(max-width: 700px)').matches ? this.manifest.mobile : this.manifest.desktop;
    this.frames = this.variant.frames;
    await this.loadImage(0);
    this.resize();
    this.draw(0);
    this.preloadWindow(0);
    this.ready = true;
  }

  async loadImage(index) {
    const clampedIndex = Math.max(0, Math.min(this.frames.length - 1, index));
    if (this.images.has(clampedIndex)) return this.images.get(clampedIndex);

    const image = new Image();
    image.decoding = 'async';
    image.src = `${this.variant.basePath}${this.frames[clampedIndex]}`;
    const promise = image.decode().catch(() => {
      if (!image.complete) {
        return new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      }
      return null;
    });
    this.images.set(clampedIndex, image);
    await promise;
    return image;
  }

  preloadWindow(centerIndex) {
    const radius = this.prefersReducedMotion ? 1 : 16;
    for (let offset = 1; offset <= radius; offset += 1) {
      this.loadImage(centerIndex + offset);
      this.loadImage(centerIndex - offset);
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * dpr);
    const height = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = `${window.innerWidth}px`;
      this.canvas.style.height = `${window.innerHeight}px`;
      this.draw(this.currentIndex < 0 ? 0 : this.currentIndex);
    }
  }

  draw(index) {
    if (!this.frames.length) return;
    const frameIndex = Math.max(0, Math.min(this.frames.length - 1, Math.round(index)));
    const image = this.images.get(frameIndex);
    if (!image || !image.complete) {
      this.loadImage(frameIndex).then(() => this.draw(frameIndex));
      return;
    }

    this.currentIndex = frameIndex;
    const canvasRatio = this.canvas.width / this.canvas.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    let drawWidth = this.canvas.width;
    let drawHeight = this.canvas.height;
    let x = 0;
    let y = 0;

    if (imageRatio > canvasRatio) {
      drawWidth = this.canvas.height * imageRatio;
      x = (this.canvas.width - drawWidth) / 2;
    } else {
      drawHeight = this.canvas.width / imageRatio;
      y = (this.canvas.height - drawHeight) / 2;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(image, x, y, drawWidth, drawHeight);
    this.preloadWindow(frameIndex);
  }

  frameFromProgress(progress) {
    return progress * (this.frames.length - 1);
  }
}

async function boot() {
  const canvas = document.querySelector('.sequence-canvas');
  const sequence = new CanvasSequence(canvas, '/generated/f1-sequence/manifest.json');
  const progressFill = document.querySelector('.progress-rail span');

  try {
    await sequence.init();
    document.body.classList.add('is-ready');
  } catch (error) {
    document.body.classList.add('is-fallback');
    canvas.setAttribute('aria-label', 'Frame sequence failed to load.');
    console.error(error);
  }

  const lenis = new Lenis({
    duration: 1.35,
    smoothWheel: true,
    wheelMultiplier: 0.82,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  if (!sequence.prefersReducedMotion && sequence.ready) {
    ScrollTrigger.create({
      trigger: '.sequence-shell',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.25,
      onUpdate: (self) => {
        sequence.draw(sequence.frameFromProgress(self.progress));
        progressFill.style.transform = `scaleY(${self.progress})`;
      },
    });
  } else {
    progressFill.style.transform = 'scaleY(1)';
  }

  gsap.utils.toArray('.chapter').forEach((chapter) => {
    gsap.fromTo(
      chapter,
      { opacity: 0.15, y: 64 },
      {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: chapter,
          start: 'top 74%',
          end: 'bottom 42%',
          scrub: true,
        },
      },
    );
  });

  gsap.utils.toArray('.detail-card, .intro-line, .final-cta > *').forEach((element) => {
    gsap.from(element, {
      opacity: 0,
      y: 42,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 84%',
      },
    });
  });

  window.addEventListener('resize', () => {
    sequence.resize();
    ScrollTrigger.refresh();
  });
}

boot();

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('search engines', () => {
  it('the HTML asks not to be indexed', () => {
    expect(read('index.html')).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  });

  it('robots.txt blocks everything', () => {
    const robots = read('public/robots.txt');
    expect(robots).toMatch(/User-agent: \*/);
    expect(robots).toMatch(/Disallow: \/$/m);
  });

  it('the deploy configs send X-Robots-Tag', () => {
    expect(read('public/_headers')).toContain('X-Robots-Tag: noindex, nofollow');
    expect(read('netlify.toml')).toContain('X-Robots-Tag');
    expect(read('vercel.json')).toContain('X-Robots-Tag');
  });
});

describe('PWA', () => {
  const manifest = JSON.parse(read('public/manifest.json'));

  it('is installable: name, start_url, display and icons', () => {
    expect(manifest.name).toBe('Balneário 1º de Maio');
    expect(manifest.lang).toBe('pt-PT');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
  });

  it('ships the icon files the manifest points to', () => {
    for (const icon of manifest.icons) expect(() => readFileSync(new URL(`../../public${icon.src}`, import.meta.url))).not.toThrow();
  });

  it('ships the favicon, the header logo and the iOS touch icon', () => {
    expect(read('index.html')).toContain('href="/favicon.png"');
    expect(read('src/components/Layout.tsx')).toContain('src="/logo.png"');
    for (const file of ['public/favicon.png', 'public/logo.png', 'public/apple-touch-icon.png']) {
      expect(() => readFileSync(new URL(`../../${file}`, import.meta.url))).not.toThrow();
    }
  });
});

describe('WhatsApp link preview', () => {
  it('has Open Graph tags and a 1200×630 image', () => {
    const html = read('index.html');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('content="/og-image.png"');
    expect(html).toContain('content="1200"');
    expect(html).toContain('content="630"');
    expect(() => readFileSync(new URL('../../public/og-image.png', import.meta.url))).not.toThrow();
  });
});

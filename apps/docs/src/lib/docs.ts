import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCS_ROOT = join(process.cwd(), '..', '..', 'docs');

export interface DocEntry {
  slug: string;
  title: string;
  filename: string;
}

function parseTitle(content: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(content);
  return match?.[1]?.trim() ?? fallback;
}

export function getDocumentationIndex(): DocEntry[] {
  if (!existsSync(DOCS_ROOT)) {
    return [];
  }

  const files = readdirSync(DOCS_ROOT)
    .filter((file) => file.endsWith('.md'))
    .sort();

  return files.map((filename) => {
    const content = readFileSync(join(DOCS_ROOT, filename), 'utf8');
    const slug = filename.replace(/\.md$/, '');
    return {
      slug,
      filename,
      title: parseTitle(content, slug),
    };
  });
}

export function getDocumentationBySlug(slug: string): { title: string; content: string } | null {
  const filename = `${slug}.md`;
  const filePath = join(DOCS_ROOT, filename);

  try {
    const content = readFileSync(filePath, 'utf8');
    return {
      title: parseTitle(content, slug),
      content,
    };
  } catch {
    return null;
  }
}

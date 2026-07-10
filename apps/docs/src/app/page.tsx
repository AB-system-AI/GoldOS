import '@goldos/ui/globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';

import { getDocumentationIndex } from '@/lib/docs';

export const metadata: Metadata = {
  title: 'GoldOS Documentation',
  description: 'Enterprise architecture and product documentation for GoldOS.',
};

export default function DocsHomePage() {
  const documents = getDocumentationIndex();

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10 space-y-3">
          <p className="text-gold text-sm font-medium uppercase tracking-widest">GoldOS</p>
          <h1 className="text-navy text-4xl font-bold">Documentation</h1>
          <p className="text-muted-foreground max-w-2xl">
            Enterprise architecture, product specifications, and engineering guides for the GoldOS
            platform.
          </p>
        </header>
        <ul className="grid gap-3">
          {documents.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/docs/${doc.slug}`}
                className="bg-card hover:border-gold hover:bg-accent block rounded-lg border p-4 transition-colors"
              >
                <span className="text-foreground font-medium">{doc.title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">{doc.filename}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

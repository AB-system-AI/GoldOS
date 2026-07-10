import '@goldos/ui/globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDocumentationBySlug } from '@/lib/docs';

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocumentationBySlug(slug);

  if (!doc) {
    return { title: 'Not Found' };
  }

  return {
    title: doc.title,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocumentationBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="text-gold mb-8 inline-block text-sm hover:underline">
          Back to documentation index
        </Link>
        <article className="prose prose-slate max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {doc.content}
        </article>
      </div>
    </main>
  );
}

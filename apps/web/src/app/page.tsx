import { Button } from '@goldos/ui/components/ui/button';

export default function HomePage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div className="space-y-4">
          <p className="text-gold text-sm font-medium uppercase tracking-widest">GoldOS</p>
          <h1 className="text-navy text-4xl font-bold tracking-tight md:text-5xl">
            The Operating System for Jewelry Business
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Enterprise cloud ERP, POS, inventory, and CRM platform purpose-built for jewelry and
            gold retailers across the Middle East.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">
            View Documentation
          </Button>
        </div>
      </div>
    </main>
  );
}

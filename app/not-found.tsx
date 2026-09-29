import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-gold">✦</p>
        <h1 className="mt-2 text-3xl">This path isn&apos;t written in the stars</h1>
        <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/upload"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-accent px-5 text-sm font-medium text-white"
        >
          Back to Astro Palm
        </Link>
      </div>
    </main>
  );
}

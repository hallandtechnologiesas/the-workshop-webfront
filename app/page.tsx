import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const marqueeItems = Array.from({ length: 6 }, () => "THE WORKSHOP");
  const marqueeTrack = [...marqueeItems, ...marqueeItems];

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <h1 className="text-center font-black uppercase tracking-tighter py-4">
        The Workshop
      </h1>
      <section className="flex flex-1 items-start justify-center">
        <div className="mx-auto w-full max-w-2xl px-6 pb-16 pt-48 text-center">
          <div className="flex flex-col items-center gap-6">
            <Image
              src="/logo.png"
              alt="The Workshop logo"
              width={240}
              height={240}
              className="h-28 w-auto sm:h-36"
              priority
            />
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                On-demand 3D printing in Cairo.
              </h1>
              <p className="text-base text-slate-600">
                Upload your design files, choose materials that match your
                project, and get your prints delivered right to your doorstep.
              </p>
            </div>
            <Link
              href="/order"
              className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Start an order
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto w-full">
        <div className="relative overflow-hidden">
          <div className="animate-marquee space-x-2 flex whitespace-nowrap py-6 text-4xl font-black tracking-tighter sm:text-5xl">
            {marqueeTrack.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

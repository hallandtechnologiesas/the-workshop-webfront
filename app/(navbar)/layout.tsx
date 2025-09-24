import Link from "next/link";

export default function NavbarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <nav className="bg-gray-100">
        <div className="flex items-center justify-between mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="uppercase tracking-tighter font-black">
            The Workshop
          </Link>

          <div className="space-x-4 text-sm">
            <Link href="/order" className="hover:text-gray-400">
              Start an order
            </Link>
            <a href="#" className="hover:text-gray-400">
              About us
            </a>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}

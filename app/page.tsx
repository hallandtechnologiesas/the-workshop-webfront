import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>The Workshop</h1>
      <p>On-demand 3D printing, locally in Cairo</p>
      <Link href="/order">Order Now</Link>
    </main>
  );
}

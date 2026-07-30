import Link from "next/link";

export default function ImportsHubPage() {
  return (
    <section>
      <h2>Imports</h2>
      <ul>
        <li>
          <Link href="/settings/imports/assignments">Assignment Excel import (.xlsx)</Link>
        </li>
      </ul>
    </section>
  );
}

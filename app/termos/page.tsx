import Link from "next/link";
import { MarkdownLite } from "@/components/legal/MarkdownLite";
import { loadPolicyMarkdownFile } from "@/lib/legal/load-policy-markdown";
import { policyMarkdownFilename } from "@/lib/legal/policy-files";
import { getLegalVersions } from "@/lib/legal/versions";

export default async function TermosPage() {
  const versions = await getLegalVersions();
  const filename = policyMarkdownFilename("terms", versions.terms);
  const md = await loadPolicyMarkdownFile(filename);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm underline-offset-2 hover:underline" style={{ color: "var(--color-text-muted)" }}>
        ← Início
      </Link>
      <article className="mt-6">
        <MarkdownLite source={md} />
      </article>
    </div>
  );
}

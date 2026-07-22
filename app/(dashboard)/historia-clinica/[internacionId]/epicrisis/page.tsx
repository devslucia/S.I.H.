"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EpicrisisForm } from "@/components/historia-clinica/EpicrisisForm";

export default function EpicrisisPage() {
  const params = useParams();
  const router = useRouter();
  const internacionId = params.internacionId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-text transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-display font-semibold text-text">Epicrisis</h2>
      </div>

      <EpicrisisForm internacionId={internacionId} />
    </div>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AnamnesisForm } from "@/components/historia-clinica/AnamnesisForm";

export default function AnamnesisPage() {
  const params = useParams();
  const router = useRouter();
  const internacionId = params.internacionId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-text transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-display font-semibold text-text">Anamnesis</h2>
      </div>

      <AnamnesisForm internacionId={internacionId} />
    </div>
  );
}

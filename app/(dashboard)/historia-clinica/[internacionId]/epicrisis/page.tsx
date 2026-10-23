"use client";

import { useParams } from "next/navigation";
import { EpicrisisForm } from "@/components/historia-clinica/EpicrisisForm";
import { HcSubpageHeader } from "@/components/historia-clinica/HcSubpageHeader";

export default function EpicrisisPage() {
  const params = useParams();
  const internacionId = params.internacionId as string;

  return (
    <div className="space-y-6">
      <HcSubpageHeader
        internacionId={internacionId}
        title="Epicrisis"
        description="Resumen de la internación. Al firmarla se registra el alta médica."
      />

      <EpicrisisForm internacionId={internacionId} />
    </div>
  );
}

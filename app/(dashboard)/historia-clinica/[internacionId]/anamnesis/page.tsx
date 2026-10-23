"use client";

import { useParams } from "next/navigation";
import { AnamnesisForm } from "@/components/historia-clinica/AnamnesisForm";
import { HcSubpageHeader } from "@/components/historia-clinica/HcSubpageHeader";

export default function AnamnesisPage() {
  const params = useParams();
  const internacionId = params.internacionId as string;

  return (
    <div className="space-y-6">
      <HcSubpageHeader internacionId={internacionId} title="Anamnesis" />

      <AnamnesisForm internacionId={internacionId} />
    </div>
  );
}

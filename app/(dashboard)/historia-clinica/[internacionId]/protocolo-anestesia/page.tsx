"use client";

import { useParams } from "next/navigation";
import { ProtocoloAnestesiaComponent } from "@/components/historia-clinica/ProtocoloAnestesia";

export default function ProtocoloAnestesiaPage() {
  const params = useParams();
  return <ProtocoloAnestesiaComponent internacionId={params.internacionId as string} />;
}

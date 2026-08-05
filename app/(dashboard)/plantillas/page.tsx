"use client";

import { useSession } from "next-auth/react";
import { PlantillasManager } from "@/components/quirofano/PlantillasManager";

const PLANTILLA_ROLES = ["MEDICO", "ANESTESIOLOGO", "ADMIN"];

export default function PlantillasPage() {
  const { data: session, status } = useSession();
  const rol = (session?.user?.rol ?? "") as string;
  const autorizado = PLANTILLA_ROLES.includes(rol);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-text">Mis Plantillas de Protocolo Quirúrgico</h2>
        <p className="text-sm text-muted mt-1">Gestioná tus plantillas: creá, importá, editá o eliminá protocolos para reutilizarlos.</p>
      </div>

      {status === "loading" ? (
        <p className="text-muted text-sm">Cargando...</p>
      ) : autorizado ? (
        <PlantillasManager />
      ) : (
        <p className="text-muted text-sm">No tenés permisos para acceder a esta sección.</p>
      )}
    </div>
  );
}
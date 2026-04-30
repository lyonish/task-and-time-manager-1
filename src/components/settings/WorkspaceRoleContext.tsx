"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type WorkspaceRole = "Admin" | "Member" | "Guest" | null;

interface WorkspaceRoleCtx {
  role: WorkspaceRole;
  isOwner: boolean;
  canEdit: boolean; // Admin or Owner
  loading: boolean;
}

const Ctx = createContext<WorkspaceRoleCtx>({ role: null, isOwner: false, canEdit: false, loading: true });

export function useWorkspaceRole() {
  return useContext(Ctx);
}

export function WorkspaceRoleProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<WorkspaceRole>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/my-role`)
      .then((r) => r.json())
      .then((data) => {
        setRole(data.role);
        setIsOwner(data.isOwner ?? false);
        // Guests get no access to settings
        if (data.role === "Guest" || data.role === null) {
          router.replace(`/workspace/${workspaceId}`);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, router]);

  const canEdit = isOwner || role === "Admin";

  return (
    <Ctx.Provider value={{ role, isOwner, canEdit, loading }}>
      {children}
    </Ctx.Provider>
  );
}

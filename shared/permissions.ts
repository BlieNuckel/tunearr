export enum Permission {
  NONE = 0,
  ADMIN = 1,
  MANAGE_USERS = 2,
  MANAGE_REQUESTS = 4,
  REQUEST = 8,
  AUTO_APPROVE = 16,
  REQUEST_VIEW = 32,
  IMPORT = 64,
}

type HasPermissionOptions = {
  mode?: "and" | "or";
};

export function hasPermission(
  userPermissions: number,
  required: Permission | Permission[],
  options?: HasPermissionOptions
): boolean {
  if ((userPermissions & Permission.ADMIN) !== 0) return true;

  if (Array.isArray(required)) {
    const mode = options?.mode ?? "or";
    return mode === "and"
      ? required.every((p) => (userPermissions & p) !== 0)
      : required.some((p) => (userPermissions & p) !== 0);
  }

  return (userPermissions & required) !== 0;
}

export const ADMIN_PERMISSIONS = Permission.ADMIN;
export const DEFAULT_USER_PERMISSIONS = Permission.REQUEST;

export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.NONE]: "None",
  [Permission.ADMIN]: "Admin",
  [Permission.MANAGE_USERS]: "Manage Users",
  [Permission.MANAGE_REQUESTS]: "Manage Requests",
  [Permission.REQUEST]: "Request",
  [Permission.AUTO_APPROVE]: "Auto Approve",
  [Permission.REQUEST_VIEW]: "View Requests",
  [Permission.IMPORT]: "Import",
};

type ActivePermission = {
  permission: Permission;
  label: string;
};

const DISPLAYABLE_PERMISSIONS = [
  Permission.ADMIN,
  Permission.MANAGE_USERS,
  Permission.MANAGE_REQUESTS,
  Permission.REQUEST,
  Permission.AUTO_APPROVE,
  Permission.REQUEST_VIEW,
  Permission.IMPORT,
] as const;

export function getActivePermissions(
  userPermissions: number
): ActivePermission[] {
  return DISPLAYABLE_PERMISSIONS.filter((p) => (userPermissions & p) !== 0).map(
    (p) => ({ permission: p, label: PERMISSION_LABELS[p] })
  );
}

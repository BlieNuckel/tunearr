import { Permission } from "@shared/permissions";

export type CreateFormState = {
  username: string;
  password: string;
  permissions: number;
};

export const ASSIGNABLE_PERMISSIONS = [
  Permission.ADMIN,
  Permission.MANAGE_USERS,
  Permission.MANAGE_REQUESTS,
  Permission.REQUEST,
  Permission.AUTO_APPROVE,
  Permission.REQUEST_VIEW,
] as const;

export const INITIAL_FORM: CreateFormState = {
  username: "",
  password: "",
  permissions: Permission.REQUEST,
};

export function togglePermissionBit(current: number, perm: Permission): number {
  return (current & perm) !== 0 ? current & ~perm : current | perm;
}

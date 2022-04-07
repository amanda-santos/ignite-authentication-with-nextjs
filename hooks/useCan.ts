import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

type UseCanParams = {
  permissions?: string[];
  roles?: string[];
};

export const useCan = ({ permissions, roles }: UseCanParams) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return false;
  }

  if (permissions?.length > 0) {
    const hasAllPermissions = permissions.every((permission) =>
      user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return false;
    }
  }

  if (roles?.length > 0) {
    const hasAllRoles = roles.every((role) => user.roles.includes(role));

    if (!hasAllRoles) {
      return false;
    }
  }

  return true;
};
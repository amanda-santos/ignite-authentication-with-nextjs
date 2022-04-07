type User = {
  permissions: string[];
  roles: string[];
};

type ValidateUserPermissionsParams = {
  user: User;
  permissions: string[];
  roles: string[];
};

export const validateUserPermissions = ({
  permissions,
  roles,
  user,
}: ValidateUserPermissionsParams) => {
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

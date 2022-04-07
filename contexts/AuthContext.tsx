import Router from "next/router";
import { destroyCookie, parseCookies, setCookie } from "nookies";
import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/apiClient";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

let authChannel: BroadcastChannel;

export function signOut() {
  destroyCookie(undefined, "ignite-next-auth.token");
  destroyCookie(undefined, "ignite-next-auth.refreshToken");

  authChannel.postMessage("signOut");

  Router.push("/");
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User>(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    authChannel = new BroadcastChannel("auth");

    authChannel.onmessage = (message) => {
      switch (message.data) {
        case "signOut":
          signOut();
          authChannel.close();
          break;
        case "signIn":
          window.location.reload();
          break;
        default:
          break;
      }
    };
  }, []);

  useEffect(() => {
    const { "ignite-next-auth.token": token } = parseCookies();

    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data;
          setUser({ email, permissions, roles });
        })
        .catch(() => {
          signOut();
        });
    }
  }, []);

  const signIn = async ({ email, password }: SignInCredentials) => {
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, "ignite-next-auth.token", token, {
        // max time for the cookie
        maxAge: 60 * 60 * 24 * 30, // 30 days
        // which paths have access to the cookie
        path: "/",
      });

      setCookie(undefined, "ignite-next-auth.refreshToken", refreshToken, {
        // max time for the cookie
        maxAge: 60 * 60 * 24 * 30, // 30 days
        // which paths have access to the cookie
        path: "/",
      });

      setUser({
        email,
        permissions,
        roles,
      });

      api.defaults.headers["Authorization"] = `Bearer ${token}`;

      Router.push("/dashboard");

      authChannel.postMessage("signIn");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <AuthContext.Provider value={{ signIn, signOut, user, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

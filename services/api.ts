import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";
import { AuthTokenError } from "./errors/AuthTokenError";

let isRefreshingToken = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["ignite-next-auth.token"]}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === "token.expired") {
          cookies = parseCookies(ctx);

          const { "ignite-next-auth.refreshToken": refreshToken } = cookies;
          const originalConfig = error.config;

          if (!isRefreshingToken) {
            isRefreshingToken = true;

            api
              .post("/refresh", {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, "ignite-next-auth.token", token, {
                  // max time for the cookie
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  // which paths have access to the cookie
                  path: "/",
                });

                setCookie(
                  ctx,
                  "ignite-next-auth.refreshToken",
                  response.data.refreshToken,
                  {
                    // max time for the cookie
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    // which paths have access to the cookie
                    path: "/",
                  }
                );

                api.defaults.headers["Authorization"] = `Bearer ${token}`;

                failedRequestsQueue.forEach((request) =>
                  request.onSuccess(token)
                );
                failedRequestsQueue = [];
              })
              .catch((error) => {
                failedRequestsQueue.forEach((request) =>
                  request.onFailure(error)
                );
                failedRequestsQueue = [];

                // if is running on browser
                if (typeof window !== "undefined") {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshingToken = false;
              });
          }

          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers["Authorization"] = `Bearer ${token}`;

                resolve(api(originalConfig));
              },
              onFailure: (error: AxiosError) => {
                reject(error);
              },
            });
          });
        } else {
          // if is running on browser
          if (typeof window !== "undefined") {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError());
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
}

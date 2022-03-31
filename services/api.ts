import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";

// runs only once

let cookies = parseCookies();
let isRefreshingToken = false;
let failedRequestsQueue = [];

export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["ignite-next-auth.token"]}`,
  },
});

// runs on every request

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === "token.expired") {
        cookies = parseCookies();

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

              setCookie(undefined, "ignite-next-auth.token", token, {
                // max time for the cookie
                maxAge: 60 * 60 * 24 * 30, // 30 days
                // which paths have access to the cookie
                path: "/",
              });

              setCookie(
                undefined,
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
        signOut();
      }
    }

    return Promise.reject(error);
  }
);

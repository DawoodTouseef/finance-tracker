import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";

export interface UserInfo {
  id: string;
  email: string | null;
  imageUrl: string;
}

// Gets the current authenticated user's information.
export const getUserInfo = api<void, UserInfo>(
  {auth: true, expose: true, method: "GET", path: "/user/me"},
  async () => {
    const auth = getAuthData()!; // guaranteed to be non-null since `auth: true` is set.
    return {
      id: auth.userID,
      email: auth.email,
      imageUrl: auth.imageUrl
    };
  }
);

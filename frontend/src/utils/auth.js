import { jwtDecode } from "jwt-decode";

export const isTokenExpired = () => {

  const token =
    localStorage.getItem("token");

  if (!token) {
    return true;
  }

  try {

    const decoded =
      jwtDecode(token);

    const currentTime =
      Date.now() / 1000;

    return (
      decoded.exp < currentTime
    );

  } catch (error) {

    return true;
  }
};

export const logout = () => {

  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  window.location.href =
    "/login";
};
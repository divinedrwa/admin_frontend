import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Unauthenticated GET/POST (no Authorization header). */
export const publicApi = axios.create({ baseURL });

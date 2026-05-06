import axios from "axios";

import { getResolvedApiBaseUrl } from "./apiBaseUrl";

const baseURL = getResolvedApiBaseUrl();

/** Unauthenticated GET/POST (no Authorization header). */
export const publicApi = axios.create({ baseURL });

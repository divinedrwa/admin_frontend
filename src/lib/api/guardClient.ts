import { api } from "../api";
import type { components } from "./generated/openapi";

export type GuardVisitorCheckInBody =
  components["schemas"]["GuardVisitorCheckInRequest"];

export type GuardVisitorCheckInResponse =
  components["schemas"]["GuardVisitorMutationResponse"];

export type GuardVisitorCheckOutBody =
  components["schemas"]["GuardVisitorCheckOutRequest"];

export type GuardVisitorCheckOutResponse =
  components["schemas"]["GuardVisitorMutationResponse"];

/** Typed guard visitor check-in (B4). */
export async function guardCheckInVisitor(body: GuardVisitorCheckInBody) {
  const { data } = await api.post<GuardVisitorCheckInResponse>(
    "/guards/visitor-checkin",
    body,
  );
  return data;
}

/** Typed guard visitor check-out (B4). */
export async function guardCheckOutVisitor(body: GuardVisitorCheckOutBody) {
  const { data } = await api.post<GuardVisitorCheckOutResponse>(
    "/guards/visitor-checkout",
    body,
  );
  return data;
}

/** Typed guard today's visitors list (B4). */
export async function guardFetchMyVisitors(params?: { status?: string }) {
  const { data } = await api.get("/guards/my-visitors", { params });
  return data;
}

/** Typed guard dashboard (B4). */
export async function guardFetchDashboard() {
  const { data } = await api.get("/guards/my-dashboard");
  return data;
}

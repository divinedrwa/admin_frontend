/**
 * Centralized branding constants.
 *
 * Change the values here to rebrand the entire admin frontend in one place.
 * Every UI string, alt-text, and metadata reference imports from this file.
 */

export const APP_NAME = "GatePass+";
export const APP_TAGLINE = "Society Management Platform";

/** <title> shown in the browser tab. */
export const ADMIN_PAGE_TITLE = `${APP_NAME} Admin`;

/** <meta name="description"> for SEO / social previews. */
export const ADMIN_PAGE_DESCRIPTION = `${APP_NAME} admin dashboard for housing societies`;

/** Auth-page hero overline next to the logo. */
export const AUTH_OVERLINE = `${APP_NAME} Access`;

/** Copyright line in auth footer. */
export const COPYRIGHT = `\u00A9 ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;

/** Toast shown after a successful admin login. */
export const LOGIN_SUCCESS_TOAST = `Login successful! Welcome to ${APP_NAME}`;

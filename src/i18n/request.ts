import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveLocale } from "./config";

export default getRequestConfig(async () => ({ locale: resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value), timeZone: "Europe/Moscow", messages: {} }));

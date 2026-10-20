"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { Locale } from "@/i18n/config";
import { defaultConfiguration, type AppConfiguration } from "./config-schema";
import { configuredDate, configuredTimestamp, workspaceToday } from "./formatting";
const publicDefaults=defaultConfiguration("Evo ERP");
const ConfigurationContext=createContext<{ settings: AppConfiguration; updateSettings: (settings: AppConfiguration) => void } | null>(null);
/** Hydrate one server-loaded tenant configuration across every authenticated module. */
export function ConfigurationProvider({ initial, children }: { initial: AppConfiguration; children: React.ReactNode }) {
 const [settings,setSettings]=useState(initial);useEffect(()=>{setSettings(initial);},[initial]);
 const value=useMemo(()=>({settings,updateSettings:setSettings}),[settings]);
 return <ConfigurationContext.Provider value={value}>{children}</ConfigurationContext.Provider>;
}
/** Read live workspace preferences; public pages outside the authenticated tree use documented presentation defaults. */
export function useConfiguration() { return useContext(ConfigurationContext) ?? { settings: publicDefaults, updateSettings: (_settings: AppConfiguration) => {} }; }
/** Bind shared date renderers to the same tenant preferences and locale as the surrounding interface. */
export function useAppFormat() {
 const {settings}=useConfiguration(),{locale}=useI18n();
 return useMemo(()=>({
  timezone:settings.timezone,
  dateLabel:(value:string, language:Locale=locale)=>configuredDate(value,language,settings),
  formatDateOnly:(value:string, language:Locale=locale)=>configuredDate(value,language,settings),
  formatDate:(value:string|Date|number)=>configuredDate(value,locale,settings),
  formatDateTime:(value:string|Date|number)=>configuredTimestamp(value,locale,settings),
  today:()=>workspaceToday(settings.timezone),
 }),[locale,settings]);
}

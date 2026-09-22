"use client";

import { SidebarVertical } from "./sidebar-vertical";

/**
 * Shell comercial oficial.
 * O layout visual das telas públicas/comerciais usa sidebar vertical fixa.
 * A antiga dock horizontal fica preservada no código para eventual modo alternativo,
 * mas não é usada no shell principal.
 */
export function Sidebar() {
  return <SidebarVertical />;
}

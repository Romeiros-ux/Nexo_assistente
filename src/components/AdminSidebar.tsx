import { FileText, MessageSquare, Users } from "lucide-react";
import { useLocation } from "react-router-dom";

import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Consultas", url: "/", icon: MessageSquare },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon" className={cn(collapsed ? "w-14" : "w-60")}> 
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className={cn("hover:bg-muted/50", collapsed && "justify-center")}
                      activeClassName={"bg-muted text-foreground font-medium"}
                    >
                      <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                      {!collapsed ? <span>{item.title}</span> : null}
                      {collapsed ? <span className="sr-only">{item.title}</span> : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

import React, { useState } from "react";
import { ToastHost } from "./components/ui";
import { StoreProvider, useStore } from "./lib/store";
import Login from "./screens/Login";
import Shell from "./screens/Shell";
import Dashboard from "./screens/Dashboard";
import { CategoriesScreen, PostEditor, PostsList } from "./screens/Posts";
import { CommentsScreen, MediaScreen, MenusScreen, PagesScreen, ThemeEditorScreen, UpdatesScreen, UsersScreen } from "./screens/Lists";
import { PluginsScreen, ThemesScreen } from "./screens/Extend";
import Settings from "./screens/Settings";
import SitePreview from "./screens/Site";
import HealthScreen from "./screens/Health";
import Installer from "./screens/Installer";
import Perf from "./screens/Perf";
import Deploy from "./screens/Deploy";

function Screen() {
  const { route, nav, siteOpen } = useStore();

  let screen: React.ReactNode;
  switch (true) {
    case route === "posts": screen = <PostsList />; break;
    case route === "post-new": screen = <PostEditor key="new" />; break;
    case route.startsWith("post-edit:"): screen = <PostEditor key={route} postId={route.split(":")[1]} />; break;
    case route === "categories": screen = <CategoriesScreen />; break;
    case route === "pages" || route === "page-new": screen = <PagesScreen />; break;
    case route === "media" || route === "media-upload": screen = <MediaScreen />; break;
    case route === "comments": screen = <CommentsScreen />; break;
    case route === "themes": screen = <ThemesScreen />; break;
    case route === "menus": screen = <MenusScreen />; break;
    case route === "theme-editor": screen = <ThemeEditorScreen />; break;
    case route === "plugins": screen = <PluginsScreen />; break;
    case route === "plugins-new": screen = <PluginsScreen key="cat" initialTab="catalog" />; break;
    case route === "users": screen = <UsersScreen />; break;
    case route === "user-new": screen = <UsersScreen autoAdd />; break;
    case route === "updates": screen = <UpdatesScreen />; break;
    case route === "health": screen = <HealthScreen />; break;
    case route === "deploy": screen = <Deploy key="deploy" />; break;
    case route.startsWith("perf"): {
      const tab = route.split(":")[1] ?? "speed";
      const valid = ["speed", "images", "sitemap", "seo", "api"].includes(tab) ? tab : "speed";
      screen = <Perf key={valid} tab={valid} onTab={t => nav(`perf:${t}`)} />;
      break;
    }
    case route.startsWith("settings"): {
      const tab = route.split(":")[1] ?? "general";
      const valid = ["general", "discussion", "cache", "security", "backups", "login"].includes(tab) ? tab : "general";
      screen = <Settings key={valid} tab={valid} onTab={t => nav(`settings:${t}`)} />;
      break;
    }
    default: screen = <Dashboard />;
  }

  return (
    <>
      <Shell route={route} onNav={nav}>{screen}</Shell>
      {siteOpen && <SitePreview />}
    </>
  );
}

function Root() {
  const { authed } = useStore();
  const [installed, setInstalled] = useState(() => localStorage.getItem("wordtime_installed_v1") === "1");
  if (!installed) {
    return (
      <>
        <Installer onDone={() => { localStorage.setItem("wordtime_installed_v1", "1"); setInstalled(true); }} />
        <ToastHost />
      </>
    );
  }
  return (
    <>
      {authed ? <Screen /> : <Login />}
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}

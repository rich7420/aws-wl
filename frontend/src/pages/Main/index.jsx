import React from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import NewWorkspaceModal, { useNewWorkspaceModal } from "@/components/Modals/NewWorkspace";
import DefaultChatContainer from "@/components/DefaultChat";
import { isMobile } from "react-device-detect";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import { userFromStorage } from "@/utils/request";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  const user = userFromStorage();
  const { showing, showModal, hideModal } = useNewWorkspaceModal();

  React.useEffect(() => {
    if (user?.role !== "admin") {
      showModal(); // 一進來就開啟 modal
    }
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      <div className="flex-1" />
      {showing && <NewWorkspaceModal hideModal={hideModal} />}
    </div>
  );

}

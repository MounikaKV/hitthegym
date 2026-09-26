import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

function AppLayout() {
  return (
    <div className="app-shell">
      <main className="content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;

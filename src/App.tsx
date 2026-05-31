import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useRepoStore } from "./stores/repoStore";
import RepoList from "./components/RepoList";
import RepoView from "./components/RepoView";
import ToastContainer from "./components/ToastContainer";
import "./utils/init";

function App() {
  const openRepoPaths = useRepoStore((s) => s.openRepoPaths);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) return;
        const store = useRepoStore.getState();
        if (!store.path) return;
        store.loadStatus();
        store.loadCommits(0, 500);
        store.loadBranches();
      });
    })();
    return () => { unlisten?.(); };
  }, []);

  return (
    <div className="h-screen overflow-hidden rounded-b-lg bg-gb-bg will-change-transform">
      {openRepoPaths.length > 0 ? <RepoView /> : <RepoList />}
      <ToastContainer />
    </div>
  );
}

export default App;

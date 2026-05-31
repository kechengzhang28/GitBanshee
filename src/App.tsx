import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useRepoStore } from "./stores/repoStore";
import * as ipc from "./utils/ipc";
import RepoList from "./components/RepoList";
import RepoView from "./components/RepoView";
import ToastContainer from "./components/ToastContainer";
import "./utils/init";

function App() {
  const openRepoPaths = useRepoStore((s) => s.openRepoPaths);
  const path = useRepoStore((s) => s.path);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Start / stop file-system watcher when the active repo changes
  useEffect(() => {
    if (path) {
      ipc.watchRepo(path).catch(() => {});
      return () => { ipc.unwatchRepo(path).catch(() => {}); };
    }
  }, [path]);

  // Listen for git-change events emitted from the Rust watcher
  useEffect(() => {
    const promise = listen<string>("git-change", (event) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const store = useRepoStore.getState();
        if (store.path && store.path === event.payload) {
          store.watcherRefresh();
        }
      }, 300);
    });
    return () => {
      promise.then((fn) => fn());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Keep focus-based refresh as fallback (watcher may miss some events)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) return;
        const store = useRepoStore.getState();
        if (!store.path) return;
        store.focusRefresh();
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

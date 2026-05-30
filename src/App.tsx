import { useRepoStore } from "./stores/repoStore";
import RepoList from "./components/RepoList";
import RepoView from "./components/RepoView";
import ToastContainer from "./components/ToastContainer";
import "./utils/init";

function App() {
  const openRepoPaths = useRepoStore((s) => s.openRepoPaths);

  return (
    <div className="h-screen overflow-hidden rounded-b-lg bg-gb-bg will-change-transform">
      {openRepoPaths.length > 0 ? <RepoView /> : <RepoList />}
      <ToastContainer />
    </div>
  );
}

export default App;

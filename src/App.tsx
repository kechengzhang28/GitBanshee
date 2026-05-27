import { useRepoStore } from "./stores/repoStore";
import TitleBar from "./components/TitleBar";
import RepoList from "./components/RepoList";
import RepoView from "./components/RepoView";
import "./utils/init";

function App() {
  const path = useRepoStore((s) => s.path);

  return (
    <div className="flex h-screen flex-col bg-gb-bg">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        {path ? <RepoView /> : <RepoList />}
      </div>
    </div>
  );
}

export default App;

import { useRepoStore } from "./stores/repoStore";
import RepoList from "./components/RepoList";
import RepoView from "./components/RepoView";
import "./utils/init";

function App() {
  const path = useRepoStore((s) => s.path);

  return (
    <div className="h-screen bg-gb-bg">
      {path ? <RepoView /> : <RepoList />}
    </div>
  );
}

export default App;

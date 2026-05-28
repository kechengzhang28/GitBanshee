import { open } from "@tauri-apps/plugin-dialog";
import { useRepoStore } from "../stores/repoStore";
import Button from "./ui/Button";

export default function RepoList() {
  const openRepo = useRepoStore((s) => s.openRepo);

  const handleOpen = async () => {
    const dir = await open({ directory: true, multiple: false, title: "Select a Git repository" });
    if (dir && typeof dir === "string") {
      await openRepo(dir);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gb-bg">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-gb-accent">GitBanshee</h1>
        <p className="text-gb-text-sec">Open a Git repository to visualize its commit history</p>
        <Button variant="primary" size="md" onClick={handleOpen}>
          Open Repository
        </Button>
      </div>
    </div>
  );
}

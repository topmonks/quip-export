import { QuipState, getCurrentUser, readFolder } from "./quip";
const quipState = new QuipState();

if (await quipState.isFile()) {
  console.log("found state file, loading it...");
  await quipState.load();
} else {
  const currentUser = await getCurrentUser(quipState);
  quipState.setInitialFolders(currentUser.group_folder_ids);
}

while (quipState.foldersToRead.length) {
  const folderToRead = quipState.foldersToRead.pop();
  if (!folderToRead) {
    continue;
  }

  const { folderId, parent } = folderToRead;
  const folder = await readFolder(folderId, quipState);

  console.log("processing", folder.folder.title);
  folder.tree = [];

  parent.tree.push(folder);

  for (const child of folder.children) {
    if (child.folder_id) {
      quipState.foldersToRead.push({
        folderId: child.folder_id,
        parent: folder,
      });
    }
  }
}

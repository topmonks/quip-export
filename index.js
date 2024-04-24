import { NotionAdapter } from "./adapter/notion";
import { FileSystemAdapter } from "./adapter/file-system";
import {
  QuipState,
  getCurrentUser,
  readQuipFolder,
  getThreadAsHTML,
  getThread,
} from "./quip";
import { QuipAWSS3ImageUpload } from "./extension/aws-s3-image";

const quipExtensions = [new QuipAWSS3ImageUpload()];
const quipState = new QuipState(undefined, quipExtensions);
const adapters = [new NotionAdapter(), new FileSystemAdapter()];

if (await quipState.existTempFile()) {
  console.log("found state file, loading it...");
  await quipState.loadFromTempFile();
} else {
  const currentUser = await getCurrentUser(quipState);
  quipState.setInitialFolders(currentUser.group_folder_ids);
}

while (quipState.folderIdsToRead.length) {
  const folderToRead = quipState.folderIdsToRead.slice(-1)[0];
  if (!folderToRead) {
    break;
  }

  const { folderId, parentFolderId } = folderToRead;
  const folder = await readQuipFolder(folderId, quipState);
  quipState.allFolders.push(folder);

  console.log("processing folder:", folder.folder.title);

  const parent = quipState.findFolderById(parentFolderId);

  for (const child of folder.children) {
    if (child.folder_id) {
      quipState.folderIdsToRead.push({
        folderId: child.folder_id,
        parentFolderId: folder.folder.id,
      });
    } else if (child.thread_id) {
      quipState.files.push({
        fileId: child.thread_id,
        parentFolderId: folder.folder.id,
      });
    }
  }

  for (const adapter of adapters) {
    try {
      await adapter.onFolder({
        folder,
        parent,
      });
    } catch (e) {
      console.error("adapter unhandled onFolder error", e);
    }
  }

  quipState.folderIdsToRead.pop();

  while (quipState.files.length) {
    const file = quipState.files.slice(-1)[0];
    if (!file) {
      break;
    }
    let html = await getThreadAsHTML(file.fileId, quipState);
    html = await quipState.applyExtensions(html);
    const thread = await getThread(file.fileId, quipState);

    console.log("processing file:", thread.title);
    try {
      const parent = quipState.findFolderById(file.parentFolderId);

      for (const adapter of adapters) {
        await adapter.onFile({
          thread,
          html,
          parent,
        });
      }
    } catch (e) {
      console.error("adapter unhandled onFile error", e);
    }

    quipState.files.pop();
  }
}

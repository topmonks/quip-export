import { NotionAdapter } from "./adapter/notion";
import { FileSystemAdapter } from "./adapter/file-system";
import {
  QuipExport,
  getCurrentUser,
  readQuipFolder,
  getThreadAsHTML,
  getThread,
} from "./quip";
import { QuipAWSS3ImageUpload } from "./extension/aws-s3-image";

const extensions = [new QuipAWSS3ImageUpload()];
const adapters = [new NotionAdapter(), new FileSystemAdapter()];
const quipExport = new QuipExport(undefined, extensions, adapters);

if (await quipExport.existTempFile()) {
  console.log("found state file, loading it...");
  await quipExport.loadFromTempFile();
} else {
  const currentUser = await getCurrentUser(quipExport);
  quipExport.setInitialFolders(currentUser.group_folder_ids);
}

while (quipExport.folderIdsToRead.length) {
  const folderToRead = quipExport.folderIdsToRead.slice(-1)[0];
  if (!folderToRead) {
    break;
  }

  const { folderId, parentFolderId } = folderToRead;
  const folder = await readQuipFolder(folderId, quipExport);
  quipExport.allFolders.push(folder);

  console.log("processing folder:", folder.folder.title);

  const parent = quipExport.findFolderById(parentFolderId);

  for (const child of folder.children) {
    if (child.folder_id) {
      quipExport.folderIdsToRead.push({
        folderId: child.folder_id,
        parentFolderId: folder.folder.id,
      });
    } else if (child.thread_id) {
      quipExport.files.push({
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

  quipExport.folderIdsToRead.pop();

  while (quipExport.files.length) {
    const file = quipExport.files.slice(-1)[0];
    if (!file) {
      break;
    }
    let html = await getThreadAsHTML(file.fileId, quipExport);
    html = await quipExport.applyExtensions(html);
    const thread = await getThread(file.fileId, quipExport);

    console.log("processing file:", thread.title);
    try {
      const parent = quipExport.findFolderById(file.parentFolderId);

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

    quipExport.files.pop();
  }
}

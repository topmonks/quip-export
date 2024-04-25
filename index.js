import { NotionAdapter } from "./adapter/notion.js";
import { FileSystemAdapter } from "./adapter/file-system.js";
import { QuipExport } from "./quip.js";
import { QuipAWSS3ImageUpload } from "./extension/aws-s3-image.js";

const extensions = [new QuipAWSS3ImageUpload()];
const adapters = [new FileSystemAdapter()];
const quipExport = new QuipExport(undefined, extensions, adapters);

// await quipExport.initFolders();
// await quipExport.processFolders();

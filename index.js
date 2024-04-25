import { NotionAdapter } from "./adapter/notion";
import { FileSystemAdapter } from "./adapter/file-system";
import { QuipExport } from "./quip";
import { QuipAWSS3ImageUpload } from "./extension/aws-s3-image";

const extensions = [new QuipAWSS3ImageUpload()];
const adapters = [new NotionAdapter(), new FileSystemAdapter()];
const quipExport = new QuipExport(undefined, extensions, adapters);

await quipExport.initFolders();
await quipExport.processFolders();

#!/usr/bin/env node
import { Command } from "commander";
import { NotionAdapter } from "./adapter/notion.js";
import { FileSystemAdapter } from "./adapter/file-system.js";
import { QuipExport } from "./quip.js";
import { QuipAWSS3ImageUpload } from "./extension/aws-s3-image.js";
const program = new Command();

program
  .version("1.0.0")
  .requiredOption(
    "-q, --quip-api-token <quip-api-token>",
    "quip api token received from https://[your-organization].quip.com/dev/token",
  )
  .option(
    "-n, --notion-token [notion-token]",
    "notion api token received from https://www.notion.so/my-integrations",
  )
  .option(
    "-root, --notion-root-document [notion-root-document]",
    "id of the root page in Notion where you want to import the documents",
  )
  .option("-a, --adapters [adapters...]", "specify adapters (fs, notion)", [
    "fs",
    "notion",
  ])
  .option("-s3", "upload images from quip to s3 and link them", false)
  .option("--aws-access-key [aws-access-key]", "aws access key to access s3")
  .option(
    "--aws-secret-access-key [aws-secret-access-key]",
    "aws secret access key to access s3",
  )
  .option("--aws-region [aws-region]", "aws region used for the s3")
  .option("--aws-bucket [aws-bucket]", "s3 bucket name")
  .action(async (options) => {
    if (options.S3) {
      if (!options.awsAccessKey) {
        program.error("missing --aws-access-key option");
      }
      if (!options.awsSecretAccessKey) {
        program.error("missing --aws-secret-access-key option");
      }
      if (!options.awsRegion) {
        program.error("missing --aws-region option");
      }
      if (!options.awsBucket) {
        program.error("missing --aws-bucket option");
      }
    }

    if (options.adapters.includes("notion")) {
      if (!options.notionToken) {
        program.error("missing --notion-token option");
      }
      if (!options.notionRootDocument) {
        program.error("missing --notion-root-document option");
      }
    }

    process.env.QUIP_TOKEN = options.quipApiToken;
    process.env.NOTION_API_KEY = options.notionToken;
    process.env.NOTION_ROOT_PAGE = options.notionRootDocument;

    process.env.AWS_ACCESS_KEY_ID = options.awsAccessKey;
    process.env.AWS_SECRET_ACCESS_KEY = options.awsSecretAccessKey;
    process.env.AWS_REGION = options.awsRegion;
    process.env.AWS_BUCKET = options.awsBucket;

    const extensions = [];
    if (options.S3) {
      extensions.push(new QuipAWSS3ImageUpload());
    }

    const adapters = [...new Set(options.adapters)].map((adapter) => {
      if (adapter === "fs") {
        return new FileSystemAdapter();
      } else if (adapter === "notion") {
        return new NotionAdapter();
      } else {
        program.error("unknown adapter " + adapter);
      }
    });

    const quipExport = new QuipExport(undefined, extensions, adapters);

    await quipExport.initFolders();
    await quipExport.processFolders();
    await quipExport.processFiles();
  });

await program.parseAsync(process.argv);

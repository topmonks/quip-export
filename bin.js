#!/usr/bin/env node
import { Command } from "commander";
import { NotionAdapter } from "./adapter/notion.js";
import { FileSystemAdapter } from "./adapter/file-system.js";
import { QuipExport } from "./quip.js";
const program = new Command();

program
  .version("1.0.0")
  .requiredOption(
    "-q, --quip-api-token <quip-api-token>",
    "quip api token received from https://[your-organization].quip.com/dev/token",
  )
  .requiredOption(
    "-n, --notion-token <notion-token>",
    "notion api token received from https://www.notion.so/my-integrations",
  )
  .requiredOption(
    "-r, --notion-root-document <notion-root-document>",
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
        program.error("missing --aws-access-key attribute");
      }
      if (!options.awsSecretAccessKey) {
        program.error("missing --aws-secret-access-key attribute");
      }
      if (!options.awsRegion) {
        program.error("missing --aws-region attribute");
      }
      if (!options.awsBucket) {
        program.error("missing --aws-bucket attribute");
      }
    }

    process.env.QUIP_TOKEN = options.quipApiToken;
    process.env.NOTION_API_KEY = options.notionToken;
    process.env.NOTION_ROOT_PAGE = options.notionRootDocument;

    process.env.AWS_ACCESS_KEY_ID = options.awsAccessKey;
    process.env.AWS_SECRET_ACCESS_KEY = options.awsSecretAccessKey;
    process.env.AWS_REGION = options.awsRegion;
    process.env.AWS_BUCKET = options.awsBucket;

    console.log(options);

    const extensions = [];
    const adapters = [new NotionAdapter(), new FileSystemAdapter()];
    const quipExport = new QuipExport(undefined, extensions, adapters);

    await quipExport.initFolders();
    await quipExport.processFolders();
  });

await program.parseAsync(process.argv);

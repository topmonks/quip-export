# Quip to Notion Export Tool

## Description
This tool simplifies the process of exporting documents from Quip to both the local filesystem and Notion. Whether you're migrating your documents or need to maintain backups, this tool provides a straightforward solution.

## Features
- **Export to Local Filesystem**: Save Quip documents directly to your local machine.
- **Export to Notion**: Seamlessly transfer Quip documents to your Notion workspace.
- **Optional Image Upload to AWS S3**: Effortlessly include images from Quip documents by uploading them to AWS S3.
- **Rate Limit Handling**: Intelligent handling of Quip rate limits by saving temporary export state to file, enabling easy resume later.
- **Preserve Formatting**: Retain document formatting and structure during the export process.
- **Command-line Interface**: Easy-to-use CLI for smooth execution.

## Usage
`npx @topmonks/quip-notion`

Example run with all options

`npx @topmonks/quip-notion -q "QUIP_TOKEN" -n "NOTION_API_KEY" -root "NOTION_ROOT_PAGE" -s3 --aws-access-key "AWS_ACCESS_KEY_ID" --aws-secret-access-key "AWS_SECRET_ACCESS_KEY" --aws-region "AWS_REGION" --aws-bucket "AWS_BUCKET" -a fs notion
`


```
Usage: quip-notion [options]

Options:
  -V, --version                                         output the version number
  -q, --quip-api-token <quip-api-token>                 quip api token received from https://[your-organization].quip.com/dev/token
  -n, --notion-token [notion-token]                     notion api token received from https://www.notion.so/my-integrations
  -root, --notion-root-document [notion-root-document]  id of the root page in Notion where you want to import the documents
  -a, --adapters [adapters...]                          specify adapters (fs, notion) (default: ["fs","notion"])
  -s3                                                   upload images from quip to s3 and link them (default: false)
  --aws-access-key [aws-access-key]                     aws access key to access s3
  --aws-secret-access-key [aws-secret-access-key]       aws secret access key to access s3
  --aws-region [aws-region]                             aws region used for the s3
  --aws-bucket [aws-bucket]                             s3 bucket name
  -h, --help                                            display help for command
  ```
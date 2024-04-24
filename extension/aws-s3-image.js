import { PassThrough, Readable } from "stream";
import { blob } from "stream/consumers";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { getBlob } from "../quip";

export class QuipAWSS3ImageUpload {
  srcRegex = /^\/blob\/(\w+)\/(\w+)$/g;

  /**
   *
   *
   * @param {import("hast-util-to-mdast/lib").Nodes} root
   * @memberof QuipAWSS3ImageUpload
   */
  check(root) {
    return root.tagName === "img" && root.properties?.src?.match(this.srcRegex);
  }

  /**
   *
   *
   * @param {import("hast-util-to-mdast/lib").Nodes} root
   * @memberof QuipAWSS3ImageUpload
   */
  async mutate(root, quipState) {
    const [, threadId, blobId] = [
      ...root.properties.src.matchAll(this.srcRegex),
    ][0];

    const name = root.properties.alt || "image.png";
    const type = mime.lookup(name);
    const key = threadId + "-" + blobId + "." + mime.extension(type);

    console.log(root.properties, name, type, key);

    const notionImageStream = await getBlob(threadId, blobId, quipState).then(
      (r) => Readable.fromWeb(r.body),
    );

    const s3UploadResult = await this.upload(notionImageStream, key, type);

    root.properties.src = s3UploadResult.Location;
  }

  /**
   *
   * @param {ReadableStream} readStream
   * @param {string} key
   * @param {string} contentType
   * @returns
   */
  async upload(readStream, key, contentType) {
    const passThrough = new PassThrough();
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        Body: passThrough,
        ContentType: contentType,
      },
      tags: [],
    });

    readStream.pipe(passThrough);

    return await upload.done();
  }
}

const s3Client = new S3Client({});

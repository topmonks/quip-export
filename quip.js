import { open, readFile, writeFile } from "fs/promises";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

export class QuipExport {
  saveTempFileOnAPILimit = true;
  saveTempFileOnProcessExit = true;
  tempFileName = "quip-notion-state.json";
  root = { tree: [], folder: { id: "_ROOT_" } };
  /**
   *
   *
   * @memberof QuipState
   * @type {Folder[]}
   */
  allFolders = [this.root];

  /**
   *
   *
   * @memberof QuipState
   * @type {{folderId: string, parentFolderId: string}[]}
   */
  folderIdsToRead = [];

  /**
   *
   *
   * @memberof QuipState
   * @type {{fileId: string, parentFolderId: string}[]}
   */
  files = [];

  extensions;
  /**
   *
   * @memberof QuipExport
   * @type {import("./adapter/base").BaseAdapter[]}
   */
  adapters;

  /**
   *
   * @param {string[]} initialFolders
   */
  constructor(initialFolders = [], extensions = [], adapters = []) {
    if (!process.env.QUIP_TOKEN) {
      throw new Error("env variable QUIP_TOKEN not set");
    }

    this.setInitialFolders(initialFolders);
    this.extensions = extensions;
    this.adapters = adapters;

    if (this.saveTempFileOnProcessExit) {
      // "kill"
      process.on("SIGTERM", () => {
        this.saveToTempFile().finally(() => {
          process.exit(0);
        });
      });

      // ctrl-c
      process.on("SIGINT", () => {
        this.saveToTempFile()
          .catch((e) => console.error(e))
          .finally(() => {
            process.exit(0);
          });
      });

      // errors
      process.on("uncaughtException", (e) => {
        console.error(e);
        this.saveToTempFile().finally(() => {
          process.exit(1);
        });
      });
    }
  }

  async applyExtensions(html) {
    const root = fromHtml(html, { fragment: true });

    await this.applyExtensionNode(root, this);

    return toHtml(root);
  }

  async applyExtensionNode(root, quipState) {
    for (const extension of this.extensions) {
      if (extension.check(root, quipState)) {
        await extension.mutate(root, quipState);
      }

      if (root.children?.length) {
        for (const child of root.children) {
          await this.applyExtensionNode(child, quipState);
        }
      }
    }
  }

  /**
   *
   * @param {string[]} initialFolders
   */
  setInitialFolders(initialFolders = []) {
    this.folderIdsToRead = [
      ...initialFolders.map((f) => ({
        folderId: f,
        parentFolderId: this.root.folder.id,
      })),
    ];
  }

  /**
   *
   * @param {string} folderId
   * @returns {import("./typedefs").QuipFolder}
   */
  findFolderById(folderId) {
    return this.allFolders.find((f) => f.folder.id === folderId);
  }

  async existTempFile() {
    return await open(this.tempFileName)
      .then((fd) => {
        fd.close();

        return true;
      })
      .catch(() => false);
  }

  async saveToTempFile() {
    const adapterData = [];
    for (const adapter of this.adapters) {
      adapterData.push({
        id: adapter.id,
        data: await adapter.saveToTempFile(),
      });
    }

    const data = {
      date: new Date(),
      foldersToRead: this.folderIdsToRead,
      files: this.files,
      allFolders: this.allFolders,
      adapterData: adapterData,
    };

    await writeFile(this.tempFileName, JSON.stringify(data));
  }

  async loadFromTempFile() {
    const f = await readFile(this.tempFileName);

    const data = JSON.parse(f.toString());

    for (const adapterData of data.adapterData) {
      const adapter = this.adapters.find((e) => e.id === adapterData.id);

      if (!adapter) {
        continue;
      }

      await adapter.loadFromTempFile(adapterData.data);
    }

    this.folderIdsToRead = data.foldersToRead;
    this.files = data.files;
    this.allFolders = data.allFolders;
  }

  userRateLimit = Number.MAX_SAFE_INTEGER;
  companyRateLimit = Number.MAX_SAFE_INTEGER;

  /**
   *
   *
   * @param {string | URL | Request} url
   * @param {RequestInit} init
   */
  async apiRequest(url, init) {
    if (this.userRateLimit <= 0) {
      console.log("user rate limit hit");
      if (this.saveTempFileOnAPILimit) {
        await this.saveToTempFile();
      }
      throw new Error("user rate limit hit");
    }

    if (this.companyRateLimit <= 0) {
      console.log("company rate limit hit");
      if (this.saveTempFileOnAPILimit) {
        await this.saveToTempFile();
      }
      throw new Error("company rate limit hit");
    }

    const resp = await fetch(url, init);
    // console.log(resp.headers);

    const userRateLimitHeader = resp.headers.get("x-ratelimit-remaining");
    const companyRateLimitHeader = resp.headers.get(
      "x-company-ratelimit-remaining",
    );

    if (userRateLimitHeader) {
      this.userRateLimit = parseInt(userRateLimitHeader);
    }

    if (companyRateLimitHeader) {
      this.companyRateLimit = parseInt(companyRateLimitHeader);
    }

    return resp;
  }
}

/**
 *
 *
 * @param {string} folderId
 * @param {QuipExport} quipState
 * @return {import("./typedefs").QuipFolder}
 */
export async function readQuipFolder(folderId, quipState) {
  return await quipState
    .apiRequest("https://platform.quip.com/1/folders/" + folderId, {
      headers: {
        Authorization: "Bearer " + process.env.QUIP_TOKEN,
      },
    })
    .then((r) => r.json());
}

/**
 *
 *
 * @param {QuipExport} quipState
 */
export async function getCurrentUser(quipState) {
  return await quipState
    .apiRequest("https://platform.quip.com/1/users/current", {
      headers: {
        Authorization: "Bearer " + process.env.QUIP_TOKEN,
      },
    })
    .then((r) => r.json());
}

/**
 *
 * @param {string} fileId
 * @param {QuipExport} quipState
 * @param {import("./typedefs").QuipThreadHTML | undefined} previousPart
 */
export async function getThreadAsHTML(fileId, quipState, previousPart) {
  /** @type {import("./typedefs").QuipThreadHTML} */
  const resp = await quipState
    .apiRequest(
      `https://platform.quip.com/2/threads/${fileId}/html` +
        (previousPart
          ? `?cursor=${previousPart.response_metadata.next_cursor}`
          : ""),
      {
        headers: {
          Authorization: "Bearer " + process.env.QUIP_TOKEN,
        },
      },
    )
    .then((r) => r.json());

  let html = (previousPart ? previousPart.html : "") + resp.html;

  if (resp.response_metadata.next_cursor) {
    return getThreadAsHTML(fileId, quipState, resp);
  } else {
    return html;
  }
}

/**
 *
 * @param {string} threadId
 * @param {QuipExport} quipState
 */
export async function getThread(threadId, quipState) {
  return await quipState
    .apiRequest(`https://platform.quip.com/2/threads/${threadId}`, {
      headers: {
        Authorization: "Bearer " + process.env.QUIP_TOKEN,
      },
    })
    .then((r) => r.json())
    .then(({ thread }) => thread);
}

/**
 *
 * @param {string} threadId
 * @param {string} blobId
 * @param {QuipExport} quipState
 */
export async function getBlob(threadId, blobId, quipState) {
  return await quipState.apiRequest(
    `https://platform.quip.com/1/blob/${threadId}/${blobId}`,
    {
      headers: {
        Authorization: "Bearer " + process.env.QUIP_TOKEN,
      },
    },
  );
}

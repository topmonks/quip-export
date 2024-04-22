import { open, readFile, writeFile } from "fs/promises";

export class QuipState {
  fileName = "quip-notion-state.json";
  root = { tree: [] };
  /**
   *
   *
   * @memberof QuipState
   * @type {{folderId: string, parent: Folder}[]}
   */
  foldersToRead = [];

  /**
   *
   * @param {string[]} initialFolders
   */
  constructor(initialFolders = []) {
    this.setInitialFolders(initialFolders);
  }

  async isFile() {
    await open(this.fileName).catch(() => false);
  }

  setInitialFolders(initialFolders = []) {
    this.foldersToRead = [
      ...initialFolders.map((f) => ({
        folderId: f,
        parent: this.root,
      })),
    ];
  }

  async save() {
    const data = {
      date: new Date(),
      foldersToRead: this.foldersToRead,
    };

    await writeFile(this.fileName, JSON.stringify(data));
  }

  async load() {
    const f = await readFile(this.fileName);

    const data = JSON.parse(f.toString());

    this.foldersToRead = data.foldersToRead;
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
      await this.save();
      throw new Error("user rate limit hit");
    }

    if (this.companyRateLimit <= 0) {
      console.log("company rate limit hit");
      await this.save();
      throw new Error("company rate limit hit");
    }

    const resp = await fetch(url, init);
    console.log(resp.headers);

    const userRateLimitHeader = resp.headers.get("x-ratelimit-remaining");
    const companyRateLimitHeader = resp.headers.get(
      "x-company-ratelimit-remaining",
    );

    if (!userRateLimitHeader) {
      throw new Error("missing x-ratelimit-remaining header in response");
    }

    if (!companyRateLimitHeader) {
      throw new Error(
        "missing x-company-ratelimit-remaining header in response",
      );
    }

    this.userRateLimit = parseInt(userRateLimitHeader);
    this.companyRateLimit = parseInt(companyRateLimitHeader);

    return resp;
  }
}

/**
 *
 *
 * @param {string} folderId
 * @param {QuipState} quipState
 * @return {import("./typedefs").QuipFolder}
 */
export async function readFolder(folderId, quipState) {
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
 * @param {QuipState} quipState
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

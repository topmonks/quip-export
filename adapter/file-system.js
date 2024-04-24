import { mkdirSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";

export class FileSystemAdapter {
  root = "export";
  paths = {};
  constructor() {
    try {
      mkdirSync(this.root);
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw e;
      }
    }
  }

  /**
   *
   * @param {{
   *    folder: import("../typedefs").QuipFolder,
   *    parent: import("../typedefs").QuipFolder
   * }} param0
   */
  async onFolder({ folder, parent }) {
    this.paths[folder.folder.id] =
      (this.paths[parent.folder.id] || "") +
      folder.folder.title.replace(/\//g, "_") +
      "/";

    try {
      await mkdir(resolve(this.root, this.paths[folder.folder.id]));
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw e;
      }
    }
  }

  /**
   *
   * @param {{
   *    html: string,
   *    parent: import("../typedefs").QuipFolder
   * }} param0
   */
  async onFile({ thread, html, parent }) {
    const name =
      resolve(
        this.root,
        this.paths[parent.folder.id],
        thread.title.replace(/\//g, "_"),
      ) + ".html";

    await writeFile(name, html);
  }
}

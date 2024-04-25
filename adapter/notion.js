import { Client } from "@notionhq/client";
import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmTableToMarkdown } from "mdast-util-gfm-table";
import { markdownToBlocks } from "@tryfabric/martian";
import chunk from "lodash.chunk";
import { BaseAdapter } from "./base.js";

export class NotionAdapter extends BaseAdapter {
  /**
   *
   * @type {Client}
   * @memberof NotionAdapter
   */
  client;
  root;

  id = "notion";

  constructor() {
    super();
    if (!process.env.NOTION_ROOT_PAGE) {
      throw new Error("missing root notion page id attr");
    }
    this.root = process.env.NOTION_ROOT_PAGE;

    if (!process.env.NOTION_API_KEY) {
      throw new Error("env variable NOTION_API_KEY not set");
    }

    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
  }
  /**
   *
   * @param {{
   *    folder: import("../typedefs").QuipFolder,
   *    parent: import("../typedefs").QuipFolder
   * }} param0
   */
  async onFolder({ folder, parent }) {
    const resp = await this.notion.pages.create({
      parent: {
        type: "page_id",
        page_id: this.paths[parent.folder.id] || this.root,
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: folder.folder.title,
              },
            },
          ],
        },
      },
      children: [],
    });

    this.paths[folder.folder.id] = resp.id;
  }

  notAllowed = ["delete"];
  /**
   *
   * @param {import("hast-util-to-mdast/lib/state").Nodes} root
   */
  removeUnknownTypes(root) {
    if (!root.children?.length) {
      return;
    }
    root.children = root.children.filter(
      (a) => !this.notAllowed.includes(a.type),
    );

    for (const child of root.children) {
      this.removeUnknownTypes(child);
    }

    return root;
  }

  /**
   *
   * @param {string} html
   * @returns
   */
  htmlToNotionBlocks(html) {
    const hast = fromHtml(html, { fragment: true });
    const mdast = this.removeUnknownTypes(toMdast(hast));

    const markdown = toMarkdown(mdast, {
      extensions: [gfmTableToMarkdown()],
    });
    return markdownToBlocks(markdown);
  }

  maxBlockPerPage = 100;
  /**
   *
   * @param {{
   *    html: string,
   *    parent: import("../typedefs").QuipFolder
   * }} param0
   */
  async onFile({ thread, html, parent }) {
    const blocks = this.htmlToNotionBlocks(html);

    if (blocks.length > this.maxBlockPerPage) {
      const blockChunks = chunk(blocks, this.maxBlockPerPage);

      const parentPage = await this.notion.pages.create({
        parent: {
          type: "page_id",
          page_id: this.paths[parent.folder.id] || this.root,
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: thread.title,
                },
              },
            ],
          },
        },
        children: [],
      });

      for (const [ix, blockChunk] of blockChunks.entries()) {
        await this.notion.pages.create({
          parent: {
            type: "page_id",
            page_id: parentPage.id,
          },
          properties: {
            title: {
              title: [
                {
                  text: {
                    content:
                      thread.title + ` (part ${ix + 1}/${blockChunks.length})`,
                  },
                },
              ],
            },
          },
          children: blockChunk,
        });
      }
    } else {
      await this.notion.pages.create({
        parent: {
          type: "page_id",
          page_id: this.paths[parent.folder.id] || this.root,
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: thread.title,
                },
              },
            ],
          },
        },
        children: blocks,
      });
    }
  }
}

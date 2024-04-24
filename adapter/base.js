export class BaseAdapter {
  paths = {};

  async saveToTempFile() {
    return { paths: this.paths };
  }

  async loadFromTempFile(data) {
    if (data.paths) {
      this.paths = data.paths;
    }
  }
}

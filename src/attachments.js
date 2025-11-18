async function fileExists(directoryHandle, filename) {
  try {
    await directoryHandle.getFileHandle(filename);
    return true;
  } catch (error) {
    if (error.code === DOMException.NOT_FOUND_ERR) {
      return false;
    } else {
      throw error;
    }
  }
}

class CardAttachments {
  constructor(cardId, handle) {
    this.cardId = cardId;
    this.handle = handle;
  }

  static async open(cardId) {
    const root = await navigator.storage.getDirectory();
    const cards = await root.getDirectoryHandle('cards', { create: true, });
    const handle = await cards.getDirectoryHandle(cardId, { create: true, });
    return new CardAttachments(cardId, handle);
  }

  static async remove(cardId) {
    const root = await navigator.storage.getDirectory();
    const cards = await root.getDirectoryHandle('cards', { create: true, });
    await cards.removeEntry(cardId, { recursive: true });
  }

  async clear() {
    const root = await navigator.storage.getDirectory();
    const cards = await root.getDirectoryHandle('cards', { create: true, });

    // remove directory then create it again
    await cards.removeEntry(this.cardId, { recursive: true });
    const handle = await cards.getDirectoryHandle(this.cardId, { create: true, });

    this.handle = handle;
  }

  async list() {
    let list = [];
    for await (let handle of this.handle.values()) {
      let file_handle = await handle.getFile();
      let attachment = new CardAttachment(file_handle);
      list.push(attachment);
    }
    return list;
  }

  async add(file) {
    // extracts the filename in [1], a possible number in [2], and the extension in [2]
    let regex = /^(.*?)(?:\.(\d+))?\.([^.]*)$/;
    // extracts the filename in [1] and a possible number at the end in [2]
    let no_ext_regex = /^(.*?)(\d+)?$/;
    let filename = file.name;
    // find a good filename by potentiallly appending a number to it, before the extension
    while (true) {
      // only return the handle if the file is new
      if (!(await fileExists(this.handle, filename))) {
        let handle = await this.handle.getFileHandle(filename, { create: true });

        let handle_writable = await handle.createWritable();
        await handle_writable.write(file);
        await handle_writable.close();

        let handle_file = await handle.getFile();
        return new CardAttachment(handle_file);
      }

      // add 1 to the number if it exists, or initialize it to 1
      let result = regex.exec(filename);
      if (result) {
        let number_str = (parseInt(result[2]) || 0) + 1 + '';
        filename = `${result[1]}.${number_str}.${result[3]}`;
      } else {
        let result_2 = no_ext_regex.exec(filename);
        let number_str = (parseInt(result_2[2]) || 0) + 1 + '';
        filename = `${result_2[1]}${number_str}`;
      }
    }
  }

  async remove(filename) {
    await this.handle.removeEntry(filename);
  }
}

class CardAttachment {
  constructor(file) {
    this.file = file;
    this.url = null;
  }

  getUrl() {
    if (this.url) {
      return this.url;
    } else {
      let url = URL.createObjectURL(this.file);
      this.url = url;
      return url;
    }
  }

  revokeUrl() {
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }

  fileName() {
    return this.file.name;
  }

  mimeType() {
    return this.file.type;
  }
}

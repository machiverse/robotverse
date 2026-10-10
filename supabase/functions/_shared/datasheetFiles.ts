type StorageFailure = { message: string; statusCode?: string | number };
type FileBucket = {
  download(path: string): Promise<{ data: Blob | null; error: StorageFailure | null }>;
  upload(path: string, body: Blob, options: { upsert: boolean; contentType: string; cacheControl: string }): Promise<{ error: StorageFailure | null }>;
};

/** Confine every write to a new datasheet namespace in the existing bucket. */
export class DatasheetFiles {
  static readonly prefix = "directory/datasheets/verified-v2/";
  constructor(private bucket: FileBucket) {}

  private check(path: string) {
    if (!path.startsWith(DatasheetFiles.prefix) || path.includes("..")) throw new Error("Invalid datasheet storage path");
  }

  async read<T>(path: string): Promise<T | null> {
    this.check(path);
    const { data, error } = await this.bucket.download(path);
    if (error) {
      const code = String(error.statusCode ?? "");
      if (code === "404" || code === "400" && /not found/i.test(error.message)) return null;
      throw new Error(`Datasheet storage unavailable: ${error.message}`);
    }
    if (!data) throw new Error("Empty datasheet storage response");
    return JSON.parse(await data.text()) as T;
  }

  async write(path: string, value: unknown, upsert = true) {
    this.check(path);
    const { error } = await this.bucket.upload(path, new Blob([JSON.stringify(value)], { type: "application/json" }),
      { upsert, contentType: "application/json", cacheControl: "60" });
    if (error) throw new Error(`Could not save datasheet file: ${error.message}`);
  }
}

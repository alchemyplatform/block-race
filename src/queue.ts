// Cutey
export default class Queue<T> {
  private items: T[] = [];
  private offset = 0;

  public get size(): number {
    return this.items.length - this.offset;
  }

  public enqueue(item: T): void {
    this.items.push(item);
  }

  public dequeue(): T {
    if (this.size === 0) {
      throw new Error("Cannot dequeue from an empty queue.");
    }
    const item = this.items[this.offset];
    this.items[this.offset] = undefined!;
    this.offset++;
    if (this.items.length <= 2 * this.offset) {
      this.items = this.items.slice(this.offset);
      this.offset = 0;
    }
    return item;
  }

  public clear(): void {
    this.items = [];
    this.offset = 0;
  }
}

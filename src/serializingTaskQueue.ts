import Queue from "./queue";

/**
 * Accepts asynchronous tasks and runs them serially in the order they are
 * received.
 */
export default class SerializingTaskQueue {
  private readonly tasks = new Queue<() => Promise<void>>();
  private isRunning = false;

  public addTask<T>(task: () => Promise<T>): Promise<T> {
    const promise = new Promise<T>((resolve, reject) => {
      this.tasks.enqueue(() => task().then(resolve, reject));
    });
    this.startTasks();
    return promise;
  }

  private async startTasks(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    while (this.tasks.size > 0) {
      await this.tasks.dequeue()();
    }
    this.isRunning = false;
  }
}
